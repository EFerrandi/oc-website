// Progressive enhancement only. Every feature here has a working no-JS
// fallback in the markup (Constitution III).
(function () {
  'use strict';

  // The NSFW form works via its Apply button without JS; with JS we can submit
  // on change and hide the now-redundant button.
  var nsfwForm = document.querySelector('.nsfw-form');
  if (!nsfwForm) return;

  var box = nsfwForm.querySelector('input[type="checkbox"][name="nsfw"]');
  var apply = nsfwForm.querySelector('.nsfw-apply');
  if (!box || !apply) return;

  apply.hidden = true;
  box.addEventListener('change', function () { nsfwForm.submit(); });
})();
