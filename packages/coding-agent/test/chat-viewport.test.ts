import { type Component, Container, ScrollView, VStack } from "@earendil-works/pi-tui";
import { describe, expect, test } from "vitest";
import { getScrollViewBox, renderLayoutFrame } from "../../tui/src/layout.ts";
import { createChatViewport } from "../src/modes/interactive/chat-viewport.ts";
import { stripAnsi } from "../src/utils/ansi.ts";

function lines(...content: string[]): Component {
	return { render: () => content, invalidate: () => {} };
}

function createViewport() {
	return createChatViewport({
		document: lines("transcript"),
		pendingMessages: new Container(),
		status: new Container(),
		editor: lines("editor"),
		footer: lines("footer"),
	});
}

function transcriptRect(viewport: ReturnType<typeof createViewport>, width: number) {
	const frame = renderLayoutFrame(viewport.root, width, 10, () => {});
	return getScrollViewBox(frame, viewport.transcript)!.rect;
}

describe("chat viewport", () => {
	test("defaults the transcript scrollbar to auto and accepts overrides", () => {
		const automatic = createChatViewport({
			document: new Container(),
			pendingMessages: new Container(),
			status: new Container(),
			editor: new Container(),
			footer: new Container(),
		});
		const hidden = createChatViewport({
			document: new Container(),
			pendingMessages: new Container(),
			status: new Container(),
			editor: new Container(),
			footer: new Container(),
			scrollbar: "hidden",
		});

		expect(automatic.transcript.scrollbar).toBe("auto");
		expect(hidden.transcript.scrollbar).toBe("hidden");
	});

	test("places the transcript after left panels", () => {
		const viewport = createViewport();
		viewport.setPanels([{ component: lines("left"), width: 20 }], [{ component: lines("right") }]);

		expect(transcriptRect(viewport, 120)).toMatchObject({ x: 20, width: 70 });
		const frame = renderLayoutFrame(viewport.root, 120, 10, () => {});
		expect(stripAnsi(frame.lines[0]!).trimEnd()).toBe(`left${" ".repeat(16)}transcript${" ".repeat(60)}right`);
	});

	test("renders the plain transcript tree without panels", () => {
		const viewport = createViewport();
		viewport.setPanels([{ component: lines("left") }], []);
		viewport.setPanels([], []);

		const legacyTranscript = new ScrollView(lines("transcript"), { follow: "end", primary: true, scrollbar: "auto" });
		const legacyRoot = new VStack([
			{ component: legacyTranscript, basis: 0, grow: 1, shrink: 1, minSize: 1 },
			{
				component: new VStack([
					{ component: new Container(), shrink: 1, minSize: 0 },
					{ component: new Container(), shrink: 1, minSize: 0 },
					{ component: lines("editor"), shrink: 1, minSize: 3 },
					{ component: lines("footer"), shrink: 1, minSize: 0 },
				]),
				basis: "auto",
				grow: 0,
				shrink: 1,
				minSize: 1,
			},
		]);
		expect(renderLayoutFrame(viewport.root, 80, 10, () => {}).lines).toEqual(
			renderLayoutFrame(legacyRoot, 80, 10, () => {}).lines,
		);
		expect(transcriptRect(viewport, 80)).toMatchObject({ x: 0, width: 80 });
	});

	test("hides all panels below the width guard", () => {
		const viewport = createViewport();
		viewport.setPanels([{ component: lines("left") }], [{ component: lines("right"), width: 20 }]);

		// Total panel width 50 plus 40 transcript columns.
		expect(transcriptRect(viewport, 89)).toMatchObject({ x: 0, width: 89 });
		expect(transcriptRect(viewport, 90)).toMatchObject({ x: 30, width: 40 });
	});
});
