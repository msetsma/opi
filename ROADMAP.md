# Roadmap

Fork changes still open. Shipped work is in [.github/README.md](.github/README.md), and the reasons are in [DECISIONS.md](DECISIONS.md).

## Window management

- **Neovim-style window control (direction).** Splits in any direction, nested layouts, floating windows with z-order, keyboard focus movement between windows, and layout save and restore. Core gets only the primitives: let an extension own the body layout tree, with the transcript as one node it can place, and add focus management between windows. Window policy (split commands, tabs, layouts) lives in an extension repo. Side panels, `Frame` and overlays are the first steps. Fixed left/right panels are the part that won't scale, so this likely replaces them.
- **`"top"` side-panel placement.** One more entry in the root VStack before the body.
- **Interactive overlay drag and resize**, plus a keyboard window mode. Programmatic moves already work by mutating the options object.

## Rendering and input fixes

- **Kitty images in narrower boxes.** Right panels lose a text row on image anchor rows. Defer image lines to a post-pass in `renderLayoutFrame` and fix the crop at `layout.ts` and the row drop in `tui.ts` (`compositeTuiLine`). Add a test that a changing panel row re-places images (`a=p`) without re-transmitting them (`a=T`).
- **Selection clamp for non-scrolling panels.** About 20 lines in `tui-alt-screen.ts`. Drag-selecting inside a non-ScrollView panel falls back to full-row selection.

## Theming and glyphs

- **Glyphs phase 2.** `✓ ✗ • › ⊞ ⊟ ○ ◉ · ↳`, footer arrows, markdown tables, the search box, spinner frames and `...` vs `…`. These have no per-instance seam, so they need a `getGlyphs()` singleton stored on `globalThis` under `Symbol.for`, like the theme.
- **Extension-defined theme tokens** (`pi.registerThemeTokens`). Wait for a real consumer. Extensions can already call `theme.style(text, {fg: "accent", bold: true})`.

## Keys and actions

- **Key sequences in core `keybindings.json`.** Only if the companion approach (pi-leader) stops being enough. Use a hook in `CustomEditor.handleInput` and a per-token schema, because `KeyIdSchema` rejects `ctrl+x ctrl+s`.
- **`ctx.ui.runAction(id)`** to dispatch built-ins without owning the editor.
