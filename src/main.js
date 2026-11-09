const React = require('react');
const h = React.createElement;

const NS = 'fileLineReference';

const NUMBERS_STORAGE_KEY = 'flr.numbers';
const NUMBERS_CLASS = 'flr-numbers';

const zh = {
	'meta.title': '文件行引用',
	'meta.description': '选中文件的若干行，把 @路径:起-止 行范围引用插入对话输入框（Ctrl+Shift+L）；点击消息中的引用 chip 回到起始行；也能把文件面板中的文件或目录拖到输入框，插入 @路径 引用。',
	'action.addLines': '添加选中行到对话',
	'action.addLinesTitle': '把选中的行以 @路径:起-止 引用插入输入框（Ctrl+Shift+L）',
	'action.lineMode': '行选择模式',
	'action.lineModeHint': '行选择模式：点击行选中整行，Shift+点击连选，Ctrl/Cmd+点击增减；再次点击关闭',
	'action.numbers': '行号',
	'action.numbersHint': '在纯文本预览中显示行号（代码预览自带行号）',
	'action.drag': '拖拽文件到对话',
	'action.dragHint': '启用后，可把文件或目录从文件面板拖到输入框，插入 @路径 引用；关闭后不再响应拖拽',
	'shortcut.label': '添加选中行到对话'
};

const en = {
	'meta.title': 'File Line Reference',
	'meta.description': 'Select file lines and insert @path:start-end references into the chat composer (Ctrl+Shift+L); click a reference chip in a message to reopen the file at its start line; drag a file or folder from the Files panel into the composer to insert an @path reference.',
	'action.addLines': 'Add selected lines to chat',
	'action.addLinesTitle': 'Insert the selected lines as @path:start-end into the composer (Ctrl+Shift+L)',
	'action.lineMode': 'Line select mode',
	'action.lineModeHint': 'Line select mode: click selects a line, Shift+click extends, Ctrl/Cmd+click toggles; click again to turn off',
	'action.numbers': 'Line numbers',
	'action.numbersHint': 'Show line numbers in the plain-text preview (the code preview has its own)',
	'action.drag': 'Drag files to chat',
	'action.dragHint': 'When on, drag a file or folder from the Files panel into the composer to insert an @path reference; when off, drags are ignored',
	'shortcut.label': 'Add selected lines to chat'
};

/** Context services this module reads; activation order comes from package.json `dsh.client.inject`. */
const inject = ['slots', 'locale', 'sessions', 'uiConversation', 'sidebarRight'];

/* ---------------------------------------------------------------- styles -- */

const STYLE_ID = 'flr-styles';
const HIGHLIGHT_CLASS = 'flr-line-selected';

const STYLE_TEXT = [
	`.${HIGHLIGHT_CLASS} { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); }`,
	`.flr-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 6px; border: none; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; max-width: 100%; text-align: left; }`,
	'button.flr-chip { cursor: pointer; }',
	'button.flr-chip:hover { background: var(--dsw-alias-bg-layer-1); border-radius: 6px; outline: .5px solid var(--dsw-alias-border-l2); }',
	'.flr-chip-label { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
	'.flr-chip-lines { color: var(--dsw-alias-label-secondary); font-family: var(--dsw-font-mono, ui-monospace, monospace); white-space: nowrap; }',
	'.flr-chip-icon { flex: none; opacity: .7; }',
	'.flr-tool-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }',
	'.flr-tool-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }',
	'.flr-tool-btn:disabled { opacity: .4; cursor: default; background: transparent; color: var(--dsw-alias-label-secondary); }',
	'.flr-tool-btn[aria-pressed="true"] { color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }',
	'.flr-drop-target { outline: 2px dashed var(--dsw-alias-brand-primary); outline-offset: 3px; border-radius: 8px; }',
	`.${NUMBERS_CLASS} [data-textpreview-line]::before { content: attr(data-textpreview-line); display: inline-block; min-width: 3ch; margin-right: 10px; color: var(--dsw-alias-label-secondary); opacity: .75; text-align: right; user-select: none; }`
].join('\n');

function injectStylesheet() {
	const existing = document.getElementById(STYLE_ID);
	if (existing) return () => {};
	const tag = document.createElement('style');
	tag.id = STYLE_ID;
	tag.textContent = STYLE_TEXT;
	document.head.appendChild(tag);
	return () => tag.remove();
}

/* ----------------------------------------------------------------- icons -- */

const ICON_CHAT = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
	h('path', { d: 'M2.5 3.5A1.5 1.5 0 0 1 4 2h8a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 11H6.5L3.8 13.4A.6.6 0 0 1 2.8 13v-2H4a.5.5 0 0 1 .5.5', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
	h('path', { d: 'M5 5.5h6M5 8h4', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' })
);

const ICON_ROWS = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
	h('rect', { x: 1.5, y: 2.5, width: 13, height: 3.4, rx: 1, fill: 'currentColor', opacity: 0.35 }),
	h('path', { d: 'M2.6 8.2h10.8M2.6 11.6h10.8', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
	h('path', { d: 'M13.2 8.2v3.4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.55 })
);

const ICON_FILE = h('svg', { className: 'flr-chip-icon', width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
	h('path', { d: 'M4 1.8h5.2L12.6 5v9.2a.6.6 0 0 1-.6.6H4a.6.6 0 0 1-.6-.6V2.4a.6.6 0 0 1 .6-.6Z', stroke: 'currentColor', strokeWidth: 1.1, strokeLinejoin: 'round' }),
	h('path', { d: 'M9 2v3.4h3.4', stroke: 'currentColor', strokeWidth: 1.1, strokeLinejoin: 'round' })
);

const ICON_NUMBERS = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
	h('path', { d: 'M5.6 2 4.4 14M11.6 2 10.4 14M2.4 5.6h11.2M2 10.4h11.2', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' })
);

const ICON_DRAG = h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
	h('path', { d: 'M8 2.2v11.6M2.2 8h11.6', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' }),
	h('path', { d: 'M8 2.2 6.2 4M8 2.2 9.8 4M8 13.8 6.2 12M8 13.8l1.8-1.8M2.2 8 4 6.2M2.2 8 4 9.8M13.8 8 12 6.2M13.8 8l-1.8 1.8', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' })
);

/* ----------------------------------------------------- selection controller -- */

/**
 * Tracks "which preview lines the user has picked" for the document toolbar.
 *
 * The preview plugin exposes no selection API, so this module reads its stable
 * DOM contract: plain-text rows carry `[data-textpreview-line]` (the value is
 * the 1-based source line), and highlighted code renders `.line` elements in
 * source order inside the `[data-code-block-content]` scrollport. Every read
 * goes through `queryTarget()` so a harness update that changes the contract
 * is a one-function fix.
 */
const controller = (() => {
	const state = {
		mode: false,
		selected: [],
		anchor: null,
		mouse: null,
		numbers: true
	};
	const listeners = new Set();
	const decorated = new Set();
	let lastContainer = null;
	let attached = 0;
	let inserter = null;

	function readStoredNumbers() {
		try {
			const stored = window.localStorage.getItem(NUMBERS_STORAGE_KEY);
			return stored === null ? true : stored === '1';
		} catch {
			return true;
		}
	}

	function applyNumbersClass(on) {
		document.documentElement.classList.toggle(NUMBERS_CLASS, on);
	}

	state.numbers = readStoredNumbers();
	applyNumbersClass(state.numbers);

	function subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}

	function notify() {
		for (const listener of listeners) listener();
	}

	/**
	 * Resolve the mounted preview body. Returns `{ kind, container }` where
	 * `kind` is `'plain' | 'code'`, or null when no line-bearing body exists.
	 * Prefers a visible container so a floating preview does not shadow the
	 * active one.
	 *
	 * Chat markdown fences also carry `[data-code-block-content]`, so a code
	 * container is accepted only inside the document preview's own
	 * `[data-code-preview]` renderer root; chat fences never match and the
	 * lookup falls through to the plain-text branch.
	 */
	function queryTarget() {
		const isVisible = (el) => el.getClientRects().length > 0;
		const previews = [...document.querySelectorAll('[data-code-preview]')];
		const preview = previews.find(isVisible) ?? previews[0];
		if (preview) {
			const code = preview.querySelector('[data-code-block-content]');
			if (code) return { kind: 'code', container: code };
		}
		const plains = [...document.querySelectorAll('[data-textpreview-line]')];
		const first = plains.find((el) => isVisible(el)) ?? plains[0];
		if (!first) return null;
		const total = document.querySelectorAll('[data-textpreview-line]').length;
		// One ancestor must hold every row; with two coexisting plain previews
		// the walk never resolves and the target stays null (degenerate case).
		let container = first.parentElement;
		while (container && container !== document.body && container.querySelectorAll('[data-textpreview-line]').length < total) {
			container = container.parentElement;
		}
		if (!container || container === document.body) return null;
		return { kind: 'plain', container };
	}

	/** Discard picks when the preview body changed underneath (tab or file switch). */
	function ensureFreshTarget() {
		const target = queryTarget();
		const identity = target ? target.container : null;
		if (identity !== lastContainer) {
			lastContainer = identity;
			clearHighlight();
			state.selected = [];
			state.anchor = null;
			if (state.mode) {
				state.mode = false;
				notify();
			}
		}
		return target;
	}

	function lineRowOf(element, target) {
		if (!(element instanceof Element)) return null;
		if (target.kind === 'plain') {
			const row = element.closest('[data-textpreview-line]');
			if (!row || !target.container.contains(row)) return null;
			return { line: Number(row.getAttribute('data-textpreview-line')), el: row };
		}
		const row = element.closest('pre .line');
		if (!row || !target.container.contains(row)) return null;
		const rows = target.container.querySelectorAll('pre .line');
		const index = Array.prototype.indexOf.call(rows, row);
		return index >= 0 ? { line: index + 1, el: row } : null;
	}

	function rowForLine(line, target) {
		if (target.kind === 'plain') {
			return target.container.querySelector(`[data-textpreview-line="${line}"]`);
		}
		return target.container.querySelectorAll('pre .line').item(line - 1);
	}

	function clearHighlight() {
		for (const el of decorated) el.classList.remove(HIGHLIGHT_CLASS);
		decorated.clear();
	}

	function applyHighlight(target) {
		clearHighlight();
		for (const line of state.selected) {
			const row = rowForLine(line, target);
			if (row instanceof Element) {
				row.classList.add(HIGHLIGHT_CLASS);
				decorated.add(row);
			}
		}
	}

	function onClick(event) {
		if (!state.mode || event.button !== 0) return;
		const target = ensureFreshTarget();
		if (!target) return;
		const hit = lineRowOf(event.target, target);
		if (!hit) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.shiftKey && state.anchor !== null) {
			const [from, to] = state.anchor <= hit.line ? [state.anchor, hit.line] : [hit.line, state.anchor];
			state.selected = [];
			for (let n = from; n <= to; n++) state.selected.push(n);
		} else if (event.ctrlKey || event.metaKey) {
			state.selected = state.selected.includes(hit.line)
				? state.selected.filter((n) => n !== hit.line)
				: [...state.selected, hit.line];
			state.anchor = hit.line;
		} else {
			state.selected = [hit.line];
			state.anchor = hit.line;
		}
		applyHighlight(target);
		notify();
	}

	function lineFromNode(node, target) {
		const element = node instanceof Element ? node : node?.parentElement;
		if (!element) return null;
		const hit = lineRowOf(element, target);
		return hit ? hit.line : null;
	}

	function onSelectionChange() {
		const target = ensureFreshTarget();
		const selection = document.getSelection();
		if (!target || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
			if (state.mouse !== null) {
				state.mouse = null;
				notify();
			}
			return;
		}
		const anchor = lineFromNode(selection.anchorNode, target);
		const focus = lineFromNode(selection.focusNode, target);
		if (anchor === null && focus === null) {
			if (state.mouse !== null) {
				state.mouse = null;
				notify();
			}
			return;
		}
		const from = anchor ?? focus;
		const to = focus ?? anchor;
		const next = [Math.min(from, to), Math.max(from, to)];
		if (state.mouse === null || state.mouse[0] !== next[0] || state.mouse[1] !== next[1]) {
			state.mouse = next;
			notify();
		}
	}

	return {
		subscribe,
		/** Refcounted document listeners, alive while a toolbar is mounted. */
		retain() {
			attached += 1;
			if (attached === 1) {
				document.addEventListener('click', onClick, true);
				document.addEventListener('selectionchange', onSelectionChange);
			}
			return () => {
				attached -= 1;
				if (attached === 0) {
					document.removeEventListener('click', onClick, true);
					document.removeEventListener('selectionchange', onSelectionChange);
					state.mode = false;
					state.selected = [];
					state.anchor = null;
					state.mouse = null;
					clearHighlight();
				}
			};
		},
		setMode(on) {
			state.mode = on;
			state.selected = [];
			state.anchor = null;
			state.mouse = null;
			clearHighlight();
			notify();
		},
		/** Current picked lines: explicit mode picks, else the tracked drag range. */
		currentLines() {
			ensureFreshTarget();
			if (state.mode) return [...state.selected].sort((a, b) => a - b);
			if (state.mouse === null) return [];
			const lines = [];
			for (let n = state.mouse[0]; n <= state.mouse[1]; n++) lines.push(n);
			return lines;
		},
		isMode() {
			return state.mode;
		},
		numbersOn() {
			return state.numbers;
		},
		setNumbers(on) {
			state.numbers = on;
			applyNumbersClass(on);
			try {
				window.localStorage.setItem(NUMBERS_STORAGE_KEY, on ? '1' : '0');
			} catch {
				// Storage unavailable (privacy mode); the toggle stays session-local.
			}
			notify();
		},
		/** Register the mounted toolbar's insert action for the global hotkey. */
		setInserter(fn) {
			inserter = fn;
			return () => {
				if (inserter === fn) inserter = null;
			};
		},
		currentInserter() {
			return inserter;
		}
	};
})();

/* --------------------------------------------------------------- dragging -- */

const DRAG_STORAGE_KEY = 'flr.drag';
/** Private payload written on `dragstart`; never `Files`, so native drops stay untouched. */
const DRAG_MIME = 'application/x-dsh-flr-path';
/** dsh-file-drag's payload for the same rows; when present we yield so a drop never inserts twice. */
const FOREIGN_DRAG_MIME = 'application/x-dsh-file-path';
const DROP_TARGET_CLASS = 'flr-drop-target';

/**
 * Drags one Files-panel row into the composer as a plain `@path` mention.
 *
 * The Files tree exposes no drag source, so this reads its stable DOM contract
 * (`[data-files-entry]` + `[data-files-path]`): a delegated `pointerdown` sets
 * `draggable` on the row just before the gesture can start, `dragstart` carries
 * the path over a private MIME type, and `drop` only acts inside the composer.
 * The feature is off when the persisted toggle says so — then no row is armed
 * and no drop is claimed.
 */
const dragger = (() => {
	const state = { enabled: true, session: null };
	const listeners = new Set();
	let attached = 0;
	let armed = null;
	let dropTarget = null;
	let dragging = false;

	try {
		state.enabled = FlrCore.readToggleState(window.localStorage.getItem(DRAG_STORAGE_KEY));
	} catch {
		state.enabled = true;
	}

	function subscribe(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}

	function notify() {
		for (const listener of listeners) listener();
	}

	/** The Files row an event started on, or null outside the tree. */
	function rowOf(node) {
		const element = node instanceof Element ? node : node?.parentElement;
		if (!element) return null;
		const row = element.closest('[data-files-path]');
		return row instanceof Element && row.hasAttribute('data-files-entry') ? row : null;
	}

	/** The composer that would receive the drop, or null elsewhere. */
	function composerOf(node) {
		const element = node instanceof Element ? node : node?.parentElement;
		return element ? element.closest('[contenteditable="true"]') : null;
	}

	function disarm() {
		if (armed === null) return;
		if (armed.wasDraggable === null) armed.element.removeAttribute('draggable');
		else armed.element.setAttribute('draggable', armed.wasDraggable);
		armed = null;
	}

	function arm(row) {
		if (armed !== null && armed.element === row) return;
		disarm();
		armed = { element: row, wasDraggable: row.getAttribute('draggable') };
		row.setAttribute('draggable', 'true');
	}

	function clearDropTarget() {
		if (dropTarget === null) return;
		dropTarget.classList.remove(DROP_TARGET_CLASS);
		dropTarget = null;
	}

	function onPointerDown(event) {
		if (!state.enabled || event.button !== 0) return;
		const row = rowOf(event.target);
		if (row !== null) arm(row);
	}

	function onPointerUp() {
		if (!dragging) disarm();
	}

	function onDragStart(event) {
		if (!state.enabled || armed === null) return;
		const path = armed.element.getAttribute('data-files-path');
		const kind = armed.element.getAttribute('data-files-entry') ?? 'file';
		if (path === null || path === '') return;
		dragging = true;
		try {
			event.dataTransfer?.setData(DRAG_MIME, JSON.stringify({ path, kind }));
			if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
		} catch (error) {
			// No writable DataTransfer: leave `dragging` false so no drop is claimed.
			dragging = false;
			console.warn('[file-line-reference] drag payload rejected:', error);
		}
	}

	function onDragOver(event) {
		if (!state.enabled || !dragging) return;
		const composer = composerOf(event.target);
		if (composer === null) {
			clearDropTarget();
			return;
		}
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		if (dropTarget !== composer) {
			clearDropTarget();
			dropTarget = composer;
			composer.classList.add(DROP_TARGET_CLASS);
		}
	}

	function onDragLeave(event) {
		if (dropTarget === null) return;
		// Only a leave that lands outside the composer clears the highlight.
		const next = event.relatedTarget;
		if (next instanceof Node && dropTarget.contains(next)) return;
		clearDropTarget();
	}

	function onDragEnd() {
		dragging = false;
		clearDropTarget();
		disarm();
	}

	/** Insert one dragged path at the caret; false when the composer refused it. */
	function insert(payload) {
		const session = state.session;
		if (session === null || !session.inputActions) return false;
		const mention = FlrCore.mentionForPath(payload.path, payload.kind, sessionCwd(session.sessionId));
		if (mention === '') return false;
		const actions = session.inputActions;
		const span = actions.captureInsertion();
		if (!actions.insertText(FlrCore.padInsertion('', span.start, mention), span)) {
			const retry = actions.captureInsertion();
			if (!actions.insertText(FlrCore.padInsertion('', retry.start, mention), retry)) {
				console.warn('[file-line-reference] composer rejected the dragged reference');
				return false;
			}
		}
		return true;
	}

	function onDrop(event) {
		if (!state.enabled || !dragging) return;
		const transfer = event.dataTransfer;
		if (transfer === null) return;
		// dsh-file-drag claims the same rows; yielding keeps one drop to one insert.
		if (Array.prototype.includes.call(transfer.types, FOREIGN_DRAG_MIME)) {
			clearDropTarget();
			return;
		}
		const payload = FlrCore.parseDraggedPath(transfer.getData(DRAG_MIME));
		const composer = composerOf(event.target);
		if (payload === null || composer === null) {
			clearDropTarget();
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		clearDropTarget();
		insert(payload);
	}

	return {
		subscribe,
		isEnabled() {
			return state.enabled;
		},
		setEnabled(on) {
			state.enabled = on;
			try {
				window.localStorage.setItem(DRAG_STORAGE_KEY, on ? '1' : '0');
			} catch {
				// Storage unavailable: the toggle stays session-local.
			}
			dragging = false;
			clearDropTarget();
			disarm();
			notify();
		},
		/** Register the mounted Files page's session so a drop can reach its composer. */
		setSession(sessionId, inputActions) {
			const session = { sessionId, inputActions };
			state.session = session;
			return () => {
				if (state.session === session) state.session = null;
			};
		},
		/** Refcounted document listeners, alive while a Files page is mounted. */
		retain() {
			attached += 1;
			if (attached === 1) {
				document.addEventListener('pointerdown', onPointerDown, true);
				document.addEventListener('pointerup', onPointerUp, true);
				document.addEventListener('pointercancel', onPointerUp, true);
				document.addEventListener('dragstart', onDragStart, true);
				document.addEventListener('dragover', onDragOver, true);
				document.addEventListener('dragleave', onDragLeave, true);
				document.addEventListener('drop', onDrop, true);
				document.addEventListener('dragend', onDragEnd, true);
				window.addEventListener('blur', onDragEnd);
			}
			return () => {
				attached -= 1;
				if (attached === 0) {
					document.removeEventListener('pointerdown', onPointerDown, true);
					document.removeEventListener('pointerup', onPointerUp, true);
					document.removeEventListener('pointercancel', onPointerUp, true);
					document.removeEventListener('dragstart', onDragStart, true);
					document.removeEventListener('dragover', onDragOver, true);
					document.removeEventListener('dragleave', onDragLeave, true);
					document.removeEventListener('drop', onDrop, true);
					document.removeEventListener('dragend', onDragEnd, true);
					window.removeEventListener('blur', onDragEnd);
					dragging = false;
					clearDropTarget();
					disarm();
				}
			};
		}
	};
})();

/* ------------------------------------------------------------ components -- */

/** Session facade captured by apply(); lets action handlers resolve cwd without hooks. */
let sessionsFacade = null;

/** Workspace root of one session from the facade snapshot; undefined when unknown. */
function sessionCwd(sessionId) {
	try {
		if (sessionId === undefined || sessionId === null || !sessionsFacade) return undefined;
		return sessionsFacade.list.getSnapshot().byId[sessionId]?.cwd;
	} catch {
		return undefined;
	}
}

/**
 * Keep one broken render from silently deleting the toolbar: the boundary
 * logs the failure to the console and drops only the buttons. Falls back to a
 * pass-through when this React build exposes no Component class, so the
 * module can never fail to load because of the boundary itself.
 */
const ToolbarBoundary = typeof React.Component === 'function'
	? class ToolbarBoundary extends React.Component {
		constructor(props) {
			super(props);
			this.state = { failed: false };
		}
		static getDerivedStateFromError() {
			return { failed: true };
		}
		componentDidCatch(error) {
			console.error('[file-line-reference] toolbar render failed:', error);
		}
		render() {
			return this.state.failed ? null : this.props.children;
		}
	}
	: function ToolbarBoundary({ children }) {
		return children;
	};

/**
 * Slot component: a single h() call that cannot throw, so the boundary
 * genuinely encloses ToolbarActions's own render — errors there would
 * otherwise fly straight to the slot runtime and silently drop the occupant.
 */
function ToolbarActionsGuarded(props) {
	return h(ToolbarBoundary, null, h(ToolbarActions, props));
}

/**
 * Toolbar occupant for `sidebar.right.tab.document.actions`.
 * Owner props: `{ absolutePath }`; session standard props supply `sessionId`
 * and `inputActions`.
 *
 * Hook discipline: this component calls ONLY fixed React hooks — never
 * hook-valued standard props (`useSession`/`useInput`). Those props can
 * appear between renders, and a conditional hook call then changes the hook
 * count mid-life, crashing the slot with React #310 and silently deleting
 * the toolbar. The workspace root is therefore resolved at action time from
 * the sessions facade snapshot (the same pattern ui-reference uses).
 */
function ToolbarActions(props) {
	const [, force] = React.useReducer((n) => n + 1, 0);
	React.useEffect(controller.retain, []);
	React.useEffect(() => controller.subscribe(force), [force]);
	React.useEffect(() => {
		console.info('[file-line-reference] toolbar mounted');
		return () => console.info('[file-line-reference] toolbar unmounted');
	}, []);

	const t = props.t;
	const inputActions = props.inputActions;
	const absolutePath = props.absolutePath;
	const latest = React.useRef({ sessionId: props.sessionId, inputActions, absolutePath });
	latest.current = { sessionId: props.sessionId, inputActions, absolutePath };
	// Controller reads walk the live preview DOM; keep a DOM surprise from
	// crashing the render and silently deleting the buttons.
	let lines = [];
	let mode = false;
	let numbers = controller.numbersOn();
	try {
		lines = inputActions && absolutePath ? controller.currentLines() : [];
		mode = controller.isMode();
	} catch (error) {
		console.error('[file-line-reference] toolbar state read failed:', error);
	}
	const canAdd = lines.length > 0;

	function performInsert() {
		const { sessionId, inputActions: actions, absolutePath: path } = latest.current;
		if (!actions || !path) return false;
		const picked = controller.currentLines();
		if (picked.length === 0) return false;
		const cwd = sessionCwd(sessionId);
		const relative = FlrCore.relativeMentionPath(path, cwd);
		const mention = FlrCore.formatMention(relative, FlrCore.mergeLines(picked));
		if (!mention) return false;
		const span = actions.captureInsertion();
		// Always pad: a leading space unless the mention opens the draft, and
		// always a trailing space so text typed next cannot glue to the path.
		const text = FlrCore.padInsertion('', span.start, mention);
		if (!actions.insertText(text, span)) {
			const retry = actions.captureInsertion();
			if (!actions.insertText(FlrCore.padInsertion('', retry.start, mention), retry)) {
				console.warn('[file-line-reference] composer rejected the line reference insertion');
				return false;
			}
		}
		return true;
	}

	// The global hotkey resolves through the mounted toolbar's inserter.
	React.useEffect(() => controller.setInserter(() => {
		try {
			return performInsert();
		} catch (error) {
			console.warn('[file-line-reference] insertion attempt failed:', error);
			return false;
		}
	}), []);

	return [
		h('button', {
			key: 'add',
			className: 'flr-tool-btn',
			type: 'button',
			title: t('action.addLinesTitle'),
			'aria-label': t('action.addLines'),
			disabled: !canAdd,
			// pointerdown reads the drag selection before the browser collapses
			// it on mousedown; click would already see an empty selection.
			// Keyboard activation (Enter/Space) never fires pointerdown, so the
			// keydown path below is the keyboard's way in.
			onPointerDown: (event) => {
				if (event.button === 0) performInsert();
			},
			onKeyDown: (event) => {
				if (event.key === 'Enter' || event.key === ' ') performInsert();
			}
		}, ICON_CHAT),
		h('button', {
			key: 'mode',
			className: 'flr-tool-btn',
			type: 'button',
			title: t('action.lineModeHint'),
			'aria-label': t('action.lineMode'),
			'aria-pressed': mode,
			onClick: () => controller.setMode(!mode)
		}, ICON_ROWS),
		h('button', {
			key: 'numbers',
			className: 'flr-tool-btn',
			type: 'button',
			title: t('action.numbersHint'),
			'aria-label': t('action.numbers'),
			'aria-pressed': numbers,
			onClick: () => controller.setNumbers(!numbers)
		}, ICON_NUMBERS)
	];
}

/** `conversation.user.text.node` occupant for the `file-lines` id. */
function FileLinesChip(props) {
	const node = props.node;
	const data = node?.data;
	if (!data) return null;
	const lines = data.lineStart === data.lineEnd ? `${data.lineStart}` : `${data.lineStart}-${data.lineEnd}`;
	const interactive = props.interactive === true && typeof props.openAtLine === 'function';
	const content = [
		ICON_FILE,
		h('span', { key: 'label', className: 'flr-chip-label' }, data.label),
		h('span', { key: 'lines', className: 'flr-chip-lines' }, `:${lines}`)
	];
	if (!interactive) {
		return h('span', { className: 'flr-chip', title: props.raw }, content);
	}
	return h('button', {
		className: 'flr-chip',
		type: 'button',
		title: props.raw,
		onClick: () => {
			try {
				props.openAtLine(data.path, data.lineStart);
			} catch {
				// Navigation failures keep the chip; the sidebar surfaces its own dialog.
			}
		}
	}, content);
}

/**
 * Files-page toolbar occupant for `sidebar.right.tab.files.actions`.
 * Owner props: `{ absolutePath }`; session standard props supply `sessionId`,
 * `inputActions` and `t`.
 */
function DragToggle(props) {
	const [, force] = React.useReducer((n) => n + 1, 0);
	React.useEffect(dragger.retain, []);
	React.useEffect(() => dragger.subscribe(force), [force]);
	React.useEffect(
		() => dragger.setSession(props.sessionId, props.inputActions),
		[props.sessionId, props.inputActions]
	);
	const enabled = dragger.isEnabled();
	const t = props.t;
	return h('button', {
		className: 'flr-tool-btn',
		type: 'button',
		title: t('action.dragHint'),
		'aria-label': t('action.drag'),
		'aria-pressed': enabled,
		onClick: () => dragger.setEnabled(!enabled)
	}, ICON_DRAG);
}

function DragToggleGuarded(props) {
	return h(ToolbarBoundary, null, h(DragToggle, props));
}

/* ------------------------------------------------------------------ apply -- */
function apply(ctx) {
	console.info('[file-line-reference] apply started');
	ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'flr: dictionaries');
	const t = ctx.locale.bind(NS);
	const sessions = ctx.get('sessions');
	sessionsFacade = sessions;

	ctx.effect(
		() => ctx.uiConversation.userText.register({
			id: 'file-lines',
			order: 20,
			match(text, from) {
				// The pipeline treats only `undefined` as "no match"; coerce any
				// nullish result so `node.start` is never read on a miss.
				return FlrCore.matchFileLinesNode(text, from) ?? undefined;
			}
		}),
		'flr: file-lines rule'
	);

	ctx.slots.inject('conversation.user.text.node', function* () {
		yield ctx.slots.register({
			name: 'conversation.user.text.node',
			key: 'file-lines',
			priority: 100,
			locale: NS,
			inject: (sessionId) => ({
				openAtLine: (path, line) => {
					const cwd = sessions.list.getSnapshot().byId[sessionId]?.cwd;
					ctx.sidebarRight.openResource(FlrCore.fileAddress(sessionId, cwd, path), { params: { file: { line } } });
				}
			})
		}, FileLinesChip);
	});

	ctx.slots.inject('sidebar.right.tab.document.actions', function* () {
		yield ctx.slots.register(
			{ name: 'sidebar.right.tab.document.actions', id: 'flr-add-lines', order: 10, locale: NS },
			ToolbarActionsGuarded
		);
	});

	ctx.slots.inject('sidebar.right.tab.files.actions', function* () {
		yield ctx.slots.register(
			{ name: 'sidebar.right.tab.files.actions', id: 'flr-drag-toggle', order: 10, locale: NS },
			DragToggleGuarded
		);
	});

	ctx.inject(['shortcuts'], (scope) => {
		scope.effect(() => {
			const command = {
				id: 'fileLineReference.addToChat',
				label: () => t('shortcut.label'),
				aliases: ['add selected lines'],
				defaults: {
					'desktop:macos': { code: 'KeyL', modifiers: ['primary', 'shift'] },
					'desktop:windows': { code: 'KeyL', modifiers: ['primary', 'shift'] },
					'desktop:linux': { code: 'KeyL', modifiers: ['primary', 'shift'] },
					'web:macos': { code: 'KeyL', modifiers: ['primary', 'shift'] },
					'web:windows': { code: 'KeyL', modifiers: ['primary', 'shift'] }
				},
				regions: ['page', 'editable'],
				modals: [],
				resolve: (context) => {
					// Never act behind an open modal (desktop priority bypasses the
					// modal check, so this is the only guard).
					if (context && context.modal) return { status: 'pass' };
					const perform = controller.currentInserter();
					if (!perform || controller.currentLines().length === 0) return { status: 'pass' };
					return { status: 'handled', run: perform };
				}
			};
			// A conflicting default binding throws; fall back to an unbound
			// command the user can assign in the shortcut settings.
			try {
				scope.shortcuts.register(command);
			} catch (error) {
				console.warn('[file-line-reference] shortcut defaults rejected, retrying unbound:', error);
				try {
					scope.shortcuts.register({ ...command, defaults: {} });
				} catch (fallbackError) {
					console.warn('[file-line-reference] shortcut registration failed:', fallbackError);
				}
			}
		}, 'flr: shortcut');
	});

	ctx.effect(() => {
		const removeStyles = injectStylesheet();
		return () => {
			removeStyles();
			document.documentElement.classList.remove(NUMBERS_CLASS);
		};
	}, 'flr: styles');
	console.info('[file-line-reference] apply finished');
}
