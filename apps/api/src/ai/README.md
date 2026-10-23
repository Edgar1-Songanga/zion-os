# ZION spiritual AI — AI Core integration

## Integration contract

The ZION API calls the separately deployed MARKA × ZION AI Core. It does not connect the AI Core directly to ZION's database.

- Endpoint: POST {AI_CORE_BASE_URL}/api/v1/ai/generate
- Space: zion unless AI_CORE_SPACE overrides it
- Operation: CHAT
- Authentication: x-ai-core-key
- Tenant/user context: short-lived HMAC-SHA256 token in x-ai-context-token
- Correlation: x-correlation-id

The AI Core gateway accepts signed context only in production. The request body is not an authority for user roles or tenant identity. Callers must pass a tenant ID obtained from authenticated ZION identity/organization context; never derive it from arbitrary user input.

## Runtime configuration

Configure these on the ZION API project (Production and Preview only where intentionally needed):

- AI_CORE_BASE_URL: AI Core production origin, without an API path.
- AI_CORE_API_KEY: same high-entropy value as AI Core's AI_CORE_API_KEY.
- AI_CONTEXT_SIGNING_SECRET: same high-entropy value as AI Core's AI_CONTEXT_SIGNING_SECRET.
- AI_CONTEXT_ISSUER: zion-api by default.
- AI_CONTEXT_AUDIENCE: ai-core by default.
- AI_CORE_SPACE: zion by default.

Configure these on the AI Core project and ensure they match:

- AI_CORE_API_KEY (at least 32 characters).
- AI_CONTEXT_SIGNING_SECRET (at least 32 characters).
- AI_ALLOWED_CONTEXT_ISSUERS includes zion-api.
- AI_CONTEXT_AUDIENCE=ai-core.
- Existing required AI Core settings: DATABASE_URL, AI_GATEWAY_API_KEY, and AI_MODEL.

Do not place secrets in source control, client-side variables, logs, or this document. Rotate secrets if exposed. The model gateway may incur usage charges; confirm its configured plan and limits before enabling production traffic.

## Current limitations / release gate

The provider adapter is not by itself proof that the product feature is live. Before production enablement:

1. Verify that AI Core's current production deployment is healthy and its zion space is registered and active.
2. Verify required server-side environment variables on both Vercel projects without exposing their values.
3. Ensure each call supplies a tenant ID from authenticated ZION context.
4. Run API tests and an authenticated end-to-end request against the production gateway.
5. Verify grounding/source behavior and privacy controls before adding user-facing chat routes or church analytics.

The provider fails closed when configuration or tenant context is absent and does not return a fabricated empty success response.
