# Quickstart: Validation

## Automated

```powershell
npm test
npm run test:nsfw
```

Expected: all pass, including new tests for the avatar frame and the SFW/NSFW chart arcs.

## Manual

1. `npm start`, open `/` with a character whose avatar has zoom above 1: the avatar stays inside its square and the name and jobs show below it at 320px, 768px and 1280px widths.
2. Log in at `/admin`: the pie chart shows two distinct colors for SFW and NSFW, a legend names them, and the table matches.
3. Check a character with only SFW images: only the SFW color is used for its arc.
