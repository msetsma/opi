# Roadmap

What is still open in opi. Shipped work is in [.github/README.md](.github/README.md), and the reasons are in [DECISIONS.md](DECISIONS.md).

## Open

- **Glyphs phase 2.** `✓ ✗ • › ⊞ ⊟ ○ ◉ · ↳`, footer arrows, markdown tables, the search box, spinner frames and `...` vs `…`. These have no per-instance seam, so they need a `getGlyphs()` singleton stored on `globalThis` under `Symbol.for`, like the theme.
- **Kitty images in narrower boxes.** Right panels lose a text row on image anchor rows. Defer image lines to a post-pass in `renderLayoutFrame` and fix the crop at `layout.ts` and the row drop in `tui.ts` (`compositeTuiLine`). Add a test that a changing panel row re-places images (`a=p`) without re-transmitting them (`a=T`).
- **Selection clamp for non-scrolling panels.** About 20 lines in `tui-alt-screen.ts`. Drag-selecting inside a non-ScrollView panel falls back to full-row selection.
- **`"top"` side-panel placement.** One more entry in the root VStack before the body.
- **Key sequences in core `keybindings.json`.** Only if the companion approach (pi-leader) stops being enough. Use a hook in `CustomEditor.handleInput` and a per-token schema, because `KeyIdSchema` rejects `ctrl+x ctrl+s`.
- **Extension-defined theme tokens** (`pi.registerThemeTokens`). Wait for a real consumer. Extensions can already call `theme.style(text, {fg: "accent", bold: true})`.
- **`ctx.ui.runAction(id)`** to dispatch built-ins without owning the editor.
- **Interactive overlay drag and resize**, plus a keyboard window mode. Programmatic moves already work by mutating the options object.

## Upstream candidates

Bug and perf fixes go first, since they add no API: the HStack measure fix and the wheel leak. Then `getFocusedComponent`, shortcut ids and text attributes. Side panels need a Contribution Proposal, and earlier side-panel asks were closed (#3769, #4992, #9238, #2820), so pitch it as "no new concept, two placement values, tree unchanged without panels".

## Risks

- **Lockfile.** Don't add workspace packages or deps on fork branches. `scripts/check-lockfile-commit.mjs` blocks it and it conflicts on every sync.
- **`npm run check` rewrites files** (`biome --write`). Run it on a clean or staged tree.
- **Node version.** Local is v26, CI is Node 22. Test on 22 before any upstream PR.
- **Repo root trust prompt.** Running from the repo root loads its own `.pi/extensions`. Run from another directory, or pass `-a`.
- **Companion seam.** Built-in dispatch depends on `CustomEditor.actionHandlers` and `onSubmit` staying public mutable fields.
- **Shared agent dir.** Stock pi and the fork read the same `~/.pi/agent`, so fork-only calls from a companion land above the editor or throw on stock pi.

## Per-change loop

1. Branch `feat/<topic>` from the upstream tip for upstreamable work. Fork-only work goes on `main` or in a companion.
2. Run targeted tests:
   - tui: `cd packages/tui && node --test test/x.test.ts`
   - coding-agent: `cd packages/coding-agent && node ../../node_modules/vitest/dist/cli.js --run test/x.test.ts`
   - Don't run the full coding-agent suite outside `./test.sh`, because tests gated on API keys would hit real providers.
3. Check it in tmux: `tmux new-session -d -s pi-test -x 160 -y 40 -c /tmp`, then run `./pi-test.sh`, `tmux capture-pane -p`, and `tmux resize-window -x 100` for width-gated behavior.
4. Run `npm run check` and fix everything it reports.
5. Commit explicit paths as `feat(tui,coding-agent): message`. Don't touch `CHANGELOG.md`.
