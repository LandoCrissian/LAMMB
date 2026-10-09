# Chamber entry artwork — Task 011B

PR #14 preserves its existing public Universe entry and the chamber's gameplay.
Two original cinematic plates appear behind Observer Access and Quick Orientation.
The landscape recommendation appears directly above Enter 3D chamber and is
associated with the button for assistive technology. Rotation remains optional.

## Generation and preservation

Both plates were generated independently through built-in Codex
`image_gen.imagegen`, using written briefs only, with no reference images,
recoloring, existing-image crops or local GPU inference. Exact prompts,
generation identifiers, native dimensions and SHA256 digests are recorded in
`apps/web/public/art/chamber-entry/provenance.json`. The tool does not expose its
underlying model version, seed or deterministic replay settings.

Untouched 1672×941 PNG masters are committed under
`docs/art-source/chamber-entry/`, outside public website assets and approved
collection artwork. They remain pending owner art review. These are scenic
illustrations, not exact renderings of the playable chamber geometry.

## Included usage

The [official pricing documentation](https://learn.chatgpt.com/docs/pricing)
states that built-in image generation consumes the general included Codex
allowance. Before both calls, the account reported ordinary usage available,
34% consumed (66% remaining) and zero purchased-credit balance. The same
readout was available after generation; percentages are rounded and do not
measure exact per-image consumption. No paid API, API key, credit purchase,
subscription purchase or external GPU service was used.

## Delivery and fallbacks

Existing Sharp 0.35.5 downsamples the masters to 1440×810 WebP at quality 84,
effort 5. It never enlarges or overwrites the PNG sources. Both WebPs together
are 236602 bytes; Next Image supplies responsive delivery. Run
`node scripts/prepare-chamber-entry-art.mjs` to reproduce encoding from the
preserved masters; generation itself cannot be deterministically replayed.

Decorative imagery has empty alt text and an aria-hidden wrapper. Dark
overlays keep foreground text readable. Solid panel backgrounds remain when
images fail, and failed images are hidden after hydration. The in-room Controls
guide stays compact and contains no scene image. Artwork has no motion.

## Verification

The integrity test decodes both native masters and WebPs and validates hashes,
dimensions, distinct sources and downsampling boundaries.
`scripts/verify-public-preview-browser.mjs` checks six widths (320, 390, 768,
1024, 1440, 1920), 844×390 and 667×320 touch landscapes, keyboard focus,
reduced motion, image decoding, MIME types, orientation-message placement,
conservative text-contrast bounds, missing-image fallback and overflow.
Existing full chamber acceptance verifies gameplay and portrait fallback.
Run these through the existing Windows CI, which tests installed Chrome and
Edge on the exact PR head. Physical iPhone/Safari acceptance requires an
actual device and is not implied by Chromium touch emulation.
