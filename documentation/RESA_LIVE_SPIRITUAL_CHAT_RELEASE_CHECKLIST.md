# RESA Live, Calls and Meetings — Release Verification

This checklist is the acceptance gate for direct RESA calls, RESA group meetings, RESA Live, ZION Governance meetings and the spiritual Bible question flow. A successful build is not production verification: use authenticated test accounts and real supported devices.

## Live lifecycle and authorization

- [ ] A host creates a live and the media room is provisioned with the matching room name.
- [ ] A host can start a scheduled live and enter the Studio.
- [ ] A non-host sees **Entrar na live** only while the session is live.
- [ ] A non-host cannot join a private live by changing the request URL or ID.
- [ ] A spectator token cannot publish audio, video or screen tracks before the host grants speaker permission.
- [ ] A spectator can leave without changing the session status or disconnecting other people.
- [ ] A non-host receives a denied response when attempting to change live status or moderate a participant.
- [ ] Only the host can end the live; ending deletes the LiveKit room and the database status becomes ended.
- [ ] An ended live cannot be restarted or rejoined.

## Direct RESA audio/video calls

- [ ] Two authenticated users can initiate, receive, accept, decline and end an audio call.
- [ ] Two authenticated users can initiate, receive, accept, decline and end a video call.
- [ ] Call state remains consistent when the initiator cancels before the other user accepts.
- [ ] An unanswered call expires and releases media resources.
- [ ] Camera and microphone controls reflect the actual local device state.
- [ ] Remote audio/video tracks attach, play and detach correctly.
- [ ] Reconnection, device denial and missing media configuration show useful error messages.
- [ ] A user outside the conversation cannot obtain a call token or join the media room.

## Group meetings and rooms

- [ ] A host can create, start, lock, end and moderate a group meeting according to the meeting policy.
- [ ] Participants can join only with valid authorization for that meeting.
- [ ] Host/moderator roles are enforced server-side; a participant cannot elevate their role by changing client state.
- [ ] Host/moderator can grant and revoke presenter permission for an individual participant.
- [ ] A participant whose presenter permission is revoked can no longer publish screen or screen-audio tracks.
- [ ] Leaving or reconnecting does not corrupt the meeting state or other participants' media.

**Current product boundary:** RESA group conversations remain messaging conversations and are separate from the dedicated group-meeting aggregate. A distinct group audio/video meeting flow now exists in the API and web client (meeting lifecycle, invitations, authorized join tokens, participant presence, chat, moderation and presenter roles). Its existence in code does not mean the acceptance checks above have passed in authenticated end-to-end or real-device testing.

## Screen sharing — shared acceptance criteria

- [ ] The presenter explicitly starts screen sharing from a user gesture; no screen capture starts automatically.
- [ ] The native browser/device picker is shown and the user can cancel without breaking the call, meeting or live.
- [ ] The presenter can stop sharing using the in-product control.
- [ ] Closing the browser's native share picker or stopping the shared track ends sharing and updates UI state.
- [ ] Remote participants see the shared screen in a distinct presentation surface, with presenter identity, not mistaken for the presenter's camera.
- [ ] Camera and screen tracks can coexist; layout changes do not replace or detach the wrong track.
- [ ] Track-ended, permission-denied, publication-failure, disconnect and reconnect paths clean up tracks and stale state.
- [ ] Only authenticated participants with a valid, server-authorized room token can receive the room's shared tracks.
- [ ] Shared-tab/system audio is requested only where the browser/device supports it and the user explicitly selects/allows it. Do not promise system audio capture on every platform.
- [ ] Screen sharing does not create a recording or persistent copy. Any future recording must be separately disclosed and consented to.
- [ ] Screen sharing adapts to low bandwidth; verify readable text and acceptable CPU/battery usage.

## Screen sharing — surface-specific role policy and checks

### Direct one-to-one RESA calls
- [ ] An eligible call participant can start/stop sharing during an audio call as well as a video call.
- [ ] The other participant sees the shared screen and can distinguish it from camera video.
- [ ] Ending the call always stops and unpublishes screen and screen-audio tracks.

### RESA group meetings
- [ ] Host and moderators can share according to meeting policy.
- [ ] Other participants can share only after explicit presenter permission.
- [ ] Host/moderator can revoke presenter permission; the participant's screen tracks stop being published.
- [ ] Remote screen tracks are rendered for all authorized participants and detached on stop/leave.

### RESA Live Studio
- [ ] Host can share screen.
- [ ] Participants promoted to speakers can share only when speaker permissions explicitly allow it.
- [ ] Spectators cannot publish screen or screen-audio tracks.
- [ ] Host/moderator controls and participant removal behave consistently while a screen is being shared.
- [ ] Screen content appears as a presentation stage/source and does not silently replace the host's camera feed.

### ZION Governance meetings
- [ ] The existing LiveKit meeting session starts and stops screen sharing.
- [ ] Remote screen tracks are rendered and detached correctly.
- [ ] Existing media-broadcast tracks (for example, a shared media player) are not misidentified as a user's screen share.
- [ ] Meeting role policy governs who may share and who may revoke sharing.

## Browser and device compatibility

- [ ] Supported desktop browsers are tested over HTTPS with the browser's native screen-capture picker.
- [ ] Unsupported browsers receive a clear message and can continue the audio/video call or meeting without screen sharing.
- [ ] Android browser/PWA support is verified on real devices and named browser versions before being advertised.
- [ ] iOS browser support is verified on real devices and named browser versions before being advertised.
- [ ] Do not infer mobile support from the existence of `navigator.mediaDevices.getDisplayMedia`; capability, browser policy, user gesture, OS restrictions and audio capture support differ.
- [ ] Where browser capture is unavailable, provide a practical fallback (join from a supported desktop browser); native Android capture would require a separately implemented Android MediaProjection path.

## Spiritual chat and Scripture

- [ ] The question “O que diz a Bíblia sobre o sábado?” returns the Sabbath knowledge item.
- [ ] Variants with accents omitted and natural wording still match the Sabbath topic.
- [ ] The response identifies its Adventist interpretive framing and lists the supporting references.
- [ ] The UI attempts to retrieve the cited passages from the configured Bible API and shows a clear fallback if the provider is unavailable.
- [ ] Unsupported questions do not invent verse quotations or claim that AI generated the answer.
- [ ] Empty submissions are ignored and loading states prevent duplicate requests.

## Known scope and release requirements

- Live chat messages are persisted through the authenticated API and loaded from history on entry; LiveKit data-channel packets provide real-time delivery. The API HTTP E2E suite covers the live-message history endpoint. Reconnect and two-account production verification remain part of the release gate.
- Hand-raise requests are still maintained in Studio memory and broadcast through the LiveKit data channel; they are not yet a durable moderation queue. This is an outstanding persistence item.
- Direct-call screen sharing was implemented in PR #178 and is included in the production code path. Direct-call media credentials are issued only to active conversation members; the API explicitly scopes publishing to camera, microphone, screen video and screen audio. RESA Live spectators remain subscribe-only; approved speakers and authorized hosts/moderators receive role-scoped publishing grants. Authenticated two-account tests and real-device verification remain outstanding.
- RESA group meetings, RESA Live Studio and ZION Governance meetings have screen-sharing paths in the codebase. Their full role, remote-rendering, revocation, reconnect and device acceptance checks remain unverified.
- The ZION↔RESA canonical institutional publishing bridge is a separate workstream tracked in issue #175.
- Automated end-to-end browser tests, role-based tests, two-account authenticated tests and real-device compatibility checks must be run before calling these flows fully production-verified.
- The Bible assistant uses deterministic knowledge matching plus the Bible API for cited passages. A generative AI provider is not wired into this component yet; the interface must not imply otherwise.
