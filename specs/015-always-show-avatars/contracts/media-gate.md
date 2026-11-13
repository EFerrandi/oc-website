# Contract: Media gate

| Request | NSFW off, image is NSFW, current avatar | NSFW off, NSFW, not an avatar | NSFW on |
|---|---|---|---|
| `GET /media/:id` | 200 (webp preview), `Cache-Control: private, no-store` | 404 | 200 |
| `GET /media/:id/full` | 404 | 404 | 200 |

- SFW images behave as before.
- Refusals are always 404, never 403.
- Gallery cards, relationship maps and the character page header show the resolved avatar with the same result at either rating.
- Admin avatar picker shows a notice that an NSFW avatar is visible to everyone.
