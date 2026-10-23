{{/*
Secrets shared by the backend and the scheduled-jobs worker. Both run the same
code: the worker delivers messages and erases accounts, so it needs every key the
backend does. One list here keeps the two from drifting (audit ENV-06).

Every key under backend.secrets is passed (DATABASE_URL is set on each
container directly). Without the fail-closed feature keys (audit TD-40) the
backend still starts, but 2FA setup, check-in passes, DPDP erasure and sealed
integration secrets are off; startup logs which, and raises a CRITICAL ops alert.

The three RAZORPAY_* keys are for order and membership payments. Empty = online
payment is off and the API says so (nothing is charged).

LIVEKIT_API_KEY / LIVEKIT_API_SECRET sign video-consult join tokens. Empty = no
call can be started and the app says so.
*/}}
{{- define "studentkare.appSecretEnv" -}}
{{- range $key, $_ := .Values.backend.secrets }}
{{- if ne $key "DATABASE_URL" }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef:
      name: studentkare-secrets
      key: {{ $key }}
      # Keys left empty in values are not written to the Secret: the variable
      # stays unset and the backend reports the feature as off.
      optional: true
{{- end }}
{{- end }}
{{- end -}}
