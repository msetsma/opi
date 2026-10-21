# opi fork plan

Plan for the TUI customization work described in `../pi-customization-notes.md`. All file:line references are at fork HEAD `6fb2e7815` (upstream `ce950d78` plus one upstream commit, no fork commits yet). `IM` means `packages/coding-agent/src/modes/interactive/interactive-mode.ts`. Line numbers in IM will shift once PR #10602 is cherry-picked in M1, so re-derive them after that step.

## Approach

Three rules shape everything below.

1. **Companion extension first, core second.** Policy (leader keys, which-key, statusline layout, highlight-group maps) goes in a separate package, `pi-my-ext`, in a sibling repo. The fork core only gets small, generic hooks. Each hook should be reviewable and upstreamable on its own. This keeps rebase pain low: upstream had 512 commits in the last 30 days and IM alone had 38.
2. **Reuse what upstream already has.** PR #10602 (editor border widgets, open, from an approved contributor) already widens `WidgetPlacement` and rewrites the widget maps. Cherry-pick it and build on it. Don't write a competing version.
3. **Fixes before features.** Two real bugs and one perf bug turned up during research. They are the easiest upstream PRs and unblock later milestones.

## Corrections to the notes

The research found these stale or wrong claims. Update the notes file in M0.

- `DEFAULT_EDITOR_KEYBINDINGS` / `DEFAULT_APP_KEYBINDINGS` don't exist. The tables are `TUI_KEYBINDINGS` (`packages/tui/src/keybindings.ts:71`), `APP_KEYBINDINGS` (`core/keybindings.ts:25`, not exported) and the merged `KEYBINDINGS` (`core/keybindings.ts:180`). `AGENTS.md:27` carries the same stale names. Leave `AGENTS.md` alone in the fork, since editing it would conflict on every sync.
- `keybindings.json` already accepts a key or a list of keys per action. What's missing is multi-key sequences. Unknown ids survive loading (`core/keybindings.ts:269-276`) and the schema allows them (`core/keybindings-schema.ts:19-21`), but `KeybindingsManager.rebuild` drops them (`tui/src/keybindings.ts:249`).
- There are 56 theme tokens (49 fg, 7 bg), not about 60. Syntax highlighting uses highlight.js 10.7.3 directly. cli-highlight is gone. The fold table survives as `buildCliHighlightTheme` (`theme.ts:887-916`).
- `setLayoutRoot` is already public through `ViewportTUI` / `isViewportTUI` (`tui.ts:495-504`). Extensions can set the root but can't read it, and IM overwrites it on every remount (IM:877, IM:908).
- Programmatic overlay move/resize already works. `showOverlay` keeps the options object by reference (`tui.ts:732`) and re-reads it each frame. Only interactive drag is fork territory.
- `types.ts:223` claims `overlayOptions` can be "a function for dynamic updates". IM calls the function only once (IM:3014-3026).
- Images: `layout.ts:350` is just a fast path. The real limits are `layout.ts:368` (the scrolled-off crop only paints at x=0 at full width) and `tui.ts:433` (`compositeTuiLine` returns the base line unchanged on image rows). A right panel loses its text on rows that hold a Kitty image anchor.
- Bootstrap is missing two steps. Model data under `packages/ai/src/providers/data/` is gitignored and must be hydrated, or `tsc` and the coding-agent tests fail. `./test.sh` also needs the Rust env daemon (`npm run build:daemon --workspace packages/env`).
- The glyph inventory is about 40 sites, not three. The full list is in the M6 section.

## Bugs found

| Bug | Where | Fix |
|---|---|---|
| Closing a `ctx.ui.custom` overlay pops the top of the overlay stack, not its own overlay. One custom overlay plus the fullscreen search overlay is enough to reproduce: `done()` closes search. | IM:2997 `if (isOverlay) this.ui.hideOverlay();`, IM:2462 (`resetExtensionUI` pops once), `tui.ts:829-842` | Keep a `Set` of extension overlay handles. `close()` calls `handle?.hide()`, and reset hides them all. This also covers `done()` firing inside the factory before the overlay is shown. |
| HStack layout measures every child's height even when the height is fixed. A transcript wrapped in an HStack renders the whole document twice per frame. | `layout.ts:204-206` | Compute `intrinsicHeights` only when `height === undefined \|\| node.align !== "stretch"`. |
| `setupExtensionShortcuts` returns early when there are no extension shortcuts, so anything else installed there never runs in the no-extension case. | IM:2243 | Only matters if key sequences move into core (backlog). Noted so nobody hits it. |

## Decisions (settled 2026-10-08)

1. **Cherry-pick PR #10602 now:** yes (commits `81ebc3c2d`, `6b64699d0`). Every widget and statusline milestone builds on its single `extensionWidgets` map. If upstream revises it, re-cherry-pick.
2. **Config:** shared. The fork uses the normal `~/.pi/agent`, with no `PI_CODING_AGENT_DIR`. Breaking the installed pi is acceptable. Expect stock pi to load the companion too and to render fork-only placements above the editor (IM:2435).
3. **Leader keys:** both. `space` starts a sequence only when the companion's editor is focused and empty (or in a vim normal mode), and `ctrl+space` works anywhere the editor has focus.
4. **Editor ownership:** the companion ships its own `CustomEditor` subclass. It wraps another editor through `getEditorComponent()` only if one is present.
5. **Side panels:** you can toggle them at any time. A companion keybinding and command show or hide each panel by calling `setWidget(key, factory, {placement})` or `setWidget(key, undefined)`. The core needs no extra API for this, because widgets already add and remove live. Panels sit beside the transcript only. They also auto-hide below the width guard and stay hidden in regular mode. Accept the cosmetic Kitty image glitch with right panels until the backlog fix. A pinned `"top"` slot is left out for now.
6. **Upstream handle:** `msetsma`, the personal account that owns the fork. Follow the contributor gate. Open a short "Contribution Proposal" issue in your own words (Monday to Thursday, labels `pkg:tui` / `pkg:coding-agent`) and open a PR only after a maintainer replies `lgtm`. The first proposals are the overlay close fix (M1) and the HStack measure fix (M2), because they are bug and perf fixes with no new API. I draft them, and you file them.
7. **Companion location:** `/Users/msetsma/dev/pi-fork/pi-my-ext`, a sibling repo and not a workspace. A workspace would drag it into the root `npm run check`, pinned-deps, the lockfile guard and every sync conflict.
8. **Daily driver:** live source through `pi-test.sh` while developing. Switch to a built bundle from a second worktree on `my` once you want stability.

## Milestones

### M0: bootstrap (no repo code changes)

Steps:
1. `git remote add upstream git@github.com:earendil-works/pi.git && git fetch upstream --tags`
2. `git config rerere.enabled true` (IM conflicts will repeat)
3. `npm ci --ignore-scripts`
4. `npm run hydrate:model-data`, then `npm run check:model-data`. If a provider endpoint flakes (the script runs `--strict`), use the pinned catalog: fetch `https://pi.dev/api/models/revisions/<rev>?types=chat,image,classifier` with `rev` from `nix/model-catalog.json` and run `node packages/ai/scripts/hydrate-model-catalog.ts <file>`.
5. Don't run plain `npm run build` day to day. Its ai step regenerates tracked `models.generated.ts` and `providers/*.models.ts` from live data and pollutes diffs. Use `build:offline` if you need a bundle.
6. Native: nothing to do. darwin prebuilds are committed under `packages/tui/native/darwin/prebuilds/`.
7. Create the wrapper `~/.local/bin/pim`. It has to be a script, not a symlink, because `pi-test.sh` resolves its own dir from `BASH_SOURCE`. It shares `~/.pi/agent` with the installed pi (decision 2).
   ```sh
   #!/bin/sh
   export PI_SKIP_VERSION_CHECK=1
   exec /Users/msetsma/dev/pi-fork/pi-my/pi-test.sh "$@"
   ```
   Later, if you want `pi` itself to be the fork, point `~/.local/bin/pi` at this wrapper.
8. Branches: `main` mirrors upstream (fast-forward only, never commit to it). `my` is the integration branch. Feature branches `feat/<topic>` are cut from `main` so they stay PR-ready.
9. Leave GitHub Actions disabled on `msetsma/opi`. The upstream issue and PR gate workflows would misfire.
10. Update the notes file with the corrections above.

Done when: `npm run check` is green on unmodified `main`, `cd packages/tui && npm test` passes, and `pim` launches from source in tmux (160x40, cwd outside the repo). Record how long `npm run check` takes as a baseline.

### M1: quick wins

Changes:
- Cherry-pick #10602 onto `my`: `git fetch upstream pull/10602/head` then cherry-pick both commits. Only 2 of the 24 later upstream commits touch its files, so expect small conflicts at most (`tui/src/components/editor.ts`, `docs/tui.md`).
- Overlay handle `Set` fix (IM:2997, IM:2462). About 15 lines.
- Add `getFocusedComponent(): Component | null` to the public `TUI` interface (`tui.ts:464-493`). It already exists on the base class at `tui.ts:594`. One line. The companion needs it to replay a swallowed key prefix to the right component.
- Fix the `types.ts:223` JSDoc.
- Companion skeleton in `pi-my-ext`:
  - `package.json` with `"keywords": ["pi-package"]`, `"pi": {"extensions": ["./src/index.ts"]}`, and host packages as `peerDependencies: "*"`.
  - For typecheck, point tsconfig `paths` at the fork's `src`. `file:` devDependencies would need the fork built first.
  - Load it through `"packages": ["~/dev/pi-fork/pi-my-ext"]` in `~/.pi/agent/settings.json`. `/reload` picks up edits.
  - First features on today's API: a statusline and winbar on #10602's border slots (`borderBottomLeft/Right`, top slots), plus `setHeader`.
  - Capture `tui` from the editor or footer factory. You don't need pi-message-sidebar's zero-line bridge widget.

Tests:
- #10602's own `test/custom-editor-border-content.test.ts` and `test/interactive-mode-widget-placement.test.ts` pass.
- New test in `test/interactive-mode-status.test.ts` (harness at :232-300): open a custom overlay and the search overlay, resolve the custom one, and assert search is still open. Add a second case where `done()` fires inside the factory.

Done when: the tests above and `npm run check` are green, and the companion's border segments show up in both TUI modes.

Upstream candidates: the overlay fix (bug) and `getFocusedComponent` (one line).

### M2: side panels (headline feature)

Prerequisite commit (`packages/tui/src/layout.ts:204-206`): skip HStack child height measurement for fixed-height stretch children. Test: an HStack copy of `layout.test.ts:34` ("does not render fixed-basis scroll content during stack measurement") asserting the transcript renders once per frame. Check `test/alt-screen-large-transcript-bench.ts` before and after.

API, the minimal version from the review:
```ts
export type WidgetPlacement = /* #10602 values */ | "left" | "right";
export interface ExtensionWidgetOptions {
  placement?: WidgetPlacement;
  /** left/right only: column width in cells. Default 30. Fullscreen only. */
  width?: number;
}
```
No `minSize`, `maxSize` or user `visible` in v1. For panel entries without `grow`, `maxSize` does nothing (`stack.ts:89-104`), and `minSize` only matters below the shrink threshold. Add `visible` when an extension needs custom responsiveness. Width is numeric only, because `"auto"` measures at full terminal width (`layout.ts:200-202`) and `Text` pads every line to full width, so an auto panel would take the whole screen.

Changes:
- `chat-viewport.ts`: build the root once as `VStack[HStack(body) basis 0 grow 1, dock]`, and add `setPanels(left, right)` to the returned object to rebuild the body entries: left panels, then the transcript `{basis:0, grow:1, shrink:1, minSize:1}`, then right panels. Each panel gets `{basis: width ?? 30, shrink: 1, visible: vp => vp.width >= totalPanelWidth + 40}`. The guard uses the total width of all panels so the transcript never gets squeezed. Keep the new field optional, because `experimental/client-tui.ts:144` also calls `createChatViewport`.
- IM, after #10602: left/right becomes one more filter over the unified `extensionWidgets` map in `renderWidgets`. Rewrite the placement routing explicitly. The current ternary at IM:2435 sends any unknown placement to `aboveEditor`. Call `this.chatViewport?.setPanels(...)` and store the viewport next to IM:980.
- Regular mode needs no code. Panels live only in the fullscreen root, and regular mode never mounts that root (IM:908, IM:875-877).
- RPC: follow #10602's precedent. Widen the literal at `rpc-types.ts:284` and forward the value, and hosts ignore what they can't render. Don't rely on the `as RpcExtensionUIRequest` cast at `rpc-mode.ts:206` to catch mistakes. Update `docs/rpc-extension-ui.md:144`.
- Pattern to document, with no auto-wrapping: a panel that should scroll independently returns `new ScrollView(content, { overscroll: "contain" })` and must not set `primary`.
- Runtime toggle (decision 5) lives in the companion. It registers a `pi-my.panel.<name>.toggle` action, bound through its own keymap and exposed as a `/panel <name>` command. The action calls `setWidget(key, factory, {placement, width})` to show the panel and `setWidget(key, undefined)` to hide it, and it remembers the state so `/reload` restores it. Hiding disposes the component, so any panel state that must survive a toggle (scroll position, expanded tree nodes) lives in the companion rather than in the component. Toggling does nothing visible in regular mode, so the command should `notify` there.
- A `"top"` placement is deferred (decision 5). It would be one more entry in the root VStack before the body.
- Docs and example: a right-panel case in `examples/extensions/widget-placement.ts`, a row in the `docs/tui.md` integration table, and a short "Side panels" note.

What already works at x>0, so no changes needed: transcript selection (`tui-alt-screen.ts:1138-1156`, `1603-1614`), search highlights (`1509-1570`), the scrollbar column (`layout.ts:296`), the scroll-to-end indicator (`1654`) and wheel routing to the ScrollView under the pointer (`994-1006`).

Known limits shipped as-is (backlog):
- Right panels lose a text row on Kitty image anchor rows.
- Drag-selecting inside a non-ScrollView panel falls back to full-row screen selection.
- The "Copied!" flash covers the top of a right panel.

Tests:
- `packages/tui/test/layout.test.ts`: the HStack measure test above.
- `packages/tui/test/tui-alt-screen.test.ts`:
  - Selection with the transcript at x>0, copying the pattern near :1335. Assert the OSC 52 payload holds only transcript text.
  - Search highlight lands after the panel columns, built on the tests near :754 and :777.
  - Wheel over a `contain` ScrollView panel scrolls only that panel, copying the pattern at :292-318 and :532.
- `packages/coding-agent/test/chat-viewport.test.ts`: the transcript box sits at `x === width` with a left panel, `setPanels([], [])` restores the plain tree, and panels hide below the width guard.
- A widget-placement test modeled on #10602's `interactive-mode-widget-placement.test.ts`.

Done when: all of the above pass, `widget-placement.ts` shows a right panel, the companion toggle shows and hides a panel mid-session in tmux, a tmux resize to below total panel width + 40 columns hides it (for example 96 with the 24-column example panel plus the 32-column outline), and the bench shows no regression.

Upstream: the measure fix can go alone. Panels need a Contribution Proposal. Earlier side-panel asks were bot-closed or marked not planned (#3769, #4992, #9238, #2820), so pitch this one as "no new concept, two placement values, tree unchanged without panels".

Size: about 50-60 source lines plus tests.

### M3: highlight groups, part 1

Scope: text attributes on foreground tokens, plus per-theme syntax-scope overrides. Extension-defined tokens are deferred to the backlog.

Theme JSON:
```jsonc
"mdHeading": { "fg": "yellow", "bold": true },   // object form, foreground tokens only
"accent": "#7aa2f7",                               // plain form unchanged
"syntax": { "regexp": { "fg": "#e0af68" }, "meta": "muted" }  // optional, per theme
```

Changes:
- `theme-tokens.ts` and `theme-schema.ts`: give foreground tokens a per-slot union, `colorValue | {fg, bold?, dim?, italic?, underline?, strikethrough?}`, with `additionalProperties:false`. Background tokens stay color-only. They style whole padded lines (`tui/src/utils.ts:1099-1107`), so underline or inverse would cover the panel padding. Add `syntax` as a `Type.Record`, the same pattern `vars` already uses at :65-69. Typebox handles it, so no manual validation.
- `theme.ts`:
  - `createTheme` splits object values into a color and a sparse `attributes` map. Leave the `Theme` constructor's color parameters alone, since `Theme` is a public export.
  - The constructor merges `options.dim` into `tokenAttrs`, runs a small loop so tokens inherit attributes from their fallback, and precomputes open/close strings with `styleTextWithAnsi("\0", ...).split("\0")`.
  - Tokens with only `dim` keep the combined `\x1b[22;39m` close, so the system theme stays byte-identical.
  - `style()` merges token attributes under call-site attributes, so a call site's `bold:false` wins.
- `buildCliHighlightTheme`: use `theme.syntaxOverride[scope] ?? today's token`, and add formatters for scopes that only have overrides. That makes the 15 currently unmapped scopes themable, including `selector-tag`, `template-variable` and `symbol`. The `.` and `-` prefix fallback in `syntax-highlight.ts:96-119` gives the hierarchy for free.
- Regenerate `schemas/theme.schema.json` with `npm run generate:schemas`. Don't hand-edit it.

Known limit: a theme can add bold to markdown headings but not remove it, because `markdown.ts:481-485` hardcodes it. Bold and dim share close code SGR 22, so nesting the two can end the outer attribute early. Document both in `docs/themes.md`.

Tests:
- `test/system-theme.test.ts:132-136` and `test/syntax-highlight.test.ts:89-129` pass unchanged, which proves the default output is byte-identical.
- `test/theme-style.test.ts`: object form, attribute inheritance through fallbacks, and call-site override.
- `test/config-schemas.test.ts:304-325`: object-form and `syntax` cases, plus an `fg` key on a bg token being rejected.
- `test/syntax-highlight.test.ts`: a `regexp` override, `meta` covering `meta-keyword`, and css `selector-tag` now themed.

Upstream: plausible. It's opt-in, backward compatible and generalizes the existing dim mechanism.

Size: about 85 source lines.

### M4: keymaps and which-key, companion first

In the companion:
- Its own `KeybindingsManager` instance (exported from pi-tui) over `~/.pi/agent/pi-my.json`, with action ids namespaced `pi-my.*`. That gives it conflict detection and key normalization for free.
- A key trie on `ctx.ui.onTerminalInput`, Vim timeout semantics, about 1000ms:
  - Exact match: fire and consume.
  - Exact match that is also a prefix: wait, and fire on timeout.
  - Prefix only: extend and restart the timer.
  - Mismatch or timeout with no exact match: replay the swallowed prefix through `tui.getFocusedComponent()?.handleInput(data)` (needs M1), then treat the new key fresh.
  - Pass Kitty key releases through untouched. Treat a repeat of the pending key as a mismatch, otherwise holding `ctrl+x` fires the built-in copy out of order.
  - While pending, a key matching the existing `tui.select.cancel` binding clears without replaying, so there's no hardcoded escape check.
  - Record the focused component when a sequence starts and cancel without replay if focus changed. A click or an async dialog could otherwise send the replay into an overlay.
- Printable-first sequences (`space f f`) only start when the companion's editor is focused and empty, or when it reports a normal mode.
- Dispatch built-ins through the editor the companion owns: `editor.actionHandlers.get(id)?.()` for app actions and `editor.onSubmit("/tree")` for built-in slash commands. `pi.sendUserMessage("/tree")` would send it to the LLM instead (`agent-session.ts:1977-2008`).
- Which-key as an `aboveEditor` widget, not an overlay. Any overlay entry, hidden ones included, blocks `switchTuiMode` (IM:893, `tui.ts:538-540`), and a bottom overlay covers the dock in fullscreen.
- A `/keys` command listing the companion keymap, since `/hotkeys` (IM:6901-6914) only knows built-ins and `registerShortcut`.
- Mode source: the companion's own editor, or pi-vim's `pi-vim:mode-change` event on `pi.events`.

Known limit: in fullscreen the alt-screen listener runs before every extension listener (`tui-alt-screen.ts:281`, keys at :729-793), so leader keys that collide with `tui.altScreen.*` bindings never reach the companion. Pick leaders that don't collide.

Core change, an upstream candidate: an optional `id` on `registerShortcut` so users can rebind extension shortcuts in `keybindings.json`.
- Key the loader's shortcut map by `id ?? shortcut` (`loader.ts:320-329`). Also replace the inline `import("./types.ts")` at :324, which `AGENTS.md` forbids.
- In `runner.getShortcuts` (`runner.ts:673-716`), apply user overrides from `keybindings.getUserBindings()`. `[]` disables a shortcut.
- Decide and document whether user-chosen extension keys bypass the RESERVED list (runner.ts:96-115). Recommended: yes, users own their keys.
- Show the ids in `/hotkeys`.

Tests:
- Companion `node --test` units for sequence match, timeout replay, mismatch replay, release and repeat handling, cancel, and the focus-change cancel.
- `test/extensions-runner.test.ts` (:169-360): an id override and `[]` disabling.
- Manual: tmux with `set -g extended-keys on` and `extended-keys-format csi-u`, testing `space f f` and the which-key popup. Then verify once in a real terminal (Ghostty, kitty, iTerm2), because tmux hides some key behavior.

Done when: the above pass and the leader plus which-key work in both TUI modes.

Size: about 600-1000 lines in the companion, about 40 lines in core.

### M5: floating windows

The review replaced the "new OverlayOptions fields" design with a standalone component. It's smaller, works in both screen modes, and avoids a `tui.ts -> layout.ts -> stack.ts -> tui.ts` import cycle.

- New `packages/tui/src/components/frame.ts`: `class Frame extends Container` with `(child, {height: number | (() => number), border?, title?, style?}, requestRender)`.
  - `render(width)` runs `renderLayoutFrame(child, innerW, innerH, requestRender)` and wraps the lines in a border. It always returns exactly `height` lines, so existing anchor, maxHeight and margin math keeps working unchanged.
  - Percent heights read `tui.terminal.rows` and must clamp to it. A too-tall overlay grows the working height and shifts the screen (`tui-alt-screen.ts:1694`).
  - `handleMouse` offsets by the border inset and dispatches through `getLayoutBoxesAt` on the last frame. Wheel goes to `getScrollViewsAt(...).scrollBy` and returns `{handled:true}`, so the transcript underneath doesn't scroll. When a click requests focus, keep the frame root as the focus target, matching what `dispatchMouseToOverlay` does today (`tui.ts:892-895`).
  - Style the top border, bottom border and one `│` once per frame and reuse them for every row. Draw no border when the frame is narrower than 3 cells.
  - Export it from `index.ts`.
- The same component can wrap side-panel content, which gives bordered panels for free.
- Example: `/overlay-scroll` and `/overlay-border` in `examples/extensions/overlay-qa-tests.ts`.

Tests:
- `overlay-options.test.ts`-style cases for padding, clamping and a ScrollView scrolling inside a frame.
- A `tui-alt-screen.test.ts` case: wheel over a framed overlay leaves the transcript `scrollTop` unchanged.
- A frame whose root is a non-Container component keeps overlay focus bookkeeping intact.

Interactive drag-move and resize stay fork-only and go in the backlog. Programmatic moves already work by mutating the options object.

Size: about 90 source lines plus one export.

### M6: glyphs, fork-first

One `glyphs` key in `settings.json`, never in the theme schema. Glyphs depend on the terminal and font, not the color scheme. They must not flip with light/dark switching, and the theme schema is closed.

```jsonc
"glyphs": { "preset": "ascii", "selectPrefix": "❯ " }
```

- `SettingsManager.getGlyphs()` merges the preset with overrides and drops single-cell overrides whose `visibleWidth !== 1`. The scrollbar cell replacement and tree column math assume one cell.
- Apply it through seams that already exist, with no pi-tui singleton:
  - editor border: `getEditorTheme().borderColor` (`theme.ts:1073`), which receives the raw glyph
  - markdown quote and rule: `quoteBorder`/`hr` callbacks (`theme.ts:1031-1032`)
  - scrollbar: `scrollbarTrackStyle`/`ThumbStyle` callbacks (IM:977-978)
  - settings-list cursor (`theme.ts:1083`), plus a padding fix: `settings-list.ts:140` hardcodes two spaces, so any other cursor width misaligns rows
  - `DynamicBorder` default (`dynamic-border.ts:23`, 64 call sites)
  - the 8 `→ ` selector sites, `extensions/llama/ui.ts:157`, and tree glyphs in `tree-selector.ts:702-743` and `session-selector.ts:535-536`
- pi-tui gets one change: an optional `cursor?: string` on `SelectListTheme`, mirroring `SettingsListTheme.cursor`. `select-list.ts:190` pads the unselected row to its width. The existing `selectedPrefix` field (:19) is declared but never called.
- Wire it where `setCapabilityOverrides` is called (IM:610, IM:2061, `main.ts:873`, `startup-ui.ts:86`), and decide whether the experimental vacation and durable TUIs (`tui.ts:568` in each) are in scope. `applyRuntimeSettings` also runs on every `/new`, `/resume` and fork (IM:2096), so call `ui.invalidate()` only when the resolved glyphs actually changed.

Tests:
- A `SettingsManager` case where a 2-wide override is dropped.
- A select-list case with a 1-wide cursor and aligned rows.
- Existing tests asserting `─` stay green.
- Manual: tmux with `preset: "ascii"` shows no box-drawing characters in editor borders, selectors, settings, the scrollbar, or markdown quotes and rules, in both modes.

Phase 2 (fork-only, optional): `✓ ✗ • › ⊞ ⊟ ○ ◉ · ↳`, footer arrows, markdown tables, the search box, spinner frames, and `...` vs `…` normalization. Those need the `getGlyphs()` singleton design (stored on `globalThis` under `Symbol.for`, like the theme), because they have no per-instance seam. Hold it for later.

Size: about 60 source lines.

## Backlog (explicitly deferred)

- Kitty image compositing in narrower boxes: defer image lines to a post-pass in `renderLayoutFrame`, and fix the crop at `layout.ts:368` and the row drop at `tui.ts:433`. When it lands, add a test that a changing right-panel row re-places images (`a=p`) without re-transmitting them (`a=T`), because the change makes `imageAnchorsNeedRedraw` (`tui-alt-screen.ts:1704-1707`) fire more often.
- Selection clamp for non-scrolling panels (about 20 lines in `tui-alt-screen.ts`).
- Key sequences in core `keybindings.json` for built-in actions. If this ever happens, use a hook in `CustomEditor.handleInput` (`custom-editor.ts:88-92`) rather than splitting the TUI input path, and add a separate per-token schema. The current `KeyIdSchema` duplicate-modifier lookahead spans the whole string (`key-id-schema.ts:8,12`), so it would reject `ctrl+x ctrl+s`.
- `when` / mode contexts in core keybindings.
- Extension-defined theme tokens (`pi.registerThemeTokens`): wait for a real consumer. Extensions can already call `theme.style(text, {fg: "accent", bold: true})`.
- `setStatus` align/priority. #10602's border slots cover left/right segments, and #10612 (`setFooterOptions`) covers trimming the built-in footer.
- `ctx.ui.runAction(id)` for dispatching built-ins without owning the editor. Uncertain upstream given #4422.
- Interactive overlay drag and resize, plus a keyboard window mode with action ids in `TUI_KEYBINDINGS`.
- Replacing the built-in message view, sign column, conceal. Not researched; none of them block anything above.
- A second comparison tool for the notes table.

## Risks

- **Upstream churn.** Keep fork-only logic in new files with a few lines of wiring in IM. Merge `main` into `my` weekly, with `rerere` enabled. `my` is pushed, so it is never rebased.
- **#10602 changes upstream.** Re-cherry-pick the final version. M2 and the M1 statusline depend on its shape.
- **Lockfile.** Don't add workspace packages or deps on fork branches. `scripts/check-lockfile-commit.mjs` blocks it, and it conflicts on every sync.
- **`npm run check` rewrites files** (`biome --write`). Run it on a clean or staged tree.
- **Node version.** Local is v26, CI is Node 22. Test on 22 before any upstream PR.
- **Running from the repo root** triggers the trust prompt and loads the repo's own `.pi/extensions`. Run `pim` from another directory, or pass `-a`.
- **Companion fragility.** Built-in dispatch depends on `CustomEditor.actionHandlers` and `onSubmit` staying public mutable fields (`custom-editor.ts:17`, IM:2888). doompi-ui depends on the same seam, so upstream is less likely to break it silently.
- **Shared agent dir.** Stock pi and the fork read the same settings and load the same companion. Fork-only calls from the companion land above the editor or throw on stock pi. Accepted (decision 2).
- **pi-message-sidebar.** If it's installed alongside native panels, it wraps the root a second time. Don't install both.

## Per-change loop

1. Branch `feat/<topic>` from `main` for upstreamable work. Fork-only work goes on `my` or in the companion.
2. Edit, then run targeted tests:
   - tui: `cd packages/tui && node --test test/x.test.ts`
   - coding-agent: `cd packages/coding-agent && node ../../node_modules/vitest/dist/cli.js --run test/x.test.ts`
   - Never run the full coding-agent vitest suite outside `./test.sh` isolation, because tests gated on API keys would hit real providers.
3. Run it in tmux: `tmux new-session -d -s pi-test -x 160 -y 40 -c /tmp`, then `pim -e <example>`, `tmux capture-pane -p` (add `-e` for colors), and `tmux resize-window -x 100` for width-gated behavior.
4. Run `npm run check` and fix every error, warning and info.
5. Commit explicit paths with the format `feat(tui,coding-agent): message`. Don't touch `CHANGELOG.md`.
6. Rebase the feature branch onto `main`, then merge or cherry-pick it into `my`.
