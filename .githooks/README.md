# Git hooks

Version-controlled hooks for this repo. Enable them (once per clone) with:

```sh
git config core.hooksPath .githooks
```

## pre-push
Runs `pnpm exec tsc --noEmit` (typecheck) then `pnpm build`, and aborts the push
if either fails. Bypass a single push with `git push --no-verify`.
