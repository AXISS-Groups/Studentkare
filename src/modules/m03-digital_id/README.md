# M03 — Digital ID Module

## Overview
Verified student credentials, dynamic anti-spoof QR token pass generation, emergency medical contact badges, and identity trust verification.

## Architecture Layering
```
src/modules/m03-digital_id/
  module.config.ts    Manifest definition (ID: M03, operational)
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             DigitalIdProfile entities, badge & expiry helpers
  data/               DigitalIdRepository (Profile fetching & QR refresh API)
  state/              DigitalIdStore (Observable store with discriminated union state)
  viewmodel/          useDigitalIdViewModel hook ({ state, actions })
  view/               Presentational Web & RN components
  __tests__/          Characterisation unit tests
```

## Public API Usage
```typescript
import { useDigitalIdViewModel, DigitalIdWebView } from '@/modules/m03-digital_id';
```
