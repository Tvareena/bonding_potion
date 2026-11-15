// Parses data/script.txt into sections and rows (TDD §5.1).
// Shared with the future content editor, so it has no Phaser or game dependencies.

import { parseCond } from './Conditions.js';

const LINE = /^([a-z_][a-z0-9_]*)(?:\s+([a-z_][a-z0-9_]*))?\s*:\s?(.*)$/i;
const NARRATION = /^:\s?(.*)$/;
const COMMAND = /^@(\w+)\s*(.*)$/;
const COND = /^\[([^\]]*)\]\s*(.*)$/;

/**
 * @returns {{sections: Array, warnings: string[], preamble: string[]}}
 * Section: { id, header, type: 'dialogue'|'potion'|'ending', potionId, endingId, rows, events, line }
 * Row: { kind: 'line', speaker, expr, text, cond, line } | { kind: 'cmd', name, args, cond, line }
 *    | { kind: 'comment', text, line } | { kind: 'bad', text, line } (a line that couldn't be read; the game skips it)
 * cond: list from Conditions.parseCond, written as "[trust=cat] heroine: text" (empty = always).
 * Expressions: "chad angry: text" → expr "angry" (image chad_angry, if it exists).
 * For potion sections, rows are also grouped into events: { name: { random, rows } }.
 * Rows before the first @on in a potion section belong to the "start" event.
 */
export function parseScript(text) {
  const sections = [];
  const warnings = [];
  let current = null;
  let currentEvent = null;
  const preamble = [];
  const lines = text.replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    let l = raw.trim();
    if (!l) return;
    if (l.startsWith('#')) {
      if (current) current.rows.push({ kind: 'comment', text: l.slice(1).trim(), line: lineNo });
      else preamble.push(l);
      return;
    }
    if (l.startsWith('==')) {
      const tokens = l.slice(2).trim().split(/\s+/).filter(Boolean);
      let id = tokens[0] || `section${sections.length + 1}`;
      let type = 'dialogue', potionId = null, endingId = null;
      if (id.toLowerCase() === 'ending') {
        type = 'ending';
        endingId = (tokens[1] || '').toLowerCase() || null;
        if (!endingId) warnings.push(`Line ${lineNo}: ending section has no ending id`);
        id = 'ending_' + endingId;
      } else if (tokens[1] && tokens[1].toLowerCase() === 'potion') {
        type = 'potion';
        potionId = tokens[2] ? tokens[2].toLowerCase() : null;
        if (!potionId) warnings.push(`Line ${lineNo}: potion section "${id}" has no potion id`);
      } else if (tokens.length > 1) {
        warnings.push(`Line ${lineNo}: unknown section header "${l}"`);
      }
      id = id.toLowerCase();
      current = { id, header: l, type, potionId, endingId, rows: [], events: {}, line: lineNo };
      currentEvent = null;
      if (type === 'potion') {
        current.events.start = { random: false, rows: [] };
        currentEvent = current.events.start;
      }
      sections.push(current);
      return;
    }
    if (!current) {
      warnings.push(`Line ${lineNo}: text before the first section header is ignored`);
      return;
    }
    let row = null;
    let cond = [];
    const cm = l.match(COND);
    if (cm) {
      cond = parseCond(cm[1]);
      cond.filter(x => x.type === 'bad').forEach(x => warnings.push(`Line ${lineNo}: unknown condition "${x.text}" (it is ignored)`));
      l = cm[2];
    }
    const c = l.match(COMMAND);
    if (c) {
      const name = c[1].toLowerCase();
      const args = c[2].trim() ? c[2].trim().split(/\s+/) : [];
      row = { kind: 'cmd', name, args, cond, line: lineNo };
      if (name === 'on') {
        if (current.type !== 'potion') {
          warnings.push(`Line ${lineNo}: @on only works in potion sections`);
        } else if (!args[0]) {
          warnings.push(`Line ${lineNo}: @on needs an event name`);
        } else {
          const ev = args[0].toLowerCase();
          currentEvent = current.events[ev] = current.events[ev] || { random: false, rows: [] };
          if (args[1] && args[1].toLowerCase() === 'random') currentEvent.random = true;
        }
        current.rows.push(row);
        return;
      }
    } else {
      const n = l.match(NARRATION);
      if (n) {
        row = { kind: 'line', speaker: null, expr: null, text: n[1], cond, line: lineNo };
      } else {
        const m = l.match(LINE);
        if (m) {
          row = { kind: 'line', speaker: m[1].toLowerCase(), expr: m[2] ? m[2].toLowerCase() : null, text: m[3], cond, line: lineNo };
        } else {
          warnings.push(`Line ${lineNo}: can't read "${l.slice(0, 40)}" (expected "speaker: text", ": text" or "@command")`);
          current.rows.push({ kind: 'bad', text: raw.trim(), line: lineNo });
          return;
        }
      }
    }
    current.rows.push(row);
    if (current.type === 'potion' && currentEvent) currentEvent.rows.push(row);
  });

  return { sections, warnings, preamble };
}
