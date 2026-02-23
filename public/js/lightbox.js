// === Shared lightbox ===
let _lbPhotos = [];
let _lbIndex = 0;

function openLightbox(index, photos) {
    _lbPhotos = photos;
    _lbIndex = index;
    if (!document.getElementById('lightbox')) {
        document.body.insertAdjacentHTML('beforeend',
            `<div id="lightbox" class="lightbox" role="dialog" aria-modal="true" onclick="closeLightbox()" style="display:none">` +
            `<button class="lightbox-close" onclick="closeLightbox();event.stopPropagation()" aria-label="Close">&times;</button>` +
            `<button class="lightbox-prev" onclick="prevPhoto();event.stopPropagation()" aria-label="Previous">&#8592;</button>` +
            `<button class="lightbox-next" onclick="nextPhoto();event.stopPropagation()" aria-label="Next">&#8594;</button>` +
            `<div class="lightbox-img-wrap" onclick="event.stopPropagation()"><img id="lightboxImg" src="" alt=""></div>` +
            `<div class="lightbox-caption" onclick="event.stopPropagation()"><span id="lightboxCaption"></span><span id="lightboxCounter"></span></div>` +
            `</div>`
        );
    }
    _showLightboxPhoto();
    document.getElementById('lightbox').style.display = 'flex';
    document.addEventListener('keydown', _lightboxKeyHandler);
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.style.display = 'none';
    document.removeEventListener('keydown', _lightboxKeyHandler);
}

function prevPhoto() {
    _lbIndex = (_lbIndex - 1 + _lbPhotos.length) % _lbPhotos.length;
    _showLightboxPhoto();
}

function nextPhoto() {
    _lbIndex = (_lbIndex + 1) % _lbPhotos.length;
    _showLightboxPhoto();
}

function _showLightboxPhoto() {
    const p = _lbPhotos[_lbIndex];
    document.getElementById('lightboxImg').src = p.largeUrl || p.thumbnailUrl;
    document.getElementById('lightboxImg').alt = escapeHtml(p.name);
    document.getElementById('lightboxCaption').textContent = p.name;
    document.getElementById('lightboxCounter').textContent = `${_lbIndex + 1} / ${_lbPhotos.length}`;
    const showNav = _lbPhotos.length > 1;
    document.querySelector('.lightbox-prev').style.display = showNav ? '' : 'none';
    document.querySelector('.lightbox-next').style.display = showNav ? '' : 'none';
}

function _lightboxKeyHandler(e) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') prevPhoto();
    else if (e.key === 'ArrowRight') nextPhoto();
}
