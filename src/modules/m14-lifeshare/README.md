# M14 — Lifeshare Module

## Overview
Campus emergency blood and plasma peer-to-peer exchange network with compatible donor matching.

## Architecture Layering
```
src/modules/m14-lifeshare/
  module.config.ts    Manifest definition (ID: M14)
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             DonorProfile, BloodTransferRequest entities & validation
  data/               LifeShareRepository (Feed & emergency request endpoints)
  state/              LifeShareStore (Observable store with discriminated union status)
  viewmodel/          useLifeShareViewModel hook ({ state, actions })
  view/               Presentational Web & RN components
  __tests__/          Characterisation unit tests
```

## Public API Usage
```typescript
import { useLifeShareViewModel, LifeShareWebView } from '@/modules/m14-lifeshare';
```
