import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, MapPin, UserCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface Camp { id: string; name: string; date: string; location: string; }
interface Station { id: string; name: string; sort: number; }
interface CampStatus { registered: boolean; checkedIn: boolean; completedStations: string[]; }

export function HealthCampPanel() {
  const camps = useApiResource<{ items: Camp[] }>('/camps');
  const [selected, setSelected] = useState('');
  const status = useApiResource<CampStatus>(selected ? `/camps/${selected}/me` : '');
  const stations = useApiResource<{ items: Station[] }>(selected ? `/camps/${selected}/stations` : '');
  const [notice, setNotice] = useState('');
  const mutation = useMutation();

  const selectedCamp = camps.data?.items.find(c => c.id === selected);
  const completed = status.data?.completedStations || [];

  const register = (campId: string) => mutation.run(() => apiRequest(`/camps/${campId}/register`, { method: 'POST' }), () => { setSelected(campId); setNotice('Registered. Check in when you arrive.'); status.reload(); });
  const checkIn = () => mutation.run(() => apiRequest(`/camps/${selected}/check-in`, { method: 'POST' }), () => { setNotice('Checked in.'); status.reload(); });
  const complete = (stationId: string) => mutation.run(() => apiRequest(`/camps/${selected}/stations/${stationId}`, { method: 'POST' }), () => { setNotice('Station completed.'); status.reload(); });

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">HEALTH CAMPS</span>
      <h2>Register & follow your camp.</h2>
      <p>Register for a campus health camp, check in, and move through its stations.</p>
    </div></div>

    <FormError message={mutation.error} />
    {notice && <div className="wf-notice" role="status" style={{ marginBottom: 16, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />{notice}</div>}

    <DataState {...camps} retry={camps.reload}>
      {camps.data?.items.length ? <div className="wf-record-grid">
        {camps.data.items.map(camp => {
          const isSelected = selected === camp.id;
          const isRegistered = isSelected && status.data?.registered;
          return <article className="wf-card" key={camp.id} onClick={() => { setSelected(camp.id); setNotice(''); status.reload(); stations.reload(); }} style={{ cursor: 'pointer', borderColor: isSelected ? '#4f46e5' : undefined }}>
            <span className="wf-record-icon"><ClipboardList size={24} /></span>
            <h3>{camp.name}</h3>
            <p>{camp.date} · <MapPin size={13} style={{ verticalAlign: '-2px' }} /> {camp.location || 'Campus'}</p>
            {isSelected && isRegistered
              ? <span className="wf-status status-accepted">Registered{status.data?.checkedIn ? ' · checked in' : ''}</span>
              : <button className="health-button" disabled={mutation.busy} onClick={e => { e.stopPropagation(); register(camp.id); }}>Register</button>}
          </article>;
        })}
      </div> : <EmptyState title="No health camps published." description="Campus health camps appear here once an administrator publishes one." />}
    </DataState>

    {selectedCamp && <section className="wf-card wf-section-gap">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{selectedCamp.date}</span><h3>{selectedCamp.name}</h3></div>
        {status.data?.registered && !status.data?.checkedIn && <button className="health-button health-button-primary" disabled={mutation.busy} onClick={checkIn}><UserCheck size={16} />Check in</button>}
      </div>
      <DataState {...stations} retry={stations.reload}>
        <div className="wf-status-chart">
          {stations.data?.items.map(station => {
            const done = completed.includes(station.id);
            return <div key={station.id} style={{ gridTemplateColumns: '1fr 40px' }}>
              <span>{done ? <CheckCircle2 size={16} style={{ verticalAlign: '-3px' }} /> : null} {station.name}</span>
              <button className="health-button" disabled={done || mutation.busy} onClick={() => complete(station.id)}>{done ? 'Done' : 'Complete'}</button>
            </div>;
          })}
        </div>
      </DataState>
    </section>}
  </>;
}
