# M04 — Emergency Module

## Overview
Campus 108 Emergency SOS trigger, 3-second safety countdown, responder ambulance dispatch, and automated emergency contact notification.

## Rule B Compliance
- **Data Class:** `clinical`
- **Fail Closed:** Any emergency trigger or dispatch error immediately fails closed to emergency helpline numbers.

## Architecture Layering
```
src/modules/m04-emergency/
  module.config.ts    Manifest definition (ID: M04, clinical)
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             EmergencyStatus, AmbulanceDispatchInfo entities & status helpers
  data/               EmergencyRepository (SOS dispatch & cancellation endpoints)
  state/              EmergencyStore (Observable store with countdown state machine)
  viewmodel/          useEmergencySosViewModel hook ({ state, actions })
  view/               Presentational Web & RN components
  __tests__/          Characterisation unit tests
```

## Public API Usage
```typescript
import { useEmergencySosViewModel, EmergencySosWebView } from '@/modules/m04-emergency';
```
