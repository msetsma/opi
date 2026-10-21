# opi

An opinionated personal fork of [earendil-works/pi](https://github.com/earendil-works/pi), a minimal terminal coding agent. `main` is upstream plus the changes below, merged in as upstream releases. The upstream README is [README.md](/README.md), unchanged.

Why the fork is set up this way is in [DECISIONS.md](/DECISIONS.md). Branches, upstream status and the sync workflow are in [FORK.md](/FORK.md).

## What this fork changes

### Bug fixes

Small fixes with no new API, written as upstream proposals.

- **HStack double render.** Fixed-height stretch layouts skip child measurement, so the transcript renders once per frame.
- **Wheel leak.** Wheel overscroll in a `contain` scroll view no longer scrolls the transcript.

### Extension API

Generic hooks that let extensions build UI. Opinions stay in the extensions.

- **Editor border widgets.** `setWidget` placements on the editor's border corners, with mouse input. From upstream PR #10602.
- **Side panels.** `"left"` and `"right"` placements with a column width, shown beside the transcript in fullscreen.
- **Shortcut ids.** `registerShortcut` takes an optional id, so users can rebind or disable extension shortcuts.
- **Focus access.** `TUI.getFocusedComponent` is public.
- **Docs fix.** `overlayOptions` JSDoc now says a function is evaluated once.

### TUI components

- **`Frame`.** A bordered, fixed-height floating window that routes mouse input and consumes wheel input.

### Theming and settings

- **Text attributes.** Theme tokens accept bold, dim, italic, underline and strikethrough. A `syntax` map overrides highlight.js scope colors.
- **Glyphs.** `"glyphs"` in `settings.json` picks a preset (`unicode`, `ascii`) and overrides individual glyphs, with a row in `/settings`.
- **Settings tabs.** `/settings` groups rows into General, Display, Fullscreen, Images and Advanced.

### Companion extensions

Separate repos that use the hooks above: [pi-statusline](https://github.com/msetsma/pi-statusline), [pi-outline](https://github.com/msetsma/pi-outline), [pi-leader](https://github.com/msetsma/pi-leader).


## Build and sync

```bash
npm install --ignore-scripts
npm run build
./pi-test.sh            # run from source
git fetch upstream && git merge upstream/main
```
