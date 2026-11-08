# RESA Live, Calls and Spiritual Chat — Release Verification

This checklist is the acceptance gate for RESA Live, direct audio/video calls, screen sharing and the spiritual Bible question flow. A successful build is not production verification: use authenticated test accounts and real supported devices.

## Live lifecycle and authorization

- [ ] A host creates a live and the media room is provisioned with the matching room name.
- [ ] A host can start a scheduled live and enter the Studio.
- [ ] A non-host sees **Entrar na live** only while the session is live.
- [ ] A non-host cannot join a private live by changing the request URL or ID.
- [ ] A spectator token cannot publish audio or video before the host grants permission.
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

## Screen sharing — shared acceptance criteria

- [ ] The presenter explicitly starts screen sharing from a user gesture; no screen capture starts automatically.
- [ ] The native browser/device picker is shown and the user can cancel without breaking the call.
- [ ] The presenter can stop sharing using the RESA control.
- [ ] Closing the browser's native share picker or stopping the shared track ends sharing and updates UI state.
- [ ] Remote participants see the shared screen in a distinct presentation surface, not mistaken for the presenter's camera.
- [ ] Camera and screen tracks can coexist; layout changes do not replace or detach the wrong track.
- [ ] Track-ended, permission-denied, publication-failure, disconnect and reconnect paths clean up tracks and stale state.
- [ ] Only authenticated participants with a valid, server-authorized room token can receive the room's shared tracks.
- [ ] Shared-tab/system audio is requested only where the browser/device supports it and the user explicitly selects/allows it. Do not promise system audio capture on every platform.
- [ ] Screen sharing does not create a recording or persistent copy. Any future recording must be separately disclosed and consented to.
- [ ] Screen sharing adapts to low bandwidth; verify readable text and acceptable CPU/battery usage.

## Screen sharing — surface-specific checks

### RESA Live Studio
- [ ] Host and participants with explicit speaker permission can share according to the live's role policy.
- [ ] Spectators without publish permission cannot publish screen tracks.
- [ ] Host/moderator controls and participant removal behave consistently while a screen is being shared.

### ZION Governance meetings
- [ ] The existing LiveKit meeting session starts and stops screen sharing.
- [ ] Remote screen tracks are rendered and detached correctly.
- [ ] Existing media-broadcast tracks (for example, a shared media player) are not misidentified as a user's screen share.

### Direct one-to-one RESA calls
- [ ] A participant can start/stop sharing during an audio call as well as a video call.
- [ ] The other participant sees the shared screen and can distinguish it from camera video.
- [ ] Ending the call always stops and unpublishes screen and screen-audio tracks.

## Browser and device compatibility

- [ ] Supported desktop browsers are tested over HTTPS with the browser's native screen-capture picker.
- [ ] Unsupported browsers receive a clear message and can continue the audio/video call without screen sharing.
- [ ] Android browser/PWA support is verified on real devices and named browser versions before being advertised.
- [ ] iOS browser support is verified on real devices and named browser versions before being advertised.
- [ ] Do not infer mobile support from the existence of `navigator.mediaDevices.getDisplayMedia`; capability, browser policy, user gesture, OS restrictions and audio capture support differ.
- [ ] Where browser screen capture is unavailable, provide a practical fallback (join from a supported desktop browser); native Android screen capture would require a separately implemented Android MediaProjection path.

## Spiritual chat and Scripture

- [ ] The question “O que diz a Bíblia sobre o sábado?” returns the Sabbath knowledge item.
- [ ] Variants with accents omitted and natural wording still match the Sabbath topic.
- [ ] The response identifies its Adventist interpretive framing and lists the supporting references.
- [ ] The UI attempts to retrieve the cited passages from the configured Bible API and shows a clear fallback if the provider is unavailable.
- [ ] Unsupported questions do not invent verse quotations or claim that AI generated the answer.
- [ ] Empty submissions are ignored and loading states prevent duplicate requests.

## Known scope and release requirements

- Live chat and hand-raise packets use the LiveKit data channel in this implementation. Chat history is not persisted across sessions/reloads.
- Speaker requests are in-memory in each Studio; they are not a durable moderation queue.
- Existing screen-sharing implementation is present in RESA Live Studio and ZION Governance meetings. The inspected direct-call component currently lacks a screen-share control/track flow; issue #176 tracks that gap.
- The ZION↔RESA canonical institutional publishing bridge is a separate workstream tracked in issue #175.
- Automated end-to-end browser tests and a two-account authenticated live/call test must be run before calling these flows fully production-verified.
- The Bible assistant uses deterministic knowledge matching plus the Bible API for cited passages. A generative AI provider is not wired into this component yet; the interface must not imply otherwise.
