# Pagination And Quota Checklist

Use this checklist before finalizing a read-only YouTube API integration.

## Request Shape

- The request uses the correct endpoint for canonical data.
- `search.list` is used only for discovery, not as the sole source of truth when canonical details matter.
- Only required `part` values are requested.
- Only required response fields are requested when partial responses are available.

## Pagination

- The code handles `nextPageToken` explicitly.
- The loop has a clear stop condition.
- Duplicate pages or repeated tokens are guarded against.
- Empty final pages do not break the consumer.

## Quota

- Polling frequency is justified.
- Stable responses are cached when appropriate.
- Expensive discovery calls are reduced when identifiers are already known.
- Background sync jobs have bounded concurrency and predictable request volume.

## Error Handling

- `quotaExceeded` is surfaced distinctly from not-found and validation errors.
- Invalid credential handling is explicit.
- Private or unavailable resources are handled as product states, not opaque failures.
- Retry logic is limited to retryable transport or transient provider failures.

## Review Outcome

- Endpoint selection is correct.
- Pagination is correct.
- Quota use is acceptable.
- Remaining risks or open assumptions are listed.
