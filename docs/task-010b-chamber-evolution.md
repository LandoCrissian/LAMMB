# Task 010B — Chamber evolution

Baseline: `723807c813270c193c95ae12afbfced3ef952d26`. Owner-review prototype at `/universe/experimental/chamber`, excluded from public navigation and search indexing. Direct-link isolation is not authentication. No production deployment or Netlify configuration change.

## Input diagnosis and fix

The original canvas blur handler cleared the movement axis when focus moved between touch controls. The canvas also stored one camera drag, replaced it on any pointerdown, and cleared it on any pointerup/cancel/lost capture. The movement pad accepted multiple captures and cleared movement on unrelated pointer endings. These are reproducible code-level hazards consistent with the owner's feedback; physical iPhone Safari causation has not been verified.

Movement now has a single owned pointer ID. Camera drag has an independent ID, rejects replacement, and only accepts touch starting on the right 55% of the canvas. Each control releases only its own pointer. Keyboard blur clears held keys without clearing the other thumb. Cancellation, window blur, hidden documents, resize/orientation, pause, reset, exit and mode entry flush the relevant inputs. Render scheduling owns one RAF and resets elapsed frame time on resume. Movement uses bounded exponential acceleration/deceleration; adjustable look sensitivity defaults to 0.003 radians per pixel. Browser gestures are suppressed only on gameplay/inspection surfaces, not the document or atlas.

Landscape uses compact pause/exit, movement pad, camera/perspective tools and proximity actions. The research result appears only in range or after the test. Portrait offers a rotate recommendation and a usable voluntary fallback. No orientation lock. Dynamic viewport height and safe-area insets are respected.

## Camera and interaction states

First and third person share the observer position, yaw, pitch and experiment state. The temporary observer is an original procedural protective suit with an opaque visor, not a LAMMB NFT character. Third-person follow uses exponential smoothing and a swept conservative camera sphere against room/furniture bounds, including the World terminal. The avatar hides when the boom collapses near an obstruction rather than clipping through the camera.

The selected look sensitivity is retained for the page session, including explicit exit/re-entry and fresh renderer recovery after context loss. Browser acceptance changes the actual slider with keyboard input and checks the resulting mouse-look angle after re-entry.

The actual sealed 3D specimen floats over a fixed illuminated platform. Inspection freezes movement and orbits the same geometry; drag, genuine two-pointer pinch, wheel and explicit keyboard-accessible rotate/zoom/reset buttons are available. Previous camera transform, player position and perspective are retained. A native nested modal makes the HUD and underlying site inert and traps focus; Escape closes the inspection first and restores the trigger. No invented NFT geometry claims.

The right-hand console opens the existing `WorldAtlas` lazily. One component, one country asset (`/maps/countries-v1.json`), one collection configuration. Embedded mode keeps country/filter selection local instead of mutating the chamber fragment/history. Standalone `/world` retains deep links and history. Country search/list, real polygons, pan/zoom/pinch, keyboard navigation, filters and detail sheet are reused. Registry remains not live. Closing restores position, camera, controls and trigger focus. Background focus loss still requires explicit resume. Standalone `/world` is a semantic fallback link.

## Lighting, performance and provenance

Brighter hemisphere fill, one static directional practical light, one overhead spotlight and existing accent lights. No realtime shadows, audio, flashing, external textures, GLB downloads or new dependencies. Original procedural geometry/canvas textures extend Task 010 provenance; Three.js remains under its existing MIT license. The container remains sealed. Hover is disabled by reduced motion; alarm illumination is steady.

Three.js loads only after explicit entry. Atlas loads only after opening its terminal. Shared geometries, instanced tiles/bolts, bounded frame delta and adaptive render pixel ratio remain. Context loss safely suspends and disposes; explicit exit/re-entry creates a fresh canvas. Home, Archive, Vault, atlas, collection rules and launch states remain protected.

Targets of 30 FPS mobile and 60 FPS capable desktop require representative hardware testing. Disposable Windows CI uses installed Edge/Chrome with ANGLE SwiftShader, not an iPhone or Legion GPU. FPS, first scene load, draw calls, triangles, browser JS heap and public-route before/after transfer/LCP/CLS samples are laboratory evidence only; heap is not GPU memory. No field INP data. No physical iPhone acceptance claim.

## Acceptance evidence

The CI runner records the exact head and SHA-256/dimensions of screenshots under `artifacts/generated/task-010b/acceptance`. Six requested widths include portrait and landscape, simultaneous CDP touch events, independent release/cancel, resize, both perspectives, camera collision, orbit/wheel/pinch/reset/close, shared atlas interaction/history/focus, pause/resume/Escape, context-loss recovery, reduced motion, no-JavaScript story, route isolation and public-site regression checks. Public Home/Universe measurements compare against the authorized baseline in the same runner. Final pass results and limitations are recorded in the draft PR after acceptance, not inferred from source inspection.

No wallet, OAuth, mint, database, registry submission, geolocation, accounts, telemetry, blockchain calls or RMT changes.
