/* ══════════════════════════════════════════════════
   CONFIG
══════════════════════════════════════════════════ */
const STATUS = {
  none:{var:'--status-prog', label:'',            dash:'none',  sw:0,   opacity:0},
  done:{var:'--status-done', label:'DONE',        dash:'none',  sw:2.5, opacity:1},
  prog:{var:'--status-prog', label:'IN PROGRESS', dash:'none',  sw:2,   opacity:1},
  plan:{var:'--status-plan', label:'PLANNED',     dash:'5,3',   sw:1.8, opacity:.75},
  expl:{var:'--status-expl', label:'EXPLORING',   dash:'3,5',   sw:1.5, opacity:.55},
};
const STAGE_GATES = [
  {key:'discover', label:'Discover', iconClass:'fa-solid fa-magnifying-glass'},
  {key:'design', label:'Design', iconClass:'fa-solid fa-pen-ruler'},
  {key:'approve', label:'Approve', iconClass:'fa-solid fa-circle-check'},
  {key:'build', label:'Build', iconClass:'fa-solid fa-screwdriver-wrench'},
  {key:'test', label:'Test', iconClass:'fa-solid fa-flask'}
];
const STAGE_STATUSES = ['pending', 'in_progress', 'done', 'blocked'];

// Child-layout modes + resolution
const LAYOUT_MODES = ['even', 'vertical', 'horizontal-right', 'horizontal-left'];
const DEFAULT_LAYOUT = 'even';

// Radius by depth. Root stays larger as a visual anchor; all child
// nodes share a single size so deeper branches don't appear to shrink.
const ROOT_RADIUS = 40;
const CHILD_RADIUS = 28;
function radiusFor(depth){ return depth <= 0 ? ROOT_RADIUS : CHILD_RADIUS; }

// Layout constants
const BASE_LEAF_W = 130;   // baseline horizontal slot width
const ROOT_GAP = 110;
const START_X = 80;
const START_Y = 120;
const MIN_NODE_GAP = 26;
const LABEL_AREA_BELOW = 44;   // approximate label height reserved beneath the node circle
const LABEL_AREA_ABOVE = 6;    // small visual margin above the circle
const EVEN_HGAP_MIN = 14;

/* ══════════════════════════════════════════════════
   USER SETTINGS
   Stored in localStorage; applied live to layout/CSS.
══════════════════════════════════════════════════ */
const DEFAULT_SETTINGS = {
  theme: 'auto',            // 'auto' | 'light' | 'dark'
  lineThickness: 1.0,       // CSS var multiplier
  nodeBorderThickness: 1.0, // CSS var multiplier
  verticalGap: 70,          // px between stacked siblings
  sideOffset: 150,          // px distance of horizontal branch
  sideAngle: 15,            // degrees below horizontal for first horizontal child
  levelGapScale: 1.0        // multiplier on levelGapFor(depth)
};
let settings = {...DEFAULT_SETTINGS};

function loadSettings(){
  try {
    const raw = localStorage.getItem('tree-settings');
    if(!raw) return;
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === 'object'){
      Object.keys(DEFAULT_SETTINGS).forEach(k => {
        if(parsed[k] !== undefined) settings[k] = parsed[k];
      });
    }
  } catch(e){ /* ignore corrupt settings */ }
}
function saveSettings(){
  try { localStorage.setItem('tree-settings', JSON.stringify(settings)); } catch(e){}
}
function sideDropFactor(){
  return Math.tan((settings.sideAngle || 0) * Math.PI / 180);
}

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function cssNumberVar(name, fallback){
  const raw = parseFloat(cssVar(name));
  return Number.isFinite(raw) ? raw : fallback;
}
function withAlpha(hex, alpha){
  const c = hex.replace('#','');
  if(c.length !== 6) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  return '#' + c + a;
}
function statusMeta(key){
  const meta = STATUS[key] || STATUS.plan;
  return {...meta, color: cssVar(meta.var)};
}
function isImageIcon(value){
  if(!value) return false;
  return /^(images\/|https?:\/\/|\.\/images\/|\/images\/)/i.test(value) ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
}

/* Font Awesome icon support.
   Accepts a class string like "fa-solid fa-user" or "fa-brands fa-github".
   We resolve the actual glyph + font family/weight by probing the live
   stylesheet — no hard-coded codepoint map to maintain. */
const FA_STYLE_TOKEN = /(?:^|\s)(fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone|fa-sharp|fas|far|fab|fal|fad|fat)\b/;
function isFontAwesomeIcon(value){
  if(!value) return false;
  if(isImageIcon(value)) return false;
  return FA_STYLE_TOKEN.test(value);
}

const FA_STYLE_TOKEN_SET = new Set([
  'fa-solid','fa-regular','fa-brands','fa-light','fa-thin','fa-duotone','fa-sharp',
  'fas','far','fab','fal','fat','fad','fa'
]);
function parseFaClasses(classes){
  const tokens = classes.trim().split(/\s+/).filter(Boolean);
  const isSharp = tokens.includes('fa-sharp');
  let prefix = 'fas';
  for(const t of tokens){
    if(t === 'fa-solid'   || t === 'fas') prefix = isSharp ? 'fass' : 'fas';
    else if(t === 'fa-regular' || t === 'far') prefix = isSharp ? 'fasr' : 'far';
    else if(t === 'fa-brands'  || t === 'fab') prefix = 'fab';
    else if(t === 'fa-light'   || t === 'fal') prefix = isSharp ? 'fasl' : 'fal';
    else if(t === 'fa-thin'    || t === 'fat') prefix = isSharp ? 'fast' : 'fat';
    else if(t === 'fa-duotone' || t === 'fad') prefix = isSharp ? 'fasd' : 'fad';
  }
  let iconName = null;
  for(const t of tokens){
    if(FA_STYLE_TOKEN_SET.has(t)) continue;
    if(t.startsWith('fa-')){ iconName = t.slice(3); break; }
  }
  return { prefix, iconName };
}

const faGlyphCache = new Map();
function resolveFaIcon(classes){
  if(faGlyphCache.has(classes)) return faGlyphCache.get(classes);
  let result = null;
  try {
    const { prefix, iconName } = parseFaClasses(classes);
    if(iconName && window.FontAwesome && typeof window.FontAwesome.icon === 'function'){
      const def = window.FontAwesome.icon({ prefix, iconName });
      if(def && def.abstract && def.abstract[0]) result = def.abstract[0];
    }
  } catch(e){ result = null; }
  faGlyphCache.set(classes, result);
  return result;
}

function buildSvgFromAbstract(node){
  const el = document.createElementNS('http://www.w3.org/2000/svg', node.tag);
  if(node.attributes){
    for(const k of Object.keys(node.attributes)){
      el.setAttribute(k, node.attributes[k]);
    }
  }
  if(Array.isArray(node.children)){
    for(const c of node.children) el.appendChild(buildSvgFromAbstract(c));
  }
  return el;
}

/* Icon darkness detection: decides whether an image is a dark/monochrome
   glyph that should be inverted when the UI switches to dark mode.
   Uses a tiny offscreen canvas, averages luminance + saturation of opaque
   pixels, and caches the result per URL so each image is sampled once. */
const iconDarknessCache = new Map();
function detectIconDarkness(url){
  if(!url) return Promise.resolve(false);
  const cached = iconDarknessCache.get(url);
  if(cached && cached.pending) return cached.pending;
  const entry = { dark: false, done: false };
  const pending = new Promise(resolve => {
    const img = new Image();
    // Only request CORS for absolute cross-origin URLs. Setting crossOrigin
    // on file:// or relative paths makes the browser refuse the load with
    // "Unsafe attempt to load URL ... 'file:' URLs are treated as unique
    // security origins."
    const isAbsolute = /^https?:\/\//i.test(url);
    const sameOrigin = isAbsolute && (() => {
      try { return new URL(url).origin === window.location.origin; }
      catch(e){ return false; }
    })();
    if(isAbsolute && !sameOrigin) img.crossOrigin = 'anonymous';
    const finish = (isDark) => {
      entry.dark = isDark;
      entry.done = true;
      resolve(isDark);
    };
    img.onload = () => {
      try {
        const S = 32;
        const canvas = document.createElement('canvas');
        canvas.width = S; canvas.height = S;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, S, S);
        ctx.drawImage(img, 0, 0, S, S);
        const { data } = ctx.getImageData(0, 0, S, S);
        let sumY = 0, sumSat = 0, weight = 0;
        for(let i = 0; i < data.length; i += 4){
          const a = data[i+3] / 255;
          if(a < 0.1) continue;
          const r = data[i] / 255, g = data[i+1] / 255, b = data[i+2] / 255;
          const y = 0.299*r + 0.587*g + 0.114*b;
          const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
          const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
          sumY += y * a;
          sumSat += sat * a;
          weight += a;
        }
        if(weight <= 0){ finish(false); return; }
        const avgY = sumY / weight;
        const avgSat = sumSat / weight;
        // Dark-on-light glyph: mostly desaturated AND low luminance on average.
        finish(avgY < 0.45 && avgSat < 0.35);
      } catch(err){
        // Canvas tainted (cross-origin image without CORS). Play safe.
        finish(false);
      }
    };
    img.onerror = () => finish(false);
    img.src = url;
  });
  entry.pending = pending;
  iconDarknessCache.set(url, entry);
  return pending;
}

function applyIconInvertClass(imgEl, url, explicit){
  if(!imgEl) return;
  if(explicit === true){ imgEl.classList.add('icon-invert-dark'); return; }
  if(explicit === false){ imgEl.classList.remove('icon-invert-dark'); return; }
  detectIconDarkness(url).then(isDark => {
    if(isDark) imgEl.classList.add('icon-invert-dark');
    else imgEl.classList.remove('icon-invert-dark');
  });
}
function nodeLabelLineCount(node){
  return (node.title || '').split('\n').length;
}
function levelGapFor(depth){
  if(depth <= 0) return 210;
  if(depth === 1) return 190;
  if(depth === 2) return 176;
  return 162;
}
function leafWidthForNode(node, depthArg){
  const lines = (node.title || '').split('\n');
  const maxChars = lines.reduce((m, line) => Math.max(m, line.trim().length), 0);
  const depth = Number.isFinite(depthArg) ? depthArg : depthOf(node.id);
  const depthBoost = depth <= 2 ? 24 : 10;
  const textBoost = Math.min(58, Math.max(0, maxChars - 11) * 2.1);
  const multiBoost = Math.max(0, lines.length - 1) * 12;
  return BASE_LEAF_W + depthBoost + textBoost + multiBoost;
}

function normalizeLayoutValue(v){
  if(typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  return LAYOUT_MODES.includes(s) ? s : null;
}
function resolveAttach(child, parent){
  const own = normalizeLayoutValue(child && child.attach);
  if(own) return own;
  const inherited = normalizeLayoutValue(parent && parent.childLayout);
  if(inherited) return inherited;
  return DEFAULT_LAYOUT;
}
function resolvedChildLayout(node){
  return normalizeLayoutValue(node && node.childLayout) || DEFAULT_LAYOUT;
}
function bucketForAttach(attach){
  // Group attach directions into layout buckets.
  if(attach === 'vertical') return 'downVert';
  if(attach === 'horizontal-right') return 'right';
  if(attach === 'horizontal-left') return 'left';
  return 'downEven';
}

/* ══════════════════════════════════════════════════
   DATA — flat list, each node has an optional parent.
   Primary source: data/tree-data.js sets window.TREE_DATA (loaded above).
   Fallback below if TREE_DATA is missing or invalid.
══════════════════════════════════════════════════ */
const DEFAULT_EMBEDDED_DATA = {
  title: 'AI Programs of Work',
  nodes: [
    {id:'root', title:'AI STRATEGY', desc:'Our organisation-wide AI programme of work, from foundations through to advanced capabilities.',
     icon:'✦', status:'done', parent:null}
  ],
  positions: {}
};
let data = DEFAULT_EMBEDDED_DATA;

function sanitizeLoadedTree(json){
  if(!json || !Array.isArray(json.nodes)) return null;
  const out = {
    title: typeof json.title === 'string' ? json.title : DEFAULT_EMBEDDED_DATA.title,
    nodes: json.nodes.map(n => {
      const copy = {...n};
      delete copy._x;
      delete copy._y;
      const cl = normalizeLayoutValue(copy.childLayout);
      if(cl) copy.childLayout = cl; else delete copy.childLayout;
      const at = normalizeLayoutValue(copy.attach);
      if(at) copy.attach = at; else delete copy.attach;
      if(typeof copy.invertInDark !== 'boolean') delete copy.invertInDark;
      return copy;
    }),
    positions: json.positions && typeof json.positions === 'object' ? {...json.positions} : {}
  };
  return out;
}

/* ══════════════════════════════════════════════════
   TREE HELPERS
══════════════════════════════════════════════════ */
function getChildren(parentId){
  return data.nodes.filter(n => (n.parent||null) === parentId);
}

function depthOf(nodeId){
  let d=0, cur=data.nodes.find(n=>n.id===nodeId);
  while(cur && cur.parent){ d++; cur=data.nodes.find(n=>n.id===cur.parent); }
  return d;
}

function rootNodes(){
  return data.nodes.filter(n => {
    if(!n.parent) return true;
    return !data.nodes.some(x => x.id === n.parent);
  });
}

function getNodeById(id){
  return data.nodes.find(n => n.id === id);
}

function titleOneLine(n){
  return (n.title || '').replace(/\n/g, ' ');
}

function normalizeLink(url){
  const v = (url || '').trim();
  if(!v) return '';
  if(/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}

function etaDaysText(etaDate){
  if(!etaDate) return '';
  const parts = etaDate.split('-').map(Number);
  if(parts.length !== 3 || parts.some(Number.isNaN)) return '';
  const target = new Date(parts[0], parts[1]-1, parts[2]);
  target.setHours(0,0,0,0);
  const today = new Date();
  today.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  if(diff > 1) return `${diff} days to go (${etaDate})`;
  if(diff === 1) return `1 day to go (${etaDate})`;
  if(diff === 0) return `Due today (${etaDate})`;
  if(diff === -1) return `Overdue by 1 day (${etaDate})`;
  return `Overdue by ${Math.abs(diff)} days (${etaDate})`;
}
function stageIndex(stageKey){
  return STAGE_GATES.findIndex(s => s.key === (stageKey || '').toLowerCase());
}
function normalizeStageStatuses(node){
  const out = {};
  STAGE_GATES.forEach(s => { out[s.key] = 'pending'; });

  // Backward compatibility with legacy single stageGate progression
  const legacyIdx = stageIndex(node && node.stageGate);
  if(legacyIdx >= 0){
    STAGE_GATES.forEach((s, i) => {
      out[s.key] = i <= legacyIdx ? 'done' : 'pending';
    });
  }

  const raw = node && node.stageStatuses && typeof node.stageStatuses === 'object'
    ? node.stageStatuses
    : {};
  Object.keys(raw).forEach(k => {
    const val = String(raw[k] || '').toLowerCase();
    if(STAGE_GATES.some(s => s.key === k) && STAGE_STATUSES.includes(val)){
      out[k] = val;
    }
  });
  return out;
}

function normalizeNodeDeps(node){
  const raw = Array.isArray(node.deps) ? node.deps : [];
  const uniq = [];
  raw.forEach(id => {
    if(typeof id !== 'string') return;
    const trimmed = id.trim();
    if(!trimmed || trimmed === node.id) return;
    if(!getNodeById(trimmed)) return;
    if(!uniq.includes(trimmed)) uniq.push(trimmed);
  });
  node.deps = uniq;
}

function normalizeAllDeps(){
  data.nodes.forEach(n => normalizeNodeDeps(n));
}

function roundPositionOverrides(){
  if(!data.positions) return;
  Object.keys(data.positions).forEach(id => {
    const p = data.positions[id];
    if(p && typeof p.x === 'number' && typeof p.y === 'number'){
      data.positions[id] = {x:Math.round(p.x), y:Math.round(p.y)};
    }
  });
}

function loadDataFromSources(){
  if(typeof window.TREE_DATA !== 'undefined' && window.TREE_DATA && Array.isArray(window.TREE_DATA.nodes)){
    const cleaned = sanitizeLoadedTree(window.TREE_DATA);
    if(cleaned) return cleaned;
  }
  console.warn('[tree] window.TREE_DATA missing or invalid; check data/tree-data.js. Using embedded default.');
  return JSON.parse(JSON.stringify(DEFAULT_EMBEDDED_DATA));
}

function nodesDependingOn(nodeId){
  return data.nodes.filter(n => Array.isArray(n.deps) && n.deps.includes(nodeId));
}

/* ══════════════════════════════════════════════════
   AUTO LAYOUT (per-node layout modes)

   For each node we compute a subtree "extent" measured from
   the node's centre:  {left, right, top, bottom}.
   We also precompute each child's offset relative to its
   parent so a simple top-down pass can place every node.

   Child attach direction (see resolveAttach) buckets siblings:
     - 'even'              → spread horizontally below parent
     - 'vertical'          → stacked column below parent
     - 'horizontal-right'  → stacked column to the right of parent
     - 'horizontal-left'   → stacked column to the left of parent

   A single parent can mix buckets (e.g. some children vertical,
   some horizontal-right); each bucket is laid out independently
   then combined into the parent's extent.
══════════════════════════════════════════════════ */
const SUB_EXT = {};        // id -> {left,right,top,bottom} from node centre
const CHILD_OFFSETS = {};  // childId -> {dx,dy} relative to its parent
const ATTACH_CACHE = {};   // childId -> resolved attach used at layout time
const STRICT_LAYOUT_IDS = new Set(); // nodes placed by vertical/right/left bucket (no collision nudge)

function ownExtent(node, depth){
  const R = radiusFor(depth);
  const w = leafWidthForNode(node, depth);
  return {
    left:  w/2,
    right: w/2,
    top:   R + LABEL_AREA_ABOVE,
    bottom: R + LABEL_AREA_BELOW
  };
}

function computeExtent(id, depth){
  const node = data.nodes.find(x => x.id === id);
  if(!node){
    SUB_EXT[id] = {left:BASE_LEAF_W/2, right:BASE_LEAF_W/2, top:30, bottom:30};
    return SUB_EXT[id];
  }
  const own = ownExtent(node, depth);
  const kids = getChildren(id);
  if(kids.length === 0){
    SUB_EXT[id] = {...own};
    return SUB_EXT[id];
  }

  // Compute each child's own subtree extent first.
  kids.forEach(k => computeExtent(k.id, depth + 1));

  // Bucket children by resolved attach direction.
  const buckets = { downEven: [], downVert: [], right: [], left: [] };
  kids.forEach(k => {
    const a = resolveAttach(k, node);
    ATTACH_CACHE[k.id] = a;
    buckets[bucketForAttach(a)].push(k);
  });

  const levelGap = levelGapFor(depth) * (settings.levelGapScale || 1);
  const horizSiblingGap = Math.max(EVEN_HGAP_MIN, 20 - Math.min(8, depth * 2));
  const vertGap = settings.verticalGap;
  const sideOffset = settings.sideOffset;

  // --- Even bucket: horizontal row below parent
  let evenTotal = 0;
  buckets.downEven.forEach((k, i) => {
    const ke = SUB_EXT[k.id];
    evenTotal += ke.left + ke.right;
    if(i < buckets.downEven.length - 1) evenTotal += horizSiblingGap;
  });
  let evenBottom = 0;
  if(buckets.downEven.length){
    let curX = -evenTotal/2;
    buckets.downEven.forEach(k => {
      const ke = SUB_EXT[k.id];
      CHILD_OFFSETS[k.id] = { dx: Math.round(curX + ke.left), dy: Math.round(levelGap) };
      evenBottom = Math.max(evenBottom, levelGap + ke.bottom);
      curX += ke.left + ke.right + horizSiblingGap;
    });
  }

  // --- Vertical bucket: column directly below parent
  let vertStartY = levelGap;
  if(buckets.downEven.length){
    // If both even and vertical below, place vertical BELOW the even row.
    vertStartY = evenBottom + vertGap;
  }
  let vertCurY = vertStartY;
  let vertMaxHalfW = 0;
  let vertBottom = 0;
  buckets.downVert.forEach(k => {
    const ke = SUB_EXT[k.id];
    CHILD_OFFSETS[k.id] = { dx: 0, dy: Math.round(vertCurY + ke.top) };
    STRICT_LAYOUT_IDS.add(k.id);
    vertBottom = vertCurY + ke.top + ke.bottom;
    vertCurY = vertBottom + vertGap;
    vertMaxHalfW = Math.max(vertMaxHalfW, ke.left, ke.right);
  });

  // Diagonal branch angle (user-configurable): the FIRST horizontal-right /
  // horizontal-left child sits this many degrees below horizontal.
  const SIDE_DROP = sideDropFactor();

  // --- Right bucket: diagonal branch down-right from parent.
  // First child is placed at the configured angle below horizontal;
  // subsequent siblings stack straight below, separated by vertGap.
  let rightCurBottom = 0;   // offset of previous sibling's bottom, from parent y
  let rightBottom = 0;
  let rightMaxFullW = 0;
  buckets.right.forEach((k, i) => {
    const ke = SUB_EXT[k.id];
    const dx = sideOffset + ke.left;
    let centerY;
    if(i === 0){
      centerY = dx * SIDE_DROP;
    } else {
      centerY = rightCurBottom + vertGap + ke.top;
    }
    CHILD_OFFSETS[k.id] = {
      dx: Math.round(dx),
      dy: Math.round(centerY)
    };
    STRICT_LAYOUT_IDS.add(k.id);
    rightCurBottom = centerY + ke.bottom;
    rightBottom = Math.max(rightBottom, rightCurBottom);
    rightMaxFullW = Math.max(rightMaxFullW, sideOffset + ke.left + ke.right);
  });

  // --- Left bucket: mirror of right bucket (diagonal down-left).
  let leftCurBottom = 0;
  let leftBottom = 0;
  let leftMaxFullW = 0;
  buckets.left.forEach((k, i) => {
    const ke = SUB_EXT[k.id];
    const dxAbs = sideOffset + ke.right;
    let centerY;
    if(i === 0){
      centerY = dxAbs * SIDE_DROP;
    } else {
      centerY = leftCurBottom + vertGap + ke.top;
    }
    CHILD_OFFSETS[k.id] = {
      dx: Math.round(-dxAbs),
      dy: Math.round(centerY)
    };
    STRICT_LAYOUT_IDS.add(k.id);
    leftCurBottom = centerY + ke.bottom;
    leftBottom = Math.max(leftBottom, leftCurBottom);
    leftMaxFullW = Math.max(leftMaxFullW, sideOffset + ke.left + ke.right);
  });

  // Combine into parent extent
  const leftExt = Math.max(
    own.left,
    (buckets.downEven.length ? evenTotal/2 : 0),
    (buckets.downVert.length ? vertMaxHalfW : 0),
    leftMaxFullW
  );
  const rightExt = Math.max(
    own.right,
    (buckets.downEven.length ? evenTotal/2 : 0),
    (buckets.downVert.length ? vertMaxHalfW : 0),
    rightMaxFullW
  );
  const topExt = own.top; // side buckets now always extend downward
  const bottomExt = Math.max(
    own.bottom,
    evenBottom,
    vertBottom,
    rightBottom,
    leftBottom
  );

  SUB_EXT[id] = {left:leftExt, right:rightExt, top:topExt, bottom:bottomExt};
  return SUB_EXT[id];
}

function positionFromOffsets(id, px, py){
  const n = data.nodes.find(x => x.id === id);
  if(!n) return;
  n._x = Math.round(px);
  n._y = Math.round(py);
  getChildren(id).forEach(k => {
    const off = CHILD_OFFSETS[k.id] || {dx:0, dy:levelGapFor(depthOf(id))};
    positionFromOffsets(k.id, px + off.dx, py + off.dy);
  });
}

function estimatedNodeWidth(n){
  const d = depthOf(n.id);
  const labelFS = d<=1 ? 10 : (d===2 ? 9 : 8);
  const lines = (n.title||'').split('\n');
  const maxChars = lines.reduce((m, line) => Math.max(m, line.length), 0);
  const textW = maxChars * labelFS * 0.66;
  return Math.max(radiusFor(d)*2 + 20, textW + 24);
}

function nudgeAutoNodesAtDepth(nodesAtDepth){
  nodesAtDepth.sort((a,b)=>a._x-b._x);
  for(let i=1;i<nodesAtDepth.length;i++){
    const prev = nodesAtDepth[i-1];
    const cur = nodesAtDepth[i];
    if(data.positions[cur.id]) continue;
    // Skip nodes placed by strict vertical/horizontal layouts — nudging
    // them horizontally would break their alignment with the parent.
    if(STRICT_LAYOUT_IDS.has(cur.id)) continue;
    if(STRICT_LAYOUT_IDS.has(prev.id)) continue;
    const minGap = Math.max(
      MIN_NODE_GAP,
      (estimatedNodeWidth(prev) + estimatedNodeWidth(cur)) / 2
    );
    if(cur._x - prev._x < minGap){
      cur._x = Math.round(prev._x + minGap);
    }
  }
}

function reduceCollisions(){
  const byDepth = {};
  data.nodes.forEach(n => {
    if(data.positions[n.id]) return;
    const d = depthOf(n.id);
    if(!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(n);
  });
  Object.values(byDepth).forEach(nudgeAutoNodesAtDepth);
}

function autoLayout(){
  // Reset caches
  Object.keys(SUB_EXT).forEach(k => delete SUB_EXT[k]);
  Object.keys(CHILD_OFFSETS).forEach(k => delete CHILD_OFFSETS[k]);
  Object.keys(ATTACH_CACHE).forEach(k => delete ATTACH_CACHE[k]);
  STRICT_LAYOUT_IDS.clear();

  const roots = rootNodes();
  roots.forEach(r => computeExtent(r.id, 0));

  // Place roots side by side, anchored on their extents.
  let curX = START_X;
  roots.forEach(r => {
    const ext = SUB_EXT[r.id];
    curX += ext.left;
    positionFromOffsets(r.id, curX, START_Y);
    curX += ext.right + ROOT_GAP;
  });

  reduceCollisions();
}

function nodePos(n){
  const ov = data.positions[n.id];
  if(ov && Number.isFinite(ov.x) && Number.isFinite(ov.y)){
    return {x:Math.round(ov.x), y:Math.round(ov.y)};
  }
  if(Number.isFinite(n._x) && Number.isFinite(n._y)){
    return {x:Math.round(n._x), y:Math.round(n._y)};
  }
  return {x:0, y:0};
}

/* ══════════════════════════════════════════════════
   PAN / ZOOM
══════════════════════════════════════════════════ */
const svg = document.getElementById('svg');
const tg  = document.getElementById('tg');
let px=0, py=0, sc=1;
let isPan=false, panO={x:0,y:0};
let dragN=null, dragO={x:0,y:0}, dragNO={x:0,y:0};
let isEditMode=false;
let fitMode='width'; // alternates between 'all' and 'width'

function ensureEditMode(actionLabel='perform this action'){
  if(isEditMode) return true;
  alert(`Enable Edit mode to ${actionLabel}.`);
  return false;
}
function updateEditModeUI(){
  const b = document.getElementById('btn-editmode');
  const mutatingControls = [
    document.getElementById('pop-edit'),
    document.getElementById('pop-addchild'),
    document.getElementById('j-apply'),
    document.getElementById('e-save'),
    document.getElementById('e-del'),
    document.getElementById('t-save')
  ];

  b.innerHTML = isEditMode
    ? '<i class="fa-solid fa-lock-open"></i>'
    : '<i class="fa-solid fa-lock"></i>';
  b.setAttribute('data-tip', isEditMode ? 'Disable edit mode' : 'Enable edit mode');
  b.setAttribute('aria-label', isEditMode ? 'Disable edit mode' : 'Enable edit mode');
  b.classList.toggle('btn-edit-active', isEditMode);
  document.body.classList.toggle('edit-mode', isEditMode);
  document.getElementById('title-text').classList.toggle('ui-disabled', !isEditMode);
  const addBtn = document.getElementById('btn-add');
  const layoutBtn = document.getElementById('btn-layout');
  addBtn.style.display = isEditMode ? '' : 'none';
  layoutBtn.style.display = isEditMode ? '' : 'none';
  mutatingControls.forEach(el => {
    if(!el) return;
    el.disabled = !isEditMode;
    el.classList.toggle('ui-disabled', !isEditMode);
    el.setAttribute('aria-disabled', String(!isEditMode));
  });
  if(selId){
    const active = data.nodes.find(x=>x.id===selId);
    if(active) showPopup(active);
  }
}
function toggleEditMode(){
  isEditMode = !isEditMode;
  updateEditModeUI();
}

function applyT(){
  tg.setAttribute('transform',`translate(${px},${py}) scale(${sc})`);
  document.getElementById('z-pct').textContent=Math.round(sc*100)+'%';
}

svg.addEventListener('mousedown',e=>{
  const el = e.target.closest('[data-nid]');
  if(!el){
    isPan=true; panO={x:e.clientX-px,y:e.clientY-py};
    svg.classList.add('panning'); e.preventDefault();
  }
});
window.addEventListener('mousemove',e=>{
  if(isPan){px=e.clientX-panO.x;py=e.clientY-panO.y;applyT()}
  if(dragN){
    const dx=(e.clientX-dragO.x)/sc, dy=(e.clientY-dragO.y)/sc;
    data.positions[dragN.id] = {x:Math.round(dragNO.x+dx), y:Math.round(dragNO.y+dy)};
    const p = nodePos(dragN);
    const el=document.getElementById('g-'+dragN.id);
    if(el) el.setAttribute('transform',`translate(${p.x},${p.y})`);
    redrawLines();
    if(selId===dragN.id) posPopup(dragN);
  }
});
window.addEventListener('mouseup',()=>{
  const movedNode = dragN;
  const hadDrag = !!movedNode;
  isPan=false;
  dragN=null;
  svg.classList.remove('panning');
  if(hadDrag){
    maybeReparentDraggedNode(movedNode);
  }
});
svg.addEventListener('wheel',e=>{
  e.preventDefault();
  const r=svg.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  const d=e.deltaY>0?.88:1.14;
  px=mx-(mx-px)*d; py=my-(my-py)*d;
  sc=Math.max(.1,Math.min(3,sc*d)); applyT();
  if(selId){ const n=data.nodes.find(x=>x.id===selId); if(n) posPopup(n); }
},{passive:false});

function fitView(mode=fitMode){
  if(!data.nodes.length) return;
  const ps = data.nodes.map(nodePos);
  const xs=ps.map(p=>p.x), ys=ps.map(p=>p.y);
  const minX=Math.min(...xs)-120, minY=Math.min(...ys)-80;
  const maxX=Math.max(...xs)+120, maxY=Math.max(...ys)+80;
  const tw=maxX-minX, th=maxY-minY;
  const cw=svg.clientWidth, ch=svg.clientHeight;
  if(mode === 'width'){
    sc=Math.min(cw/tw,1.3)*.9;
    const topPad = 65;
    px=(cw-tw*sc)/2-minX*sc;
    py=topPad-minY*sc;
  } else {
    sc=Math.min(cw/tw,ch/th,1.3)*.9;
    px=(cw-tw*sc)/2-minX*sc; py=(ch-th*sc)/2-minY*sc;
  }
  applyT();
}
function toggleFitModeAndApply(){
  fitMode = fitMode === 'all' ? 'width' : 'all';
  fitView(fitMode);
  const tip = fitMode === 'all' ? 'Fit all nodes (click toggles width)' : 'Fit by width (click toggles all)';
  const btnFit = document.getElementById('btn-fit');
  const btnFit2 = document.getElementById('z-fit2');
  btnFit.setAttribute('data-tip', tip);
  btnFit2.setAttribute('title', tip);
}
document.getElementById('btn-fit').onclick=toggleFitModeAndApply;
document.getElementById('z-in').onclick=()=>{sc=Math.min(3,sc*1.2);applyT()};
document.getElementById('z-out').onclick=()=>{sc=Math.max(.1,sc/1.2);applyT()};
document.getElementById('z-fit2').onclick=toggleFitModeAndApply;
document.getElementById('btn-settings').onclick=toggleSettingsPanel;
document.getElementById('btn-editmode').onclick=toggleEditMode;

/* ══════════════════════════════════════════════════
   SVG HELPERS
══════════════════════════════════════════════════ */
const NS='http://www.w3.org/2000/svg';
const se=t=>document.createElementNS(NS,t);

function edgePt(fx,fy,tx,ty,r){
  const a=Math.atan2(ty-fy,tx-fx);
  return [fx+Math.cos(a)*r, fy+Math.sin(a)*r];
}
function toScreen(x,y){
  const r=svg.getBoundingClientRect();
  return {x:x*sc+px+r.left, y:y*sc+py+r.top};
}

function detectTheme(){
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function resolveTheme(val){
  if(val === 'light' || val === 'dark') return val;
  return detectTheme();
}
function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  syncBackdropTheme();
  render();
}
function applyThemeFromSettings(){
  setTheme(resolveTheme(settings.theme));
}
function syncBackdropTheme(){
  const bg = document.getElementById('canvas-bg');
  const dots = document.getElementById('dots-circle');
  if(bg) bg.setAttribute('fill', cssVar('--bg-canvas'));
  if(dots) dots.setAttribute('fill', cssVar('--bg-dots'));
}

/* ══════════════════════════════════════════════════
   RENDER
══════════════════════════════════════════════════ */
let selId=null;
let hoverNodeId=null;

function render(){
  document.getElementById('lg').innerHTML='';
  document.getElementById('ng').innerHTML='';
  renderDependencyLines();
  renderHierarchyLines();
  renderNodes();
}

function renderHierarchyLines(){
  const lg=document.getElementById('lg');
  const edgeDefault = cssVar('--edge-default');
  const edgeHighlight = cssVar('--edge-highlight');
  const lineThickness = cssNumberVar('--tree-line-thickness', 1);

  // Pre-compute each parent's vertical chain order so we can
  // route every non-first vertical child from its previous sibling.
  const vertChainPrev = {}; // childId -> previous sibling in vertical chain (node) or null
  data.nodes.forEach(p => {
    const verticalKids = getChildren(p.id).filter(k => {
      const a = ATTACH_CACHE[k.id] || resolveAttach(k, p);
      return a === 'vertical';
    });
    verticalKids.forEach((k, i) => {
      vertChainPrev[k.id] = i === 0 ? null : verticalKids[i-1];
    });
  });

  data.nodes.forEach(n => {
    if(!n.parent) return;
    const p = data.nodes.find(x=>x.id===n.parent);
    if(!p) return;

    const attach = ATTACH_CACHE[n.id] || resolveAttach(n, p);
    const rP = radiusFor(depthOf(p.id)) + 2;
    const rN = radiusFor(depthOf(n.id)) + 2;
    const pP = nodePos(p), pN = nodePos(n);

    let x1, y1, x2, y2, c1x, c1y, c2x, c2y;

    if(attach === 'vertical'){
      // Chain: each vertical child connects to previous sibling's bottom;
      // first sibling connects from the parent's bottom.
      const prev = vertChainPrev[n.id];
      const source = prev ? nodePos(prev) : pP;
      const rS = prev ? (radiusFor(depthOf(prev.id)) + 2) : rP;
      x1 = source.x;
      y1 = source.y + rS;
      x2 = pN.x;
      y2 = pN.y - rN;
      const dy = y2 - y1;
      const handle = Math.max(22, Math.min(110, Math.abs(dy) * 0.45));
      c1x = x1; c1y = y1 + handle;
      c2x = x2; c2y = y2 - handle;
    } else if(attach === 'horizontal-right' || attach === 'horizontal-left'){
      // Straight line from parent edge to child edge, along the
      // centre-to-centre axis so it meets each circle perpendicularly.
      const ang = Math.atan2(pN.y - pP.y, pN.x - pP.x);
      const cx = Math.cos(ang), cy = Math.sin(ang);
      x1 = pP.x + rP * cx;
      y1 = pP.y + rP * cy;
      x2 = pN.x - rN * cx;
      y2 = pN.y - rN * cy;
      c1x = c1y = c2x = c2y = null; // marker: draw as a straight line
    } else {
      // Default 'even': bottom of parent -> top of child
      x1 = pP.x;
      y1 = pP.y + rP;
      x2 = pN.x;
      y2 = pN.y - rN;
      const dy = y2 - y1;
      const handle = Math.max(26, Math.min(120, Math.abs(dy) * 0.42));
      c1x = x1; c1y = y1 + handle;
      c2x = x2; c2y = y2 - handle;
    }

    const isHl = selId && (selId===p.id || selId===n.id);
    const path = se('path');
    const d = (c1x === null)
      ? `M ${x1} ${y1} L ${x2} ${y2}`
      : `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', isHl ? edgeHighlight : edgeDefault);
    path.setAttribute('stroke-width', String((isHl ? 2 : 1.35) * lineThickness));
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', isHl ? '.95' : '.62');
    path.setAttribute('stroke-linecap', 'round');
    lg.appendChild(path);
  });
}

function renderDependencyLines(){
  const lg=document.getElementById('lg');
  const depColor = cssVar('--edge-dependency');
  const depHighlight = cssVar('--edge-dependency-highlight');
  const lineThickness = cssNumberVar('--tree-line-thickness', 1);
  data.nodes.forEach(n => {
    // n depends on depId => direct edge-to-edge line from dependency → n.
    const dependentPos = nodePos(n);
    (n.deps || []).forEach(depId => {
      const dependency = getNodeById(depId);
      if(!dependency) return;
      const dependencyPos = nodePos(dependency);
      const rFrom = radiusFor(depthOf(dependency.id)) + 2;
      const rTo = radiusFor(depthOf(n.id)) + 2;
      const dx = dependentPos.x - dependencyPos.x;
      const dy = dependentPos.y - dependencyPos.y;
      const dist = Math.hypot(dx, dy);
      // If the two nodes overlap, skip drawing to avoid a degenerate line.
      if(dist < rFrom + rTo + 1) return;
      const ux = dx / dist, uy = dy / dist;  // unit vector from source to target
      const x1 = dependencyPos.x + ux * rFrom;
      const y1 = dependencyPos.y + uy * rFrom;
      const x2 = dependentPos.x - ux * rTo;
      const y2 = dependentPos.y - uy * rTo;

      const isHl = !!selId && (selId===n.id || selId===dependency.id);
      const path = se('path');
      path.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`);
      path.setAttribute('stroke', isHl ? depHighlight : depColor);
      path.setAttribute('stroke-width', String((isHl ? 2 : 1.35) * lineThickness));
      path.setAttribute('stroke-dasharray', '6 5');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', isHl ? '.95' : '.72');
      path.setAttribute('stroke-linecap', 'round');
      // Tag so hover handler can show direction arrow on connected edges.
      path.setAttribute('data-dep', '1');
      path.setAttribute('data-dep-src', dependency.id);
      path.setAttribute('data-dep-dst', n.id);
      if(hoverNodeId && (hoverNodeId === dependency.id || hoverNodeId === n.id)){
        path.setAttribute('marker-end', 'url(#dep-arrow)');
      }
      lg.appendChild(path);
    });
  });
}

function updateDepHoverArrows(){
  const lg = document.getElementById('lg');
  lg.querySelectorAll('path[data-dep]').forEach(p => {
    const matches = hoverNodeId && (
      p.getAttribute('data-dep-src') === hoverNodeId ||
      p.getAttribute('data-dep-dst') === hoverNodeId
    );
    if(matches){
      p.setAttribute('marker-end', 'url(#dep-arrow)');
    } else {
      p.removeAttribute('marker-end');
    }
  });
}

function redrawLines(){
  document.getElementById('lg').innerHTML='';
  renderDependencyLines();
  renderHierarchyLines();
}

function renderNodes(){
  const ng = document.getElementById('ng');
  const nodeBg = cssVar('--bg-node');
  const neutralRing = cssVar('--edge-highlight');
  const labelMain = cssVar('--text-secondary');
  const labelExpl = cssVar('--text-subtle');
  const labelSel = cssVar('--text-primary');
  const fontFamily = cssVar('--font-ui');
  const nodeBorderThickness = cssNumberVar('--tree-node-border-thickness', 1);
  data.nodes.forEach(n => {
    const d = depthOf(n.id);
    const R = radiusFor(d);
    const s = statusMeta(n.status);
    const noStatus = n.status === 'none';
    const p = nodePos(n);
    const isSel = n.id === selId;

    const g = se('g');
    g.setAttribute('id','g-'+n.id);
    g.setAttribute('transform',`translate(${p.x},${p.y})`);
    g.setAttribute('data-nid',n.id);
    g.classList.add('node-group');
    g.style.cursor='pointer';

    // Selected outer ring
    if(isSel && !noStatus){
      const sr = se('circle');
      sr.setAttribute('r', R+8);
      sr.setAttribute('fill','none');
      sr.setAttribute('stroke', s.color);
      sr.setAttribute('stroke-width', String(1.5 * nodeBorderThickness));
      sr.setAttribute('opacity','.35');
      g.appendChild(sr);
    }
    // Background circle
    const bg = se('circle');
    bg.setAttribute('r', R);
    bg.setAttribute('fill', (isSel && !noStatus) ? withAlpha(s.color, 0.16) : nodeBg);
    g.appendChild(bg);
    // Inner glow appears on hover (CSS-driven), tinted by status color
    const glow = se('circle');
    glow.setAttribute('r', Math.max(2, R - 1.25));
    glow.setAttribute('fill', s.color);
    glow.setAttribute('class', 'node-glow');
    glow.setAttribute('pointer-events','none');
    g.appendChild(glow);
    // Ring
    if(!noStatus){
      const ring = se('circle');
      ring.setAttribute('r', R);
      ring.setAttribute('fill','none');
      ring.setAttribute('stroke', s.color);
      ring.setAttribute('stroke-width', String(s.sw * nodeBorderThickness));
      if(s.dash !== 'none') ring.setAttribute('stroke-dasharray', s.dash);
      ring.setAttribute('opacity', s.opacity+'');
      ring.setAttribute('pointer-events','none');
      g.appendChild(ring);
    } else {
      const ring = se('circle');
      ring.setAttribute('r', R);
      ring.setAttribute('fill','none');
      ring.setAttribute('stroke', neutralRing);
      ring.setAttribute('stroke-width', String(1.35 * nodeBorderThickness));
      ring.setAttribute('opacity', '.75');
      ring.setAttribute('pointer-events','none');
      g.appendChild(ring);
    }
    // Icon - size scales with radius
    const iconSize = Math.max(10, Math.round(R*1.0));
    const iconVal = (n.icon || '').trim();
    if(isImageIcon(iconVal)){
      const imgSize = Math.max(14, Math.round(R * 1.5));
      const img = se('image');
      img.setAttribute('x', String(-imgSize/2));
      img.setAttribute('y', String(-imgSize/2));
      img.setAttribute('width', String(imgSize));
      img.setAttribute('height', String(imgSize));
      img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', iconVal);
      img.setAttribute('href', iconVal);
      img.setAttribute('opacity', n.status==='expl' ? '.5' : '1');
      img.setAttribute('pointer-events','none');
      const explicitInvert = typeof n.invertInDark === 'boolean' ? n.invertInDark : null;
      applyIconInvertClass(img, iconVal, explicitInvert);
      g.appendChild(img);
    } else if(isFontAwesomeIcon(iconVal)){
      const def = resolveFaIcon(iconVal);
      if(def){
        const size = Math.max(14, Math.round(R * 1.2));
        const svg = se('svg');
        svg.setAttribute('class', 'node-fa-icon');
        svg.setAttribute('x', String(-size/2));
        svg.setAttribute('y', String(-size/2));
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('viewBox', (def.attributes && def.attributes.viewBox) || '0 0 512 512');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('pointer-events','none');
        svg.setAttribute('opacity', n.status==='expl' ? '.5' : '1');
        if(Array.isArray(def.children)){
          for(const c of def.children) svg.appendChild(buildSvgFromAbstract(c));
        }
        g.appendChild(svg);
      } else {
        const ico = se('text');
        ico.setAttribute('text-anchor','middle');
        ico.setAttribute('dominant-baseline','central');
        ico.setAttribute('font-size', iconSize);
        ico.setAttribute('opacity', n.status==='expl' ? '.5' : '1');
        ico.setAttribute('pointer-events','none');
        ico.textContent = '●';
        g.appendChild(ico);
      }
    } else {
      const ico = se('text');
      ico.setAttribute('text-anchor','middle');
      ico.setAttribute('dominant-baseline','central');
      ico.setAttribute('font-size', iconSize);
      ico.setAttribute('opacity', n.status==='expl' ? '.5' : '1');
      ico.setAttribute('pointer-events','none');
      ico.textContent = iconVal || '●';
      g.appendChild(ico);
    }
    // Labels (below circle)
    const lines = (n.title||'').split('\n');
    const labelFS = d<=1 ? 10 : (d===2 ? 9 : 8);
    const labelFW = d<=1 ? 700 : 600;
    const labelLS = d<=1 ? 2 : 1.2;
    const maxLines = d <= 1 ? 2 : 3;
    const maxChars = d <= 2 ? 15 : 13;
    const labelLines = lines.slice(0, maxLines).map(ln => {
      const clean = ln.trim();
      return clean.length > maxChars ? clean.slice(0, maxChars-1) + '…' : clean;
    });
    labelLines.forEach((ln,i) => {
      const t = se('text');
      t.setAttribute('text-anchor','middle');
      t.setAttribute('y', R + 16 + (i * (labelFS+3)));
      t.setAttribute('font-size', labelFS);
      t.setAttribute('font-weight', labelFW+'');
      t.setAttribute('letter-spacing', labelLS);
      t.setAttribute('font-family', fontFamily);
      t.setAttribute('fill', isSel ? labelSel : (n.status==='expl' ? labelExpl : labelMain));
      t.setAttribute('pointer-events','none');
      t.textContent = ln;
      g.appendChild(t);
    });
    // Invisible hit area
    const hit = se('circle');
    hit.setAttribute('r', R+12);
    hit.setAttribute('fill','transparent');
    g.appendChild(hit);

    // Events
    let clickDown={x:0,y:0};
    g.addEventListener('mousedown',e=>{
      e.stopPropagation();
      clickDown={x:e.clientX,y:e.clientY};
      if(!isEditMode){ dragN=null; return; }
      dragN=n; dragO={x:e.clientX,y:e.clientY};
      const cur = nodePos(n);
      dragNO={x:cur.x, y:cur.y};
    });
    g.addEventListener('click',e=>{
      e.stopPropagation();
      if(Math.abs(e.clientX-clickDown.x)<5 && Math.abs(e.clientY-clickDown.y)<5){
        selectNode(n.id);
      }
    });
    g.addEventListener('mouseenter',()=>{
      hoverNodeId = n.id;
      updateDepHoverArrows();
    });
    g.addEventListener('mouseleave',()=>{
      if(hoverNodeId === n.id){
        hoverNodeId = null;
        updateDepHoverArrows();
      }
    });
    ng.appendChild(g);
  });
}

/* ══════════════════════════════════════════════════
   SELECTION & POPUP
══════════════════════════════════════════════════ */
function selectNode(id){
  selId = (selId===id) ? null : id;
  render();
  if(selId){
    const n = data.nodes.find(x=>x.id===selId);
    if(n) showPopup(n);
  } else hidePopup();
}

svg.addEventListener('click',e=>{
  if(e.target===svg||e.target.tagName==='rect'){
    selId=null; render(); hidePopup();
  }
});

function showPopup(n){
  const s = statusMeta(n.status);
  const pop = document.getElementById('popup');
  const inEdit = isEditMode;

  const st = document.getElementById('pop-status');
  if(n.status === 'none'){
    st.style.display = 'none';
  } else {
    st.style.display = '';
    st.textContent = s.label;
    st.style.background = withAlpha(s.color, 0.13);
    st.style.color = s.color;
    st.style.border = '1px solid ' + withAlpha(s.color, 0.3);
  }

  document.getElementById('pop-title').textContent = titleOneLine(n);
  document.getElementById('pop-desc').textContent = n.desc||'';

  // Stage gates
  const stageSec = document.getElementById('pop-stage-s');
  const stageWrap = document.getElementById('pop-stage-gates');
  stageWrap.innerHTML = '';
  const hideStageGates = n.status === 'none' || n.status === 'plan';
  if(hideStageGates){
    stageSec.style.display = 'none';
  } else {
    const stageStatuses = normalizeStageStatuses(n);
    STAGE_GATES.forEach((stage, i) => {
      const el = document.createElement('span');
      const status = stageStatuses[stage.key] || 'pending';
      const statusClass = status === 'done'
        ? 'stage-done'
        : (status === 'in_progress'
          ? 'stage-in-progress'
          : (status === 'blocked' ? 'stage-blocked' : 'stage-pending'));
      el.className = `stage-chip ${statusClass}`;
      el.innerHTML = `<i class="${stage.iconClass}"></i><span>${stage.label}</span>`;
      stageWrap.appendChild(el);
    });
    stageSec.style.display = '';
  }

  // ETA / days to go
  const etaSec = document.getElementById('pop-eta-s');
  const etaEl = document.getElementById('pop-eta');
  const etaTxt = etaDaysText(n.etaDate || '');
  if(etaTxt){
    etaEl.textContent = etaTxt;
    etaSec.style.display = '';
  } else etaSec.style.display = 'none';

  // Link
  const linkSec = document.getElementById('pop-link-s');
  const linkEl = document.getElementById('pop-link');
  const nodeLink = normalizeLink(n.link || '');
  if(nodeLink){
    linkEl.href = nodeLink;
    linkEl.textContent = nodeLink;
    linkSec.style.display = '';
  } else {
    linkEl.href = '#';
    linkEl.textContent = '';
    linkSec.style.display = 'none';
  }

  // Parent
  const parent = n.parent ? data.nodes.find(x=>x.id===n.parent) : null;
  const parSec = document.getElementById('pop-parent-s');
  const parEl = document.getElementById('pop-parent');
  if(inEdit && parent){
    parEl.innerHTML = '';
    const el = document.createElement('div');
    el.className='pop-link';
    el.textContent = '↑ ' + titleOneLine(parent);
    el.onclick = ()=>selectNode(parent.id);
    parEl.appendChild(el);
    parSec.style.display = '';
  } else parSec.style.display='none';

  // Children
  const kids = getChildren(n.id);
  const kSec = document.getElementById('pop-kids-s');
  const kEl = document.getElementById('pop-kids');
  kEl.innerHTML='';
  if(inEdit && kids.length){
    kids.forEach(k => {
      const el = document.createElement('div');
      el.className='pop-link';
      el.textContent = '↓ ' + titleOneLine(k);
      el.onclick = ()=>selectNode(k.id);
      kEl.appendChild(el);
    });
    kSec.style.display='';
  } else kSec.style.display='none';

  // Dependencies (cross-stream)
  const deps = (n.deps || [])
    .map(id => getNodeById(id))
    .filter(Boolean);
  const depSec = document.getElementById('pop-deps-s');
  const depEl = document.getElementById('pop-deps');
  depEl.innerHTML = '';
  if(inEdit && deps.length){
    deps.forEach(dn => {
      const el = document.createElement('div');
      el.className = 'pop-link';
      el.textContent = '↘ depends on: ' + titleOneLine(dn);
      el.onclick = ()=>selectNode(dn.id);
      depEl.appendChild(el);
    });
    depSec.style.display = '';
  } else depSec.style.display = 'none';

  // Reverse dependencies
  const blocks = nodesDependingOn(n.id);
  const blkSec = document.getElementById('pop-blocks-s');
  const blkEl = document.getElementById('pop-blocks');
  blkEl.innerHTML = '';
  if(inEdit && blocks.length){
    blocks.forEach(bn => {
      const el = document.createElement('div');
      el.className = 'pop-link';
      el.textContent = '↗ enables: ' + titleOneLine(bn);
      el.onclick = ()=>selectNode(bn.id);
      blkEl.appendChild(el);
    });
    blkSec.style.display = '';
  } else blkSec.style.display = 'none';

  // Hide edit-only popup action buttons in view mode.
  document.getElementById('pop-edit').style.display = inEdit ? '' : 'none';
  document.getElementById('pop-addchild').style.display = inEdit ? '' : 'none';
  document.getElementById('pop-close2').style.display = inEdit ? '' : 'none';

  posPopup(n);
  pop.style.display='block';
  pop.style.opacity='0'; pop.style.transform='scale(.95)';
  requestAnimationFrame(()=>{
    pop.style.transition='opacity .18s, transform .18s';
    pop.style.opacity='1'; pop.style.transform='scale(1)';
  });
}

function posPopup(n){
  const d = depthOf(n.id);
  const r = radiusFor(d);
  const p = nodePos(n);
  const scr = toScreen(p.x, p.y);
  const pop = document.getElementById('popup');
  const pw = 260, ph = pop.offsetHeight || 220;
  const vw=window.innerWidth, vh=window.innerHeight;
  let tx = scr.x + r*sc + 14;
  if(tx+pw > vw-10) tx = scr.x - r*sc - pw - 14;
  let ty = scr.y - ph/2;
  ty = Math.max(10, Math.min(vh-ph-10, ty));
  pop.style.left = tx+'px'; pop.style.top = ty+'px';
}

function hidePopup(){
  const pop=document.getElementById('popup');
  pop.style.transition='opacity .15s';
  pop.style.opacity='0';
  setTimeout(()=>pop.style.display='none', 150);
}

document.getElementById('pop-x').onclick=()=>{selId=null;render();hidePopup()};
document.getElementById('pop-close2').onclick=()=>{selId=null;render();hidePopup()};
document.getElementById('pop-edit').onclick=()=>{
  if(!ensureEditMode('edit nodes')) return;
  if(selId) openEdit(selId);
};
document.getElementById('pop-addchild').onclick=()=>{
  if(!ensureEditMode('add child nodes')) return;
  if(selId) openEdit('__new__', selId);
};

/* ══════════════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════════════ */
let editId=null;

function filterDependencyOptions(){
  const q = (document.getElementById('e-deps-search').value || '').trim().toLowerCase();
  const depSel = document.getElementById('e-deps');
  [...depSel.options].forEach(opt => {
    const show = !q || opt.textContent.toLowerCase().includes(q);
    opt.hidden = !show;
  });
}

function openEdit(id, defaultParent){
  if(!ensureEditMode('edit nodes')) return;
  editId = id;
  const isNew = id === '__new__';
  const n = isNew ? null : data.nodes.find(x=>x.id===id);

  document.getElementById('e-head').textContent = isNew ? 'New Node' : 'Edit Node';
  document.getElementById('e-title').value = n ? (n.title||'').replace(/\n/g,'\\n') : '';
  document.getElementById('e-desc').value = n ? (n.desc||'') : '';
  document.getElementById('e-status').value = n ? (n.status||'plan') : 'plan';
  document.getElementById('e-icon').value = n ? (n.icon||'') : '';
  document.getElementById('e-link').value = n ? (n.link||'') : '';
  document.getElementById('e-eta').value = n ? (n.etaDate||'') : '';
  document.getElementById('e-child-layout').value = n ? resolvedChildLayout(n) : DEFAULT_LAYOUT;
  document.getElementById('e-attach').value = (n && normalizeLayoutValue(n.attach)) || '';
  document.getElementById('e-del').style.display = n ? '' : 'none';

  const pSel = document.getElementById('e-parent');
  pSel.innerHTML = '<option value="">— root —</option>';
  data.nodes.forEach(x => {
    if(x.id === id) return;  // can't be own parent
    const opt = document.createElement('option');
    opt.value = x.id;
    opt.textContent = '  '.repeat(depthOf(x.id)) + titleOneLine(x);
    opt.selected = n ? x.id===n.parent : x.id===defaultParent;
    pSel.appendChild(opt);
  });

  const depSel = document.getElementById('e-deps');
  depSel.innerHTML = '';
  document.getElementById('e-deps-search').value = '';
  const selectedDeps = new Set((n && Array.isArray(n.deps)) ? n.deps : []);
  data.nodes.forEach(x => {
    if(x.id === id) return;
    const opt = document.createElement('option');
    opt.value = x.id;
    opt.textContent = `${x.id} — ${titleOneLine(x)}`;
    opt.selected = selectedDeps.has(x.id);
    depSel.appendChild(opt);
  });
  filterDependencyOptions();

  // Stage status editors
  const stageWrap = document.getElementById('e-stage-statuses');
  stageWrap.innerHTML = '';
  const stageStatuses = normalizeStageStatuses(n || {});
  STAGE_GATES.forEach(stage => {
    const row = document.createElement('div');
    row.className = 'stage-edit-row';

    const lbl = document.createElement('div');
    lbl.className = 'stage-edit-label';
    lbl.innerHTML = `<i class="${stage.iconClass}"></i><span>${stage.label}</span>`;

    const sel = document.createElement('select');
    sel.className = 'stage-status-input';
    sel.setAttribute('data-stage-key', stage.key);
    sel.innerHTML = `
      <option value="pending">Pending</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
      <option value="blocked">Blocked</option>
    `;
    sel.value = stageStatuses[stage.key] || 'pending';

    row.appendChild(lbl);
    row.appendChild(sel);
    stageWrap.appendChild(row);
  });

  document.getElementById('emod').classList.add('open');
  document.getElementById('e-title').focus();
}

function closeEdit(){document.getElementById('emod').classList.remove('open');editId=null}
document.getElementById('e-cancel').onclick=closeEdit;
document.getElementById('emod').addEventListener('click',e=>{if(e.target===document.getElementById('emod'))closeEdit()});
document.getElementById('e-deps-search').addEventListener('input', filterDependencyOptions);
document.getElementById('e-deps-search').addEventListener('keydown',e=>{
  if(e.key === 'Escape'){
    e.currentTarget.value = '';
    filterDependencyOptions();
  }
});

document.getElementById('e-save-top').onclick = () => document.getElementById('e-save').click();
document.getElementById('e-save').onclick=()=>{
  const raw = document.getElementById('e-title').value.trim();
  if(!raw){alert('Title required.');return;}
  const title = raw.replace(/\\n/g,'\n');
  const desc = document.getElementById('e-desc').value.trim();
  const status = document.getElementById('e-status').value;
  const icon = document.getElementById('e-icon').value.trim() || '●';
  const link = normalizeLink(document.getElementById('e-link').value);
  const etaDate = document.getElementById('e-eta').value || '';
  const stageStatuses = {};
  document.querySelectorAll('#e-stage-statuses .stage-status-input').forEach(el => {
    const k = el.getAttribute('data-stage-key');
    const v = String(el.value || '').toLowerCase();
    if(k && STAGE_GATES.some(s => s.key === k) && STAGE_STATUSES.includes(v)){
      stageStatuses[k] = v;
    }
  });
  const parent = document.getElementById('e-parent').value || null;
  const deps = [...document.getElementById('e-deps').selectedOptions].map(o => o.value);
  const childLayoutRaw = normalizeLayoutValue(document.getElementById('e-child-layout').value);
  const childLayout = childLayoutRaw && childLayoutRaw !== DEFAULT_LAYOUT ? childLayoutRaw : null;
  const attach = normalizeLayoutValue(document.getElementById('e-attach').value);

  if(editId === '__new__'){
    const newId = 'node-'+Date.now();
    const created = {id:newId, title, desc, status, icon, link, etaDate, stageStatuses, parent, deps};
    if(childLayout) created.childLayout = childLayout;
    if(attach) created.attach = attach;
    data.nodes.push(created);
    editId = newId;
  } else {
    const n = data.nodes.find(x=>x.id===editId);
    if(n){
      // Prevent cycle: new parent can't be self or a descendant
      if(parent && isDescendant(parent, editId)){
        alert('Cannot set parent to a descendant.');
        return;
      }
      Object.assign(n, {title, desc, status, icon, link, etaDate, stageStatuses, parent, deps});
      if(childLayout) n.childLayout = childLayout; else delete n.childLayout;
      if(attach) n.attach = attach; else delete n.attach;
    }
  }
  normalizeAllDeps();
  // When structure changes, re-layout (but preserve manually-positioned overrides)
  autoLayout();
  closeEdit();
  render();
  if(editId){ selId=editId; const n=data.nodes.find(x=>x.id===editId); if(n) showPopup(n); }
};

function isDescendant(candidateId, ancestorId){
  // Is candidateId a descendant of ancestorId?
  let cur = data.nodes.find(n=>n.id===candidateId);
  while(cur && cur.parent){
    if(cur.parent === ancestorId) return true;
    cur = data.nodes.find(n=>n.id===cur.parent);
  }
  return false;
}

function findDropParentForNode(node){
  const src = nodePos(node);
  const srcR = radiusFor(depthOf(node.id));
  let best = null;
  let bestDist = Infinity;
  data.nodes.forEach(target => {
    if(target.id === node.id) return;
    if(isDescendant(target.id, node.id)) return;
    const tp = nodePos(target);
    const tr = radiusFor(depthOf(target.id));
    const dx = src.x - tp.x;
    const dy = src.y - tp.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const snap = Math.max(40, srcR + tr + 10);
    if(dist <= snap && dist < bestDist){
      best = target;
      bestDist = dist;
    }
  });
  return best;
}

function maybeReparentDraggedNode(node){
  if(!isEditMode || !node) return false;
  const dropParent = findDropParentForNode(node);
  if(!dropParent) return false;
  if(node.parent === dropParent.id) return false;
  node.parent = dropParent.id;
  delete data.positions[node.id];
  autoLayout();
  render();
  if(selId === node.id) showPopup(node);
  return true;
}

document.getElementById('e-del').onclick=()=>{
  if(!editId) return;
  const kids = getChildren(editId);
  const msg = kids.length ? `Delete this node and reassign its ${kids.length} children to its parent?` : 'Delete this node?';
  if(!confirm(msg)) return;
  const n = data.nodes.find(x=>x.id===editId);
  const newParent = n ? n.parent : null;
  // Re-parent children to this node's parent
  data.nodes.forEach(x => { if(x.parent === editId) x.parent = newParent; });
  data.nodes = data.nodes.filter(x => x.id !== editId);
  data.nodes.forEach(x => {
    if(Array.isArray(x.deps)) x.deps = x.deps.filter(id => id !== editId);
  });
  delete data.positions[editId];
  normalizeAllDeps();
  autoLayout();
  closeEdit();
  selId=null;
  render();
  hidePopup();
};

document.getElementById('btn-add').onclick=()=>openEdit('__new__');

/* ══════════════════════════════════════════════════
   RE-LAYOUT
══════════════════════════════════════════════════ */
document.getElementById('btn-layout').onclick=()=>{
  if(!ensureEditMode('re-layout and reposition nodes')) return;
  if(confirm('Re-layout will reset any manual positioning. Continue?')){
    data.positions = {};
    autoLayout();
    render();
    fitView();
  }
};

/* ══════════════════════════════════════════════════
   JSON
══════════════════════════════════════════════════ */
document.getElementById('btn-json').onclick=()=>{
  document.getElementById('jtx').value = JSON.stringify(data, null, 2);
  document.getElementById('jmod').classList.add('open');
};
document.getElementById('j-close').onclick=()=>document.getElementById('jmod').classList.remove('open');
document.getElementById('jmod').addEventListener('click',e=>{if(e.target===document.getElementById('jmod'))document.getElementById('jmod').classList.remove('open')});
document.getElementById('j-copy').onclick=()=>{
  navigator.clipboard.writeText(document.getElementById('jtx').value)
    .then(()=>{const b=document.getElementById('j-copy');b.textContent='✓';setTimeout(()=>b.textContent='Copy',2000)});
};
document.getElementById('j-apply').onclick=()=>{
  if(!ensureEditMode('apply JSON changes')) return;
  try{
    const d = JSON.parse(document.getElementById('jtx').value);
    if(!Array.isArray(d.nodes)) throw new Error('Missing nodes array');
    if(!d.positions) d.positions = {};
    data = d;
    roundPositionOverrides();
    normalizeAllDeps();
    document.getElementById('jmod').classList.remove('open');
    document.getElementById('title-text').textContent = data.title || 'AI Programs of Work';
    selId=null;
    autoLayout();
    render();
    hidePopup();
    setTimeout(fitView, 80);
  }catch(e){alert('Invalid JSON: '+e.message)}
};

/* ══════════════════════════════════════════════════
   TITLE
══════════════════════════════════════════════════ */
document.getElementById('title-text').onclick=()=>{
  if(!ensureEditMode('rename the tree')) return;
  document.getElementById('t-inp').value = data.title || '';
  document.getElementById('tmod').classList.add('open');
  document.getElementById('t-inp').focus();
};
document.getElementById('t-cancel').onclick=()=>document.getElementById('tmod').classList.remove('open');
document.getElementById('tmod').addEventListener('click',e=>{if(e.target===document.getElementById('tmod'))document.getElementById('tmod').classList.remove('open')});
document.getElementById('t-save').onclick=()=>{
  const v = document.getElementById('t-inp').value.trim();
  if(v){data.title=v;document.getElementById('title-text').textContent=v;}
  document.getElementById('tmod').classList.remove('open');
};
document.getElementById('t-inp').addEventListener('keydown',e=>{
  if(e.key==='Enter') document.getElementById('t-save').click();
  if(e.key==='Escape') document.getElementById('tmod').classList.remove('open');
});

/* ══════════════════════════════════════════════════
   KEYBOARD
══════════════════════════════════════════════════ */
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    closeEdit();
    document.getElementById('jmod').classList.remove('open');
    document.getElementById('tmod').classList.remove('open');
    closeSettingsPanel();
    selId=null; render(); hidePopup();
  }
  if(e.key==='e' && selId && !document.getElementById('emod').classList.contains('open')){
    openEdit(selId);
  }
});

/* ══════════════════════════════════════════════════
   SETTINGS PANEL
══════════════════════════════════════════════════ */
function applyCssSettings(){
  const root = document.documentElement.style;
  root.setProperty('--tree-line-thickness', String(settings.lineThickness));
  root.setProperty('--tree-node-border-thickness', String(settings.nodeBorderThickness));
}
function applyAllSettings(){
  applyCssSettings();
  applyThemeFromSettings();
  autoLayout();
  render();
}
function toggleSettingsPanel(){
  const p = document.getElementById('settings-panel');
  const open = !p.classList.contains('open');
  p.classList.toggle('open', open);
  p.setAttribute('aria-hidden', String(!open));
}
function closeSettingsPanel(){
  const p = document.getElementById('settings-panel');
  p.classList.remove('open');
  p.setAttribute('aria-hidden', 'true');
}
function updateSettingsValueLabels(){
  const setText = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setText('s-line-thickness-val',  settings.lineThickness.toFixed(1) + '×');
  setText('s-node-border-val',     settings.nodeBorderThickness.toFixed(1) + '×');
  setText('s-vertical-gap-val',    settings.verticalGap + 'px');
  setText('s-side-offset-val',     settings.sideOffset + 'px');
  setText('s-level-gap-val',       settings.levelGapScale.toFixed(2) + '×');
  setText('s-side-angle-val',      settings.sideAngle + '°');
  document.querySelectorAll('#s-theme button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === settings.theme);
  });
}
function populateSettingsInputs(){
  document.getElementById('s-line-thickness').value = settings.lineThickness;
  document.getElementById('s-node-border').value    = settings.nodeBorderThickness;
  document.getElementById('s-vertical-gap').value   = settings.verticalGap;
  document.getElementById('s-side-offset').value    = settings.sideOffset;
  document.getElementById('s-level-gap').value      = settings.levelGapScale;
  document.getElementById('s-side-angle').value     = settings.sideAngle;
  updateSettingsValueLabels();
}
function initSettingsPanel(){
  populateSettingsInputs();

  // Theme segmented control
  document.querySelectorAll('#s-theme button').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.theme = btn.getAttribute('data-val');
      saveSettings();
      applyThemeFromSettings();
      updateSettingsValueLabels();
    });
  });

  const bind = (id, key, {parse = parseFloat, needsLayout = false, needsCss = false} = {}) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('input', () => {
      settings[key] = parse(el.value);
      updateSettingsValueLabels();
      if(needsCss) applyCssSettings();
      if(needsLayout) autoLayout();
      render();
    });
    el.addEventListener('change', saveSettings);
  };
  bind('s-line-thickness', 'lineThickness',       { needsCss: true });
  bind('s-node-border',    'nodeBorderThickness', { needsCss: true });
  bind('s-vertical-gap',   'verticalGap',         { parse: v => parseInt(v,10), needsLayout: true });
  bind('s-side-offset',    'sideOffset',          { parse: v => parseInt(v,10), needsLayout: true });
  bind('s-level-gap',      'levelGapScale',       { needsLayout: true });
  bind('s-side-angle',     'sideAngle',           { parse: v => parseInt(v,10), needsLayout: true });

  document.getElementById('settings-close').addEventListener('click', closeSettingsPanel);
  document.getElementById('s-reset').addEventListener('click', () => {
    settings = {...DEFAULT_SETTINGS};
    saveSettings();
    populateSettingsInputs();
    applyAllSettings();
  });

  // Close on outside click
  document.addEventListener('mousedown', e => {
    const panel = document.getElementById('settings-panel');
    if(!panel.classList.contains('open')) return;
    if(panel.contains(e.target)) return;
    if(e.target.closest('#btn-settings')) return;
    closeSettingsPanel();
  });
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
function init(){
  loadSettings();
  data = loadDataFromSources();
  roundPositionOverrides();
  document.getElementById('title-text').textContent = data.title || 'AI Programs of Work';
  applyCssSettings();
  applyThemeFromSettings();
  initSettingsPanel();
  normalizeAllDeps();
  updateEditModeUI();
  autoLayout();
  render();
  setTimeout(fitView, 80);
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if(settings.theme === 'auto') applyThemeFromSettings();
  });
}
init();
