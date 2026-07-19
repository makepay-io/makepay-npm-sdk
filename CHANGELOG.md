# Changelog

All notable changes to `@makecrypto/makepay` are documented here.

## 0.4.0 - 2026-07-19

### Added

- Asynchronous OAuth authorization providers while preserving the existing
  `keyId` and `keySecret` client configuration.
- P-256 DPoP key generation, JWK thumbprints, and ES256 proof helpers for native
  OAuth integrations.
- One controlled authorization refresh and retry after a `401`; token storage,
  refresh locking, and atomic persistence remain the host application's
  responsibility.
- Idempotency keys for payment-link mutations and grant-scoped MakePay webhook
  subscription methods.
- Allowlisted Medusa payment-link correlation metadata for reliable order and
  payment reconciliation.

### Changed

- Requests refuse cross-origin path escapes and use manual redirect handling so
  credentials and DPoP proofs are never automatically forwarded to a redirect
  target.
- API, anonymous, checkout, script, iframe, and DPoP transport URLs require
  HTTPS; HTTP is limited to exact loopback hosts for local testing, and base
  URLs remain origin-only.
- Embedded-checkout parent origins are normalized and validated before they are
  serialized or used for browser message targeting.
- Mounted checkout events must come from both the configured MakePay origin and
  that mount's iframe window, isolating sibling checkout frames.
- Webhook verification rejects non-finite or non-positive timestamp tolerances
  instead of allowing them to disable freshness checks.
- The default hosted checkout and embedded checkout URLs use the canonical
  `www.makepay.io` origin; the production modal loader uses the MakePay CDN.
- Published JavaScript and declarations no longer include source maps.
- Authenticated payment-link detail, update, and list response types now match
  the partner-v1 envelope and retain the typed nested payment-link payload.
- Packaging always rebuilds through `prepack` before npm creates an artifact.

### Compatibility

- API-key construction and the public package root export remain compatible.
- Node.js 18 or newer is required.
