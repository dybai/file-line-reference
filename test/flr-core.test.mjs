import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../src/flr-core.cjs');

test('stripTrailingPunctuation removes only trailing punctuation', () => {
  assert.equal(core.stripTrailingPunctuation('@a.ts:10-25,'), '@a.ts:10-25');
  assert.equal(core.stripTrailingPunctuation('@a.ts:10-25。；'), '@a.ts:10-25');
  assert.equal(core.stripTrailingPunctuation('@a.ts:10-25'), '@a.ts:10-25');
  assert.equal(core.stripTrailingPunctuation('@a b.ts'), '@a b.ts');
});

test('parseLineSuffix parses start-end and single-line suffixes', () => {
  assert.deepEqual(core.parseLineSuffix('src/app.ts:10-25'), { path: 'src/app.ts', start: 10, end: 25 });
  assert.deepEqual(core.parseLineSuffix('src/app.ts:7'), { path: 'src/app.ts', start: 7, end: 7 });
});

test('parseLineSuffix takes the last colon so windows drive paths survive', () => {
  assert.deepEqual(core.parseLineSuffix('E:\\t\\src/app.ts:10-25'), { path: 'E:\\t\\src/app.ts', start: 10, end: 25 });
});

test('parseLineSuffix rejects folder-suffixed, empty, zero, and reversed ranges', () => {
  assert.equal(core.parseLineSuffix('src/:10-25'), null);
  assert.equal(core.parseLineSuffix(':10-25'), null);
  assert.equal(core.parseLineSuffix('a.ts:0'), null);
  assert.equal(core.parseLineSuffix('a.ts:25-10'), null);
  assert.equal(core.parseLineSuffix('a.ts'), null);
  assert.equal(core.parseLineSuffix('a.ts:10-'), null);
  assert.equal(core.parseLineSuffix('a.ts:x'), null);
});

test('matchFileLinesNode finds the nearest line-ref token after from', () => {
  const text = 'see @src/app.ts:10-25 and @lib/x.ts:3';
  const node = core.matchFileLinesNode(text, 0);
  assert.ok(node, 'expected a node');
  assert.equal(node.id, 'file-lines');
  assert.equal(node.start, text.indexOf('@src'));
  assert.equal(node.end, text.indexOf('@src') + '@src/app.ts:10-25'.length);
  assert.equal(node.data.path, 'src/app.ts');
  assert.equal(node.data.label, 'app.ts');
  assert.deepEqual([node.data.lineStart, node.data.lineEnd], [10, 25]);

  const second = core.matchFileLinesNode(text, node.end);
  assert.ok(second, 'expected second node');
  assert.equal(second.data.path, 'lib/x.ts');
  assert.deepEqual([second.data.lineStart, second.data.lineEnd], [3, 3]);
  assert.equal(core.matchFileLinesNode(text, second.end), undefined);
});

test('matchFileLinesNode claims quoted tokens and keeps the quote span', () => {
  const text = 'look @"my file.ts:1-2" now';
  const node = core.matchFileLinesNode(text, 0);
  assert.ok(node);
  assert.equal(node.data.path, 'my file.ts');
  assert.equal(text.slice(node.start, node.end), '@"my file.ts:1-2"');
});

test('matchFileLinesNode ignores plain file mentions and folders', () => {
  assert.equal(core.matchFileLinesNode('plain @src/app.ts tail', 0), undefined);
  assert.equal(core.matchFileLinesNode('@src/:10-25 folder', 0), undefined);
});

test('matchFileLinesNode respects a preceding word boundary', () => {
  const text = 'email me@src/app.ts:1-2 stays plain';
  assert.equal(core.matchFileLinesNode(text, 0), undefined);
});

test('mergeLines merges contiguous and dedupes unsorted input', () => {
  assert.deepEqual(core.mergeLines([7, 3, 4, 7, 9]), [[3, 4], [7, 7], [9, 9]]);
  assert.deepEqual(core.mergeLines([1, 2, 3]), [[1, 3]]);
  assert.deepEqual(core.mergeLines([]), []);
});

test('formatMention quotes paths with whitespace and collapses single-line ranges', () => {
  assert.equal(core.formatMention('src/app.ts', [[10, 25]]), '@src/app.ts:10-25');
  assert.equal(core.formatMention('src/app.ts', [[7, 7]]), '@src/app.ts:7');
  assert.equal(core.formatMention('my file.ts', [[1, 2]]), '@"my file.ts:1-2"');
  assert.equal(core.formatMention('a.ts', [[1, 2], [5, 6]]), '@a.ts:1-2 @a.ts:5-6');
  assert.equal(core.formatMention('a.ts', []), '');
});

test('relativeMentionPath strips the session cwd and normalizes separators', () => {
  assert.equal(core.relativeMentionPath('E:\\t\\src\\app.ts', 'E:\\t'), 'src/app.ts');
  assert.equal(core.relativeMentionPath('E:/t/src/app.ts', 'E:\\t'), 'src/app.ts');
  assert.equal(core.relativeMentionPath('E:\\t', 'E:\\t'), '');
  assert.equal(core.relativeMentionPath('E:\\other\\a.ts', 'E:\\t'), 'E:/other/a.ts');
  assert.equal(core.relativeMentionPath('/home/u/proj/a.ts', '/home/u/proj'), 'a.ts');
});

test('fileAddress builds session addresses for relative paths', () => {
  assert.equal(
    core.fileAddress('s-1', 'E:\\t', 'src/app.ts'),
    'dsh-resource://file/session/s-1/src/app.ts'
  );
  assert.equal(
    core.fileAddress('s-1', 'E:\\t', 'E:\\t\\src/app.ts'),
    'dsh-resource://file/session/s-1/src/app.ts'
  );
});

test('fileAddress keeps paths outside the workspace absolute in the address', () => {
  assert.equal(
    core.fileAddress('s-1', 'E:\\t', 'E:\\other\\a.ts'),
    'dsh-resource://file/session/s-1/E:/other/a.ts'
  );
});

test('padInsertion adds spaces so the mention never glues to neighboring text', () => {
  assert.equal(core.padInsertion('', 0, '@a.ts:1-2'), '@a.ts:1-2 ');
  assert.equal(core.padInsertion('abc', 3, '@a.ts:1-2'), ' @a.ts:1-2 ');
  assert.equal(core.padInsertion('abc', 0, '@a.ts:1-2'), '@a.ts:1-2 ');
  assert.equal(core.padInsertion('abc ', 4, '@a.ts:1-2'), '@a.ts:1-2 ');
  assert.equal(core.padInsertion('abc @a.ts:1-2', 12, '@a.ts:3-4'), ' @a.ts:3-4 ');
  assert.equal(core.padInsertion('x @a.ts:1-2 y', 12, '@a.ts:3-4'), '@a.ts:3-4 ');
  assert.equal(core.padInsertion('a\tb', 1, '@a.ts:1-2'), ' @a.ts:1-2');
  assert.equal(core.padInsertion('x  y', 2, '@a.ts:1-2'), '@a.ts:1-2');
});

test('padInsertion pads both sides when the span start sits past the draft end', () => {
  // The conservative retry path: fresh span captured against a stale/empty
  // draft snapshot — undefined neighbors never count as whitespace.
  assert.equal(core.padInsertion('abc', 5, '@a.ts:1-2'), ' @a.ts:1-2 ');
  assert.equal(core.padInsertion('', 2, '@a.ts:1-2'), ' @a.ts:1-2 ');
  assert.equal(core.padInsertion('a\nb', 1, '@a.ts:1-2'), ' @a.ts:1-2');
});

test('formatPlainMention writes a bare file path as an unquoted @ mention', () => {
  assert.equal(core.formatPlainMention('src/app.ts', 'file'), '@src/app.ts');
});

test('formatPlainMention marks a directory with one trailing slash', () => {
  assert.equal(core.formatPlainMention('packages', 'directory'), '@packages/');
  assert.equal(core.formatPlainMention('src/widgets', 'directory'), '@src/widgets/');
  assert.equal(core.formatPlainMention('packages/', 'directory'), '@packages/');
});

test('formatPlainMention quotes whitespace paths and rejects unrepresentable ones', () => {
  assert.equal(core.formatPlainMention('my notes.md', 'file'), '@"my notes.md"');
  assert.equal(core.formatPlainMention('my notes', 'directory'), '@"my notes/"');
  assert.equal(core.formatPlainMention('a"b.ts', 'file'), '');
  assert.equal(core.formatPlainMention('a\u0001b.ts', 'file'), '');
  assert.equal(core.formatPlainMention('', 'file'), '');
  assert.equal(core.formatPlainMention(undefined, 'file'), '');
  assert.equal(core.formatPlainMention('a.ts', undefined), '@a.ts');
});

test('parseDraggedPath accepts only a complete private drag payload', () => {
  assert.deepEqual(core.parseDraggedPath('{"path":"src/app.ts","kind":"file"}'), {
    path: 'src/app.ts',
    kind: 'file'
  });
  assert.deepEqual(core.parseDraggedPath('{"path":"packages","kind":"directory"}'), {
    path: 'packages',
    kind: 'directory'
  });
  assert.equal(core.parseDraggedPath(''), null);
  assert.equal(core.parseDraggedPath('not json'), null);
  assert.equal(core.parseDraggedPath('null'), null);
  assert.equal(core.parseDraggedPath('{"kind":"file"}'), null);
  assert.equal(core.parseDraggedPath('{"path":""}'), null);
  assert.equal(core.parseDraggedPath('{"path":7,"kind":"file"}'), null);
});

test('mentionForPath relativizes the cwd and keeps directory and quoting rules', () => {
  assert.equal(core.mentionForPath('E:\\t\\src\\a.ts', 'file', 'E:\\t'), '@src/a.ts');
  assert.equal(core.mentionForPath('src/widgets', 'directory', 'E:\\t'), '@src/widgets/');
  assert.equal(core.mentionForPath('my notes.md', 'file', undefined), '@"my notes.md"');
  assert.equal(core.mentionForPath('E:\\t', 'directory', 'E:\\t'), '');
});

test('readToggleState defaults to enabled and only the stored zero disables', () => {
  assert.equal(core.readToggleState(null), true);
  assert.equal(core.readToggleState('1'), true);
  assert.equal(core.readToggleState('0'), false);
  assert.equal(core.readToggleState('yes'), true);
});

test('mentionForPath refuses a missing path instead of naming "undefined"', () => {
  assert.equal(core.mentionForPath(undefined, 'file', 'E:\\t'), '');
  assert.equal(core.mentionForPath(null, 'file', undefined), '');
  assert.equal(core.mentionForPath('', 'directory', undefined), '');
});

test('dragVerdict yields first, then requires one ready registered matching Session', () => {
  const ok = { sourceSession: 's-1', targetSession: 's-1', foreign: false, ready: true, registered: true };
  assert.equal(core.dragVerdict(ok), 'insert');
  assert.equal(core.dragVerdict({ ...ok, foreign: true }), 'yield');
  assert.equal(core.dragVerdict({ ...ok, foreign: true, targetSession: 's-2' }), 'yield');
  assert.equal(core.dragVerdict({ ...ok, sourceSession: null }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, sourceSession: '' }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, targetSession: null }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, targetSession: 's-2' }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, targetSession: 'S-1' }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, ready: false }), 'ignore');
  assert.equal(core.dragVerdict({ ...ok, registered: false }), 'ignore');
  assert.equal(core.dragVerdict(null), 'ignore');
  assert.equal(core.dragVerdict(undefined), 'ignore');
});
