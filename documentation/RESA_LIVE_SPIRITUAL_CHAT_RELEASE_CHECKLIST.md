# RESA Live and Spiritual Chat — Release Verification

This checklist is the acceptance gate for the Live Studio and spiritual Bible question flow.

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

## Audio, video and participation

- [ ] Host camera preview is visible locally.
- [ ] Remote video tracks attach and detach correctly.
- [ ] Remote audio tracks attach and play after browser audio permission is granted.
- [ ] Microphone and camera controls reflect actual device state.
- [ ] Screen sharing starts and stops on supported desktop browsers.
- [ ] Spectator chat messages and raised-hand events are visible to connected participants in real time.
- [ ] Host approval grants publishing permission to the selected participant only.
- [ ] Host can revoke publishing permission and remove a participant.
- [ ] Reconnection, device denial and missing media configuration show useful error messages.

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
- Automated end-to-end browser tests and a two-account authenticated live test must be run before calling this flow fully production-verified.
- The Bible assistant uses deterministic knowledge matching plus the Bible API for cited passages. A generative AI provider is not wired into this component yet; the interface must not imply otherwise.
