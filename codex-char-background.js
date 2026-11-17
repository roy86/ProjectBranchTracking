/**
 * codex-char-background.js
 *
 * Standalone, dependency-free port of the animated ASCII / character
 * background used on the Codex web login screen.
 *
 * Pixel-parity with the original: the embedded noise function is the
 * exact `open-simplex-noise` v2 makeNoise3D used by the bundle (with
 * its LCG seed mutator and lattice/kernel data tables), and the
 * dither/ramp/composite pipeline matches the original `H5` hook and
 * `B5` renderer step-for-step.
 *
 * Usage:
 *   const fx = new CodexCharBackground({
 *     container: document.getElementById('bg'),
 *     columns: 130, rows: 100,
 *     mode: 'noise',                 // 'noise' | 'video' | 'composite'
 *     ramp: '@%#*+=-:. ',
 *     backgroundColor: '#131313',    // matches sideBar.background in dark theme
 *     foregroundColor: '#5a5a5a',    // approximates checkbox.border
 *     autoCover: true,
 *     vignette: true,
 *     videoSrc: null,
 *   });
 *   fx.start();
 *
 * Public API:
 *   new CodexCharBackground(options)
 *   .start() / .stop() / .destroy()
 *   .setMode(mode) / .getMode()
 *   .setRamp(string) / .cycleRamp()
 *   .setVideoSrc(url)
 *   .setSize(cols, rows)
 *   .setColors({ foreground, background })
 *   .setFps(fps)
 *   .setScale(n)            // applies only when autoCover is false
 *   CodexCharBackground.RAMPS  // built-in ramp set
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define([], factory);
  else root.CodexCharBackground = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULT_RAMPS = [
    '█▓▒░ ',
    '■□▲△●○◆◇',
    '⎺⎻⎼⎽⎾⎿',
    'o p e n a i ',
    '█▉▊▋▌▍▎▏',
    '█▓▒░-=:. ',
    '█▇▆▅▄▃▂▁',
    'C O D E X',
    '█■▲●◉○. ',
    'WMBRXVIl. ',
    '█#A*-. ',
    '●◉○· ',
  ];
  const DEFAULT_RAMP = '@%#*+=-:. ';

  // ===================================================================
  // OpenSimplex noise 3D — verbatim port of `open-simplex-noise` v2
  // (the package the original Codex bundle imports as Ype.makeNoise3D).
  // Algorithm by Kurt Spencer, JS port by joshforisha (MIT licensed).
  // ===================================================================

  // LCG seed mutator (V5 in the bundle)
  function lcgStep(buf) {
    const out = new Uint32Array(1);
    out[0] = buf[0] * 1664525 + 1013904223;
    return out;
  }

  const NORM_3D = 1 / 103;
  const SQUISH_3D = 1 / 3;
  const STRETCH_3D = (1 / 2 - 1) / 3; // = -1/6

  function makeContribution3D(multiplier, xsb, ysb, zsb) {
    return {
      dx: -xsb - multiplier * STRETCH_3D,
      dy: -ysb - multiplier * STRETCH_3D,
      dz: -zsb - multiplier * STRETCH_3D,
      xsb, ysb, zsb,
      next: undefined,
    };
  }

  // Kernel base shapes (`s` in the bundle)
  const BASE_3D = [
    [0,0,0,0, 1,1,0,0, 1,0,1,0, 1,0,0,1],
    [2,1,1,0, 2,1,0,1, 2,0,1,1, 3,1,1,1],
    [1,1,0,0, 1,0,1,0, 1,0,0,1, 2,1,1,0, 2,1,0,1, 2,0,1,1],
  ];

  // Gradient table (`c` in the bundle), 24 gradients × 3 components = 72 values
  const GRADIENTS_3D = [
    -11, 4, 4,   -4, 11, 4,   -4, 4, 11,
     11, 4, 4,    4, 11, 4,    4, 4, 11,
    -11,-4, 4,   -4,-11, 4,   -4,-4, 11,
     11,-4, 4,    4,-11, 4,    4,-4, 11,
    -11, 4,-4,   -4, 11,-4,   -4, 4,-11,
     11, 4,-4,    4, 11,-4,    4, 4,-11,
    -11,-4,-4,   -4,-11,-4,   -4,-4,-11,
     11,-4,-4,    4,-11,-4,    4,-4,-11,
  ];

  // Lookup pairs (`l` in the bundle) — maps lattice keys to kernel indices
  const LOOKUP_PAIRS_3D = [
    0,2, 1,1, 2,2, 5,1, 6,0, 7,0, 32,2, 34,2, 129,1, 133,1, 160,5, 161,5,
    518,0, 519,0, 546,4, 550,4, 645,3, 647,3, 672,5, 673,5, 674,4, 677,3, 678,4, 679,3,
    680,13, 681,13, 682,12, 685,14, 686,12, 687,14, 712,20, 714,18, 809,21, 813,23, 840,20, 841,21,
    1198,19, 1199,22, 1226,18, 1230,19, 1325,23, 1327,22, 1352,15, 1353,17, 1354,15, 1357,17, 1358,16, 1359,16,
    1360,11, 1361,10, 1362,11, 1365,10, 1366,9, 1367,9, 1392,11, 1394,11, 1489,10, 1493,10, 1520,8, 1521,8,
    1878,9, 1879,9, 1906,7, 1910,7, 2005,6, 2007,6, 2032,8, 2033,8, 2034,7, 2037,6, 2038,7, 2039,6,
  ];

  // Kernel offsets (`u` in the bundle), 9 ints per kernel
  const KERNEL_OFFSETS_3D = [
    0, 0,1,-1,0, 0,1,0,-1,
    0, 0,-1,1,0, 0,0,1,-1,
    0, 0,-1,0,1, 0,0,-1,1,
    0, 2,1,1,0, 1,1,1,-1,
    0, 2,1,0,1, 1,1,-1,1,
    0, 2,0,1,1, 1,-1,1,1,
    1, 3,2,1,0, 3,1,2,0,
    1, 3,2,0,1, 3,1,0,2,
    1, 3,0,2,1, 3,0,1,2,
    1, 1,1,0,0, 2,2,0,0,
    1, 1,0,1,0, 2,0,2,0,
    1, 1,0,0,1, 2,0,0,2,
    2, 0,0,0,0, 1,1,-1,1,
    2, 0,0,0,0, 1,-1,1,1,
    2, 0,0,0,0, 1,1,1,-1,
    2, 3,1,1,1, 2,0,0,2,
    2, 3,1,1,1, 2,0,2,0,
    2, 3,1,1,1, 2,2,0,0,
    2, 1,-1,1,1, 2,0,0,2,
    2, 1,1,-1,1, 2,0,2,0,
    2, 1,1,1,-1, 2,2,0,0,
    2, 2,0,0,2, 1,-1,1,1,
    2, 2,0,2,0, 1,1,-1,1,
    2, 2,2,0,0, 1,1,1,-1,
  ];

  function makeNoise3D(seed) {
    // Build kernel linked-lists from BASE_3D using KERNEL_OFFSETS_3D
    const kernels = [];
    for (let d = 0; d < KERNEL_OFFSETS_3D.length; d += 9) {
      const base = BASE_3D[KERNEL_OFFSETS_3D[d]];
      let head = null, prev = null, last = null;
      for (let h = 0; h < base.length; h += 4) {
        const node = makeContribution3D(base[h], base[h+1], base[h+2], base[h+3]);
        if (head === null) head = node;
        if (prev) prev.next = node;
        prev = node;
        last = node;
      }
      last.next = makeContribution3D(KERNEL_OFFSETS_3D[d+1], KERNEL_OFFSETS_3D[d+2], KERNEL_OFFSETS_3D[d+3], KERNEL_OFFSETS_3D[d+4]);
      last.next.next = makeContribution3D(KERNEL_OFFSETS_3D[d+5], KERNEL_OFFSETS_3D[d+6], KERNEL_OFFSETS_3D[d+7], KERNEL_OFFSETS_3D[d+8]);
      kernels[d / 9] = head;
    }

    // Lookup map: lattice key -> kernel head node
    const lookup = [];
    for (let i = 0; i < LOOKUP_PAIRS_3D.length; i += 2) {
      lookup[LOOKUP_PAIRS_3D[i]] = kernels[LOOKUP_PAIRS_3D[i + 1]];
    }

    // Permutation tables (Fisher-Yates with LCG-driven random)
    const perm = new Uint8Array(256);
    const perm3 = new Uint8Array(256);   // gradient index * 3
    const source = new Uint8Array(256);
    for (let i = 0; i < 256; i++) source[i] = i;

    let state = new Uint32Array(1);
    state[0] = seed >>> 0;
    state = lcgStep(lcgStep(lcgStep(state)));

    for (let i = 255; i >= 0; i--) {
      state = lcgStep(state);
      let r = (state[0] + 31) % (i + 1);
      if (r < 0) r += i + 1;
      perm[i] = source[r];
      perm3[i] = (perm[i] % 24) * 3;
      source[r] = source[i];
    }

    return function noise3D(x, y, z) {
      const stretchOffset = (x + y + z) * STRETCH_3D;
      const xs = x + stretchOffset;
      const ys = y + stretchOffset;
      const zs = z + stretchOffset;

      const xsb = Math.floor(xs);
      const ysb = Math.floor(ys);
      const zsb = Math.floor(zs);

      const squishOffset = (xsb + ysb + zsb) * SQUISH_3D;
      const dx0 = x - (xsb + squishOffset);
      const dy0 = y - (ysb + squishOffset);
      const dz0 = z - (zsb + squishOffset);

      const xins = xs - xsb;
      const yins = ys - ysb;
      const zins = zs - zsb;
      const inSum = xins + yins + zins;

      const hash =
        (yins - zins + 1) |
        ((xins - yins + 1) << 1) |
        ((xins - zins + 1) << 2) |
        (inSum << 3) |
        ((inSum + zins) << 5) |
        ((inSum + yins) << 7) |
        ((inSum + xins) << 9);

      let value = 0;
      for (let c = lookup[hash]; c !== undefined; c = c.next) {
        const dx = dx0 + c.dx;
        const dy = dy0 + c.dy;
        const dz = dz0 + c.dz;
        const attn = 2 - dx * dx - dy * dy - dz * dz;
        if (attn > 0) {
          const px = xsb + c.xsb;
          const py = ysb + c.ysb;
          const pz = zsb + c.zsb;
          const gi = perm3[(perm[(perm[px & 255] + py) & 255] + pz) & 255];
          const valuePart = GRADIENTS_3D[gi] * dx + GRADIENTS_3D[gi + 1] * dy + GRADIENTS_3D[gi + 2] * dz;
          value += attn * attn * attn * attn * valuePart;
        }
      }
      return value * NORM_3D;
    };
  }

  // ===================================================================
  // Floyd-Steinberg dithering — matches the original `k` callback
  // ===================================================================
  function ditherGrid(grid, levels) {
    const rows = grid.length;
    const cols = rows > 0 ? grid[0].length : 0;
    const out = grid.map((r) => r.slice());
    const step = 255 / (levels - 1);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const old = out[y][x];
        const quant = Math.round(old / step) * step;
        out[y][x] = quant;
        const err = old - quant;
        if (x + 1 < cols)                  out[y][x + 1]     += (err * 7) / 16;
        if (y + 1 < rows && x > 0)         out[y + 1][x - 1] += (err * 3) / 16;
        if (y + 1 < rows)                  out[y + 1][x]     += (err * 5) / 16;
        if (y + 1 < rows && x + 1 < cols)  out[y + 1][x + 1] += (err * 1) / 16;
      }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = out[y][x];
        out[y][x] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    return out;
  }

  // ===================================================================
  // Main class
  // ===================================================================
  class CodexCharBackground {
    constructor(opts) {
      opts = opts || {};
      if (!opts.container) throw new Error('CodexCharBackground: `container` is required');

      this.container          = opts.container;
      // Auto-size derives columns/rows from container size + cell metrics
      // on init and on container resize. Defaults on when the caller didn't
      // pin a fixed grid; passing `columns`/`rows` opts you out unless you
      // also explicitly set `autoSize: true` (initial values seed the grid
      // until the first measurement).
      const hasExplicitSize = (opts.columns != null) || (opts.rows != null);
      this.autoSize           = opts.autoSize ?? !hasExplicitSize;
      this.columns            = opts.columns ?? 130;
      this.rows               = opts.rows ?? 100;
      this.mode               = opts.mode ?? 'noise';
      this.ramp               = opts.ramp ?? DEFAULT_RAMP;
      this.fontSize           = opts.fontSize ?? 12;
      this.fontFamily         = opts.fontFamily ?? 'monospace';
      this.foregroundColor    = opts.foregroundColor ?? '#5a5a5a';
      this.backgroundColor    = opts.backgroundColor ?? '#131313';
      this.fps                = opts.fps ?? 20;
      this.autoCover          = opts.autoCover ?? true;
      this.vignette           = opts.vignette ?? false;
      this.noiseSpeed         = opts.noiseSpeed ?? 0.03;
      this.noiseScale         = opts.noiseScale ?? 0.15;
      this.videoSrc           = opts.videoSrc ?? null;
      this.compositeThreshold = opts.compositeThreshold ?? 110;
      this.scale              = opts.scale ?? 0.75;       // used when !autoCover
      this.borderRadius       = opts.borderRadius ?? (this.autoCover ? '0px' : '10px');
      this.RAMPS              = DEFAULT_RAMPS.slice();

      this._noise = makeNoise3D(opts.seed ?? Date.now());
      this._t = 0;
      this._rampIndex = -1;
      this._rafId = null;
      this._lastFrame = 0;
      this._running = false;
      this._lastJoined = '';

      this._video = null;
      this._scratch = null;
      this._scratchCtx = null;
      this._objectUrl = null;
      this._resizeObs = null;
      this._cellW = 8;
      this._cellH = 16;

      this._buildDom();

      this._onVisibility = () => { this._lastFrame = 0; };
      document.addEventListener('visibilitychange', this._onVisibility);
      this._onResize = () => { this._handleResize(); };
      window.addEventListener('resize', this._onResize);

      if (typeof ResizeObserver !== 'undefined' && (this.autoCover || this.autoSize)) {
        this._resizeObs = new ResizeObserver(() => this._handleResize());
        this._resizeObs.observe(this.container);
      }

      if (this.videoSrc) this.setVideoSrc(this.videoSrc);

      // Match B5: wait for fonts to be ready before the first draw so cell metrics are correct.
      const firstDraw = () => {
        if (this._destroyed) return;
        if (this.autoSize) this._recomputeGrid();
        this._draw();
      };
      if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(firstDraw, firstDraw);
      } else {
        requestAnimationFrame(firstDraw);
      }
    }

    // ---- DOM setup ----
    // DOM layout mirrors the original Codex login wrapper:
    //
    //   outer       ← solid backgroundColor, sized to container (NEVER masked)
    //     maskLayer ← absolute inset-0, pointer-events:none, holds the mask
    //                 and the optional -ml-6 horizontal nudge from the original
    //       posWrap ← centers/scales the mount
    //         mount ← inline-block, holds the canvas
    //           canvas
    //
    // Putting the mask on `maskLayer` (which only contains the canvas) means
    // the mask fades the *characters* to transparent and reveals the solid
    // dark `outer` underneath — same colour, smooth fade. Putting the mask on
    // `outer` (as the previous version did) instead exposed whatever was
    // behind the container, which is what made the vignette look harsh.
    _buildDom() {
      // Outer: solid dark backdrop. No mask, no transform.
      this._outer = document.createElement('div');
      this._outer.style.color = this.foregroundColor;
      this._outer.style.background = this.backgroundColor;
      this._outer.style.position = 'relative';
      this._outer.style.width = '100%';
      this._outer.style.height = '100%';
      this._outer.style.overflow = 'hidden';

      // Mask layer: absolute, fills outer. Mask applied here when vignette is on.
      this._maskLayer = document.createElement('div');
      Object.assign(this._maskLayer.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        // Match original "-ml-6" (-1.5rem) horizontal nudge; small visual asymmetry.
        marginLeft: this.vignette ? '-1.5rem' : '0',
      });

      if (this.vignette) {
        // Use the gentler stop set for both prefixes. The original passed a
        // steeper set to `-webkit-mask-image`, which made Safari visibly
        // harsher than other browsers; aligning both gives a consistent fade.
        const mask = 'radial-gradient(ellipse at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0) 78%)';
        this._maskLayer.style.maskImage = mask;
        this._maskLayer.style.maskRepeat = 'no-repeat';
        this._maskLayer.style.maskSize = '100% 100%';
        this._maskLayer.style.setProperty('-webkit-mask-image', mask);
        this._maskLayer.style.setProperty('-webkit-mask-repeat', 'no-repeat');
        this._maskLayer.style.setProperty('-webkit-mask-size', '100% 100%');
      }

      // Pos wrap: centers the mount when autoCover, else applies static scale.
      this._posWrap = document.createElement('div');
      if (this.autoCover) {
        Object.assign(this._posWrap.style, {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'block',
        });
      } else {
        this._posWrap.style.transform = `scale(${this.scale})`;
        this._posWrap.style.transformOrigin = 'center';
        this._posWrap.style.display = 'inline-block';
      }

      // Mount: holds the canvas. Mirrors B5's inner div.
      this._mount = document.createElement('div');
      this._mount.style.display = 'inline-block';
      this._mount.style.lineHeight = '1';
      this._mount.style.borderRadius = this.autoCover ? '0' : '10px';

      // Canvas
      this._canvas = document.createElement('canvas');
      this._canvas.style.display = 'block';
      this._canvas.style.imageRendering = 'crisp-edges';
      this._canvas.style.borderRadius = this.autoCover ? '0px' : '10px';

      this._mount.appendChild(this._canvas);
      this._posWrap.appendChild(this._mount);
      this._maskLayer.appendChild(this._posWrap);
      this._outer.appendChild(this._maskLayer);
      this.container.appendChild(this._outer);
    }

    // ---- public controls ----
    start() {
      if (this._running) return;
      this._running = true;
      const interval = () => 1000 / this.fps;
      const tick = (now) => {
        this._rafId = requestAnimationFrame(tick);
        if (document.hidden) return;
        if (now - this._lastFrame < interval() - 1) return;
        this._lastFrame = now;
        this._draw();           // generates lines using current this._t
        this._t += this.noiseSpeed;
      };
      this._rafId = requestAnimationFrame(tick);
    }

    stop() {
      this._running = false;
      if (this._rafId != null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    destroy() {
      this._destroyed = true;
      this.stop();
      document.removeEventListener('visibilitychange', this._onVisibility);
      window.removeEventListener('resize', this._onResize);
      if (this._resizeObs) this._resizeObs.disconnect();
      this._teardownVideo();
      if (this._scratch && this._scratch.parentNode) this._scratch.parentNode.removeChild(this._scratch);
      if (this._outer && this._outer.parentNode) this._outer.parentNode.removeChild(this._outer);
      this._scratch = null; this._scratchCtx = null;
      this._outer = null; this._canvas = null; this._mount = null; this._posWrap = null;
    }

    setMode(mode) {
      if (mode !== 'noise' && mode !== 'video' && mode !== 'composite') {
        throw new Error('mode must be noise|video|composite');
      }
      this.mode = mode;
      if ((mode === 'video' || mode === 'composite') && !this._video && this.videoSrc) {
        this.setVideoSrc(this.videoSrc);
      }
    }
    getMode() { return this.mode; }

    setRamp(ramp) {
      if (typeof ramp !== 'string' || ramp.length < 2) throw new Error('ramp must be a string of >=2 chars');
      this.ramp = ramp;
    }

    cycleRamp() {
      this._rampIndex = (this._rampIndex + 1) % this.RAMPS.length;
      this.ramp = this.RAMPS[this._rampIndex];
      return this.ramp;
    }

    setVideoSrc(url) {
      this.videoSrc = url;
      this._teardownVideo();
      if (!url) return;
      const v = document.createElement('video');
      v.style.display = 'none';
      v.loop = true; v.muted = true; v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.crossOrigin = 'anonymous';
      v.src = url;
      document.body.appendChild(v);
      this._video = v;
      const tryPlay = () => { v.play().catch(() => {}); };
      if (v.readyState >= 2) tryPlay();
      else v.addEventListener('loadeddata', tryPlay, { once: true });
    }

    setSize(cols, rows) {
      this.columns = cols; this.rows = rows;
      this.autoSize = false;
      this._draw();
    }

    setFontSize(px) {
      this.fontSize = px;
      if (this.autoSize) this._recomputeGrid();
      this._draw();
    }

    setAutoSize(enabled) {
      this.autoSize = !!enabled;
      if (this.autoSize) {
        if (!this._resizeObs && typeof ResizeObserver !== 'undefined') {
          this._resizeObs = new ResizeObserver(() => this._handleResize());
          this._resizeObs.observe(this.container);
        }
        this._recomputeGrid();
      }
      this._draw();
    }

    setColors({ foreground, background } = {}) {
      if (foreground) { this.foregroundColor = foreground; this._outer.style.color = foreground; }
      if (background) { this.backgroundColor = background; this._outer.style.background = background; }
    }

    setFps(fps) { this.fps = fps; }

    setScale(s) {
      this.scale = s;
      if (!this.autoCover && this._posWrap) this._posWrap.style.transform = `scale(${s})`;
    }

    // ---- internals ----
    _teardownVideo() {
      if (this._video) {
        try { this._video.pause(); } catch (e) {}
        try { this._video.srcObject = null; } catch (e) {}
        if (this._video.parentNode) this._video.parentNode.removeChild(this._video);
        this._video = null;
      }
      if (this._objectUrl) {
        try { URL.revokeObjectURL(this._objectUrl); } catch (e) {}
        this._objectUrl = null;
      }
    }

    // Re-derive columns/rows from the container size and current cell metrics.
    // Adds 1 cell of overscan on each axis so a fractional remainder doesn't
    // leave a visible gap at the right/bottom edges.
    _recomputeGrid() {
      if (!this._canvas) return;
      const ctx = this._canvas.getContext('2d');
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const m = ctx.measureText('M');
      const cellW = Math.max(1, Math.round(m.width));
      const cellH = Math.max(1, Math.round(
        (m.actualBoundingBoxAscent || this.fontSize) +
        (m.actualBoundingBoxDescent || Math.ceil(this.fontSize * 0.3))
      ));
      const rect = this.container.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const newCols = Math.max(1, Math.floor(w / cellW) + 1);
      const newRows = Math.max(1, Math.floor(h / cellH) + 1);
      if (newCols !== this.columns || newRows !== this.rows) {
        this.columns = newCols;
        this.rows = newRows;
        this._lastJoined = '';      // grid shape changed → force redraw
      }
    }

    _handleResize() {
      if (this.autoSize) this._recomputeGrid();
      this._draw();
    }

    _ensureScratch() {
      if (!this._scratch) {
        this._scratch = document.createElement('canvas');
        this._scratch.style.display = 'none';
        document.body.appendChild(this._scratch);
        this._scratchCtx = this._scratch.getContext('2d', { willReadFrequently: true });
      }
      this._scratch.width = this.columns;
      this._scratch.height = this.rows;
      return this._scratchCtx;
    }

    _videoReady() {
      const v = this._video;
      if (!v) return false;
      return Number.isFinite(v.videoWidth) && Number.isFinite(v.videoHeight)
          && v.videoWidth > 1 && v.videoHeight > 1
          && (v.readyState ?? 0) >= 2 && !v.paused;
    }

    _drawVideoFrame() {
      const v = this._video; const ctx = this._scratchCtx;
      if (!v || !ctx) return;
      const cols = this.columns, rows = this.rows;
      const target = cols / Math.max(1, (18 / 9) * rows);
      const ratio = v.videoWidth / v.videoHeight;
      let sx, sy, sw, sh;
      if (ratio > target) {
        sh = v.videoHeight;
        sw = Math.max(1, v.videoHeight * target);
        sx = Math.max(0, (v.videoWidth - sw) / 2);
        sy = 0;
      } else {
        sw = v.videoWidth;
        sh = Math.max(1, v.videoWidth / target);
        sx = 0;
        sy = Math.max(0, (v.videoHeight - sh) / 2);
      }
      try { ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cols, rows); } catch (e) {}
    }

    // Raw video luminance grid (no dithering) — original `j` callback.
    _videoLumaRaw() {
      const ctx = this._scratchCtx;
      const cols = this.columns, rows = this.rows;
      if (!ctx) return [];
      const data = ctx.getImageData(0, 0, cols, rows).data;
      const out = [];
      for (let y = 0; y < rows; y++) {
        const row = new Array(cols);
        for (let x = 0; x < cols; x++) {
          const i = (y * cols + x) * 4;
          row[x] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
        out.push(row);
      }
      return out;
    }

    // 3D noise field at the current time (original `O` callback).
    _noiseField() {
      const cols = this.columns, rows = this.rows;
      const scale = this.noiseScale;
      const t = this._t;
      const grid = new Array(rows);
      for (let y = 0; y < rows; y++) {
        const row = new Array(cols);
        for (let x = 0; x < cols; x++) {
          const v = (this._noise(x * scale, y * scale, t) + 1) / 2 * 255;
          row[x] = Math.round(v);
        }
        grid[y] = row;
      }
      return grid;
    }

    // Convert a 0..255 grid to ramp character lines.
    // `direct` mirrors the `e` flag passed to the original `M` callback:
    //   direct=false → high value maps to ramp[0] (densest char). Used for noise.
    //   direct=true  → high value maps to ramp[end] (sparsest). Used for video luma.
    _gridToLines(grid, direct) {
      const ramp = this.ramp;
      const dithered = ditherGrid(grid, ramp.length);
      const cols = this.columns, rows = this.rows;
      const lines = new Array(rows);
      for (let y = 0; y < rows; y++) {
        let s = '';
        for (let x = 0; x < cols; x++) {
          const v = dithered[y][x];
          let idx = direct
            ? Math.round((v / 255) * (ramp.length - 1))
            : Math.round((1 - v / 255) * (ramp.length - 1));
          if (Number.isNaN(idx)) idx = 0;
          if (idx < 0) idx = 0; else if (idx > ramp.length - 1) idx = ramp.length - 1;
          s += ramp[idx];
        }
        lines[y] = s;
      }
      return lines;
    }

    // Mirrors original `P()` callback: produces the lines for the current frame.
    _generateLines() {
      const cols = this.columns, rows = this.rows;
      this._ensureScratch();

      let lines = [];

      if (this.mode === 'video') {
        if (this._videoReady()) {
          this._drawVideoFrame();
          lines = this._gridToLines(this._videoLumaRaw(), true);
        } else {
          lines = this._gridToLines(this._noiseField(), false);
        }
      } else if (this.mode === 'composite') {
        const noiseLines = this._gridToLines(this._noiseField(), false);
        if (this._videoReady()) {
          this._drawVideoFrame();
          const luma = this._videoLumaRaw();
          const videoLines = this._gridToLines(luma, true);
          const merged = new Array(rows);
          const thresh = this.compositeThreshold;
          for (let y = 0; y < rows; y++) {
            let s = '';
            for (let x = 0; x < cols; x++) {
              const bright = (luma[y]?.[x] ?? 0) > thresh;
              s += bright ? videoLines[y][x] : noiseLines[y][x];
            }
            merged[y] = s;
          }
          lines = merged;
        } else {
          lines = noiseLines;
        }
      } else {
        // 'noise'
        lines = this._gridToLines(this._noiseField(), false);
      }

      // Original safety net: if we ended up with nothing, fill with '@'.
      if (!lines.length || lines.every((s) => !s.trim())) {
        lines = Array.from({ length: rows }, () => '@'.repeat(cols));
      }
      return lines;
    }

    _measureCell(ctx) {
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const m = ctx.measureText('M');
      const w = Math.max(1, Math.round(m.width));
      const h = Math.max(1, Math.round(
        (m.actualBoundingBoxAscent || this.fontSize) +
        (m.actualBoundingBoxDescent || Math.ceil(this.fontSize * 0.3))
      ));
      this._cellW = w; this._cellH = h;
      return { w, h };
    }

    _draw() {
      if (!this._canvas) return;
      const ctx = this._canvas.getContext('2d');

      // Reset transform before measuring/sizing.
      try { ctx.setTransform(1, 0, 0, 1, 0, 0); } catch (e) {}

      const { w: cellW, h: cellH } = this._measureCell(ctx);
      const cols = this.columns, rows = this.rows;
      const baseW = Math.max(1, cols * cellW);
      const baseH = Math.max(1, rows * cellH);

      // Compute autoCover scale from the user's container box.
      let coverScale = 1;
      if (this.autoCover) {
        const rect = this.container.getBoundingClientRect();
        if (rect && baseW > 0 && baseH > 0) {
          const sx = rect.width / baseW;
          const sy = rect.height / baseH;
          let s = Math.max(sx, sy);
          if (!Number.isFinite(s) || s <= 0) s = 1;
          else s *= 1.02;          // slight overscan to hide rounding seams
          coverScale = s;
        }
      }

      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      const dispW = baseW * coverScale;
      const dispH = baseH * coverScale;
      const pixelW = Math.max(1, Math.round(dispW * dpr));
      const pixelH = Math.max(1, Math.round(dispH * dpr));

      if (this._canvas.width !== pixelW || this._canvas.height !== pixelH) {
        this._canvas.width = pixelW;
        this._canvas.height = pixelH;
      }
      this._canvas.style.width = dispW + 'px';
      this._canvas.style.height = dispH + 'px';
      this._mount.style.width = dispW + 'px';
      this._mount.style.height = dispH + 'px';

      // Generate the new frame's lines.
      const lines = this._generateLines();
      const joined = lines.join('\n');
      const changed = joined !== this._lastJoined;
      this._lastJoined = joined;

      // Always need to repaint when canvas was resized; otherwise skip if identical.
      // (Match original behavior: it skipped lines-state updates when unchanged,
      // but always redrew after a layout change.)
      if (!changed && pixelW === this._canvas.width && pixelH === this._canvas.height) {
        // Still need to set transform/clear if sizes match? We can safely skip.
        // But if we never painted yet, force one paint.
        if (this._hasPainted) return;
      }
      this._hasPainted = true;

      // Logical drawing area in untransformed units.
      const logicalW = pixelW / (dpr * coverScale);
      const logicalH = pixelH / (dpr * coverScale);

      ctx.setTransform(dpr * coverScale, 0, 0, dpr * coverScale, 0, 0);
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, logicalW, logicalH);

      ctx.fillStyle = this.foregroundColor;
      ctx.textBaseline = 'top';
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      const limit = Math.min(rows, lines.length);
      for (let y = 0; y < limit; y++) {
        const line = lines[y] || '';
        if (line) ctx.fillText(line, 0, y * cellH);
      }
    }
  }

  CodexCharBackground.RAMPS = DEFAULT_RAMPS.slice();
  CodexCharBackground.DEFAULT_RAMP = DEFAULT_RAMP;
  return CodexCharBackground;
}));
