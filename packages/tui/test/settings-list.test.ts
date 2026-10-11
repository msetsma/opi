import assert from "node:assert";
import { describe, it } from "node:test";
import { SettingsList, type SettingsListTheme } from "../src/components/settings-list.ts";
import { KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "../src/keybindings.ts";
import type { TuiMouseEvent } from "../src/tui.ts";
import { visibleWidth } from "../src/utils.ts";

const testTheme: SettingsListTheme = {
	label: (text) => text,
	value: (text) => text,
	description: (text) => text,
	cursor: "> ",
	hint: (text) => text,
};

const items = [
	{
		id: "tui-mode",
		label: "TUI mode",
		currentValue: "regular",
		values: ["regular", "fullscreen"],
	},
];

describe("SettingsList", () => {
	it("includes spaces in an active search instead of changing the selected setting", () => {
		const changes: Array<{ id: string; value: string }> = [];
		const list = new SettingsList(
			items.map((item) => ({ ...item })),
			10,
			testTheme,
			(id, value) => changes.push({ id, value }),
			() => {},
			{ enableSearch: true },
		);

		for (const character of "TUI mode") list.handleInput(character);

		assert.deepStrictEqual(changes, []);
		assert.match(list.render(80)[0] ?? "", /TUI mode/);

		list.handleInput("\r");
		assert.deepStrictEqual(changes, [{ id: "tui-mode", value: "fullscreen" }]);
	});

	it("aligns unselected rows with a cursor that is not two cells wide", () => {
		const twoItems = [...items, { id: "theme", label: "Theme", currentValue: "dark" }];
		const lines = new SettingsList(
			twoItems,
			10,
			{ ...testTheme, cursor: "❯ ▸ " },
			() => {},
			() => {},
		).render(80);

		assert.equal(lines[0]?.indexOf("regular"), lines[1]?.indexOf("dark"));
	});

	it("keeps Space as a change shortcut before a search query is entered", () => {
		const changes: Array<{ id: string; value: string }> = [];
		const list = new SettingsList(
			items.map((item) => ({ ...item })),
			10,
			testTheme,
			(id, value) => changes.push({ id, value }),
			() => {},
			{ enableSearch: true },
		);

		list.handleInput(" ");

		assert.deepStrictEqual(changes, [{ id: "tui-mode", value: "fullscreen" }]);
	});

	describe("tabs", () => {
		const tabTheme: SettingsListTheme = { ...testTheme, tab: (text, active) => (active ? `[${text}]` : text) };
		const tabItems = () => [
			{ id: "a", tab: "General", label: "Alpha", currentValue: "x", values: ["x", "y"] },
			{ id: "b", tab: "General", label: "Bravo", currentValue: "x", values: ["x", "y"] },
			{ id: "c", tab: "Display", label: "Charlie", currentValue: "x", values: ["x", "y"] },
			{ id: "d", tab: "Advanced", label: "Delta", currentValue: "x", values: ["x", "y"] },
		];
		const create = (onChange: (id: string, value: string) => void = () => {}) =>
			new SettingsList(tabItems(), 10, tabTheme, onChange, () => {}, { enableSearch: true });
		const rows = (list: SettingsList) =>
			list
				.render(80)
				.map((line) => line.trim())
				.filter((line) => /^(> )?(Alpha|Bravo|Charlie|Delta) /.test(line));

		it("renders a tab bar with the active tab highlighted and only its rows", () => {
			const list = create();
			const lines = list.render(80);
			assert.strictEqual(lines[0], "  [General] │ Display │ Advanced");
			assert.deepStrictEqual(rows(list), ["> Alpha    x", "Bravo    x"]);
			assert.strictEqual(
				lines.at(-1),
				"  Tab/Shift+Tab tabs · Type to search · Enter/Space to change · Esc to cancel",
			);
			assert.ok(visibleWidth(lines.at(-1) ?? "") <= 80);
		});

		it("builds the tab key hint from the active keybindings", (t) => {
			t.after(() => setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS)));
			setKeybindings(
				new KeybindingsManager(TUI_KEYBINDINGS, {
					"tui.tabs.next": "ctrl+right",
					"tui.tabs.previous": "ctrl+left",
				}),
			);
			const list = create();
			assert.match(list.render(80).at(-1) ?? "", /^ {2}Ctrl\+Right\/Ctrl\+Left tabs · /);
			list.handleInput("\t");
			assert.strictEqual(list.render(80)[0], "  [General] │ Display │ Advanced");
		});

		it("lists items without a tab under the first tab", () => {
			const list = new SettingsList(
				[...tabItems(), { id: "e", label: "Echo", currentValue: "x" }],
				10,
				tabTheme,
				() => {},
				() => {},
			);
			assert.strictEqual(list.render(80)[0], "  [General] │ Display │ Advanced");
			assert.ok(list.render(80).some((line) => line.includes("Echo")));
			list.handleInput("\t");
			list.selectItem("e");
			assert.strictEqual(list.render(80)[0], "  [General] │ Display │ Advanced");
		});

		it("switches tabs with wraparound and resets the selection", () => {
			const changes: string[] = [];
			const list = create((id) => changes.push(id));
			list.handleInput("\x1b[B");
			list.handleInput("\t");
			assert.strictEqual(list.render(80)[0], "  General │ [Display] │ Advanced");
			assert.deepStrictEqual(rows(list), ["> Charlie  x"]);
			list.handleInput("\t");
			list.handleInput("\t");
			assert.strictEqual(list.render(80)[0], "  [General] │ Display │ Advanced");
			list.handleInput("\x1b[Z");
			assert.deepStrictEqual(rows(list), ["> Delta    x"]);
			list.handleInput("\r");
			assert.deepStrictEqual(changes, ["d"]);
		});

		it("keeps the active tab visible on narrow widths", () => {
			const list = create();
			list.handleInput("\x1b[Z");
			for (const width of [12, 20, 30]) {
				const bar = list.render(width)[0] ?? "";
				assert.ok(visibleWidth(bar) <= width, `${width}: ${bar}`);
				assert.match(bar, /\[Advanced\]/);
			}
			assert.strictEqual(list.render(14)[0], "… [Advanced]");
		});

		it("searches across all tabs and clears the query when switching tabs", () => {
			const list = create();
			for (const character of "Delta") list.handleInput(character);
			assert.strictEqual(list.render(80)[0], "  General │ Display │ Advanced");
			assert.deepStrictEqual(rows(list), ["> Delta    x"]);
			list.handleInput("\t");
			assert.deepStrictEqual(rows(list), ["> Charlie  x"]);
		});

		it("selectItem switches to the item's tab", () => {
			const list = create();
			list.selectItem("d");
			assert.strictEqual(list.render(80)[0], "  General │ Display │ [Advanced]");
			assert.deepStrictEqual(rows(list), ["> Delta    x"]);
		});

		it("offsets mouse rows by the tab bar", () => {
			const changes: string[] = [];
			const list = create((id) => changes.push(id));
			const click = (y: number): TuiMouseEvent => ({
				type: "click",
				button: "left",
				x: 4,
				y,
				screenX: 4,
				screenY: y,
				width: 80,
				height: 20,
				shift: false,
				alt: false,
				ctrl: false,
				clickCount: 1,
			});
			assert.strictEqual(list.handleMouse(click(0)), undefined);
			// Rows: tab bar, blank, search, blank, Alpha, Bravo
			list.handleMouse(click(5));
			assert.deepStrictEqual(changes, ["b"]);
		});
	});
});
