# M01 — Auth Module

## Overview
Session management, P66 hardened OTP verification, 2FA challenge handling, and verified student registration.

## Rule 2 Compliance
- **No Auth Fallback:** A failed, expired, or rejected OTP never grants an authenticated session.
- **Fail Closed:** Any authentication error or network failure denies session creation.

## Architecture Layering
```
src/modules/m01-auth/
  module.config.ts    Manifest definition (ID: M01, operational)
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             AuthUser, SessionResponse entities & validation rules
  data/               AuthRepository (OTP dispatch, verify & signup endpoints)
  state/              AuthStore (Observable store with discriminated union state)
  viewmodel/          useAuthViewModel hook ({ state, actions })
  view/               Presentational views
  __tests__/          Characterisation unit tests
```

## Public API Usage
```typescript
import { useAuthViewModel } from '@/modules/m01-auth';
```
