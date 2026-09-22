---
name: youtube-api
description: 'Design, implement, configure, debug, or review read-only integrations with the YouTube API. Use for YouTube Data API v3, API keys, public channel and playlist reads, video metadata, search, pagination, partial responses, quota reduction, and common failures such as quotaExceeded, forbidden, invalidCredentials, and empty or inconsistent results.'
argument-hint: 'Describe the app type, stack, read-only YouTube feature you need, and any current endpoint, pagination, or quota issue.'
---

# YouTube API

## What This Skill Does

This skill helps the agent handle read-only YouTube API work in a repeatable way instead of jumping straight into endpoint calls or code edits. It is intended for teams that need to read YouTube data, search content, list a channel's uploads, inspect request design problems, or review an existing integration for correctness, quota use, and maintainability.

Use it to:
- Choose the right YouTube Data API read path for the feature
- Map product requirements to the correct read endpoints and request shape
- Implement reliable request flows for channels, playlists, videos, and search
- Diagnose common failures around credentials, quota, filters, and pagination
- Review an integration for security, error handling, and quota efficiency

## When to Use

Use this skill when the task involves any of the following:
- YouTube Data API v3 integration
- Reading channel, playlist, video, comment, or caption data
- Searching YouTube content or listing uploads from a channel
- API key setup for public read-only data
- Pagination, partial responses, quota reduction, or retry behavior
- Debugging errors such as `quotaExceeded`, `forbidden`, `invalidCredentials`, or empty results
- Reviewing whether an existing app is using the correct endpoint, filters, parts, and credential type

Do not use this skill for uploads, channel management, comment moderation, or other write-capable workflows. It is deliberately focused on public or read-only API usage. For simple iframe embeds with no API work, use the player integration path instead of a full API workflow.

## Required Inputs

Before changing code, identify or ask for:
- Product goal: search videos, read public metadata, list a channel's uploads, fetch canonical video details, or something else
- App type: backend service, web app, SPA, mobile app, desktop app, or automation script
- Primary stack: language, framework, runtime, and existing Google client library if any
- Data boundary: public data only or read-only access to known channel resources
- Credential context: API key and environment setup
- Expected traffic pattern: one-off admin task, background sync, user-driven interactions, or batch processing
- Current issue if one exists: error response, quota pressure, incorrect data, upload failure, or auth mismatch

Useful templates:
- [Read-only integration template](./assets/read-only-integration-template.md)
- [Pagination and quota checklist](./assets/pagination-and-quota-checklist.md)

If these are unknown, pause implementation and gather them first.

## Decision Guide

### 1. Choose the Right Access Model

- Use an API key only for public, read-only data.
- If the task requires private or write-capable data, stop and re-scope the work before editing code under this skill.
- If the task involves analytics, reporting, or CMS content-owner workflows, verify whether a different API is actually required before editing Data API code.

### 2. Choose the Right Data Path

- Use `search.list` for discovery, but do not rely on it as the primary source of canonical video details.
- Use `videos.list`, `channels.list`, and `playlistItems.list` for canonical resource retrieval.
- To list a channel's uploaded videos, prefer retrieving the channel's uploads playlist and then iterating `playlistItems.list`.
- Use partial responses and request only the `part` values and fields actually needed.

### 3. Choose the Right Ownership Boundary

- If the app reads public content only, keep the integration stateless where possible.
- If the product stores YouTube data internally, make the resource-to-record mapping explicit in application state.
- If multiple parts of the app consume the same YouTube data, centralize request construction and normalization to avoid drift.

## Procedure

### Step 1. Identify the Exact Feature Path

1. Translate the product request into a concrete YouTube operation.
2. Confirm that the feature fits a read-only integration path.
3. Identify the target resources: channel, playlist, playlist item, video, comment thread, caption, or upload session.
4. Confirm whether the app needs a one-time call, paginated listing, or background sync.
5. Record the minimum fields the feature actually needs.

Output of this step:
- The concrete feature statement
- The target resources and operations
- The minimal data shape required by the product

### Step 2. Verify Credentials and Scopes

1. Confirm that the current flow should use an API key.
2. Verify environment-specific API key configuration.
3. Confirm API key restrictions are compatible with the runtime origin or server environment.
4. Confirm that no OAuth-only assumptions leaked into the code path.
5. Check whether the feature depends on public visibility of the target resources.

Completion checks:
- Public read paths do not use OAuth unnecessarily.
- API key usage is restricted and environment-specific.
- Environment credentials are separated for local, staging, and production.

### Step 3. Map the Operation to API Calls

Work through the feature in this order:

1. Choose the primary endpoint.
2. Choose the required `part` values.
3. Choose filters or identifiers such as channel ID, playlist ID, video ID, query string, or page token.
4. Decide whether follow-up canonical lookups are needed.
5. Decide pagination, retry, and backoff behavior.

Common patterns:
- Public search: `search.list`, then `videos.list` for normalized details when needed
- Channel uploads: `channels.list` to get uploads playlist, then `playlistItems.list`
- Video detail refresh: `videos.list`
- Comment listing: `commentThreads.list` only when public comment data is genuinely part of the feature

### Step 4. Implement with Quota and Reliability in Mind

1. Use an official Google client library or a well-maintained HTTP client abstraction already present in the codebase.
2. Centralize YouTube configuration: base settings, credentials, scopes, and retry policy.
3. Request only required fields and avoid overfetching.
4. Handle `nextPageToken` explicitly for listings.
5. Add retry or backoff only for retryable failures; do not blindly retry auth or permission errors.
6. Normalize YouTube errors into application-level errors instead of leaking raw provider responses directly to users.

Implementation rules:
- Never hardcode API keys, client secrets, or refresh tokens.
- Never log API keys or raw provider payloads in production logs when they may expose sensitive request details.
- Never build product logic on unstable search ordering without a canonical follow-up read.

### Step 5. Validate the End-to-End Behavior

Validate at least these cases when applicable:
- Public read with valid credentials
- Missing or invalid credential handling
- Pagination across multiple pages
- Empty results and partial data handling
- Quota pressure or rate-limit behavior
- Local and deployed environment configuration behavior

If the integration syncs data into an internal database, also validate:
- Idempotent refresh behavior
- Stable mapping between YouTube resources and internal records
- Handling of deleted, private, or unavailable videos

### Step 6. Review Security and Operational Risks

Check the following before considering the task complete:
- Credentials come from environment variables or secret storage
- API key restrictions are configured when an API key is used
- Logs and telemetry do not leak tokens or sensitive provider payloads
- Quota-sensitive endpoints are used intentionally and sparingly
- Error handling distinguishes auth, not-found, quota, validation, and retryable transport failures

## Common Failure Patterns

### `quotaExceeded`
- The integration is making too many expensive calls or polling too aggressively.
- Reduce `search.list` usage where possible, request fewer parts, cache stable reads, and reconsider sync frequency.

### `insufficientPermissions`
- The request path may actually require private or write-capable access and no longer fits this skill's boundary.
- Re-check whether the feature was incorrectly designed as read-only.

### `forbidden`
- The API key may be restricted incorrectly, the resource may not be public, or the request shape may be invalid for the target resource.
- Verify key restrictions, resource visibility, and endpoint parameters.

### `invalidCredentials` or auth failures
- The API key is wrong, missing, or restricted incorrectly.
- Reconstruct the exact credential path and verify environment configuration.

### Empty or unexpected results
- The wrong resource path, wrong channel identifier, pagination omission, private content visibility, or overly restrictive filters may be involved.
- Confirm whether the product expects public or authenticated views of the same resource.

### Upload succeeds partially or metadata is wrong
- This is outside the intended boundary of this skill.
- Re-scope to a write-capable YouTube workflow before changing code.

## Troubleshooting Workflow

When debugging a failure, work in this order:
1. Reconstruct the exact feature path and the endpoint sequence.
2. Identify which credential type and scopes were used.
3. Confirm whether the operation is truly public and read-only.
4. Inspect the actual resource identifiers and pagination state.
5. Classify the failure as auth, permission, quota, request-shape, or transport.
6. Reproduce with the smallest valid request before editing surrounding application logic.

## Completion Standard

A YouTube API task is complete when:
- The feature is mapped to the correct YouTube capability and endpoint sequence.
- The credential model matches a read-only data boundary.
- Quota-sensitive choices are intentional and justified.
- Pagination, retries, and error handling are implemented at the right points.
- End-to-end behavior has been validated for the relevant success and failure paths.

## Response Pattern

When using this skill, structure the work as:
1. Feature summary and target YouTube operation
2. Chosen credential model and read boundary
3. Endpoint sequence and data shape
4. Implementation or fix plan
5. Quota and security checks
6. Validation results or remaining blockers