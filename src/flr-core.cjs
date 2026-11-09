/**
 * File Line Reference — pure core.
 *
 * Single source of truth shared by the browser client bundle (inlined at build
 * time) and the node:test suite. No DOM, no React, no services: everything is
 * plain data in, plain data out.
 *
 * Grammar notes mirror the built-in file reference rule
 * (`@deepseek-ai/dsh-client-ui-reference`): an unquoted `@token` strips only
 * *trailing* punctuation, a quoted `@"token"` keeps its quote span, and tokens
 * must start at a whitespace boundary. Line references are `path:S-E` (or
 * `path:S`) suffixes parsed at the LAST colon so Windows drive letters survive.
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FlrCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	/* FLR_CORE_BEGIN */
	/** The shared file-reference token grammar: quoted `@"…"` or a `@`-run of non-space, at a whitespace boundary. */
	const TOKEN_SOURCE = '(?<!\\S)(@"[^"\\n]+"|@[^\\s]+)';
	const TRAILING_PUNCTUATION = /[.,;:!?，。；：！？]+$/u;
	const LINE_SUFFIX = /^(\d{1,7})(?:-(\d{1,7}))?$/u;
	const FILE_ADDRESS_PREFIX = 'dsh-resource://file/';

	/** Remove trailing punctuation the reference grammar treats as sentence text. */
	function stripTrailingPunctuation(text) {
		return text.replace(TRAILING_PUNCTUATION, '');
	}

	/**
	 * Split a trailing `:S-E` / `:S` line suffix off a path at the last colon.
	 * @param path - candidate path text, quotes already removed.
	 * @returns `{ path, start, end }` with 1-based inclusive lines, or null.
	 */
	function parseLineSuffix(path) {
		if (typeof path !== 'string') return null;
		const colon = path.lastIndexOf(':');
		if (colon <= 0) return null;
		const suffix = path.slice(colon + 1);
		const match = LINE_SUFFIX.exec(suffix);
		if (match === null) return null;
		const filePath = path.slice(0, colon);
		if (filePath.length === 0 || filePath.endsWith('/')) return null;
		const start = Number(match[1]);
		const end = match[2] === undefined ? start : Number(match[2]);
		if (!Number.isSafeInteger(start) || start < 1) return null;
		if (!Number.isSafeInteger(end) || end < start) return null;
		return { path: filePath, start, end };
	}

	/** Display label of a path: its last non-empty segment in either separator spelling. */
	function labelOf(path) {
		return path.split(/[\\/]/u).filter(Boolean).at(-1) ?? path;
	}

	/**
	 * Find the nearest `@path:S-E` token at or after `from`.
	 * @param text - the complete original text; never mutated.
	 * @param from - inclusive UTF-16 offset to search from.
	 * @returns a `file-lines` user-text node, or `undefined` when no later
	 * candidate exists. The conversation pipeline treats only `undefined` as
	 * "no match" — returning `null` would crash its `node.start` access.
	 */
	function matchFileLinesNode(text, from) {
		const re = new RegExp(TOKEN_SOURCE, 'gu');
		re.lastIndex = from;
		for (let match = re.exec(text); match !== null; match = re.exec(text)) {
			const token = match[0];
			const quoted = token.startsWith('@"');
			const raw = quoted ? token : stripTrailingPunctuation(token);
			if (raw.length <= 1) continue;
			const inner = quoted ? raw.slice(2, -1) : raw.slice(1);
			const parsed = parseLineSuffix(inner);
			if (parsed === null) continue;
			return {
				id: 'file-lines',
				start: match.index,
				end: match.index + raw.length,
				data: {
					path: parsed.path,
					label: labelOf(parsed.path),
					lineStart: parsed.start,
					lineEnd: parsed.end,
					raw
				}
			};
		}
		return undefined;
	}

	/**
	 * Fold 1-based line numbers into ascending contiguous inclusive runs.
	 * @param numbers - arbitrary-order line numbers; duplicates and stray values ignored.
	 * @returns `[start, end]` pairs, contiguous runs merged.
	 */
	function mergeLines(numbers) {
		const sorted = [...new Set(numbers)]
			.filter((n) => Number.isInteger(n) && n >= 1)
			.sort((left, right) => left - right);
		const runs = [];
		for (const n of sorted) {
			const last = runs[runs.length - 1];
			if (last !== undefined && n === last[1] + 1) last[1] = n;
			else runs.push([n, n]);
		}
		return runs;
	}

	/**
	 * Build mention text for one path and line runs, quoting paths the unquoted
	 * grammar cannot represent (whitespace); control characters or quotes in the
	 * path are unrepresentable and answer the empty string.
	 * @param path - workspace-relative or absolute path in either separator spelling.
	 * @param ranges - ascending `[start, end]` inclusive line runs.
	 * @returns space-joined `@path:S-E` mentions, or '' when nothing is representable.
	 */
	function formatMention(path, ranges) {
		if (typeof path !== 'string' || path.length === 0) return '';
		const runs = (ranges ?? []).filter(([s, e]) => Number.isSafeInteger(s) && s >= 1 && Number.isSafeInteger(e) && e >= s);
		if (runs.length === 0) return '';
		if (/["\u0000-\u001f\u007f-\u009f]/u.test(path)) return '';
		const quoted = /\s/u.test(path);
		return runs
			.map(([s, e]) => {
				const ref = `${path}:${s === e ? `${s}` : `${s}-${e}`}`;
				return quoted ? `@"${ref}"` : `@${ref}`;
			})
			.join(' ');
	}

	/**
	 * Build a plain `@path` mention for one file or directory, matching the
	 * built-in reference grammar: a directory carries a trailing slash, and a
	 * path with whitespace is quoted.
	 * @param path - workspace-relative path in either separator spelling.
	 * @param kind - the tree row's kind; only `'directory'` changes the shape.
	 * @returns the mention text, or '' for an unrepresentable path.
	 */
	function formatPlainMention(path, kind) {
		if (typeof path !== 'string' || path.length === 0) return '';
		if (/["\u0000-\u001f\u007f-\u009f]/u.test(path)) return '';
		const trailing = kind === 'directory' && !path.endsWith('/') ? '/' : '';
		const body = `${path}${trailing}`;
		return /\s/u.test(body) ? `@"${body}"` : `@${body}`;
	}

	/**
	 * Normalize a path for a mention: forward slashes, and the session cwd
	 * stripped when the path lives inside it (comparison is case-insensitive for
	 * Windows spellings); anything else stays absolute.
	 */
	function relativeMentionPath(path, cwd) {
		const normalized = String(path).replace(/\\/g, '/');
		if (cwd === undefined || cwd === null || cwd === '') return normalized;
		const root = String(cwd).replace(/\\/g, '/').replace(/\/+$/, '');
		if (root === '') return normalized;
		if (normalized.toLowerCase() === root.toLowerCase()) return '';
		if (normalized.toLowerCase().startsWith(`${root.toLowerCase()}/`)) return normalized.slice(root.length + 1);
		return normalized;
	}

	/**
	 * Build the insertion text for one dragged tree row: the workspace-relative
	 * path and the plain-mention shape, or '' for a row that cannot be named.
	 * @param path - the row's path, absolute or relative.
	 * @param kind - the row's kind; `'directory'` adds the trailing slash.
	 * @param cwd - the session workspace root, when known.
	 * @returns the mention text, or '' when nothing is representable.
	 */
	function mentionForPath(path, kind, cwd) {
		if (typeof path !== 'string' || path.length === 0) return '';
		const relative = relativeMentionPath(path, cwd);
		if (relative === '') return '';
		return formatPlainMention(relative, kind);
	}

	/**
	 * Parse the private drag payload written by `dragstart`.
	 * @param raw - the `DataTransfer` value for the private MIME type.
	 * @returns `{ path, kind }` for a complete payload, else null.
	 */
	function parseDraggedPath(raw) {
		if (typeof raw !== 'string' || raw.length === 0) return null;
		let value;
		try {
			value = JSON.parse(raw);
		} catch {
			return null;
		}
		if (value === null || typeof value !== 'object') return null;
		const { path, kind } = value;
		if (typeof path !== 'string' || path.length === 0) return null;
		if (typeof kind !== 'string' || kind.length === 0) return null;
		return { path, kind };
	}

	/**
	 * Read the persisted drag-toggle value.
	 * @param stored - the raw `localStorage` string, or null when unset.
	 * @returns enabled unless the user explicitly stored the disabled value.
	 */
	function readToggleState(stored) {
		return stored !== '0';
	}

	/**
	 * Decide what one drag event may do.
	 *
	 * `yield` wins over every other answer so an installed dsh-file-drag keeps
	 * its own drop; otherwise the drop is ours only when the payload is ready,
	 * the source Session still has a mounted Files page, and the target
	 * composer belongs to that same Session.
	 * @param input - foreign payload flag, payload readiness, registration, and
	 * both Sessions.
	 * @returns `'yield'`, `'insert'`, or `'ignore'`.
	 */
	function dragVerdict(input) {
		if (input === null || typeof input !== 'object') return 'ignore';
		if (input.foreign === true) return 'yield';
		if (input.ready !== true || input.registered !== true) return 'ignore';
		if (typeof input.sourceSession !== 'string' || input.sourceSession === '') return 'ignore';
		if (input.targetSession !== input.sourceSession) return 'ignore';
		return 'insert';
	}

	/** Component-encode one address segment, keeping `:` literal for drive letters. */
	function encodeSegment(segment) {
		return encodeURIComponent(segment).replace(/%3A/gi, ':');
	}

	/** Encode a `/`-separated path segment by segment. */
	function encodePath(path) {
		return path.split('/').map(encodeSegment).join('/');
	}

	/** Build the `dsh-resource://file/session/<id>/<path>` address of a normalized path. */
	function sessionFileAddress(sessionId, path) {
		const normalized = path.replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
		return `${FILE_ADDRESS_PREFIX}session/${encodeSegment(sessionId)}/${encodePath(normalized)}`;
	}

	/** Whether a path is absolute in either spelling the Host accepts. */
	function isAbsoluteWorkspacePath(path) {
		return path.startsWith('/') || /^[A-Za-z]:[/\\]/u.test(path) || path.startsWith('\\\\');
	}

	/**
	 * The address for a path as a caller holds it: relative or inside the
	 * Session's workspace becomes session-relative; anything else keeps its
	 * absolute path inside that Session's address.
	 */
	function fileAddress(sessionId, cwd, path) {
		const normalized = path.replace(/\\/g, '/');
		if (!isAbsoluteWorkspacePath(normalized)) return sessionFileAddress(sessionId, normalized);
		const root = cwd === undefined || cwd === null ? '' : String(cwd).replace(/\\/g, '/').replace(/\/+$/, '');
		if (root !== '' && normalized === root) return sessionFileAddress(sessionId, '');
		if (root !== '' && normalized.startsWith(`${root}/`)) return sessionFileAddress(sessionId, normalized.slice(root.length + 1));
		return sessionFileAddress(sessionId, normalized);
	}

	/**
	 * Pad one draft insertion with spaces so the mention never glues to
	 * neighboring text: a leading space unless the caret sits at offset 0 or
	 * after whitespace; a trailing space unless whitespace immediately follows —
	 * at the draft end the trailing space always lands, so text typed next
	 * cannot be swallowed into the reference path.
	 *
	 * Callers that pass an empty draft with a live span start (the conservative
	 * retry path) get exactly this always-pad shape: `draft[start - 1]` is
	 * `undefined`, which never counts as whitespace, so the leading space lands
	 * whenever `start > 0`, and the trailing space always lands.
	 *
	 * @param draft - the composer draft text in insertion coordinates.
	 * @param start - the insertion span start offset in that draft.
	 * @param insertion - the text being inserted.
	 * @returns the padded insertion text.
	 */
	function padInsertion(draft, start, insertion) {
		const before = start > 0 && !/\s/u.test(draft[start - 1]);
		const after = !(start < draft.length && /\s/u.test(draft[start]));
		return `${before ? ' ' : ''}${insertion}${after ? ' ' : ''}`;
	}

	return {
		stripTrailingPunctuation,
		parseLineSuffix,
		labelOf,
		matchFileLinesNode,
		mergeLines,
		formatMention,
		formatPlainMention,
		relativeMentionPath,
		mentionForPath,
		parseDraggedPath,
		readToggleState,
		dragVerdict,
		fileAddress,
		padInsertion
	};
	/* FLR_CORE_END */
});
