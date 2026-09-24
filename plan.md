# Community Profile Channels Modal

## Problem and approach

Community profile cards do not currently expose which YouTube channels they contain. Add a "See Channels" action to every community profile card and open an accessible modal listing that profile's channels with thumbnail and channel name.

The existing community profiles endpoint will include only the channel fields needed by the modal. The client will model that response, render the action and modal, and follow the application's established styling and accessibility patterns.

## Todos

1. Extend the community profile query and client response type to include channel ID, title, and thumbnail data.
2. Add a focused channels modal component with a labelled dialog, close control, backdrop dismissal, Escape handling, focus containment, initial focus, and focus restoration to the triggering "See Channels" button.
3. Add "See Channels" to each community card and render the selected profile's channel list, including a clear empty state for profiles with no channels.
4. Style the modal and channel rows consistently with the current rounded, restrained Focused Tube interface, including responsive reflow, visible focus states, reduced-motion support, and forced-colors support.
5. Expand client tests to cover opening the correct profile's modal, channel content and empty state, accessible dialog semantics, Escape/close behavior, and focus restoration.
6. Run targeted client tests plus client and server builds to validate the API contract and UI integration.

## Notes and considerations

- Channel entries contain thumbnail and channel name only; they will not link to YouTube.
- Channel data is returned as part of the existing paginated community profiles response, avoiding an extra API request when the modal opens.
- No database migration is required because profile channel records already contain the required fields.
- The card action will be implemented as a native button styled as a text link for semantic keyboard support.
