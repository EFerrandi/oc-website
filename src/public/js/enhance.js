// Progressive enhancement only. Every feature here has a working no-JS
// fallback in the markup (Constitution III).
(function () {
  'use strict';

  // The NSFW form works via its Apply button without JS; with JS we can submit
  // on change and hide the now-redundant button.
  var nsfwForm = document.querySelector('.nsfw-form');
  if (nsfwForm) {
    var box = nsfwForm.querySelector('input[type="checkbox"][name="nsfw"]');
    var apply = nsfwForm.querySelector('.nsfw-apply');
    if (box && apply) {
      apply.hidden = true;
      box.addEventListener('change', function () { nsfwForm.submit(); });
    }
  }

  document.querySelectorAll('.filter-bar').forEach(function (form) {
    var tags = form.querySelectorAll('input[type="checkbox"][name="tag"]');
    var apply = form.querySelector('.filter-apply');
    if (!tags.length || !apply) return;

    tags.forEach(function (tag) {
      tag.addEventListener('change', function () { form.submit(); });
    });
    apply.hidden = true;
  });

  document.querySelectorAll('[data-crop-form]').forEach(function (form) {
    var preview = form.querySelector('[data-crop-preview]');
    var x = form.querySelector('[name="avatar_crop_x"]');
    var y = form.querySelector('[name="avatar_crop_y"]');
    var zoom = form.querySelector('[name="avatar_crop_zoom"]');
    var avatarSelect = form.querySelector('[data-crop-avatar-select]');
    if (!preview || !x || !y || !zoom) return;

    function updatePreview() {
      preview.style.objectPosition = x.value + '% ' + y.value + '%';
      preview.style.transform = 'scale(' + zoom.value + ')';
      preview.style.transformOrigin = x.value + '% ' + y.value + '%';
    }
    [x, y, zoom].forEach(function (input) {
      input.addEventListener('input', updatePreview);
    });
    if (avatarSelect) {
      avatarSelect.addEventListener('change', function () {
        var option = avatarSelect.options[avatarSelect.selectedIndex];
        if (option && option.dataset.previewSrc) preview.src = option.dataset.previewSrc;
      });
    }
    updatePreview();
  });
})();
