import { groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { removeRecurringOverlay } from "../lib/overlay";
import { cleanModel, normalizeReg, parseDmy, REG_PREFIX_ONLY, REG_SUFFIX_ONLY } from "../lib/text";
import type { Issue, ParseResult, RawAircraft, RawOperator } from "../lib/types";

interface Cols {
  bodyY0: number;
  snoX1: number;
  opX0: number;
  opX1: number;
  aocX0: number;
  aocX1: number;
  validX0: number;
  modelX0: number;
  nosX0: number;
  regX0: number;
  seatX0: number;
}

function findHeader(words: Word[], re: RegExp, yMax = 140): Word | undefined {
  return words.find((w) => w.cy < yMax && re.test(w.text));
}

function detectCols(page: Page, prev: Cols | null): Cols | null {
  const w = page.words;
  const model = findHeader(w, /^Model$/i);
  const nos = findHeader(w, /^NOs\.?$/i);
  const seating = findHeader(w, /^Seating$/i);
  const operator = findHeader(w, /^OPERATOR['\u2019]S/i);
  const sHeader = findHeader(w, /^S\.$/);
  const manager = findHeader(w, /^(ACCOUNTABLE|Accountable)$/);
  const aoc = findHeader(w, /^AOC$/i);
  const valid = findHeader(w, /^Valid$/i);
  if (!model || !nos || !seating || !aoc || !valid) return prev;
  const headerBottom = Math.max(...w.filter((x) => x.cy < seating.cy + 20 && x.cy >= seating.cy - 2).map((x) => x.y1));
  return {
    bodyY0: headerBottom + 3,
    snoX1: (sHeader?.x0 ?? 21) + 18,
    opX0: (operator?.x0 ?? 60) - 20,
    opX1: (manager?.x0 ?? 150) - 4,
    aocX0: aoc.x0 - 10,
    aocX1: valid.x0 - 6,
    validX0: valid.x0 - 6,
    modelX0: model.x0 - 30,
    nosX0: (model.x1 + nos.x0) / 2,
    regX0: nos.x1 + 4,
    seatX0: seating.x0 - 10,
  };
}

function mid(w: Word) {
  return (w.x0 + w.x1) / 2;
}

interface ModelBlock {
  operatorSeq: number;
  model: string;
  modelWords: Word[];
  nos: number;
  seatingRaw: string | null;
  regs: string[];
  page: number;
  cy: number;
}

export function parseScheduled(rawPages: Page[]): ParseResult {
  const issues: Issue[] = [];
  const firstCols = detectCols(rawPages[0], null);
  const firstRowCy = firstCols ? Math.min(...rawPages[0].words.filter((w) => w.cy > firstCols.bodyY0).map((w) => w.cy)) : 150;
  const { pages, overlay } = removeRecurringOverlay(rawPages, { yMin: firstRowCy - 8, yMax: firstRowCy + 12 });
  if (overlay.length) {
    issues.push({ level: "warn", message: `Stripped recurring header overlay (${overlay.length} words): ${joinText(overlay)}` });
  }

  let asOn: string | null = null;
  for (const w of pages[0]?.words ?? []) {
    if (w.cy < 100) {
      const d = parseDmy(w.text);
      if (d) asOn = d;
    }
  }

  const operators: RawOperator[] = [];
  const blocks: ModelBlock[] = [];
  let current: RawOperator | null = null;
  let maxSeq = 0;
  let cols: Cols | null = null;
  let block: ModelBlock | null = null;

  for (const page of pages) {
    cols = detectCols(page, cols);
    if (!cols) {
      issues.push({ level: "error", message: "Could not detect columns", page: page.index });
      continue;
    }
    const c = cols;
    const body = page.words.filter((w) => w.cy > c.bodyY0);
    const rows = groupRows(body);
    const pendingPrefixes: Word[] = [];
    let lastHeaderRowCy = -1;

    for (const row of rows) {
      const sno = row.find((w) => w.x1 <= c.snoX1 && /^\d{1,2}$/.test(w.text));
      const opWords = row.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1 && w !== sno);
      const aocWords = row.filter((w) => mid(w) >= c.aocX0 && mid(w) < c.aocX1);
      const validWords = row.filter((w) => mid(w) >= c.validX0 && mid(w) < c.modelX0);
      const modelWords = row.filter((w) => mid(w) >= c.modelX0 && mid(w) < c.nosX0);
      const nosWord = row.find((w) => mid(w) >= c.nosX0 && mid(w) < c.regX0 && /^\d{1,3}$/.test(w.text));
      const rightWords = row.filter((w) => mid(w) >= c.regX0);

      if (sno) {
        const seq = Number(sno.text);
        if (seq > maxSeq) {
          let name = joinText(opWords);
          const next = rows[rows.indexOf(row) + 1];
          if (next && !/(Ltd\.?|Limited|LLP|Inc\.?)\s*$/i.test(name)) {
            const nextOp = next.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1);
            const t = joinText(nextOp);
            if (t && nextOp.length <= 5 && !/\d|,/.test(t) && !/^\(/.test(t)) name = `${name} ${t}`;
          }
          current = {
            seq,
            name,
            brandRaw: null,
            category: "scheduled",
            permitNo: aocWords.map((w) => w.text).join("") || null,
            validUntil: validWords.map((w) => parseDmy(w.text)).find(Boolean) ?? null,
            statedCount: null,
            fleetCode: null,
            ops: null,
            firstPage: page.index,
          };
          operators.push(current);
          maxSeq = seq;
          lastHeaderRowCy = row[0].cy;
          block = null;
        } else {
          issues.push({
            level: "warn",
            message: `Non-advancing serial ${seq} treated as continuation of #${current?.seq}`,
            page: page.index,
          });
        }
      } else if (current && lastHeaderRowCy > 0 && row[0].cy - lastHeaderRowCy < 30) {
        // rows right under the header: brand "(IndiGo)" and ops words
        const t = joinText(opWords);
        for (const m of t.matchAll(/\(([^)]+)\)/g)) {
          const brand = m[1].trim();
          if (!/^(cargo|passenger|pax)$/i.test(brand)) current.brandRaw = current.brandRaw ?? brand;
        }
      }
      if (current && aocWords.length && !sno) {
        const t = joinText(aocWords);
        if (/passenger|pax|cargo|&/i.test(t)) current.ops = [current.ops, t].filter(Boolean).join(" ");
      }

      if (!current) continue;

      if (nosWord) {
        const seatWords = rightWords.filter((w) => mid(w) >= c.seatX0 && !normalizeReg(w.text));
        block = {
          operatorSeq: current.seq,
          model: joinText(modelWords),
          modelWords: [...modelWords],
          nos: Number(nosWord.text),
          seatingRaw: seatWords.length ? joinText(seatWords) : null,
          regs: [],
          page: page.index,
          cy: row[0].cy,
        };
        blocks.push(block);
      } else if (block && modelWords.length && row[0].cy - block.cy < 16 && block.page === page.index) {
        block.modelWords.push(...modelWords);
        block.model = joinText(block.modelWords);
      }

      // registrations (and fragments) anywhere right of the NOs column
      for (const w of rightWords) {
        if (mid(w) >= c.seatX0 && !/^VT/i.test(w.text) && !REG_SUFFIX_ONLY.test(w.text)) continue;
        const reg = normalizeReg(w.text);
        if (reg) {
          if (!block) {
            issues.push({ level: "error", message: `Registration ${reg} before any model row`, page: page.index });
            continue;
          }
          block.regs.push(reg);
          continue;
        }
        if (REG_PREFIX_ONLY.test(w.text)) {
          pendingPrefixes.push(w);
          continue;
        }
        if (REG_SUFFIX_ONLY.test(w.text) && mid(w) < c.seatX0 && pendingPrefixes.length && block) {
          pendingPrefixes.shift();
          block.regs.push(`VT-${w.text}`);
          issues.push({ level: "warn", message: `Re-joined split registration VT-${w.text}`, page: page.index });
        }
      }
    }
    if (pendingPrefixes.length) {
      issues.push({ level: "error", message: `${pendingPrefixes.length} unmatched "VT-" fragment(s)`, page: page.index });
    }
  }

  // Assemble aircraft, merging blocks of the same operator+model across pages.
  const aircraft: RawAircraft[] = [];
  const seen = new Map<string, RawAircraft>();
  const byKey = new Map<string, { nos: number; regs: Set<string>; pages: Set<number> }>();
  for (const b of blocks) {
    const op = operators.find((o) => o.seq === b.operatorSeq)!;
    const model = cleanModel(b.model);
    const key = `${b.operatorSeq}|${model}`;
    const agg = byKey.get(key) ?? { nos: 0, regs: new Set<string>(), pages: new Set<number>() };
    agg.nos = Math.max(agg.nos, b.nos);
    agg.pages.add(b.page);
    byKey.set(key, agg);
    for (const reg of b.regs) {
      agg.regs.add(reg);
      const dup = seen.get(reg);
      if (dup) {
        if (dup.operatorSeq !== b.operatorSeq || dup.model !== model) {
          issues.push({ level: "error", message: `Duplicate registration ${reg}: #${dup.operatorSeq} ${dup.model} vs #${b.operatorSeq} ${model}`, page: b.page });
        }
        continue;
      }
      const a: RawAircraft = {
        reg,
        operatorSeq: op.seq,
        operatorName: op.name,
        operatorBrandRaw: op.brandRaw,
        category: "scheduled",
        permitNo: op.permitNo,
        validUntil: op.validUntil,
        model,
        seatingRaw: b.seatingRaw,
        wing: null,
        ops: op.ops,
        page: b.page,
      };
      seen.set(reg, a);
      aircraft.push(a);
    }
  }
  for (const [key, agg] of byKey) {
    if (agg.regs.size !== agg.nos) {
      const [seq, model] = key.split("|");
      const op = operators.find((o) => o.seq === Number(seq));
      issues.push({
        level: "warn",
        message: `Count mismatch for ${op?.name ?? seq} / ${model}: stated ${agg.nos}, parsed ${agg.regs.size} (pages ${[...agg.pages].join(",")})`,
      });
    }
  }
  for (const op of operators) {
    op.statedCount = [...byKey.entries()]
      .filter(([k]) => k.startsWith(`${op.seq}|`))
      .reduce((s, [, v]) => s + v.nos, 0);
  }
  return { asOn, category: "scheduled", operators, aircraft, issues };
}
