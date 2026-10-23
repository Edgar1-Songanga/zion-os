# ZION spiritual AI — AI Core integration

## Integration contract

The ZION API calls the separately deployed MARKA × ZION AI Core. It does not connect the AI Core directly to ZION's database.

- ZION chat endpoint: POST /api/v1/ai/chat
- Request body: organizationId and prompt; optional conversationId.
- Endpoint called by ZION: POST {AI_CORE_BASE_URL}/api/v1/ai/generate
- Space: zion unless AI_CORE_SPACE overrides it
- Operation: CHAT
- Authentication: x-ai-core-key
- Tenant/user context: short-lived HMAC-SHA256 token in x-ai-context-token
- Correlation: x-correlation-id

The chat endpoint requires a valid Supabase bearer token and an active membership in the selected organization. It derives tenant and role context from the authenticated user and membership record; it does not trust role or tenant claims from the request body. AI Core must never connect directly to ZION's database.

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

The endpoint and provider are implemented in source but are not proven production-ready yet. Before production enablement:

1. Verify that AI Core's current production deployment is healthy and its zion space is registered and active.
2. Verify required server-side environment variables on both Vercel projects without exposing their values.
3. Ensure each chat call supplies a tenant ID from the authenticated membership record (the controller enforces this).
4. Run API tests and an authenticated end-to-end request against the production gateway.
5. Verify grounding/source behavior and privacy controls before expanding to church analytics or sensitive pastoral workflows.

The provider fails closed when configuration or tenant context is absent and does not return a fabricated empty success response.
