# Decisions

Why opi differs from upstream pi, one change at a time. The change list is in the [README](README.md), and branches and upstream status are in [FORK.md](FORK.md).

## Bug fixes

**HStack double render.** In pi, an HStack measures every child's height even when the height is fixed, so a transcript inside an HStack renders the whole document twice per frame. The side panels put the transcript in an HStack, so this had to be fixed first.

**Wheel leak.** In pi, wheel input over a `contain` scroll view scrolls the transcript underneath once the view hits its end. Panels and floating frames need wheel input to stay inside them.

## Extension API

**Editor border widgets.** pi has no way to put content on the editor's border, which is where a statusline belongs. Upstream PR #10602 adds it, so we cherry-picked it instead of writing a competing version.

**Side panels.** pi only places widgets above or below the editor. An outline or file tree needs a column beside the transcript. Upstream discussion #1684 and the closed PR #2820 asked for the same thing and got no answer, so it lives in the fork.

**Shortcut ids.** In pi, a user can't rebind or disable a shortcut an extension registered with `registerShortcut`. An optional id makes it addressable in `keybindings.json`.

**`TUI.getFocusedComponent`.** The method exists on the base class but not on the public `TUI` interface. A leader-key extension swallows a key prefix and has to replay it to the focused component when the sequence doesn't match.

**`overlayOptions` JSDoc.** pi's type docs say `overlayOptions` can be "a function for dynamic updates", but the function is called once. Updating works by mutating the returned object, so the doc now says that.

## TUI components

**`Frame`.** pi overlays have no border, fixed height or input routing of their own, so every floating window would reimplement them. `Frame` is a bordered, fixed-height window that sends mouse input to its child and keeps wheel input from reaching the transcript.

## Theming and settings

**Text attributes.** pi theme files hold colors only, so a theme can't make headings bold or comments italic. Neovim highlight groups can, and that is the model we wanted. Syntax scope overrides let a theme recolor highlight.js scopes without a code change.

**Glyphs.** pi hardcodes box-drawing characters, `→` selectors and the scrollbar. They break on terminals and fonts that lack them, and users can't restyle them. The setting lives in `settings.json` and not in the theme, because glyphs depend on the terminal and font, not the color scheme, and shouldn't flip when light and dark mode switch.

**Settings tabs and glyphs row.** The fork added settings (fullscreen, images, glyphs), and one flat list got long. Tabs split it by topic, and the glyphs row makes the preset reachable without editing JSON.

## Where the fork stops

Leader keys, statusline layout and the outline panel are not in the core. They live in separate extension repos, and the core only carries the hooks above. Upstream merges about 500 commits a month, so every opinion in the core is a recurring merge conflict, while a small hook is not.
