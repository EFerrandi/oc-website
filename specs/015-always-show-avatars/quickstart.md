# Quickstart: Always Show Avatars

1. `npm test` and `npm run test:nsfw` pass.
2. In admin, set an NSFW image as a character's avatar (a warning is shown).
3. With NSFW off, open `/`: the card shows that avatar; `/relationships` shows the same.
4. With NSFW off, `GET /media/<id>` returns 200; `GET /media/<id>/full` returns 404.
5. Another NSFW image of that character: `GET /media/<other>` returns 404; the character page picture list hides it.
6. Change the avatar: the old NSFW image returns 404 again.
