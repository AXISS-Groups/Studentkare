# Module M04 — Emergency

**Owner:** clinical-team  
**Data Class:** clinical  

## Purpose
Vertical slice module providing emergency capabilities following P58 Module Contract.

## Layers
- `domain/`: Pure domain entities and errors.
- `data/`: Repository and data mappers.
- `state/`: Light observable store (`useSyncExternalStore`).
- `viewmodel/`: ViewModel hook exposing state & actions.
- `view/`: React / React Native presentation component.
