# Design: Integrated AI Assistant Flow

## Problem
The current "Assist" buttons and the "Wizard Action Panel" operate independently. When a user clicks an inline "Assist" button, the text is overwritten directly without context or explanation. The side panel is only used for larger, step-wide actions.

## Goal
Integrate inline assist suggestions into the side panel to provide a unified AI experience. This allows the user to see the rationale, warnings, and assumptions before adopting a suggestion.

## Proposed Changes

### 1. Unified State Management (`useWizardContext`)
Lift the assistant stack state from `WizardActionPanel` to `WizardContextProvider`. This allows any component within the wizard (like `AssistButton`) to "push" new items to the side panel.

```typescript
type AssistantItem = {
  id: string;
  result: ActionResult | AssistResult; // Extend ActionResult to include AssistResult
}
```

### 2. Communication Layer
- Add `pushAssistantItem` to `WizardContextValue`.
- `AssistButton` will call this function instead of its current `onApply` callback.

### 3. Service Layer Refinement
- Ensure `/api/assist` and `assistService` provide enough metadata (Rationale, Warnings, etc.).

### 4. UI/UX Enhancements
- **Side Panel**: Modernize with Glassmorphism and smoother transitions.
- **Result Cards**: Add support for `AssistResult` showing:
    - Suggested Text (with "Adopt" button).
    - Rationale (styled as a helpful "thought" block).
    - Warnings/Open Questions (severity-aware styling).
- **Transitions**: Items should slide in or fade in to indicate new activity.

## Approach
1.  **Phase A: Infrastructure**: Modify `useWizardContext` and `WizardActionPanel` to share state.
2.  **Phase B: Integration**: Update `AssistButton` to use the shared state.
3.  **Phase C: Visual Polish**: Apply new styles in `app/globals.css` and `ActionResultCard.tsx`.

## Decision Points
- **Persistence**: Should the stack persist across step changes? Yes, to allow users to navigate while keeping suggestions open.
- **Limit**: Keep the stack limit (currently 5) to prevent clutter.

## Risks
- **Complexity**: Passing many types through context. Mitigation: Use a clean `AssistantItem` union.
- **Mobile**: The side panel is `fixed`. Need to ensure it doesn't block critical UI on smaller screens (though the target is primarily desktop).
