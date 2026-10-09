import assert from "node:assert";
import { describe, it } from "node:test";
import { Frame } from "../src/components/frame.ts";
import { ScrollView } from "../src/components/scroll-view.ts";
import { Text } from "../src/components/text.ts";
import type { Component, TuiMouseEvent, TuiMouseEventResult } from "../src/tui.ts";
import { TuiAltScreen } from "../src/tui-alt-screen.ts";
import { TuiMainScreen } from "../src/tui-main-screen.ts";
import { stripTerminalSequences, visibleWidth } from "../src/utils.ts";
import { VirtualTerminal } from "./virtual-terminal.ts";

const noop = () => {};
const numbered = (count: number) => Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n");
const plain = (lines: string[]) => lines.map((line) => stripTerminalSequences(line));

class ClickTarget implements Component {
	focused = false;
	wantsKeyRelease = false;
	inputs: string[] = [];

	render(): string[] {
		return ["click me"];
	}

	handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
		return event.type === "press" ? { focus: true } : undefined;
	}

	handleInput(data: string): void {
		this.inputs.push(data);
	}

	invalidate(): void {}
}

describe("Frame", () => {
	it("pads short content to exactly the frame height inside the border", () => {
		const frame = new Frame(new Text("a\nb", 0, 0), { height: 6, title: "T" }, noop);
		const lines = frame.render(10);
		assert.deepStrictEqual(plain(lines), [
			"╭─ T ────╮",
			"│a       │",
			"│b       │",
			"│        │",
			"│        │",
			"╰────────╯",
		]);
		assert.ok(lines.every((line) => visibleWidth(line) === 10));
	});

	it("styles each border segment once per frame", () => {
		const styled: string[] = [];
		const frame = new Frame(
			new Text("x", 0, 0),
			{
				height: 5,
				style: (text) => {
					styled.push(text);
					return text;
				},
			},
			noop,
		);
		frame.render(6);
		assert.deepStrictEqual(styled, ["╭", "────╮", "│", "╰────╯"]);
	});

	it("keeps the top border styled after a truncated title", () => {
		const red = (text: string) => `\x1b[31m${text}\x1b[39m`;
		const frame = new Frame(new Text("x", 0, 0), { height: 4, title: "A very long title here", style: red }, noop);
		const top = frame.render(12)[0] ?? "";
		assert.strictEqual(stripTerminalSequences(top), "╭─ A very l╮");
		assert.ok(top.endsWith("\x1b[31m╮\x1b[39m"));
	});

	it("forwards wantsKeyRelease from the child", async () => {
		const terminal = new VirtualTerminal(30, 10);
		const tui = new TuiAltScreen(terminal);
		const target = new ClickTarget();
		const frame = new Frame(target, { height: 3 }, noop);
		assert.strictEqual(frame.wantsKeyRelease, false);
		target.wantsKeyRelease = true;
		tui.showOverlay(frame, { anchor: "top-left", width: 12 });
		tui.start();
		await terminal.waitForRender();
		terminal.sendInput("\x1b[97;1:3u");
		assert.deepStrictEqual(target.inputs, ["\x1b[97;1:3u"]);
		tui.stop();
	});

	it("clips tall content and keeps the bottom border", () => {
		const frame = new Frame(new Text(numbered(20), 0, 0), { height: 4 }, noop);
		assert.deepStrictEqual(plain(frame.render(10)), ["╭────────╮", "│line 1  │", "│line 2  │", "╰────────╯"]);
	});

	it("re-reads height functions and drops the border below 3 cells", () => {
		let height = 3;
		const frame = new Frame(new Text(numbered(5), 0, 0), { height: () => height }, noop);
		assert.strictEqual(frame.render(10).length, 3);
		height = 2.7;
		assert.deepStrictEqual(plain(frame.render(10)), ["line 1    ", "line 2    "]);
		height = -1;
		assert.deepStrictEqual(frame.render(10), []);
		height = 4;
		assert.strictEqual(frame.render(2).length, 4);
		assert.ok(!frame.render(2).some((line) => line.includes("│")));
	});

	it("keeps overlay anchor and margin math working", async () => {
		const terminal = new VirtualTerminal(30, 10);
		const tui = new TuiMainScreen(terminal);
		tui.addChild(new Text("", 0, 0));
		tui.showOverlay(new Frame(new Text("hi", 0, 0), { height: 4, title: "box" }, noop), {
			anchor: "bottom-right",
			width: 12,
			margin: 1,
		});
		tui.start();
		await terminal.waitForRender();
		const viewport = terminal.getViewport();
		assert.strictEqual(viewport[5]?.slice(17, 29), "╭─ box ────╮");
		assert.strictEqual(viewport[6]?.slice(17, 29), "│hi        │");
		assert.strictEqual(viewport[8]?.slice(17, 29), "╰──────────╯");
		tui.stop();
	});

	it("scrolls a ScrollView inside a framed overlay with the wheel", async () => {
		const terminal = new VirtualTerminal(30, 10);
		const tui = new TuiAltScreen(terminal);
		tui.addChild(new Text(numbered(30), 0, 0));
		const scroll = new ScrollView(new Text(numbered(20), 0, 0));
		tui.showOverlay(new Frame(scroll, { height: 5 }, () => tui.requestRender()), {
			anchor: "top-left",
			width: 12,
		});
		tui.start();
		await terminal.waitForRender();
		assert.strictEqual(terminal.getViewport()[1]?.slice(0, 12), "│line 1    │");

		terminal.sendInput("\x1b[<65;3;3M");
		terminal.sendInput("\x1b[<65;3;3M");
		await terminal.waitForRender();
		assert.strictEqual(scroll.scrollTop, 2);
		assert.deepStrictEqual(
			terminal
				.getViewport()
				.slice(0, 5)
				.map((line) => line.slice(0, 12)),
			["╭──────────╮", "│line 3    │", "│line 4    │", "│line 5    │", "╰──────────╯"],
		);
		tui.stop();
	});

	it("keeps the frame as overlay focus owner when a non-Container child is clicked", async () => {
		const terminal = new VirtualTerminal(30, 10);
		const tui = new TuiAltScreen(terminal);
		tui.addChild(new Text(numbered(30), 0, 0));
		const editor = new ClickTarget();
		tui.setFocus(editor);
		const target = new ClickTarget();
		const frame = new Frame(target, { height: 3 }, noop);
		const handle = tui.showOverlay(frame, { anchor: "top-left", width: 12, nonCapturing: true });
		tui.start();
		await terminal.waitForRender();
		assert.strictEqual(tui.getFocusedComponent(), editor);

		terminal.sendInput("\x1b[<0;3;2M");
		terminal.sendInput("\x1b[<0;3;2m");
		await terminal.waitForRender();
		assert.strictEqual(tui.getFocusedComponent(), frame);
		assert.strictEqual(handle.isFocused(), true);
		assert.strictEqual(target.focused, true);

		terminal.sendInput("x");
		assert.deepStrictEqual(target.inputs, ["x"]);

		handle.hide();
		assert.strictEqual(tui.getFocusedComponent(), editor);
		assert.strictEqual(target.focused, false);
		tui.stop();
	});
});
