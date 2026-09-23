// Progressive enhancement. Without this file every preview anchor still
// navigates to /images/:id, which shows the original (Constitution III).
(function () {
  'use strict';

  var overlay = null;
  var lastFocused = null;

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a.preview-link') : null;
    if (!link) return;

    // Let the browser handle modified clicks (new tab, download, etc.).
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    open(link);
  });

  function open(link) {
    close();
    lastFocused = link;

    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', link.dataset.alt || 'Full size image');

    var img = document.createElement('img');
    // The anchor points at the HTML page; the original bytes live one level in.
    img.src = link.getAttribute('href').replace(/^\/images\//, '/media/') + '/full';
    img.alt = link.dataset.alt || '';

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'lightbox-close';
    button.textContent = 'Close';
    button.addEventListener('click', close);

    overlay.appendChild(img);
    overlay.appendChild(button);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);
    button.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      close();
      return;
    }

    // Keep Tab inside the dialog: the close button is the only stop.
    if (event.key === 'Tab' && overlay) {
      event.preventDefault();
      var button = overlay.querySelector('.lightbox-close');
      if (button) button.focus();
    }
  }

  function close() {
    if (!overlay) return;

    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKeydown);

    // Return keyboard focus to the preview that opened the overlay (FR-066).
    if (lastFocused) {
      lastFocused.focus();
      lastFocused = null;
    }
  }
})();
