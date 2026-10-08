# Task 010 — containment chamber prototype

## Scope and isolation

`/universe/experimental/chamber` is a direct-link, noindex owner-review prototype. It is not linked from the homepage, global menu, facility directory or public Experimental Wing. No production configuration changes. This is route isolation, not authentication: anyone with access to a future preview URL can open its deep link. Review before publishing. The existing archive remains the public experience.

## Engine decision

Plain Three.js 0.186.1 (MIT), dynamically imported on explicit entry, with development-only @types/three 0.186.0. React Three Fiber was evaluated; it adds a reconciler layer and dependencies that this one imperative room does not need. React owns accessible DOM and story state; Three owns geometry/camera/rendering. No physics engine, model loader, game engine, postprocessing, particle system or model installation.

Primary references: [Three renderer](https://threejs.org/docs/pages/WebGLRenderer.html), [instancing](https://threejs.org/docs/pages/InstancedMesh.html), [R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation), [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API). WebGL 2 is required for the scene. The complete DOM terminal works without WebGL; native evidence also exposes the full story without JavaScript.

## Original asset provenance

All room, deck, wall, ceiling, console, observation glass, containment chassis, bolts and lights are procedural geometry authored for this task in `apps/web/src/lib/chamber-scene.ts`. The sealed object is an original 3D interpretation of the established industrial visual language, not a reconstruction or exact geometric match to the earlier 2D artwork. No revealed character is inside it. No proprietary or third-party models/textures were imported. The original smile/labels/contact shade are small runtime canvas textures, not upscaled concept crops. Source code is the reproducible master; no external image/model requests. Three.js's MIT license is distributed in its package and recorded in the lockfile; third-party type dependency licenses remain in their packages.

## Playable sequence

The observer spawns at x=0,z=5.5, eye height 1.65m, facing the room. WASD moves at 2.8m/s; arrow keys or drag look, optional pointer lock. A radius of 0.3m, four room boundaries and expanded axis-aligned specimen/console obstacles contain movement. Steps are capped at 50ms, normalized diagonals and sliding independent axes prevent speed boosts and tunnelling. No jumping, stairs, physics or camera bob.

Approach the console at x=-3.3,z=0.4 within 2.1m. E or the accessible Run button starts a 1.4-second local fictional assessment: $100 becomes $0.37, loans $48,000, confidence 100%; steady red containment lighting and the conclusion “EXPERIMENT SUCCESSFUL. SUBJECT REMAINS TECHNICALLY ALIVE.” Replay runs again; experiment reset restores the initial balance/alarm; position reset restores the spawn/camera. All amounts are fictional laboratory credits and story IDs are not tokens. There are no financial requests or backend.

## Controls, lifetime and accessibility

The scene opens in a native full-screen dialog. Its background is inert; Exit restores entry focus. Escape releases pointer lock and pauses; it does not trap the user in pointer lock. Tab accesses ordinary DOM controls. Touch uses a movement pad plus independent view drag. Pointer cancellation, focus loss, visibility changes and pause clear movement. Pause cancels the render loop and aborts an unfinished assessment back to READY; explicit resume restarts observation. Exit/unmount cancels frames and removes listeners, disconnects resizing and disposes all materials, geometries, textures and renderer.

The non-3D terminal offers the same activate/result/replay/reset interaction, with polite readable status and no movement/proximity barrier. Without JavaScript a native disclosure gives the complete story. No audio, flickering lights or animated alarm. Reduced motion removes decorative transitions; deliberate movement remains user-controlled. Screen-reader and physical-device acceptance must be reported separately from desktop emulation.

Context loss prevents further rendering and pauses safely. Context restoration does not automatically resume. Users can exit to the text alternative or explicitly resume after recovery. Unsupported WebGL offers a readable failure with the alternative. No automatic reload or retry.

## Performance and verification

Instanced floor plates and bolts, low-segment chassis, shared materials, no realtime shadow maps/particles/postprocessing. Pixel ratio starts at <=1.5; drawing-buffer budget is approximately 1.8 million pixels, with a 0.75 floor. Three consecutive <25fps samples reduce ratio by 0.25. Geometry and draw-call counts, sampled FPS and first-scene-load time are available in optional prototype diagnostics. These are local diagnostic counts, not exact GPU byte usage. No remote telemetry.

Historical Legion resource check for this task: 0.434 GiB available RAM, 61.06 GiB free C:, i7-11800H and RTX 3050 Laptop 4096 MiB / driver 591.59. No local builds, browsers, GPU inference, process termination or Windows changes. Locked installation/builds/actual browser acceptance run in disposable CI. Software-rendered CI FPS is not RTX or physical iPhone performance. Browser memory APIs, if available, are estimates rather than isolated scene allocations.

Acceptance includes both installed browsers and six widths, first-person movement, mouse/keyboard/touch camera, room/specimen/console collision, proximity, sequence, alarm, replay/reset, pointer lock release, context loss/recovery, reduced motion, complete text/no-JS alternatives, history, route isolation, console/network/overflow and screenshots. Existing full website acceptance remains in CI. Exact-head evidence carries commit identity and screenshot digests.

## Unchanged boundaries

No wallet, OAuth, user accounts, database, mint, blockchain calls, rewards, external game engine, tracking, audio, final specimen identity, Netlify changes, deployment or RMT changes. No crowns/signage; collection supply remains 5280. Existing developer-tool audit advisories are recorded in delivery; unrelated toolchain replacement is outside this prototype.
