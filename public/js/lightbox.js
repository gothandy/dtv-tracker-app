// === Shared lightbox ===
let _lbPhotos = [];
let _lbIndex = 0;
let _lbMetaRenderer = null;

function setLightboxMetaRenderer(fn) { _lbMetaRenderer = fn; }
function refreshLightbox() { _showLightboxPhoto(); }

function openLightbox(index, photos) {
    _lbPhotos = photos;
    _lbIndex = index;
    if (!document.getElementById('lightbox')) {
        document.body.insertAdjacentHTML('beforeend',
            `<div id="lightbox" class="lightbox" role="dialog" aria-modal="true" onclick="closeLightbox()" style="display:none">` +
            `<button class="lightbox-close" onclick="closeLightbox();event.stopPropagation()" aria-label="Close">&times;</button>` +
            `<button class="lightbox-prev" onclick="prevPhoto();event.stopPropagation()" aria-label="Previous">&#8592;</button>` +
            `<button class="lightbox-next" onclick="nextPhoto();event.stopPropagation()" aria-label="Next">&#8594;</button>` +
            `<div class="lightbox-img-wrap" id="lightboxMediaWrap" onclick="event.stopPropagation()"></div>` +
            `<div class="lightbox-caption" onclick="event.stopPropagation()"><span id="lightboxCaption"></span><span id="lightboxCounter"></span></div>` +
            `<div class="lightbox-meta" id="lightboxMeta" onclick="event.stopPropagation()"></div>` +
            `</div>`
        );
    }
    _showLightboxPhoto();
    document.getElementById('lightbox').style.display = 'flex';
    document.addEventListener('keydown', _lightboxKeyHandler);
}

function closeLightbox() {
    _pauseLightboxVideo();
    const lb = document.getElementById('lightbox');
    if (lb) lb.style.display = 'none';
    document.removeEventListener('keydown', _lightboxKeyHandler);
}

function _pauseLightboxVideo() {
    const v = document.querySelector('#lightboxMediaWrap video');
    if (v) { v.pause(); v.src = ''; }
}

function prevPhoto() {
    _pauseLightboxVideo();
    _lbIndex = (_lbIndex - 1 + _lbPhotos.length) % _lbPhotos.length;
    _showLightboxPhoto();
}

function nextPhoto() {
    _pauseLightboxVideo();
    _lbIndex = (_lbIndex + 1) % _lbPhotos.length;
    _showLightboxPhoto();
}

function _showLightboxPhoto() {
    const p = _lbPhotos[_lbIndex];
    const wrap = document.getElementById('lightboxMediaWrap');
    const isVideo = p.mimeType && p.mimeType.startsWith('video/');
    if (isVideo) {
        wrap.innerHTML = `<video controls autoplay playsinline style="max-width:100%;max-height:80vh;">` +
            `<source src="/api/media/${encodeURIComponent(p.id)}/stream" type="${escapeHtml(p.mimeType)}">` +
            `</video>`;
    } else {
        wrap.innerHTML = `<img src="${escapeHtml(p.largeUrl || p.thumbnailUrl)}" alt="${escapeHtml(p.title || p.name)}" style="max-width:100%;max-height:80vh;">`;
    }
    // Combine caption and counter into one text: "Caption text (5 / 14)" or just "5 / 14"
    // Admin (meta renderer set): show filename; Public: show title if set, blank if not
    const _caption = _lbMetaRenderer ? p.name : (p.title || '');
    const _counter = `${_lbIndex + 1} / ${_lbPhotos.length}`;
    document.getElementById('lightboxCaption').textContent = _caption ? `${_caption} (${_counter})` : _counter;
    document.getElementById('lightboxCounter').textContent = '';
    const showNav = _lbPhotos.length > 1;
    document.querySelector('.lightbox-prev').style.display = showNav ? '' : 'none';
    document.querySelector('.lightbox-next').style.display = showNav ? '' : 'none';
    const metaEl = document.getElementById('lightboxMeta');
    if (metaEl) metaEl.innerHTML = _lbMetaRenderer ? _lbMetaRenderer(p, _lbIndex) : '';
}

function _lightboxKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') prevPhoto();
    else if (e.key === 'ArrowRight') nextPhoto();
}
