---
name: google-authentication
description: 'Design, implement, configure, debug, or review Google Authentication using OAuth 2.0 and OpenID Connect. Use for Google Sign-In, backend token validation, redirect URI setup, consent screen issues, refresh tokens, session mapping, and common auth failures such as invalid_client, redirect_uri_mismatch, invalid_grant, and audience mismatch.'
argument-hint: 'Describe the app type, stack, current auth flow, and whether you need integration, debugging, or a security review.'
---

# Google Authentication

## What This Skill Does

This skill helps the agent work through Google Authentication tasks methodically instead of jumping straight to code changes. It is intended for application teams that need to integrate, troubleshoot, or review Google login flows across frontend, backend, and full-stack systems.

Use it to:
- Choose the correct Google auth flow for the app architecture
- Configure Google Cloud OAuth credentials and consent screen settings
- Implement sign-in, authorization, token exchange, and backend validation
- Debug common Google auth errors and environment mismatches
- Review security risks around tokens, sessions, scopes, and account linking

## When to Use

Use this skill when the task involves any of the following:
- Google Sign-In or Sign in with Google
- OAuth 2.0 authorization code flow
- OpenID Connect ID token validation
- Server-side session creation after Google login
- SPA, web, backend, mobile, or desktop Google authentication design
- Redirect URI, callback URL, client ID, or client secret issues
- Token refresh, offline access, scope review, or consent screen setup
- Security review of existing Google authentication code

## Required Inputs

Before changing code, identify or ask for:
- App type: SPA, server-rendered web app, backend API, mobile app, desktop app, or hybrid
- Primary stack: framework, runtime, auth library, and deployment environment
- Current target outcome: integrate new auth, fix a bug, add account linking, or review security
- Current flow if one exists: implicit, authorization code, PKCE, backend token exchange, or Firebase/Auth broker flow
- Google credential context: OAuth client type, consent screen status, redirect URIs, JavaScript origins, scopes
- Session model: stateless JWT, server session, or hybrid

If these are unknown, pause implementation and gather them first.

## Decision Guide

### 1. Choose the Right Flow

- Use Authorization Code + PKCE for SPAs and public clients.
- Use Authorization Code flow for confidential web applications with a backend.
- Use OpenID Connect when the app needs verified user identity claims.
- Use offline access only when refresh tokens are genuinely required.
- Avoid implicit flow for new implementations.
- Avoid trusting client-side identity assertions without backend verification when the backend establishes application sessions or authorizes API access.

### 2. Choose the Validation Boundary

- If the frontend only renders UI and the backend owns access control, validate Google tokens on the backend.
- If the app creates its own session cookie, issue the cookie only after backend verification of the Google identity.
- If multiple services consume identity, centralize validation or session issuance to avoid drift in audience, issuer, and expiry checks.

### 3. Minimize Scope and Data

- Request the smallest scopes that satisfy the feature.
- Treat profile and email as optional unless the product explicitly needs them.
- Do not store raw Google tokens longer than necessary.
- Prefer internal user IDs in application state instead of repeatedly keying business logic on email addresses.

## Procedure

### Step 1. Inspect the Existing Auth Model

1. Find where authentication starts, where the callback lands, and where sessions or app tokens are issued.
2. Identify the auth library, SDK, or middleware already in use.
3. Trace which token types are handled: ID token, access token, refresh token, or app-issued session token.
4. Confirm where the app maps a Google account to an internal user record.
5. Note whether the current flow is frontend-only, backend-only, or split across both.

Output of this step:
- A short auth flow summary
- The token lifecycle
- The trust boundary between frontend, backend, and Google

### Step 2. Verify Google Configuration

1. Confirm the OAuth client type matches the app type.
2. Check authorized redirect URIs exactly, including scheme, host, port, path, and trailing slash behavior.
3. Check authorized JavaScript origins for browser-based flows.
4. Confirm consent screen configuration, test users, publishing status, and required scopes.
5. Confirm environment separation for local, staging, and production credentials.

Completion checks:
- Redirect URIs align exactly with runtime URLs.
- The correct client ID is used in each environment.
- Secrets are only present where confidential clients need them.

### Step 3. Implement or Repair the Flow

1. Use a proven library for the framework instead of custom OAuth handling where possible.
2. Generate and verify state for redirect-based flows.
3. Use PKCE for public clients.
4. Exchange codes server-side when a backend participates in auth.
5. Verify ID token claims before trusting identity:
   - issuer
   - audience
   - expiry
   - hosted domain if the product requires domain restriction
   - email_verified if the product depends on verified email
6. Create or link the internal user account after successful verification.
7. Issue the app's own session or access token with the app's authorization model.

Implementation rules:
- Never hardcode client secrets.
- Never log authorization codes, access tokens, refresh tokens, or raw ID tokens in production logs.
- Never use Google access tokens directly as the app's own session credential.

### Step 4. Test the End-to-End Behavior

Validate at least these cases:
- First-time sign-in for a new user
- Returning sign-in for an existing linked user
- Rejected callback when state is missing or invalid
- Expired or invalid token handling
- Redirect behavior in local and deployed environments
- Sign-out behavior and session invalidation
- Access denied or consent cancelled by the user

If domain-restricted access exists, also test:
- Allowed domain user
- Disallowed domain user
- User with missing or unexpected hosted domain claim

### Step 5. Review Security and Operational Risks

Check the following before considering the task complete:
- Secrets come from environment or secret storage
- State and PKCE are enforced where applicable
- Tokens are validated on the correct boundary
- Sessions are rotated or renewed according to the app's policy
- Sensitive auth failures are not overexposed to end users
- Audit and debug logs do not leak token material
- Account linking rules are explicit and do not rely on ambiguous email matching alone

## Common Failure Patterns

### `redirect_uri_mismatch`
- The configured redirect URI does not exactly match the runtime callback URL.
- Compare scheme, hostname, port, path, and trailing slash.

### `invalid_client`
- Wrong client ID or secret, wrong client type, or wrong environment configuration.
- Verify local, staging, and production credentials are not crossed.

### `invalid_grant`
- Reused or expired authorization code, wrong redirect URI during exchange, clock skew, or mismatched PKCE verifier.

### Audience or issuer mismatch
- The token was minted for a different client ID or from the wrong issuer.
- Validate the backend against the exact expected audience.

### Missing refresh token
- Google commonly issues refresh tokens only in specific conditions.
- Check offline access settings, consent behavior, and whether the user has previously approved the app.

### Session works locally but fails in production
- Check callback URL, reverse proxy headers, HTTPS enforcement, cookie secure settings, same-site policy, and environment-specific credential values.

## Troubleshooting Workflow

When debugging a failure, work in this order:
1. Reconstruct the exact runtime flow from login start to callback handling.
2. Identify which credential and environment were used.
3. Compare runtime URLs with Google Console configuration.
4. Determine which token or code failed and at which boundary.
5. Inspect claim validation and session creation logic.
6. Reproduce with the smallest possible path before editing unrelated auth code.

## Completion Standard

A Google Authentication task is complete when:
- The auth flow is explicitly identified and appropriate for the app type.
- Google Console settings and app settings are aligned.
- The application verifies identity at the correct boundary.
- Internal session or account linking behavior is clear and tested.
- Known error paths and environment-specific issues have been covered.
- Security checks around scopes, secrets, logging, and token handling have passed.

## Response Pattern

When using this skill, structure the work as:
1. Current auth flow summary
2. Chosen or detected Google auth flow
3. Configuration gaps or code gaps
4. Concrete implementation or fix steps
5. Security checks
6. Validation results or remaining blockers