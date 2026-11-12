# UI Contract Changes

## POST /admin/characters (create)

- `artist_id` may be `new`; then `new_designer_name` is required and `new_designer_website_url` is optional.
- `image_artist_id` may be `new`; then `new_image_artist_name` is required and `new_image_artist_website_url` is optional.
- 422 responses name the failing field (`new_designer_name`, `new_designer_website_url`, `new_image_artist_name`, `new_image_artist_website_url`) and redisplay all values, including the `new` selections.
- Success: 303 to `/admin/characters/:id/edit`; new artists exist and are linked.

## GET /admin/characters/new

- Both artist selects end with `Add a new artist…` (value `new`).
- Two always-visible fieldsets, one labelled for the designer and one for the image artist, each with name and website inputs.

## POST /admin/characters/:id (edit) and GET edit form

- No `Add a new artist…` option, no new-artist fields. `artist_id=new` is rejected with the existing "Choose an artist." error; no artist is created.

## POST /admin/images

- Unchanged.
