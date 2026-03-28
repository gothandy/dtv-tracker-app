/**
 * MediaGallery — Embla-powered horizontal photo/video strip with thumbnail nav.
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
 *   height      {number}   280    Main strip height in px
 *   minWidth    {number}   120    Minimum slide width in px
 *   maxWidth    {number}   560    Maximum slide width in px
 *   gap         {number}   8      Gap between slides in px
 *   radius      {number}   6      Slide border-radius in px
 *   thumbHeight {number}   64     Thumbnail strip height in px
 *   quality     {string}   'large'
 *   onAction    {function} null   onAction(item, index) — tap selected item
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
      thumbHeight: 64,
      thumbs: true,
      quality: 'large',
      onAction: null,
      ...options,
    };

    this._items = [];
    this._embla = null;
    this._emblaThumb = null;
    this._viewport = null;
    this._track = null;
    this._thumbViewport = null;
    this._thumbTrack = null;
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
    const rebuildKeys = ['height', 'minWidth', 'maxWidth', 'gap', 'radius', 'thumbHeight', 'thumbs', 'quality'];
    const needsRebuild = rebuildKeys.some(k => k in partial && partial[k] !== this._opts[k]);
    Object.assign(this._opts, partial);
    if (needsRebuild && this._items.length) this._initEmbla();
  }

  destroy() {
    if (this._embla) { this._embla.destroy(); this._embla = null; }
    if (this._emblaThumb) { this._emblaThumb.destroy(); this._emblaThumb = null; }
    window.removeEventListener('keydown', this._onKey);
    this._el.innerHTML = '';
  }

  // ── DOM scaffold ────────────────────────────────────────────────────────────

  _build() {
    this._el.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'mg-wrap';

    // Main strip — overflow:hidden viewport + absolutely-positioned nav buttons
    this._viewport = document.createElement('div');
    this._viewport.className = 'mg-viewport';
    this._viewport.style.height = this._opts.height + 'px';

    this._track = document.createElement('div');
    this._track.className = 'mg-track';
    this._viewport.appendChild(this._track);
    wrap.appendChild(this._viewport);

    this._btnPrev = this._navBtn('‹', 'Previous', 'mg-nav-prev');
    this._btnNext = this._navBtn('›', 'Next', 'mg-nav-next');
    this._btnPrev.addEventListener('click', () => this._embla && this._embla.scrollPrev());
    this._btnNext.addEventListener('click', () => this._embla && this._embla.scrollNext());
    wrap.appendChild(this._btnPrev);
    wrap.appendChild(this._btnNext);

    // Thumbnail strip (optional)
    if (this._opts.thumbs) {
      this._thumbViewport = document.createElement('div');
      this._thumbViewport.className = 'mg-thumb-viewport';
      this._thumbViewport.style.height = this._opts.thumbHeight + 'px';

      this._thumbTrack = document.createElement('div');
      this._thumbTrack.className = 'mg-thumb-track';
      this._thumbViewport.appendChild(this._thumbTrack);
      wrap.appendChild(this._thumbViewport);
    }

    this._el.appendChild(wrap);

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
    if (this._emblaThumb) { this._emblaThumb.destroy(); this._emblaThumb = null; }

    const { height, gap, radius, thumbHeight } = this._opts;
    const thumbWidth = Math.round(thumbHeight * (4 / 3));

    // Main slides
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

      if (item.title) {
        const caption = document.createElement('div');
        caption.className = 'mg-caption';
        caption.textContent = item.title;
        inner.appendChild(caption);
      }

      if (item.isPublic === false) {
        const badge = document.createElement('div');
        badge.className = 'mg-private-badge';
        badge.title = 'Not in public gallery';
        badge.innerHTML = '<img src="/svg/nophoto.svg" width="18" height="18" alt="Private">';
        inner.appendChild(badge);
      }

      slide.appendChild(inner);
      this._track.appendChild(slide);
    }

    if (!this._items.length) {
      this._btnPrev.disabled = true;
      this._btnNext.disabled = true;
      return;
    }

    // Main Embla — free physics, variable-width slides
    this._embla = EmblaCarousel(this._viewport, {
      loop: false,
      align: 'center',
      dragFree: true,
    });

    const slides = Array.from(this._track.children);

    // Thumb strip — only when thumbs:true
    let thumbSlides = [];
    if (this._opts.thumbs) {
      this._thumbTrack.innerHTML = '';
      this._thumbTrack.style.gap = gap + 'px';
      for (let i = 0; i < this._items.length; i++) {
        const item = this._items[i];
        const isVideo = item.mimeType && item.mimeType.startsWith('video/');

        const slide = document.createElement('div');
        slide.className = 'mg-thumb-slide';
        slide.style.cssText = `width:${thumbWidth}px;height:${thumbHeight}px;`;

        const inner = document.createElement('div');
        inner.className = 'mg-thumb-inner';
        inner.style.borderRadius = Math.round(radius * 0.5) + 'px';

        const img = document.createElement('img');
        img.src = item.thumbnailUrl || item.largeUrl || '';
        img.alt = item.title || '';
        img.onerror = () => inner.classList.add('img-error');
        inner.appendChild(img);

        if (isVideo) {
          const ov = document.createElement('div');
          ov.className = 'mg-video-overlay';
          ov.innerHTML = '<div class="mg-play-icon mg-play-icon--sm">▶</div>';
          inner.appendChild(ov);
        }

        if (item.isPublic === false) {
          const badge = document.createElement('div');
          badge.className = 'mg-private-badge';
          badge.innerHTML = '<img src="/svg/nophoto.svg" width="12" height="12" alt="Private">';
          inner.appendChild(badge);
        }

        slide.appendChild(inner);
        this._thumbTrack.appendChild(slide);
      }

      this._emblaThumb = EmblaCarousel(this._thumbViewport, {
        loop: false,
        align: 'center',
        containScroll: 'keepSnaps',
        dragFree: true,
      });

      thumbSlides = Array.from(this._thumbTrack.children);
      thumbSlides.forEach((slide, i) => {
        slide.addEventListener('click', () => {
          if (this._embla) this._embla.scrollTo(i);
        });
      });
    }

    const updateSelection = () => {
      const sel = this._embla.selectedScrollSnap();
      slides.forEach((s, i) => s.classList.toggle('mg-selected', i === sel));
      if (this._emblaThumb) {
        thumbSlides.forEach((s, i) => s.classList.toggle('mg-selected', i === sel));
        this._emblaThumb.scrollTo(sel);
      }
    };

    const updateNav = () => {
      this._btnPrev.disabled = !this._embla.canScrollPrev();
      this._btnNext.disabled = !this._embla.canScrollNext();
    };

    this._embla.on('select', updateSelection);
    this._embla.on('settle', updateNav);

    // Tap main slide — unselected: centre it; selected: onAction
    let dragHappened = false;
    this._embla.on('pointerDown', () => { dragHappened = false; });
    this._embla.on('scroll', () => { dragHappened = true; });

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
