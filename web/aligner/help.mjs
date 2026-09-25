// SPDX-License-Identifier: GPL-3.0-only
// LVOcode modifications, 2026; upstream attribution: THIRD_PARTY_NOTICES.md.
// Standalone packaging modified 2026-09-25.
import * as icons from './icons.mjs?v=lvo-fill-space-1';

const actions = [
 ['fillWidthSvg','Fill horizontal space','Give nodes equal widths with the exact Gap between them. Preserve the leftmost and rightmost outer edges of the selection. Horizontal positions may change; vertical positions stay unchanged.'],
 ['fillHeightSvg','Fill vertical space','Give nodes equal heights with the exact Gap between them, including title bars. Preserve the topmost and bottommost outer edges. Vertical positions may change; horizontal positions stay unchanged.'],
 ['alignLeftSvg','Align left','Align selected left edges to the leftmost edge of the selection.'],
 ['alignCenterVerticallySvg','Align horizontal centers','Move nodes horizontally so their centers share the center of the selection’s outer bounds.'],
 ['alignRightSvg','Align right','Align selected right edges to the rightmost edge of the selection.'],
 ['alignTopSvg','Align top','Align selected top edges, including title bars, to the topmost edge.'],
 ['alignCenterHorizontallySvg','Align vertical centers','Move nodes vertically so their visible centers share the center of the selection’s outer bounds.'],
 ['alignBottomSvg','Align bottom','Align selected bottom edges to the bottommost edge.'],
 ['horizontalDistributionSvg','Row: exact Gap','Arrange nodes from left to right with the exact Gap. Keep the leftmost node as the anchor and align their tops. Sizes stay unchanged.'],
 ['verticalDistributionSvg','Column: exact Gap','Arrange nodes from top to bottom with the exact Gap. Keep the topmost node as the anchor and align their left edges. Sizes stay unchanged.'],
 ['equalWidthSvg','Equal width: largest','Set expanded nodes to the width of the widest selected expanded node. Positions stay unchanged.'],
 ['equalWidth2Svg','Equal width: smallest','Request the width of the narrowest selected expanded node for all expanded nodes. A node’s minimum size may prevent it from becoming that narrow. Positions stay unchanged.'],
 ['equalHeightSvg','Equal height: largest','Set expanded nodes to the height of the tallest selected expanded node. Positions stay unchanged.'],
 ['equalHeight2Svg','Equal height: smallest','Request the height of the shortest selected expanded node for all expanded nodes. A node’s minimum size may prevent it from becoming that short. Positions stay unchanged.'],
];
let dialog;
export function openAlignerHelp(anchor) {
 if (dialog?.open) return;
 const current = document.createElement('dialog');dialog = current;
 current.setAttribute('aria-label','LVO Node Aligner help');
 current.style.cssText='padding:0;border:1px solid #555;border-radius:10px;background:#242424;color:#eee;width:660px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);';
 const host = document.createElement('div');current.append(host);
 const root = host.attachShadow({mode:'open'});
 root.innerHTML=`<style>
 :host{font:14px/1.5 "Segoe UI",sans-serif}*{box-sizing:border-box}
 header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #444}
 h2{font-size:18px;margin:0;color:#78b800}h3{font-size:15px;color:#78b800;margin:18px 0 6px}
 button{background:#383838;color:white;border:1px solid #666;border-radius:5px;cursor:pointer;padding:5px 12px}
 button:hover,button:focus-visible{border-color:#78b800}main{padding:0 18px 18px;max-height:calc(100vh - 120px);overflow:auto}
 p{margin:6px 0 12px}dl{margin:0}dt{font-weight:600;margin-top:14px;display:flex;align-items:center;gap:10px}
 dd{margin:4px 0 0 34px;color:#ccc}.icon{width:24px;height:24px;flex:none;display:inline-flex}.icon svg{width:100%;height:100%}.icon path{fill:#eee}
 </style><header><h2>LVO Node Aligner — Help</h2><button type="button" aria-label="Close help" autofocus>Close</button></header><main>
 <h3>Opening and moving the panel</h3>
 <p>Select two or more nodes to show the panel automatically. Select fewer to hide it. The top-right LVO button also opens it manually, even with no selection; a manually opened panel stays open until you close it with that button. The button lights up while the panel is visible. Drag the panel title to move it. The minus button collapses or expands its controls.</p>
 <p>The panel remembers its position in this browser after you drag it. When the browser window becomes smaller, the panel is moved back inside the visible area.</p>
 <h3>Align to — reference node</h3>
 <p>Select the nodes you want to align, then choose a node from the Align to list. Titles and IDs help distinguish nodes with identical names. The chosen node stays in place when using any of the six edge/center alignment buttons; the other selected nodes align to its visible edges or center. This also works with pinned or collapsed nodes.</p>
 <p>Choose Selection bounds (default) to restore the original behavior described below. The reference is cleared when it leaves the selection or you switch graphs. Row and Column also keep the chosen reference fixed: other nodes are placed before and after it in their existing order with the exact Gap. Row aligns their tops to the reference; Column aligns their left edges. Fill and equal-size buttons do not use the reference.</p>
 <h3>Gap, Range and Snap</h3><dl>
 <dt>Gap</dt><dd>The exact margin between visible node edges, in workflow units. Used by Row, Column, both Fill tools and snapping. Zoom does not change the workflow margin.</dd>
 <dt>Range</dt><dd>How close a dragged edge must get before Snap attracts it, measured in screen pixels. Increasing Range makes snapping easier from farther away; it does not change Gap.</dd>
 <dt>Snap ON / OFF</dt><dd>Snap while dragging nodes or resizing their edges. Match neighboring edges or centers, or leave the configured Gap. Multiple selected nodes move together. Resizing keeps the opposite edge fixed. Hold Shift to temporarily bypass snapping. Hiding the panel does not turn Snap off.</dd></dl>
 <h3>Toolbar buttons — in panel order</h3><p>Select at least two nodes. Hover over an icon to see its name.</p>
 <dl>${actions.map(([icon,name,text])=>`<dt><span class="icon" aria-hidden="true">${icons[icon]}</span>${name}</dt><dd>${text}</dd>`).join('')}</dl>
 <h3>Pinned nodes, collapsed nodes and size limits</h3>
 <p>All toolbar actions include pinned nodes without removing their pins. Drag snapping does not move pinned nodes, but other nodes can snap to them.</p>
 <p>Alignment, Row, Column and Snap measure only the visible title bar of a collapsed node. Equal-size tools skip collapsed nodes. Both Fill tools require every selected node to be expanded and also work with more than two nodes. If minimum sizes leave too little space for equal sizes and Gap, the layout is left unchanged and the panel shows a message.</p>
 <h3>Undo and saved settings</h3>
 <p>Use Ctrl+Z to undo a toolbar layout change. Gap, Range and Snap are remembered in this browser. Node positions and sizes are saved in the workflow. If another extension also snaps nodes, turn off one snapping system to avoid competing adjustments.</p>
 <p>Close this help with Close, Escape, or a click outside the window.</p></main>`;
 root.querySelector('button').onclick=()=>current.close();
 current.addEventListener('click',event=>{
  const r=current.getBoundingClientRect();
  if(event.target===current&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))current.close();
 });
 current.addEventListener('keydown',event=>event.stopPropagation());
 current.addEventListener('close',()=>{current.remove();dialog=null;if(anchor?.isConnected)anchor.focus();},{once:true});
 document.body.append(current);current.showModal();
}
