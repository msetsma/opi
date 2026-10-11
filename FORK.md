# pi-my fork

This is a personal fork of [earendil-works/pi](https://github.com/earendil-works/pi). The fork's own changes are the commits listed under Core changes below, plus this file, the note at the top of `README.md` and `pi-my-plan.md`. Everything else is upstream.

## What this fork is

- `main` mirrors upstream `main`. It only moves by fast-forward and never gets its own commits.
- `my` is the personal integration branch. It is what runs day to day.
- Feature branches (`feat/*`, `fix/*`, `docs/*`) are cut from `main` so each one stays a clean upstream candidate, then merged or cherry-picked into `my`.
- Fork-only work, which upstream is not expected to take, is committed on `my` directly or on a branch that is never proposed.

## Core changes

| Change | What it does | Branch | Upstream status |
| --- | --- | --- | --- |
| Editor border widgets | `setWidget` placements on the editor's border corners, with mouse input forwarded to the border content. Cherry-picked from upstream PR #10602 by Pavel Shirshov ([@pshirshov](https://github.com/pshirshov)). | `pr-10602` | upstream PR #10602 (open) |
| Overlay close fix | An extension overlay's `done()` closes that overlay by handle instead of whatever is on top of the stack. | `feat/overlay-close-own-handle` | proposal drafted |
| `TUI.getFocusedComponent` | Exposes `getFocusedComponent` on the `TUI` interface. | `feat/tui-get-focused-component` | not proposed yet |
| `overlayOptions` JSDoc | Corrects the docs: a function is evaluated once, and updates work by mutating the returned object. | `docs/overlay-options-jsdoc` | not proposed yet |
| HStack measure fix | Skips child measurement in fixed-height stretch layouts, so the transcript no longer renders twice per frame. | `fix/hstack-measure` | proposal drafted |
| Wheel-contain fix | Wheel overscroll in an `overscroll: "contain"` scroll view no longer leaks to the transcript. | `fix/wheel-contain-leak` | proposal drafted |
| Left and right side panels | `setWidget` placements `"left"` and `"right"` with a column width, shown beside the transcript in fullscreen mode. | `my` | not proposed yet |
| Theme text attributes and syntax overrides | Theme tokens accept bold, dim, italic, underline and strikethrough, and a `syntax` map overrides highlight.js scope colors. | `feat/theme-text-attributes` | not proposed yet |
| `registerShortcut` id | An optional id lets users rebind or disable extension shortcuts in `keybindings.json`. | `feat/extension-shortcut-id` | not proposed yet |
| `Frame` component | A bordered, fixed-height floating window that routes mouse input and consumes wheel input. | `feat/tui-frame` | not proposed yet |
| Glyphs setting | `"glyphs"` in `settings.json` picks a preset (`unicode`, `ascii`) plus per-glyph overrides for borders, markdown, scrollbar, cursors and tree connectors. | `my` | fork-only |
| Settings category tabs | `/settings` groups rows into General, Display, Fullscreen, Images and Advanced tabs, switched with Tab and Shift+Tab. | `feat/settings-tabs` | not proposed yet |
| Glyphs settings row | A row in `/settings` for choosing the glyphs preset. | `feat/settings-glyphs` | fork-only |

## Companion extensions

Policy lives in extensions, in separate repos, and the core only gets small generic hooks.

- [pi-statusline](https://github.com/msetsma/pi-statusline): header, winbar and statusline. Needs the border widget slots.
- [pi-outline](https://github.com/msetsma/pi-outline): an outline side panel. Needs the left and right placements.
- [pi-leader](https://github.com/msetsma/pi-leader): leader key sequences, a which-key popup and `/keys`. Nvim-style modes are planned.

## Running the fork

`pi-test.sh` runs the coding agent from source with no build step. Pass `--no-env` to unset provider credential variables (API keys, AWS, Google Cloud, Azure OpenAI) for that run.

To run it from anywhere, put a wrapper script on your `PATH`. Use a script, not a symlink, because `pi-test.sh` finds the repo from its own location.

```sh
#!/bin/sh
# Run the pi-my fork from source.
export PI_SKIP_VERSION_CHECK=1
# Optional: unset provider variables the fork should not pick up, e.g.
# unset OPENAI_API_KEY
exec "$HOME/dev/pi-fork/pi-my/pi-test.sh" "$@"   # path to your clone
```

The fork reads and writes the same `~/.pi/agent` directory (settings, auth, sessions, extensions) as an installed `pi`. Start it from a directory outside the repo; inside it, the trust prompt shows and the repo's own `.pi/extensions` load.

## Syncing with upstream

`rerere` is enabled in this clone (`git config rerere.enabled true`), so a conflict resolved once is replayed on later merges.

```sh
git fetch upstream
git switch main && git merge --ff-only upstream/main && git push origin main
git switch my && git merge main
git rebase main feat/<topic>   # or re-cut it from main and cherry-pick
npm run check
```

Merge `main` into `my` rather than rebasing `my`. Rebase or re-cut feature branches onto the new `main` so they stay PR-ready.

## Plan

`pi-my-plan.md` holds the full roadmap, milestones and backlog.
