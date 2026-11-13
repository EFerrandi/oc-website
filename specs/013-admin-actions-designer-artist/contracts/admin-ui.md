# Contract: Admin UI

## GET /admin (dashboard)

Markup order inside the admin content: `<h1>`, then `<nav class="admin-actions" aria-label="Create new content">` containing three links, then the counts list, then the statistics section.

| Link text | href |
|---|---|
| Add a character | `/admin/characters/new` |
| Add an image | `/admin/images/new` |
| Add a story | `/admin/stories/new` |

Each link has class `btn-action`. Text and background meet WCAG AA contrast; the focus state is visible; the row wraps on narrow screens with no horizontal scroll.

## POST /admin/characters (new character with first image)

New optional field: `image_artist_same_as_designer` (`1` when ticked).

| Case | Behavior |
|---|---|
| Ticked, designer chosen or newly entered | Created (303). First image's artist = designer. Image-artist fields ignored. One artist row if the designer is new. |
| Ticked, no designer | 422 with the usual designer error; nothing saved. |
| Not ticked | Unchanged: `image_artist_id` required. |
| Validation failure | 422, form redisplayed with the checkbox state preserved; nothing saved, no files left behind. |
