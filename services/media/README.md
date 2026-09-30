# ZION Media Infrastructure

The ZION API owns meeting identity, authorization, governance, room lifecycle, and token issuance. The media server is an infrastructure component behind the ZION Media Adapter.

## Production topology

Browser -> HTTPS/WSS -> LiveKit SFU -> WebRTC media
                         \
                          -> embedded TURN

LiveKit is not exposed as the application's authorization layer. The browser receives a short-lived token from the authenticated ZION API only after Governance authorization succeeds.

## Required infrastructure

1. Linux VM with a public IPv4 address.
2. DNS record for the media endpoint, for example `media.zion.example`.
3. DNS record for TURN, for example `turn.zion.example`.
4. Trusted TLS certificates.
5. Firewall rules for HTTPS/TURN and the WebRTC UDP/TCP ranges.
6. Redis for a production LiveKit deployment.

The official LiveKit deployment guidance documents TLS, TURN, firewall ports, public IP handling and production VM deployment. See the LiveKit self-hosting documentation before exposing the server.

## ZION API environment

Set on the API server only:

- `ZION_LIVEKIT_URL=wss://media.zion.example`
- `ZION_LIVEKIT_API_KEY=<server key>`
- `ZION_LIVEKIT_API_SECRET=<server secret>`

Never put the API secret in the web application.

## Browser flow

1. Authenticated user opens a ZION meeting.
2. ZION Governance verifies participant status and room state.
3. ZION API mints a short-lived LiveKit token.
4. Browser connects to the media endpoint.
5. Governance remains the source of truth for participant permissions and moderation.
