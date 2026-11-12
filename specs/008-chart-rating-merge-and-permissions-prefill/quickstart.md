# Quickstart: Validation

## Automated

```powershell
npm test
npm run test:nsfw
```

Expected: all pass, including new tests for the two-region chart and the permission prefill.

## Manual

1. `npm start`, sign in at `/admin`: the pie chart shows one SFW region and one NSFW region sized like the totals above it.
2. Open a character's edit form: each permission shows its saved choice; save without changes and reopen to confirm nothing changed.
3. Submit the edit form with an invalid field: the permission choices you made are still selected.
4. Open "Add a character": no permission is preselected.
