import { getLayoutBoxesAt, getScrollViewsAt, type LayoutFrame, renderLayoutFrame } from "../layout.ts";
import { getLayoutNode } from "../layout-node.ts";
import {
	type Component,
	Container,
	dispatchMouseEvent,
	isFocusable,
	type TuiMouseDispatchResult,
	type TuiMouseEvent,
} from "../tui.ts";
import { truncateToWidth, visibleWidth } from "../utils.ts";

export interface FrameOptions {
	/**
	 * Total rows, border included. A function is read on every render. Clamp it to `tui.terminal.rows`:
	 * an overlay taller than the terminal grows the working area and shifts the screen.
	 */
	height: number | (() => number);
	/** Draw a rounded border (default true). Skipped when the frame is narrower or shorter than 3 cells. */
	border?: boolean;
	/** Title drawn in the top border. */
	title?: string;
	/** Style for the border glyphs and title. */
	style?: (text: string) => string;
}

const SEGMENT_RESET = "\x1b[0m\x1b]8;;\x07";

/**
 * Fixed-height box that lays out its child like a screen (ScrollView, VStack and HStack work inside it)
 * and routes mouse events into it. Always renders exactly `height` lines, so overlay anchors and margins
 * work unchanged; an overlay maxHeight below `height` crops the bottom border. Wheel events over the
 * frame never reach the content underneath.
 */
export class Frame extends Container {
	private readonly child: Component;
	private readonly options: FrameOptions;
	private readonly requestRender: () => void;
	private lastFrame: LayoutFrame | undefined;
	private inset = 0;
	private isFocused = false;

	constructor(child: Component, options: FrameOptions, requestRender: () => void) {
		super();
		this.child = child;
		this.children.push(child);
		this.options = options;
		this.requestRender = requestRender;
	}

	get focused(): boolean {
		return this.isFocused;
	}

	set focused(value: boolean) {
		this.isFocused = value;
		if (isFocusable(this.child)) this.child.focused = value;
	}

	get wantsKeyRelease(): boolean {
		return this.child.wantsKeyRelease === true;
	}

	/** The frame is the keyboard focus owner for anything clicked inside it; keys go to the child. */
	handleInput(data: string): void {
		this.child.handleInput?.(data);
	}

	override render(width: number): string[] {
		const option = this.options.height;
		const height = Math.max(0, Math.floor(typeof option === "function" ? option() : option));
		if (height === 0) {
			this.lastFrame = undefined;
			return [];
		}
		this.inset = this.options.border !== false && width >= 3 && height >= 3 ? 1 : 0;
		const innerWidth = width - this.inset * 2;
		const frame = renderLayoutFrame(this.child, innerWidth, height - this.inset * 2, this.requestRender);
		this.lastFrame = frame;
		if (this.inset === 0) return frame.lines;

		const style = this.options.style ?? ((text: string) => text);
		const title = this.options.title ? truncateToWidth(`─ ${this.options.title} `, innerWidth, "") : "";
		// Styled in two parts: a truncated title ends in a reset that would unstyle the rest of the border.
		const top = style(`╭${title}`) + style(`${"─".repeat(innerWidth - visibleWidth(title))}╮`);
		const side = style("│");
		const bottom = style(`╰${"─".repeat(innerWidth)}╯`);
		const rows = frame.lines.map(
			(line) => `${side}${truncateToWidth(line, innerWidth, "", true)}${SEGMENT_RESET}${side}`,
		);
		return [top, ...rows, bottom];
	}

	override handleMouse(event: TuiMouseEvent): TuiMouseDispatchResult | undefined {
		const frame = this.lastFrame;
		if (!frame) return undefined;
		const x = event.x - this.inset;
		const y = event.y - this.inset;
		const inside = x >= 0 && y >= 0 && x < frame.width && y < frame.height;
		if (inside) {
			// Same walk as the alternate-screen layout dispatch. dispatchMouseEvent keeps this frame as the
			// focus target because it has handleInput.
			const visited = new Set<Component>();
			for (const box of getLayoutBoxesAt(frame, x, y)) {
				if (visited.has(box.component)) continue;
				if (getLayoutNode(box.component) && box.component.handleMouse === Container.prototype.handleMouse) continue;
				visited.add(box.component);
				const result = dispatchMouseEvent(box.component, {
					...event,
					x: x - box.rect.x,
					y: y - box.rect.y,
					width: box.rect.width,
					height: box.rect.height,
				});
				if (result) return result;
			}
		}
		if (event.type !== "wheel") return undefined;
		let remaining = event.wheelDelta ?? 0;
		for (const scrollView of inside ? getScrollViewsAt(frame, x, y) : []) {
			remaining = scrollView.scrollBy(remaining);
			if (remaining === 0 || scrollView.overscroll === "contain") break;
		}
		// Consume the wheel even when nothing scrolled, so the transcript underneath stays put.
		return {
			handled: true,
			target: {
				component: this,
				originX: event.screenX - event.x,
				originY: event.screenY - event.y,
				width: event.width,
				height: event.height,
			},
		};
	}
}
