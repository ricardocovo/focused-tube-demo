# Read-Only Integration Template

Use this template when planning or reviewing a read-only YouTube API feature.

## Feature Summary

- Product goal:
- User-facing behavior:
- Runtime: backend service, web app, SPA, script, or other

## Target Resources

- Primary resource type: channel, playlist, playlist item, video, or search result
- Known identifiers: channel ID, playlist ID, video ID, query string
- Public visibility assumptions:

## Endpoint Plan

- Primary endpoint:
- Follow-up canonical endpoint if needed:
- Required `part` values:
- Required fields:
- Filters and parameters:

## Pagination Plan

- Needs pagination: yes or no
- Expected page size:
- `nextPageToken` handling:
- Stop condition:

## Quota Plan

- Expected call frequency:
- Caching strategy:
- Expensive endpoints to avoid or minimize:
- Fallback behavior under quota pressure:

## Failure Handling

- Missing or invalid API key behavior:
- Empty result behavior:
- Not-found or private resource behavior:
- Retryable failure behavior:

## Completion Check

- Correct endpoint sequence chosen
- Minimal `part` values and fields requested
- Pagination handled explicitly
- Quota-sensitive decisions documented
- Error handling mapped to product behavior
