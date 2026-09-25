"""Regression checks for the authenticated contracts replacing prototype endpoints."""
import time
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from core import workflow_models as M
from test_workflow_api import harness, register  # shared isolated-database fixture


def test_expired_otp_is_rejected(harness):
    client, factory, codes = harness
    client.post('/api/auth/otp/send', json={'identifier': 'a@example.test', 'channel': 'EMAIL', 'intent': 'SIGNUP'})
    with factory() as db:
        db.scalar(select(M.OtpChallenge)).expires_at = time.time() - 1
        db.commit()
    assert client.post('/api/auth/otp/verify', json={'otp': codes[-1]}).status_code == 401


def test_cross_origin_and_forged_role_cannot_mutate(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    body = {'subject': 'Account help', 'message': 'Please help with my account request.'}
    assert client.post('/api/support', json=body, headers={**headers, 'Origin': 'https://untrusted.example'}).status_code == 403
    assert client.get('/api/ops/accounts', headers={'Authorization': 'Bearer fabricated-admin-token'}).status_code == 403


def test_revoked_cookie_cannot_restore_session(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    cookie = client.cookies.get('sacare_session')
    client.post('/api/auth/logout', headers=headers)
    client.cookies.set('sacare_session', cookie, path='/api')
    assert client.get('/api/auth/session').json()['user'] is None
    assert client.get('/api/orders').status_code == 401


def test_current_database_role_and_active_flag_are_authoritative(harness):
    client, factory, codes = harness
    user, _ = register(client, codes)
    with factory() as db:
        account = db.get(M.Account, user['id'])
        account.role = 'SUPER_ADMIN'
        db.commit()
    assert client.get('/api/ops/summary').status_code == 200
    with factory() as db:
        db.get(M.Account, user['id']).active = False
        db.commit()
    assert client.get('/api/ops/summary').status_code == 401


def test_otp_request_rate_limit_is_durable(harness):
    client, _, codes = harness
    body = {'identifier': 'a@example.test', 'channel': 'EMAIL', 'intent': 'SIGNUP'}
    for _ in range(3):
        assert client.post('/api/auth/otp/send', json=body).status_code == 200
    assert client.post('/api/auth/otp/send', json=body).status_code == 429
    assert len(codes) == 3


def test_invalid_contact_channel_and_short_code(harness):
    client, _, _ = harness
    assert client.post('/api/auth/otp/send', json={'identifier': 'someone@example.test', 'channel': 'WHATSAPP', 'intent': 'LOGIN'}).status_code == 422
    assert client.post('/api/auth/otp/send', json={'identifier': '123', 'channel': 'EMAIL', 'intent': 'LOGIN'}).status_code == 422
    assert client.post('/api/auth/otp/verify', json={'otp': '1234'}).status_code == 422


def seed_catalog(factory, *, kind='product', rx=False, stock=5):
    with factory() as db:
        db.add(M.Account(id='provider', identifier='provider@example.test', channel='EMAIL', full_name='Provider', role='NMC_DOCTOR' if kind == 'consultation' else 'VENDOR', active=True, profile={}, created_at=time.time()))
        db.add(M.CatalogEntry(id='item', provider_id='provider', kind=kind, name='Configured item', brand='Provider', category='devices', description='Configured catalog entry', pack='1 item', price_paise=45000, stock=stock, active=True, requires_prescription=rx, preparation=''))
        db.commit()


def order_body(slot=''):
    return {'items': [{'id': 'item', 'quantity': 2}], 'delivery': {'mode': 'pickup', 'address': '', 'city': 'Hyderabad', 'pincode': '500001'}, 'requestedSlot': slot}


def test_cancellation_releases_stock_once(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    seed_catalog(factory)
    order = client.post('/api/orders', json=order_body(), headers={**headers, 'Idempotency-Key': 'cancel-stock-test'}).json()
    with factory() as db:
        assert db.get(M.CatalogEntry, 'item').stock == 3
    for _ in range(2):
        assert client.post(f"/api/orders/{order['id']}/cancel", headers=headers).status_code == 200
    with factory() as db:
        assert db.get(M.CatalogEntry, 'item').stock == 5


def test_accepted_request_cannot_be_cancelled_by_customer(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    seed_catalog(factory)
    order = client.post('/api/orders', json=order_body(), headers={**headers, 'Idempotency-Key': 'accepted-test-key'}).json()
    with factory() as db:
        db.get(M.OrderLine, order['lines'][0]['id']).status = 'ACCEPTED'
        db.commit()
    assert client.post(f"/api/orders/{order['id']}/cancel", headers=headers).status_code == 409


def test_prescription_service_is_not_simulated(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    seed_catalog(factory, rx=True)
    assert client.post('/api/orders', json=order_body(), headers={**headers, 'Idempotency-Key': 'prescription-test'}).status_code == 409
    assert client.get('/api/orders').json()['items'] == []


def test_lab_request_requires_future_time_and_remains_unconfirmed(harness):
    client, factory, codes = harness
    _, headers = register(client, codes)
    seed_catalog(factory, kind='lab')
    payload = order_body()
    payload['items'][0]['quantity'] = 1
    assert client.post('/api/orders', json=payload, headers={**headers, 'Idempotency-Key': 'lab-test-request'}).status_code == 422
    payload['requestedSlot'] = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    response = client.post('/api/orders', json=payload, headers={**headers, 'Idempotency-Key': 'lab-test-request'})
    assert response.status_code == 201
    assert response.json()['lines'][0]['status'] == 'REQUESTED'


def test_private_preferences_and_session_record_idempotency(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    assert client.put('/api/health/preferences', json={'savedExercises': ['neck'], 'completedTasks': []}, headers=headers).status_code == 200
    body = {'id': 'client-session-unique', 'routineName': 'Desk reset', 'activeSeconds': 40, 'completedMoves': 1, 'skippedMoves': 3, 'finishedAt': datetime.now(timezone.utc).isoformat()}
    for _ in range(2):
        assert client.post('/api/health/exercise-sessions', json=body, headers=headers).status_code == 201
    assert len(client.get('/api/health/exercise-sessions').json()['items']) == 1
    client.post('/api/auth/logout', headers=headers)
    register(client, codes, 'other@example.test')
    assert client.get('/api/health/preferences').json()['savedExercises'] == []
    assert client.get('/api/health/exercise-sessions').json()['items'] == []


def test_policies_support_and_file_size_checks(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    assert client.post('/api/health/policies', json={'insurer': 'Policy issuer', 'policyNumber': 'ACTUAL-POLICY-REF', 'sumInsured': 100000, 'validUntil': '2027-01-01'}, headers=headers).status_code == 201
    assert client.get('/api/health/policies').json()['items'][0]['verification'] == 'USER_RECORDED'
    assert client.post('/api/support', json={'subject': 'Account question', 'message': 'Please help me with my account details.'}, headers=headers).status_code == 201
    assert client.get('/api/support').json()['items'][0]['status'] == 'OPEN'
    response = client.post('/api/health/documents', headers=headers, content=b'x' * (13 * 1024 * 1024))
    assert response.status_code == 413


def test_no_user_can_sign_in_with_an_invented_bearer_token(harness):
    client, _, _ = harness
    assert client.get('/api/health/readings', headers={'Authorization': 'Bearer sacare_sim_jwt_token_2026'}).status_code == 401


def test_telemetry_vitals_contract_requires_sensor_accuracy_index(harness):
    client, _, codes = harness
    _, headers = register(client, codes)
    # Missing required sensorAccuracyIndex should return 422 Unprocessable Entity
    invalid_res = client.post('/api/v1/telemetry/vitals', json={'deviceId': 'DEV_1', 'heartRateBpm': 72}, headers=headers)
    assert invalid_res.status_code == 422

    # Valid payload with required sensorAccuracyIndex succeeds
    # The live endpoint takes the full vitals set, and spells it spO2Percent.
    # This used to send the shape of a second, unreachable route defined lower
    # in the same module, so it could never have passed.
    valid_res = client.post(
        '/api/v1/telemetry/vitals',
        json={'deviceId': 'DEV_1', 'heartRateBpm': 72.0, 'spO2Percent': 98.0,
              'respirationRateRpm': 16.0, 'systolicBp': 118.0, 'diastolicBp': 76.0,
              'temperatureF': 98.6, 'sensorAccuracyIndex': 0.96},
        headers=headers,
    )
    assert valid_res.status_code == 200
    res_data = valid_res.json()
    assert res_data['status'] == 'SUCCESS'
    assert res_data['sensorAccuracyIndex'] == 0.96
    # It persists: an endpoint that returned SUCCESS without storing anything
    # would be a receipt for data nobody kept.
    assert res_data['record_id']

