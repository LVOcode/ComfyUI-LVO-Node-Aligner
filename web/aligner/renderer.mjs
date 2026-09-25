// SPDX-License-Identifier: MIT
// Derived from ComfyUI-Pixaroma, copyright (c) 2026 pixaroma.
// Extracted from the LVOcode nodes2 helper on 2026-09-25.
// Full permission notice: licenses/MIT-Pixaroma.txt.
export function isVueNodes() {
    return !!window.LiteGraph?.vueNodesMode;
}
