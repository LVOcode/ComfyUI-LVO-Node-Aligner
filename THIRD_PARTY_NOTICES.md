# Third-party notices

## Tenney95 — ComfyUI-NodeAligner

- Upstream: https://github.com/Tenney95/ComfyUI-NodeAligner
- Supplied source: `ComfyUI-NodeAligner/node_info.js` and `LICENSE`.
- License: GNU General Public License, version 3. Full text in the root `LICENSE`.
- Used for the toolbar foundation and SVG icons retained in `web/aligner/icons.mjs`.
- The supplied JavaScript does not include a separate copyright-year notice;
  this package credits the upstream project without inventing one.

LVOcode modifications include rewritten layout and snap geometry, exact-gap
arrangement, reference anchoring, pinned/collapsed behavior, Fill actions,
selection/manual visibility, saved position and English help. The adapted
component and these modifications are distributed under GPL-3.0-only.

## Pixaroma — ComfyUI-Pixaroma

- Upstream: https://github.com/pixaroma/ComfyUI-Pixaroma
- Copyright (c) 2026 pixaroma.
- License: MIT. The complete copyright and permission notice is retained in
  `licenses/MIT-Pixaroma.txt` and applies to Pixaroma-derived portions.
- Source: `js/align/index.js` (pointer-event approach and collapsed-node bounds)
  and `js/shared/nodes2.mjs` (renderer detection).
- Affected files: `web/aligner/index.js`, `geometry.mjs`, and `renderer.mjs`.

The renderer helper was extracted without unrelated shared utilities. Upstream
notices are retained; distributing the combined work under GPL does not erase
the MIT license on the original portions.

## LVOcode changes

LVOcode modifications and standalone packaging, 2026.
Standalone extraction date: **2026-09-25**.

The files were extracted from the user's supplied ComfyUI-LVOcode package.
The standalone version changes the renderer-helper import and adds package
registration, English documentation and license/provenance files. The original
ComfyUI-LVOcode package is not modified by this extraction.

`licenses/SOURCE_HASHES.json` records SHA-256 hashes of supplied upstream source
files for traceability. These are file hashes, not asserted upstream commit IDs.

Thanks to both upstream projects. Attribution does not imply endorsement.
