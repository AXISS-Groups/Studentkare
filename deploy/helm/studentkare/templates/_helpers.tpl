{{/*
Secrets shared by the backend and the scheduled-jobs worker. Both run the same
code: the worker delivers messages and erases accounts, so it needs every key the
backend does. One list here keeps the two from drifting (audit ENV-06).

The last five are the fail-closed feature keys (audit TD-40). Without them the
backend still starts, but 2FA setup, check-in passes, DPDP erasure and sealed
integration secrets are off; startup logs which, and raises a CRITICAL ops alert.
*/}}
{{- define "studentkare.appSecretEnv" -}}
{{- range $key := list "OTP_HASH_SECRET" "SENTRY_DSN" "ALERTMANAGER_WEBHOOK_SECRET" "TWO_FACTOR_ENCRYPTION_KEY" "PASS_SIGNING_SECRET" "DPDP_ARCHIVE_KEY" "DPDP_ARCHIVE_RETENTION_DAYS" "INTEGRATIONS_ENCRYPTION_KEY" }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef:
      name: studentkare-secrets
      key: {{ $key }}
{{- end }}
{{- end -}}
