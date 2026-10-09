import { type Component, HStack, ScrollView, type ScrollViewScrollbar, VStack } from "@earendil-works/pi-tui";

export interface ChatViewportOptions {
	readonly document: Component;
	readonly pendingMessages: Component;
	readonly status: Component;
	readonly editor: Component;
	readonly footer: Component;
	readonly widgetsAbove?: Component;
	readonly widgetsBelow?: Component;
	readonly scrollbar?: ScrollViewScrollbar;
	readonly scrollbarTrackStyle?: (text: string) => string;
	readonly scrollbarThumbStyle?: (text: string) => string;
}

/** A side panel beside the transcript. */
export interface ChatViewportPanel {
	readonly component: Component;
	/** Column width in cells. Default 30. */
	readonly width?: number;
}

export interface ChatViewport {
	readonly root: Component;
	readonly transcript: ScrollView;
	/** Replace the side panels. Panels hide while the viewport is narrower than their total width plus 40 columns. */
	setPanels(left: readonly ChatViewportPanel[], right: readonly ChatViewportPanel[]): void;
}

const DEFAULT_PANEL_WIDTH = 30;
const MIN_TRANSCRIPT_WIDTH = 40;

/** Shared fullscreen transcript and fixed input-dock layout. */
export function createChatViewport(options: ChatViewportOptions): ChatViewport {
	const transcript = new ScrollView(options.document, {
		follow: "end",
		primary: true,
		overscroll: "chain",
		scrollbar: options.scrollbar ?? "auto",
		...(options.scrollbarTrackStyle === undefined ? {} : { scrollbarTrackStyle: options.scrollbarTrackStyle }),
		...(options.scrollbarThumbStyle === undefined ? {} : { scrollbarThumbStyle: options.scrollbarThumbStyle }),
	});
	const dock = new VStack([
		{ component: options.pendingMessages, shrink: 1, minSize: 0 },
		{ component: options.status, shrink: 1, minSize: 0 },
		...(options.widgetsAbove === undefined ? [] : [{ component: options.widgetsAbove, shrink: 1, minSize: 0 }]),
		{ component: options.editor, shrink: 1, minSize: 3 },
		...(options.widgetsBelow === undefined ? [] : [{ component: options.widgetsBelow, shrink: 1, minSize: 0 }]),
		{ component: options.footer, shrink: 1, minSize: 0 },
	]);
	const body = new HStack();
	const setPanels = (left: readonly ChatViewportPanel[], right: readonly ChatViewportPanel[]): void => {
		const totalPanelWidth = [...left, ...right].reduce((sum, panel) => sum + (panel.width ?? DEFAULT_PANEL_WIDTH), 0);
		const addPanel = (panel: ChatViewportPanel): void =>
			body.addChild(panel.component, {
				basis: panel.width ?? DEFAULT_PANEL_WIDTH,
				shrink: 1,
				visible: (viewport) => viewport.width >= totalPanelWidth + MIN_TRANSCRIPT_WIDTH,
			});
		body.clear();
		left.forEach(addPanel);
		body.addChild(transcript, { basis: 0, grow: 1, shrink: 1, minSize: 1 });
		right.forEach(addPanel);
	};
	setPanels([], []);
	return {
		transcript,
		root: new VStack([
			{ component: body, basis: 0, grow: 1, shrink: 1, minSize: 1 },
			{ component: dock, basis: "auto", grow: 0, shrink: 1, minSize: 1 },
		]),
		setPanels,
	};
}
