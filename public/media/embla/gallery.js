/**
 * MediaGallery — Embla-powered horizontal photo/video strip.
 *
 * Requires EmblaCarousel to be loaded as a global before this script.
 * CDN: https://unpkg.com/embla-carousel/embla-carousel.umd.js
 *
 * Usage:
 *   const gallery = new MediaGallery(containerEl, { height: 360 });
 *   gallery.setItems(itemsArray);
 *
 * Item shape: { id, thumbnailUrl, largeUrl, mimeType, title }
 *
 * Options:
 *   height    {number}   280              Gallery height in px
 *   minWidth  {number}   120              Minimum slide width in px
 *   maxWidth  {number}   560              Maximum slide width in px
 *   gap       {number}   8                Gap between slides in px
 *   radius    {number}   6                Slide border-radius in px
 *   quality   {string}   'large'          'large' or 'thumbnail'
 *   onAction  {function} null             onAction(item, index) — tap selected item
 */
class MediaGallery {
  constructor(container, options = {}) {
    this._el = typeof container === 'string' ? document.querySelector(container) : container;
    this._opts = {
      height: 280,
      minWidth: 120,
      maxWidth: 560,
      gap: 8,
      radius: 6,
      quality: 'large',
      onAction: null,
      ...options,
    };

    this._items = [];
    this._embla = null;
    this._viewport = null;
    this._track = null;
    this._info = null;
    this._btnPrev = null;
    this._btnNext = null;

    this._build();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  setItems(items) {
    this._items = (items || []).map(i => ({ ...i }));
    this._measureDimensions(() => this._initEmbla());
  }

  setOptions(partial) {
    const rebuildKeys = ['height', 'minWidth', 'maxWidth', 'gap', 'radius', 'quality'];
    const needsRebuild = rebuildKeys.some(k => k in partial && partial[k] !== this._opts[k]);
    Object.assign(this._opts, partial);
    this._viewport.style.height = this._opts.height + 'px';
    if (needsRebuild && this._items.length) this._initEmbla();
  }

  destroy() {
    if (this._embla) { this._embla.destroy(); this._embla = null; }
    window.removeEventListener('keydown', this._onKey);
    this._el.innerHTML = '';
  }

  // ── DOM scaffold ────────────────────────────────────────────────────────────

  _build() {
    this._el.innerHTML = '';

    // Wrap holds the viewport + absolutely-positioned nav buttons so they
    // overlay the gallery edges without being clipped by overflow:hidden.
    const wrap = document.createElement('div');
    wrap.className = 'mg-wrap';

    // Embla root — overflow:hidden
    this._viewport = document.createElement('div');
    this._viewport.className = 'mg-viewport';
    this._viewport.style.height = this._opts.height + 'px';

    // Embla container — display:flex
    this._track = document.createElement('div');
    this._track.className = 'mg-track';
    this._viewport.appendChild(this._track);
    wrap.appendChild(this._viewport);

    // Nav buttons sit in the wrap (not inside viewport) so they aren't clipped
    this._btnPrev = this._navBtn('‹', 'Previous', 'mg-nav-prev');
    this._btnNext = this._navBtn('›', 'Next', 'mg-nav-next');
    this._btnPrev.addEventListener('click', () => this._embla && this._embla.scrollPrev());
    this._btnNext.addEventListener('click', () => this._embla && this._embla.scrollNext());
    wrap.appendChild(this._btnPrev);
    wrap.appendChild(this._btnNext);

    this._el.appendChild(wrap);

    // Arrow-key navigation
    this._onKey = e => {
      if (!this._embla) return;
      if (e.key === 'ArrowLeft') this._embla.scrollPrev();
      else if (e.key === 'ArrowRight') this._embla.scrollNext();
    };
    window.addEventListener('keydown', this._onKey);
  }

  _navBtn(label, ariaLabel, posClass) {
    const btn = document.createElement('button');
    btn.className = `mg-btn-nav ${posClass}`;
    btn.setAttribute('aria-label', ariaLabel);
    btn.textContent = label;
    btn.disabled = true;
    return btn;
  }

  // ── Image dimensions ────────────────────────────────────────────────────────

  _imageUrl(item) {
    return this._opts.quality === 'large'
      ? (item.largeUrl || item.thumbnailUrl)
      : (item.thumbnailUrl || item.largeUrl);
  }

  _itemWidth(item) {
    const { height, minWidth, maxWidth } = this._opts;
    const ar = (item._w && item._h) ? item._w / item._h : 4 / 3;
    return Math.min(maxWidth, Math.max(minWidth, Math.round(height * ar)));
  }

  _measureDimensions(cb) {
    const items = this._items;
    if (!items.length) { cb(); return; }
    let pending = items.length;
    const done = () => { if (--pending === 0) cb(); };
    for (const item of items) {
      if (item._w && item._h) { done(); continue; }
      const url = this._imageUrl(item);
      if (!url) { item._w = 4; item._h = 3; done(); continue; }
      const img = new Image();
      img.onload = () => { item._w = img.naturalWidth || 4; item._h = img.naturalHeight || 3; done(); };
      img.onerror = () => { item._w = 4; item._h = 3; done(); };
      img.src = url;
    }
  }

  // ── Embla init ──────────────────────────────────────────────────────────────

  _initEmbla() {
    if (this._embla) { this._embla.destroy(); this._embla = null; }

    const { height, gap, radius } = this._opts;
    this._track.innerHTML = '';
    this._track.style.gap = gap + 'px';

    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      const w = this._itemWidth(item);
      const isVideo = item.mimeType && item.mimeType.startsWith('video/');

      const slide = document.createElement('div');
      slide.className = 'mg-item';
      slide.style.cssText = `width:${w}px;height:${height}px;`;

      const inner = document.createElement('div');
      inner.className = 'mg-item-inner';
      inner.style.borderRadius = radius + 'px';

      const img = document.createElement('img');
      img.src = this._imageUrl(item) || '';
      img.alt = item.title || '';
      img.onerror = () => inner.classList.add('img-error');
      inner.appendChild(img);

      if (isVideo) {
        const ov = document.createElement('div');
        ov.className = 'mg-video-overlay';
        ov.innerHTML = '<div class="mg-play-icon">▶</div>';
        inner.appendChild(ov);
      }

      // Edit button — overlay, visible on hover of selected slide
      const editBtn = document.createElement('button');
      editBtn.className = 'mg-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', e => {
        e.stopPropagation(); // don't bubble to slide click handler
        if (this._opts.onAction) this._opts.onAction(item, i);
      });
      inner.appendChild(editBtn);

      // Caption pre-rendered with fixed position — "3 / 48 · Title"
      const total = this._items.length;
      const caption = document.createElement('div');
      caption.className = 'mg-caption';
      const title = item.title || '';
      caption.textContent = `${i + 1} / ${total}${title ? '  ·  ' + title : ''}`;
      inner.appendChild(caption);

      slide.appendChild(inner);
      this._track.appendChild(slide);
    }

    if (!this._items.length) {
      this._btnPrev.disabled = true;
      this._btnNext.disabled = true;
      return;
    }

    this._embla = EmblaCarousel(this._viewport, {
      loop: false,
      align: 'center',
      dragFree: true,
    });

    const slides = Array.from(this._track.children);

    const updateSelection = () => {
      const sel = this._embla.selectedScrollSnap();
      slides.forEach((s, i) => s.classList.toggle('mg-selected', i === sel));
    };

    const updateNav = () => {
      this._btnPrev.disabled = !this._embla.canScrollPrev();
      this._btnNext.disabled = !this._embla.canScrollNext();
    };

    this._embla.on('select', updateSelection);
    this._embla.on('settle', updateNav);

    // Distinguish tap from drag: if scroll fired between pointerDown and click, it was a drag.
    let dragHappened = false;
    this._embla.on('pointerDown', () => { dragHappened = false; });
    this._embla.on('scroll', () => { dragHappened = true; });

    // Tap unselected slide → scroll to centre it. Tap already-selected slide → onAction.
    slides.forEach((slide, i) => {
      slide.addEventListener('click', () => {
        if (dragHappened) return;
        if (this._embla.selectedScrollSnap() === i) {
          if (this._opts.onAction) this._opts.onAction(this._items[i], i);
        } else {
          this._embla.scrollTo(i);
        }
      });
    });

    updateSelection();
    updateNav();

  }
}
