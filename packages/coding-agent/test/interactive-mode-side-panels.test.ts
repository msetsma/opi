import { Container } from "@earendil-works/pi-tui";
import { beforeAll, describe, expect, it } from "vitest";
import type { ExtensionWidgetOptions } from "../src/core/extensions/types.ts";
import type { ChatViewportPanel } from "../src/modes/interactive/chat-viewport.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";
import { initTheme } from "../src/modes/interactive/theme/theme.ts";

type PanelCall = { left: readonly ChatViewportPanel[]; right: readonly ChatViewportPanel[] };

type WidgetContext = {
	extensionWidgets: Map<string, { placement: string; component: object }>;
	widgetContainerAbove: Container;
	widgetContainerBelow: Container;
};

const widgetPrototype = InteractiveMode.prototype as unknown as {
	setExtensionWidget(
		this: WidgetContext,
		key: string,
		content: string[] | undefined,
		options?: ExtensionWidgetOptions,
	): void;
};

const plainEditor = {
	render: () => [],
	invalidate: () => {},
	getText: () => "",
	setText: () => {},
	handleInput: () => {},
};

function createContext(fullscreen: boolean) {
	const above = new Container();
	const below = new Container();
	const calls: PanelCall[] = [];
	const context = Object.assign(Object.create(InteractiveMode.prototype), {
		extensionWidgets: new Map(),
		editor: plainEditor,
		defaultEditor: plainEditor,
		widgetContainerAbove: above,
		widgetContainerBelow: below,
		chatViewport: fullscreen
			? {
					setPanels: (left: readonly ChatViewportPanel[], right: readonly ChatViewportPanel[]) =>
						calls.push({ left, right }),
				}
			: undefined,
		ui: { requestRender: () => {} },
	}) as WidgetContext;
	return { context, above, below, calls };
}

describe("InteractiveMode side panel widgets", () => {
	beforeAll(() => {
		initTheme("dark");
	});

	it("routes left/right placements to the chat viewport panels", () => {
		const { context, above, below, calls } = createContext(true);

		widgetPrototype.setExtensionWidget.call(context, "l", ["left"], { placement: "left", width: 20 });
		widgetPrototype.setExtensionWidget.call(context, "r", ["right"], { placement: "right" });

		const last = calls.at(-1)!;
		expect(last.left.map((panel) => panel.width)).toEqual([20]);
		expect(last.right.map((panel) => panel.width)).toEqual([undefined]);
		expect(last.left[0]!.component).toBe(context.extensionWidgets.get("l")!.component);
		expect(above.children).toHaveLength(1); // default spacer only
		expect(below.children).toHaveLength(0);
	});

	it("clears panels when the widget is removed", () => {
		const { context, calls } = createContext(true);

		widgetPrototype.setExtensionWidget.call(context, "r", ["right"], { placement: "right" });
		widgetPrototype.setExtensionWidget.call(context, "r", undefined);

		expect(calls.at(-1)).toEqual({ left: [], right: [] });
	});

	it("renders side panels nowhere without the fullscreen viewport", () => {
		const { context, above, below } = createContext(false);

		widgetPrototype.setExtensionWidget.call(context, "l", ["left"], { placement: "left" });
		widgetPrototype.setExtensionWidget.call(context, "r", ["right"], { placement: "right" });

		expect(above.children).toHaveLength(1); // default spacer only
		expect(below.children).toHaveLength(0);
	});

	it("renders unknown placements nowhere instead of above the editor", () => {
		const { context, above, below, calls } = createContext(true);

		widgetPrototype.setExtensionWidget.call(context, "t", ["top"], {
			placement: "top" as ExtensionWidgetOptions["placement"],
		});

		expect(context.extensionWidgets.has("t")).toBe(true);
		expect(above.children).toHaveLength(1); // default spacer only
		expect(below.children).toHaveLength(0);
		expect(calls.at(-1)).toEqual({ left: [], right: [] });
	});
});
