# Module M03 — Digital_id

**Owner:** ops-team  
**Data Class:** operational  

## Purpose
Vertical slice module providing digital_id capabilities following P58 Module Contract.

## Layers
- `domain/`: Pure domain entities and errors.
- `data/`: Repository and data mappers.
- `state/`: Light observable store (`useSyncExternalStore`).
- `viewmodel/`: ViewModel hook exposing state & actions.
- `view/`: React / React Native presentation component.
