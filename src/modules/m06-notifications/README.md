# M06 — Notifications Module

## Overview
Provides real-time campus notification alerts, emergency push notifications, and activity updates across web and mobile platforms.

## Architecture Layering
```
src/modules/m06-notifications/
  module.config.ts    Manifest definition
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             Notification entities, types, and invariants
  data/               Repository and HTTP data mappers
  state/              Observable store with discriminated union state
  viewmodel/          useNotificationViewModel hook (state & actions)
  view/               Presentational Web & RN components
  platform/           Storage & platform adapters
  __tests__/          Characterisation tests
```

## Public API Usage
```typescript
import { useNotificationViewModel, NotificationBellView } from '@/modules/m06-notifications';
```
