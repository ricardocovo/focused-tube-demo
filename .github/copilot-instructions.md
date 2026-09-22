# Copilot Instructions for Focused Tube

## AGENTS

Be brief on your responses.

## Project Overview

Focused Tube is a YouTube overlay web app that lets users create curated profiles — each with subscribed channels and keywords — to bypass YouTube's recommendation algorithm. Users sign in with Google to import their YouTube subscriptions, organize them into profiles, and view a combined feed of subscription-based and keyword-search videos.

## Diagrams

Any diagrams should be done in Mermaid syntax.

## Architecture

Monorepo with two workspaces:

- **`client/`** — React 18 SPA built with Vite and TypeScript
- **`server/`** — Express REST API in TypeScript, with Prisma ORM over SQLite

Communication is via REST JSON API. Authentication uses Google OAuth 2.0 with JWT session tokens. The server proxies all YouTube Data API v3 calls.

### Key data flow

1. User authenticates via Google OAuth → server stores encrypted access/refresh tokens
2. User creates profiles with channels (from their YouTube subscriptions) and keywords
3. Feed endpoint combines two sources per profile:
   - **Subscription feed**: recent uploads from profile's channels via `youtube.search.list`
   - **Keyword search feed**: results for each keyword via `youtube.search.list`
4. Videos are deduplicated by ID, sorted by date, and tagged with their source (`"subscription"` or `"search"`)

### API route structure

All routes are prefixed with `/api/`:
- `/api/auth/*` — Google OAuth flow, session management
- `/api/profiles/*` — Profile CRUD, channel/keyword management
- `/api/subscriptions` — Fetch user's YouTube subscriptions
- `/api/feed/:profileId` — Combined video feed (filterable by `?source=subscriptions|search`)
   - If `profileId` does not exist in the database, return HTTP 404 with `{ "error": "profile_not_found" }`.
   - If `profileId` exists but belongs to a different user than the authenticated session, return HTTP 403 with `{ "error": "forbidden" }`. Never leak the existence of another user's profile by returning 404 in this case.
   - If `?source=` is provided with any value other than `subscriptions` or `search`, return HTTP 400 with `{ "error": "invalid_source", "message": "source must be 'subscriptions' or 'search'" }`.

## Conventions

### Server-side patterns
- Routes live in `server/src/routes/`, one file per resource domain
- Business logic goes in `server/src/services/`, keeping routes thin
- Auth middleware in `server/src/middleware/` attaches the authenticated user to the request
- YouTube API calls are isolated in a service layer to support future caching
- Google access/refresh tokens are stored encrypted — use the encryption utils in `server/src/utils/`
- If a Google token refresh attempt fails with `invalid_grant` or `token_revoked`, delete the user's stored tokens from the database and return HTTP 401 with `{ "error": "google_auth_revoked", "message": "Google authorization has been revoked. Please sign in again." }`.
- Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `DATABASE_URL` (all in `.env`, gitignored)

### Client-side patterns
- Components organized by domain: `auth/`, `feed/`, `profile/`, `subscriptions/`, `ui/`
- Custom hooks in `hooks/` (`useAuth`, `useProfiles`, `useFeed`)
- API client functions in `services/` — all server communication goes through these
- Auth state managed via React context (`AuthProvider`)
- TypeScript interfaces in `types/`

### Database
- Prisma schema at `server/src/prisma/schema.prisma`
- SQLite database file (gitignored)
- Run `npx prisma migrate dev` from `server/` for migrations
- Run `npx prisma generate` after schema changes

## Spec-Driven Development

Feature work follows a spec-driven workflow:

1. Use the **gh-feature-spec-generator** agent to create a business-focused parent feature issue with stable requirement IDs.
2. The feature agent automatically delegates to **gh-user-story-generator**, which inspects the repository and creates linked, implementation-ready story issues.
3. Begin implementation only after every parent requirement is covered by a linked story issue.
4. Use the **gh-developer** agent with the parent issue number or URL to plan, implement, validate, and update issue progress.

GitHub Issues are the canonical specification source. Local files under `specs/` are supported only when the user explicitly requests the developer agent's compatibility mode.

Always read the parent feature issue and every linked story issue before implementing a feature. If no parent specification exists, do not implement the feature directly; instruct the user to run **gh-feature-spec-generator** first.

## YouTube API Quota Awareness

The YouTube Data API v3 has a 10,000 unit daily quota. `search.list` costs 100 units per call. When implementing YouTube-related features:
Follow these rules in priority order:
1. Never make duplicate calls for data already fetched in the same request lifecycle.
2. Always batch API calls when the YouTube Data API supports it for that endpoint (for example, use comma-separated `id` parameters for `videos.list` instead of one request per video). Never call the same endpoint in a loop when a single batched request is available.
3. Structure service functions so inputs fully determine outputs and avoid internal state mutations, so a caching wrapper can memoize by function arguments later. Do not make inline API calls from within other service calls; invoke isolated YouTube service functions so a cache can intercept them.

If a YouTube API call returns a 403 `quotaExceeded` error, the server must return HTTP 429 with `{ "error": "youtube_quota_exceeded", "message": "YouTube API quota exhausted. Try again after midnight Pacific Time." }`. Do not propagate the raw Google error response to the client.