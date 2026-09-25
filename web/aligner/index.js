// SPDX-License-Identifier: GPL-3.0-only
// LVOcode modifications, 2026; upstream attribution: THIRD_PARTY_NOTICES.md.
// Standalone packaging modified 2026-09-25.
// LVO Node Aligner: adapted ComfyUI-NodeAligner toolbar (GPL-3.0).
// Pointer hook approach and collapsed geometry: Pixaroma (MIT).
import { app } from '/scripts/app.js';
import { openAlignerHelp } from './help.mjs?v=aligner-reference-row-3';
import * as icons from './icons.mjs?v=lvo-fill-space-1';
import { bounds, union, arrange, snap, snapResize, fillSpace } from './geometry.mjs?v=lvo-reference-row-3';
import { isVueNodes } from './renderer.mjs';

const KEY = 'LVOcode.NodeAligner';
const config = { gap: 20, enabled: false, radius: 8 };
try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const k of ['gap','radius']) if (Number.isFinite(saved[k])) config[k] = Math.max(k==='gap'?0:1,Math.min(1000,saved[k]));
    config.enabled = saved.enabled === true;
    if (Number.isFinite(saved.position?.x) && Number.isFinite(saved.position?.y))
        config.position = {x:saved.position.x,y:saved.position.y};
} catch { /* Defaults on unavailable or corrupted browser storage. */ }
const save = () => { try {localStorage.setItem(KEY,JSON.stringify(config));} catch {} };
const canvas = () => app.canvas;
const graph = () => canvas()?.graph || app.graph;
const selected = (includePinned = false) => Object.values(canvas()?.selected_nodes || {}).filter(n => n.pos && n.size && (includePinned || !n.flags?.pinned));
const redraw = () => {canvas()?.setDirty?.(true,true);graph()?.setDirtyCanvas?.(true,true);};
let panel, toolbarButton, drag, frame = 0, pendingMove = null, releasing = false;
let selectionGraph, selectionNodes = [], manuallyOpened = false;
let referenceNode = null, referenceSelect, referenceOptions = [];
function updateReference(nodes) {
    if (graph() !== selectionGraph || !nodes.includes(referenceNode)) referenceNode = null;
    if (!referenceSelect) return;
    referenceOptions = nodes;
    referenceSelect.replaceChildren(new Option('Selection bounds (default)', ''));
    nodes.forEach((node,index) => referenceSelect.add(new Option(
        `${node.title || node.comfyClass || node.type || 'Node'} · #${node.id}`, String(index))));
    referenceSelect.value = referenceNode ? String(nodes.indexOf(referenceNode)) : '';
}
function positionPanel() {
    if (!panel || panel.hidden) return;
    const rect = panel.getBoundingClientRect();
    const desired = config.position || {x:96,y:innerHeight-rect.height-24};
    panel.style.left = Math.max(0,Math.min(innerWidth-rect.width,desired.x))+'px';
    panel.style.top = Math.max(0,Math.min(innerHeight-rect.height,desired.y))+'px';
    panel.style.bottom = 'auto';
}
function syncToolbar() {
    if (!toolbarButton) return;
    const visible = !!panel && !panel.hidden;
    toolbarButton.setAttribute('aria-pressed', String(visible));
    toolbarButton.setAttribute('aria-expanded', String(visible));
    toolbarButton.style.background = visible ? '#78b800' : '#2a2c2e';
}
function showPanel(visible) {
    if (visible && !panel) mount();
    if (panel) panel.hidden = !visible;
    if (visible) positionPanel();
    syncToolbar();
}
function syncSelection() {
    const currentGraph = graph();
    const nodes = selected(true);
    if (currentGraph === selectionGraph && nodes.length === selectionNodes.length &&
        nodes.every(n => selectionNodes.includes(n))) return;
    updateReference(nodes);
    selectionGraph = currentGraph;
    selectionNodes = nodes;
    showPanel(manuallyOpened || nodes.length >= 2);
}
function mountToolbarButton() {
    if (toolbarButton?.isConnected) return;
    const anchor = app.menu?.settingsGroup?.element;
    if (!anchor?.isConnected) return;
    const group = document.createElement('div');
    group.className = 'comfyui-button-group lvocode-aligner-toolbar';
    const button = document.createElement('button');
    button.className = 'comfyui-button';
    button.title = 'Show / hide LVO Node Aligner';
    button.setAttribute('aria-label', 'LVO Node Aligner');
    button.setAttribute('aria-controls', 'lvocode-node-aligner');
    button.style.cssText = 'display:flex;align-items:center;gap:5px;padding:5px 8px;border:1px solid #555;border-radius:5px;color:white;cursor:pointer;';
    const icon = document.createElement('span');
    icon.style.cssText = 'width:18px;height:18px;display:inline-flex;';
    icon.innerHTML = icons.alignLeftSvg.replaceAll('#666666', 'currentColor');
    button.append(icon, document.createTextNode('LVO'));
    button.onclick = () => {
        syncSelection();
        manuallyOpened = !panel || panel.hidden;
        showPanel(manuallyOpened);
    };
    group.append(button);anchor.before(group);toolbarButton = button;syncToolbar();
}
function resetDrag() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; pendingMove = null; releasing = false; drag = null;
}

function apply(action) {
    // All explicit toolbar commands include pinned references and targets,
    // without toggling their pin. Drag snapping still respects pin.
    const nodes = selected(true);
    if (nodes.length < 2) return;
    const g = graph();
    g?.beforeChange?.();
    try {
        if (action === 'fillWidth' || action === 'fillHeight') {
            const message = fillSpace(nodes, action === 'fillWidth' ? 0 : 1, config.gap);
            const hint = panel?.shadowRoot?.querySelector('.hint');
            if (hint) hint.textContent = message || 'Space filled · Shift: temporarily disable snap';
        } else if (action.startsWith('size')) {
            const expanded = nodes.filter(n => !n.flags?.collapsed);
            if (expanded.length < 2) return;
            const axis = action.includes('Width') ? 0 : 1;
            const target = Math[action.endsWith('Min')?'min':'max'](...expanded.map(n => n.size[axis]));
            for (const n of expanded) {
                const size = Array.from(n.size); size[axis] = target;
                n.setSize?.(size);
                if (!n.setSize) n.size = size;
            }
        } else arrange(nodes,action,config.gap,
            graph() === selectionGraph && nodes.includes(referenceNode) ? referenceNode : null);
    } finally {g?.afterChange?.();redraw();}
}
function mount() {
    if (panel) return;
    panel = document.createElement('div');
    panel.id = 'lvocode-node-aligner';
    panel.hidden = true;
    panel.style.cssText = 'position:fixed;left:96px;bottom:24px;z-index:10000;max-width:calc(100vw - 108px);';
    const root = panel.attachShadow({mode:'open'});
    root.innerHTML = `<style>
      :host{font:13px "Segoe UI",sans-serif;color:white}
      .box{background:#292929;border:1px solid #555;border-radius:7px;box-shadow:0 3px 16px #0006;padding:8px;width:340px;max-width:calc(100vw - 44px);box-sizing:border-box}
      header{display:flex;justify-content:space-between;align-items:center;font-weight:600;cursor:move;touch-action:none;color:#78b800}
      .controls,.tools{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:8px}
      button{background:#383838;color:white;border:1px solid #555;border-radius:4px;cursor:pointer;padding:5px}
      button:hover{border-color:#78b800}button[aria-pressed=true]{background:#78b800;border-color:#78b800}
      .tools button{width:32px;height:30px}.tools svg{width:100%;height:100%}.tools path{fill:#eee}
      input{width:58px;background:#171717;color:white;border:1px solid #666;border-radius:3px;padding:4px;font:inherit}
      label{display:flex;gap:4px;align-items:center}.hint{font-size:11px;color:#bbb;margin-top:7px}
      [hidden]{display:none!important}
    </style><div class="box"><header><span>LVO Node Aligner</span><button title="Collapse panel" aria-label="Collapse panel">−</button></header><section><div class="controls"></div><div class="tools"></div><div class="hint">Select nodes to align · Shift: temporarily disable snap</div></section></div>`;
    const section=root.querySelector('section');
    root.querySelector('header button').onclick=()=>{section.hidden=!section.hidden;positionPanel();};
    const help = document.createElement('button');
    help.type='button';help.textContent='?';help.title='Help (English)';
    help.setAttribute('aria-label','LVO Node Aligner help');
    help.style.cssText='margin-left:auto;margin-right:6px;width:24px;height:24px;padding:0;border-radius:50%;';
    help.onclick=()=>openAlignerHelp(help);
    root.querySelector('header').insertBefore(help,root.querySelector('header button'));
    const controls=root.querySelector('.controls');
    const toggle=document.createElement('button');
    const update=()=>{toggle.textContent=`Snap ${config.enabled?'ON':'OFF'}`;toggle.setAttribute('aria-pressed',String(config.enabled));};
    toggle.onclick=()=>{config.enabled=!config.enabled;save();update();drag=null;}; update();controls.append(toggle);
    for(const [key,label,title] of [['gap','Gap','Exact margin between visible node edges (graph pixels)'],['radius','Range','Snap attraction distance (screen pixels)']]) {
        const lb=document.createElement('label');lb.textContent=label;
        const input=document.createElement('input');input.type='number';input.min=key==='gap'?'0':'1';input.max='1000';input.step='1';input.value=config[key];input.title=title;input.setAttribute('aria-label',label);
        input.onchange=()=>{const v=Number(input.value);if(input.value.trim() && Number.isFinite(v))config[key]=Math.max(Number(input.min),Math.min(1000,v));input.value=config[key];save();};
        lb.append(input);controls.append(lb);
    }
    const referenceRow = document.createElement('label');
    referenceRow.textContent='Align to';
    referenceRow.style.cssText='display:flex;margin-top:8px;gap:6px;';
    referenceSelect = document.createElement('select');
    referenceSelect.setAttribute('aria-label','Alignment reference');
    referenceSelect.title='Reference for edge/center alignment, Row and Column. The chosen node stays in place.';
    referenceSelect.style.cssText='flex:1;min-width:0;background:#171717;color:white;border:1px solid #666;border-radius:4px;padding:4px;';
    referenceSelect.onchange=()=>{referenceNode=referenceSelect.value===''?null:referenceOptions[Number(referenceSelect.value)];};
    referenceRow.append(referenceSelect);controls.after(referenceRow);
    updateReference(selected(true));
    const actions=[
      ['fillWidth','Fill horizontal space: equal widths + Gap','fillWidthSvg'],
      ['fillHeight','Fill vertical space: equal heights + Gap','fillHeightSvg'],
      ['left','Align left','alignLeftSvg'],['centerX','Align horizontal centers','alignCenterVerticallySvg'],['right','Align right','alignRightSvg'],
      ['top','Align top','alignTopSvg'],['centerY','Align vertical centers','alignCenterHorizontallySvg'],['bottom','Align bottom','alignBottomSvg'],
      ['row','Row: exact Gap','horizontalDistributionSvg'],['column','Column: exact Gap','verticalDistributionSvg'],
      ['sizeWidth','Equal width: largest','equalWidthSvg'],['sizeWidthMin','Equal width: smallest','equalWidth2Svg'],
      ['sizeHeight','Equal height: largest','equalHeightSvg'],['sizeHeightMin','Equal height: smallest','equalHeight2Svg']];
    for(const [action,title,icon] of actions){const b=document.createElement('button');b.title=title;b.setAttribute('aria-label',title);b.innerHTML=icons[icon];b.onclick=()=>apply(action);root.querySelector('.tools').append(b);}
    panel.addEventListener('pointerdown',e=>e.stopPropagation());
    panel.addEventListener('keydown',e=>e.stopPropagation());
    const header=root.querySelector('header');
    header.addEventListener('pointerdown',e=>{
        if(e.button!==0||e.target.closest('button'))return;
        const r=panel.getBoundingClientRect(), x=e.clientX,y=e.clientY;
        header.setPointerCapture(e.pointerId);
        const move=ev=>{panel.style.left=Math.max(0,Math.min(innerWidth-r.width,r.left+ev.clientX-x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-r.height,r.top+ev.clientY-y))+'px';panel.style.bottom='auto';};
        const end=()=>{
            header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',end);header.removeEventListener('pointercancel',end);header.removeEventListener('lostpointercapture',end);
            const current=panel.getBoundingClientRect();config.position={x:current.left,y:current.top};save();
        };
        header.addEventListener('pointermove',move);header.addEventListener('pointerup',end);header.addEventListener('pointercancel',end);
        header.addEventListener('lostpointercapture',end);
    });
    document.body.append(panel);
    window.addEventListener('resize',positionPanel);
}

function pointerDown(e) {
    resetDrag();
    if (!config.enabled || e.button!==0 || e.composedPath().includes(panel) || e.composedPath().some(el=>el.tagName==='DIALOG')) return;
    const c=canvas(), g=graph(), el=c?.canvas;
    if(!el || !g) return;
    const screen=el.getBoundingClientRect(), scale=c.ds?.scale||1, offset=c.ds?.offset||[0,0];
    const x=(e.clientX-screen.left)/scale-offset[0], y=(e.clientY-screen.top)/scale-offset[1];
    const all=g._nodes||[];
    // Snapshot body/edge gestures too, but only actual native size changes can
    // activate resize. Editing widgets must never start a move.
    const pad=8/scale;
    const hit=[...all].reverse().find(n=>{const r=bounds(n);return x>=r.x-pad&&x<=r.x+r.w+pad&&y>=r.y-pad&&y<=r.y+r.h+pad&&!n.flags?.pinned;});
    if(!hit)return;
    drag={g,hit,header:y>=bounds(hit).y&&y<=hit.pos[1]&&x>=hit.pos[0]&&x<=hit.pos[0]+bounds(hit).w,
        x:e.clientX,y:e.clientY,scale,active:false,initial:new Map(all.map(n=>[n,{pos:Array.from(n.pos),size:Array.from(n.size),rect:bounds(n)}]))};
}
function resizeMove(e) {
    const n=drag.hit, initial=drag.initial.get(n);
    if(n.flags?.collapsed||n.flags?.pinned)return false;
    const changed=n.size.some((v,i)=>Math.abs(v-initial.size[i])>0.01);
    if(!drag.resize&&!changed)return false;
    const now=bounds(n),base=initial.rect;
    if(!drag.resize) {
        const left=Math.abs(now.x-base.x)>0.01,top=Math.abs(now.y-base.y)>0.01;
        drag.resize={left,top,right:!left&&Math.abs(now.w-base.w)>0.01,bottom:!top&&Math.abs(now.h-base.h)>0.01};
    }
    // A corner can begin by changing only one axis, then change the other.
    const edges=drag.resize;
    if(!edges.left&&!edges.right&&Math.abs(now.w-base.w)>0.01)edges[Math.abs(now.x-base.x)>0.01?'left':'right']=true;
    if(!edges.top&&!edges.bottom&&Math.abs(now.h-base.h)>0.01)edges[Math.abs(now.y-base.y)>0.01?'top':'bottom']=true;
    const dx=(e.clientX-drag.x)/drag.scale,dy=(e.clientY-drag.y)/drag.scale;
    const desired={x:base.x+(edges.left?dx:0),y:base.y+(edges.top?dy:0),
        w:base.w+(edges.left?-dx:edges.right?dx:0),h:base.h+(edges.top?-dy:edges.bottom?dy:0)};
    const title=base.h-initial.size[1];
    const computed=n.computeSize?.()||[1,1];
    const min=[Math.max(1,n.min_size?.[0]||computed[0]||1),Math.max(1,n.min_size?.[1]||computed[1]||1)+title];
    const targets=drag.g._nodes.filter(t=>t!==n).map(bounds);
    const r=snapResize(desired,e.shiftKey?[]:targets,config.gap,config.radius/drag.scale,edges,min);
    const size=[r.w,r.h-title];
    if(n.setSize)n.setSize(size);else n.size=size;
    // If the node enforces a larger minimum, still preserve the opposite edge.
    n.pos=[edges.left?base.x+base.w-n.size[0]:base.x,
        (edges.top?base.y+base.h-n.size[1]-title:base.y)+title];
    redraw();return true;
}
function pointerMove(e) {
    if(!drag || !config.enabled || !(e.buttons&1) || graph()!==drag.g) return;
    if(canvas()?.dragging_canvas || canvas()?.dragging_rectangle != null) {resetDrag();return;}
    if(resizeMove(e))return;
    if(!drag.header)return;
    const nodes=selected();
    if(!nodes.includes(drag.hit))return;
    if(nodes.some(n=>!drag.initial.has(n)))return;
    if(nodes.some(n=>n.size.some((v,i)=>v!==drag.initial.get(n).size[i]))){drag=null;return;}
    // Vue moves its layout store without updating node.pos. A header gesture
    // plus pointer distance detects that path; legacy uses native position changes.
    const moved = isVueNodes()
        ? Math.hypot(e.clientX-drag.x,e.clientY-drag.y) >= 4
        : nodes.some(n=>n.pos.some((v,i)=>v!==drag.initial.get(n).pos[i]));
    if(!drag.active && !moved)return;
    drag.active=true;
    const dx=(e.clientX-drag.x)/drag.scale,dy=(e.clientY-drag.y)/drag.scale;
    const rects=nodes.map(n=>{const r=bounds(n),p=drag.initial.get(n).pos;return {...r,x:p[0]+dx,y:r.y-n.pos[1]+p[1]+dy};});
    const desired=union(rects);
    const targets=(drag.g._nodes||[]).filter(n=>!nodes.includes(n)).map(bounds);
    const correction=e.shiftKey?{dx:0,dy:0}:snap(desired,targets,config.gap,config.radius/drag.scale);
    for(const n of nodes){const p=drag.initial.get(n).pos;n.pos=[p[0]+dx+correction.dx,p[1]+dy+correction.dy];}
    redraw();
}
function captureMove(e) {
    if(!isVueNodes() || !drag) return;
    pendingMove = e;
    if(frame)return;
    // Capture sees events even when Vue stops bubbling. The animation frame
    // applies the correction after Vue's own pointer handler updates its store.
    frame=requestAnimationFrame(()=>{
        frame=0;
        const event=pendingMove;pendingMove=null;
        if(event)pointerMove(event);
        if(releasing)resetDrag();
    });
}
function release() {
    if(frame)releasing=true;
    else resetDrag();
}
app.registerExtension({name:'LVOcode.NodeAligner',setup(){
    // Same toolbar anchor as Align Pixaroma. Mount when the app creates it,
    // and reattach if the frontend rebuilds the toolbar.
    mountToolbarButton();
    const toolbarObserver = new MutationObserver(mountToolbarButton);
    toolbarObserver.observe(document.body,{childList:true,subtree:true});
    // Observe the public canvas selection in both renderers, including changes
    // from keyboard commands, workflow switches and other extensions. Only
    // selection changes update the DOM, so editing panel controls is stable.
    syncSelection();
    window.setInterval(syncSelection, 100);
    window.addEventListener('pointerdown',pointerDown,true);
    window.addEventListener('pointermove',captureMove,true);
    window.addEventListener('pointermove',e=>{if(!isVueNodes())pointerMove(e);},false);
    window.addEventListener('pointerup',release,true);
    window.addEventListener('pointercancel',resetDrag,true);
    window.addEventListener('blur',resetDrag);
}});
