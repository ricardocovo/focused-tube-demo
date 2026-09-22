# Configuration Guide

Step-by-step setup of all external dependencies and environment configuration required to run Focused Tube locally.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Create a Google Cloud Project](#2-create-a-google-cloud-project)
3. [Enable the YouTube Data API](#3-enable-the-youtube-data-api)
4. [Set Up Google OAuth 2.0 Credentials](#4-set-up-google-oauth-20-credentials)
5. [Configure the OAuth Consent Screen](#5-configure-the-oauth-consent-screen)
6. [Generate Secrets](#6-generate-secrets)
7. [Create the `.env` File](#7-create-the-env-file)
8. [Install Dependencies](#8-install-dependencies)
9. [Set Up the Database](#9-set-up-the-database)
10. [Start the Application](#10-start-the-application)
11. [Verify Everything Works](#11-verify-everything-works)
12. [Environment Variable Reference](#12-environment-variable-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|-----------------|---------------|
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ (ships with Node 18) | `npm --version` |
| **Git** | Any recent version | `git --version` |

You will also need:

- A **Google account** (to access Google Cloud Console)
- A **web browser** for the OAuth flow

---

## 2. Create a Google Cloud Project

The app uses Google OAuth for sign-in and the YouTube Data API for fetching subscriptions and videos. Both require a Google Cloud project.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the **project dropdown** at the top of the page (next to the "Google Cloud" logo).
3. Click **New Project**.
4. Enter a project name (e.g., `Focused Tube Dev`).
5. Leave the organization as-is (or select one if applicable).
6. Click **Create**.
7. Wait for the project to be created, then **select it** from the project dropdown.

> **Tip:** Keep the browser tab open — you'll use the console for the next several steps.

---

## 3. Enable the YouTube Data API

The server uses the YouTube Data API v3 to fetch user subscriptions and search for videos.

1. In the Google Cloud Console, navigate to **APIs & Services → Library** (or search for "API Library" in the top search bar).
2. Search for **YouTube Data API v3**.
3. Click the result, then click **Enable**.
4. Wait for the API to be enabled.

> **Quota note:** The free tier gives you **10,000 units per day**. Channel uploads use `playlistItems.list` at **1 unit** per call. Keyword searches use `search.list` at **100 units** per call. Server-side caching reduces repeated calls. A built-in quota tracker warns when approaching the limit.

---

## 4. Set Up Google OAuth 2.0 Credentials

These credentials allow users to sign in via Google and grant the app access to their YouTube subscriptions.

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. If prompted, you must configure the consent screen first — see [Step 5](#5-configure-the-oauth-consent-screen), then come back here.
4. For **Application type**, select **Web application**.
5. Give it a name (e.g., `Focused Tube Local`).
6. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:5173
   ```
7. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
8. Click **Create**.
9. A dialog will display your **Client ID** and **Client Secret**. Copy both — you'll need them for the `.env` file.

> **Important:** The redirect URI must match *exactly* what the server expects. The default is `http://localhost:3001/api/auth/google/callback`. If you change the server port, update this URI accordingly.

---

## 5. Configure the OAuth Consent Screen

Google requires a consent screen before users can authenticate.

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Select **External** as the user type (unless you have a Google Workspace org and want to restrict access).
3. Click **Create**.
4. Fill in the required fields:
   - **App name:** `Focused Tube` (or any name you like)
   - **User support email:** Your email address
   - **Developer contact information:** Your email address
5. Click **Save and Continue**.
6. On the **Scopes** screen, click **Add or Remove Scopes** and add these three scopes:
   - `openid` (or `.../auth/userinfo.profile`)
   - `.../auth/userinfo.email`
   - `https://www.googleapis.com/auth/youtube.readonly`
7. Click **Update**, then **Save and Continue**.
8. On the **Test users** screen, click **+ Add Users** and add your own Google email address (and any other testers).
9. Click **Save and Continue**, then **Back to Dashboard**.

> **Why test users?** While the consent screen is in "Testing" status, only added test users can sign in. You can publish the app later to remove this restriction, but for local development, testing mode is fine.

---

## 6. Generate Secrets

The app requires three secrets that you must generate yourself. Open a terminal and run each command:

### JWT Secret (for signing access tokens)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — this is your `JWT_SECRET`.

### JWT Refresh Secret (for signing refresh tokens)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — this is your `JWT_REFRESH_SECRET`. Make sure it's **different** from `JWT_SECRET`.

### Encryption Key (for encrypting stored Google tokens)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — this is your `ENCRYPTION_KEY`. This must be a **64-character hex string** (32 bytes).

> **Security:** Never commit these secrets to version control. The `.env` file is git-ignored by default.

---

## 7. Create the `.env` File

Create a file named `.env` in the **project root** (`focused-tube/.env`):

```env
# ── Server ────────────────────────────────────────────
PORT=3001
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# ── Database ──────────────────────────────────────────
DATABASE_URL=file:./prisma/dev.db

# ── Google OAuth 2.0 ─────────────────────────────────
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# ── JWT ───────────────────────────────────────────────
JWT_SECRET=paste-your-generated-hex-here
JWT_REFRESH_SECRET=paste-your-generated-hex-here

# ── Encryption ────────────────────────────────────────
ENCRYPTION_KEY=paste-your-64-char-hex-here
```

Replace the placeholder values with:
- The **Client ID** and **Client Secret** from [Step 4](#4-set-up-google-oauth-20-credentials)
- The three secrets from [Step 6](#6-generate-secrets)

---

## 8. Install Dependencies

From the project root:

```bash
npm install
```

This installs dependencies for both the `client/` and `server/` workspaces (configured via npm workspaces in the root `package.json`).

---

## 9. Set Up the Database

The server uses SQLite via Prisma. Initialize the database:

```bash
cd server
npx prisma generate
npx prisma migrate dev
cd ..
```

- `prisma generate` creates the Prisma Client based on the schema.
- `prisma migrate dev` creates the SQLite database file and applies all migrations.

You should see a `dev.db` file created inside `server/src/prisma/`.

> **Tip:** To visually inspect or edit the database during development, run `npx prisma studio` from the `server/` directory. It opens a web UI at `http://localhost:5555`.

---

## 10. Start the Application

From the project root:

```bash
npm run dev
```

This starts both services concurrently:

| Service | URL | Description |
|---------|-----|-------------|
| **Client** (Vite) | http://localhost:5173 | React SPA with hot-reload |
| **Server** (Express) | http://localhost:3001 | REST API |

The Vite dev server automatically proxies `/api/*` requests to the Express server, so the client doesn't need to know the server's port.

---

## 11. Verify Everything Works

1. Open http://localhost:5173 in your browser.
2. Click the **Sign in with Google** button.
3. You should be redirected to Google's consent screen.
4. Sign in with a test user account (one you added in [Step 5](#5-configure-the-oauth-consent-screen)).
5. After granting access, you should be redirected back to the app and logged in.

You can also verify the server independently:

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{ "status": "ok", "quota": { "date": "2025-01-01", "used": 0, "limit": 9000, "remaining": 9000 } }
```

---

## 12. Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Port the Express server listens on |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CLIENT_ORIGIN` | No | `http://localhost:5173` | Frontend URL (used for CORS and OAuth redirects) |
| `DATABASE_URL` | No | `file:./prisma/dev.db` | SQLite connection string for Prisma |
| `GOOGLE_CLIENT_ID` | **Yes** | — | OAuth 2.0 Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | OAuth 2.0 Client Secret from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:3001/api/auth/google/callback` | OAuth redirect URI (must match Google Console) |
| `JWT_SECRET` | **Yes** | — | Secret for signing access tokens (32+ chars) |
| `JWT_REFRESH_SECRET` | **Yes** | — | Secret for signing refresh tokens (32+ chars, different from JWT_SECRET) |
| `ENCRYPTION_KEY` | **Yes** | — | 64-char hex string for AES-256-GCM encryption of stored Google tokens |
| `CACHE_MAX_ENTRIES` | No | `5000` | Maximum number of entries in the server-side in-memory cache |
| `CACHE_TTL_CHANNEL_SECONDS` | No | `600` | TTL (seconds) for cached channel upload results |
| `CACHE_TTL_KEYWORD_SECONDS` | No | `300` | TTL (seconds) for cached keyword search results |
| `FEED_PUBLISHED_AFTER_DAYS` | No | `14` | Only return videos published within this many days |
| `QUOTA_DAILY_LIMIT` | No | `9000` | Soft quota guard threshold (YouTube daily limit is 10,000) |

---

## 13. Troubleshooting

### `Missing required environment variable: GOOGLE_CLIENT_ID`

The server throws this on startup if a required variable is missing. Double-check that your `.env` file exists in the project root and contains all required values.

### `redirect_uri_mismatch` from Google

The redirect URI in Google Cloud Console must **exactly** match `GOOGLE_CALLBACK_URL`. Common mistakes:
- Trailing slash mismatch (`/callback` vs `/callback/`)
- Wrong port (`3001` vs `5173`)
- `https` vs `http`

### `invalid_client` from Google

Your `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is wrong. Re-copy them from the Google Cloud Console under **APIs & Services → Credentials**.

### `Access blocked: This app's request is invalid (Error 400)`

The OAuth consent screen is not configured, or the required scopes haven't been added. Go back to [Step 5](#5-configure-the-oauth-consent-screen).

### `Error: P1001: Can't reach database server`

Run the Prisma migration from the `server/` directory:

```bash
cd server
npx prisma migrate dev
```

### CORS errors in the browser console

Make sure `CLIENT_ORIGIN` in `.env` matches the URL you're accessing the client from (default: `http://localhost:5173`). Port, protocol, and hostname must all match.

### `403 Forbidden` or `quotaExceeded` from YouTube API

- Confirm the **YouTube Data API v3** is enabled in your Google Cloud project ([Step 3](#3-enable-the-youtube-data-api)).
- Check your daily quota usage at **APIs & Services → Dashboard** in the Google Cloud Console.

### Token refresh fails silently

The access token expires every 15 minutes. If refresh fails, try signing out and signing back in. Returning users skip the consent screen automatically; if you need to re-grant permissions, clear the `ft_returning_user` cookie or use an incognito window.

### Database reset

If the database gets into a bad state, you can reset it:

```bash
cd server
npx prisma migrate reset
```

> **Warning:** This deletes all data in the local database.
