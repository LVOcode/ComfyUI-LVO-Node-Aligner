// SPDX-License-Identifier: GPL-3.0-only
// LVOcode modifications, 2026; upstream attribution: THIRD_PARTY_NOTICES.md.
// Standalone packaging modified 2026-09-25.
// LVO Node Aligner, GPL-3.0. Collapsed geometry adapted from
// ComfyUI-Pixaroma (c) 2026 pixaroma, MIT; see bundled licenses.
export function bounds(node) {
    const lg = globalThis.LiteGraph;
    const title = node.flags?.no_title ? 0 : (lg?.NODE_TITLE_HEIGHT || 30);
    if (node.flags?.collapsed) {
        const h = lg?.NODE_TITLE_HEIGHT || 30;
        return { x: node.pos[0], y: node.pos[1] - h,
            w: node._collapsed_width || lg?.NODE_COLLAPSED_WIDTH || 80, h };
    }
    return { x: node.pos[0], y: node.pos[1] - title, w: node.size[0], h: node.size[1] + title };
}
export function move(node, dx, dy) {
    // Use the public setter as well as a new array for reactive renderers.
    node.pos = [node.pos[0] + dx, node.pos[1] + dy];
}

// Divide the existing outer span into equally sized nodes and exact gaps.
// Keep the perpendicular positions/sizes and never resize collapsed previews.
export function fillSpace(nodes, axis, gap) {
    if (nodes.length < 2) return 'Select at least two nodes.';
    if (nodes.some(n => n.flags?.collapsed)) return 'Expand the selected nodes first.';
    const key = axis === 0 ? 'x' : 'y', span = axis === 0 ? 'w' : 'h';
    const items = nodes.map(n => ({n, r:bounds(n), pos:Array.from(n.pos), size:Array.from(n.size)}))
        .sort((a,b) => a.r[key]-b.r[key]);
    const start = Math.min(...items.map(i => i.r[key]));
    const end = Math.max(...items.map(i => i.r[key]+i.r[span]));
    const extra = items.map(i => i.r[span]-i.size[axis]);
    const target = (end-start-gap*(items.length-1)-extra.reduce((a,b)=>a+b,0))/items.length;
    if (!Number.isFinite(target) || target <= 0 || items.some(i => {
        const minimum = i.n.computeSize?.();
        return target < (Number(minimum?.[axis]) || 1);
    })) return 'Not enough space for equal sizes and this Gap. Move nodes further apart or reduce Gap.';
    try {
        for (const i of items) {
            const size = [...i.size];size[axis] = target;
            if (i.n.setSize) i.n.setSize(size);else i.n.size = size;
        }
        // Custom nodes may enforce a larger minimum in their resize hook.
        if (items.some(i => Math.abs(i.n.size[axis]-target)>0.01)) throw new Error('Minimum size');
        let cursor = start;
        for (const i of items) {
            i.n.pos = [...i.pos];
            i.n.pos[axis] = cursor + i.pos[axis]-i.r[key];
            cursor += bounds(i.n)[span]+gap;
        }
        return '';
    } catch {
        for (const i of items) {
            if (i.n.setSize) i.n.setSize([...i.size]);else i.n.size = [...i.size];
            i.n.pos = [...i.pos];
        }
        return 'A selected node cannot use this size. Move nodes further apart.';
    }
}
export function union(rects) {
    const x = Math.min(...rects.map(r => r.x)), y = Math.min(...rects.map(r => r.y));
    return { x, y, w: Math.max(...rects.map(r => r.x + r.w)) - x,
        h: Math.max(...rects.map(r => r.y + r.h)) - y };
}
export function arrange(nodes, action, gap, reference = null) {
    if (nodes.length < 2) return;
    if (action === 'row' || action === 'column') {
        const horizontal = action === 'row';
        const key = horizontal ? 'x' : 'y';
        const sorted = nodes.map(n => ({n, r: bounds(n)})).sort((a,b) => a.r[key]-b.r[key]);
        const anchorIndex = Math.max(0, sorted.findIndex(item => item.n === reference));
        const anchor = sorted[anchorIndex].r;
        let cursor = anchor[key];
        for (let i = 0; i < anchorIndex; i++) cursor -= (horizontal ? sorted[i].r.w : sorted[i].r.h) + gap;
        for (const {n,r} of sorted) {
            if (n !== reference) move(n, (horizontal ? cursor : anchor.x)-r.x, (horizontal ? anchor.y : cursor)-r.y);
            cursor += (horizontal ? r.w : r.h) + gap;
        }
        return;
    }
    const box = reference && nodes.includes(reference) ? bounds(reference) : union(nodes.map(bounds));
    for (const n of nodes) {
        if (n === reference) continue;
        const r = bounds(n);
        const delta = {
            left: [box.x-r.x,0], right: [box.x+box.w-r.x-r.w,0],
            top: [0,box.y-r.y], bottom: [0,box.y+box.h-r.y-r.h],
            centerX: [box.x+box.w/2-r.x-r.w/2,0],
            centerY: [0,box.y+box.h/2-r.y-r.h/2],
        }[action];
        if (delta) move(n,...delta);
    }
}
// The gap is in graph units, while attraction radius is converted from screen px.
export function snap(rect, targets, gap, tolerance) {
    let dx = 0, dy = 0, bestX = tolerance + 1e-6, bestY = tolerance + 1e-6;
    const separation = (a, sizeA, b, sizeB) => Math.max(a-b-sizeB,b-a-sizeA,0);
    for (const t of targets) {
        if (separation(rect.y,rect.h,t.y,t.h) <= gap + tolerance) {
            for (const x of [t.x-rect.w-gap,t.x+t.w+gap,t.x,t.x+t.w-rect.w,t.x+t.w/2-rect.w/2]) {
                const d = x-rect.x;
                if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx = d; }
            }
        }
        if (separation(rect.x,rect.w,t.x,t.w) <= gap + tolerance) {
            for (const y of [t.y-rect.h-gap,t.y+t.h+gap,t.y,t.y+t.h-rect.h,t.y+t.h/2-rect.h/2]) {
                const d = y-rect.y;
                if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy = d; }
            }
        }
    }
    return {dx,dy};
}

// Resize only the grabbed edges; opposite edges stay anchored.
export function snapResize(rect, targets, gap, tolerance, edges, minimum=[1,1]) {
    const out={...rect};
    for(const [axis,side,other,span,min] of [['x','left','y','h',minimum[0]],['y','top','x','w',minimum[1]]]) {
        const far=axis==='x'?'right':'bottom', size=axis==='x'?'w':'h';
        const near=!!edges[side];
        if(!near&&!edges[far])continue;
        const edge=near?rect[axis]:rect[axis]+rect[size];
        const fixed=near?rect[axis]+rect[size]:rect[axis];
        let best=tolerance+1e-6, chosen=edge;
        for(const t of targets) {
            if(Math.max(rect[other]-t[other]-t[span],t[other]-rect[other]-rect[span],0)>gap+tolerance)continue;
            const values=[near?t[axis]+t[size]+gap:t[axis]-gap,t[axis],t[axis]+t[size]];
            for(const v of values) {
                if((near?fixed-v:v-fixed)<min)continue;
                if(Math.abs(v-edge)<best){best=Math.abs(v-edge);chosen=v;}
            }
        }
        out[axis]=near?Math.min(chosen,fixed-min):fixed;
        out[size]=Math.max(min,near?fixed-chosen:chosen-fixed);
    }
    return out;
}
