import { Markdown } from "@earendil-works/pi-tui";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GLYPH_PRESETS } from "../src/core/settings-defaults.ts";
import { DynamicBorder } from "../src/modes/interactive/components/dynamic-border.ts";
import { getEditorTheme, getMarkdownTheme, initTheme, setGlyphs } from "../src/modes/interactive/theme/theme.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

describe("glyphs setting", () => {
	beforeEach(() => {
		initTheme("dark");
		setGlyphs(GLYPH_PRESETS.ascii);
	});

	afterEach(() => {
		setGlyphs(GLYPH_PRESETS.unicode);
	});

	it("reports whether the glyphs changed", () => {
		expect(setGlyphs(GLYPH_PRESETS.ascii)).toBe(false);
		expect(setGlyphs(GLYPH_PRESETS.unicode)).toBe(true);
	});

	it("replaces markdown quote borders and rules", () => {
		const lines = new Markdown("> quoted\n\n---", 0, 0, getMarkdownTheme())
			.render(20)
			.map((line) => stripAnsi(line).trimEnd());

		expect(lines).toContain("| quoted");
		expect(lines).toContain("-".repeat(20));
		expect(lines.join("")).not.toMatch(/[│─]/);
	});

	it("replaces editor and dynamic borders", () => {
		expect(stripAnsi(getEditorTheme().borderColor("── ↑ 2 more ──"))).toBe("-- ↑ 2 more --");
		expect(new DynamicBorder().render(4).map((line) => stripAnsi(line))).toEqual(["----"]);
	});
});
