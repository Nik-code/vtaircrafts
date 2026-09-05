import { groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { removeRecurringOverlay } from "../lib/overlay";
import { cleanModel, isRegPrefix, isRegSuffix, normalizeReg, parseAsOn, parseDmy, regSuffix } from "../lib/text";
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

/**
 * Column headers only ever sit above the first row that carries a registration, so that
 * row bounds the search. Layouts from 2011-2017 push the header as low as y=160, which a
 * fixed cut-off would miss.
 */
function headerZone(page: Page): number {
  let firstReg = Infinity;
  for (const w of page.words) if (normalizeReg(w.text)) firstReg = Math.min(firstReg, w.cy);
  return Number.isFinite(firstReg) ? firstReg - 4 : 140;
}

function findHeader(words: Word[], re: RegExp, yMax: number): Word | undefined {
  return words.find((w) => w.cy < yMax && re.test(w.text));
}

function detectCols(page: Page, prev: Cols | null): Cols | null {
  const w = page.words;
  const yMax = headerZone(page);
  // "Valid (upto)" appears in every layout and only in the header band, so it anchors the
  // search. Without a floor, the pre-2018 title "LIST OF SCHEDULED OPERATOR'S PERMIT
  // HOLDERS" would be mistaken for the operator column header.
  const valid = findHeader(w, /^Valid$/i, yMax);
  // Some pre-2018 exports print the header on page 1 only; keep the previous geometry but
  // start the body at the top of the page.
  if (!valid) return prev && { ...prev, bodyY0: 0 };
  const yMin = valid.cy - 10;
  const find = (re: RegExp) => w.find((x) => x.cy < yMax && x.cy > yMin && re.test(x.text));
  // Header wording by era: "Model"/"NOs."/"Seating"/"AOC" since 2017, and
  // "Aircraft Type"/"A/c No."/"Seat Cap."/"SOP No." before that. Column order is the same.
  const model = find(/^Model$/i) ?? find(/^Aircraf?t?$/);
  const nos = find(/^NOs\.?$/i) ?? find(/^A\/c$/i);
  const seating = find(/^Seating$/i) ?? find(/^Seat\.?$/i);
  const operator = find(/^OPERATOR['\u2019]?S?[,.]?$/i) ?? find(/^Name$/i);
  const sHeader = find(/^S\.$/) ?? find(/^S\.No?\.?$/i);
  const aoc = find(/^AOC$/i) ?? find(/^AOC\/AOP$/i) ?? find(/^AOP$/i) ?? find(/^SOP$/i);
  if (!model || !nos || !seating || !aoc) return prev;
  // Right edge of the operator-name column: the next column header, whichever exists.
  const nextToName = find(/^ACCOUNTABLE?$/i) ?? find(/^Tel[./]/i) ?? aoc;
  const headerBottom = Math.max(
    ...w.filter((x) => x.cy < Math.min(seating.cy + 20, yMax) && x.cy >= seating.cy - 2).map((x) => x.y1),
  );
  return {
    bodyY0: headerBottom + 3,
    snoX1: (sHeader?.x0 ?? 21) + 18,
    opX0: (operator?.x0 ?? 60) - 20,
    opX1: nextToName.x0 - 4,
    aocX0: aoc.x0 - 10,
    aocX1: valid.x0 - 6,
    validX0: valid.x0 - 6,
    modelX0: model.x0 - 30,
    nosX0: (model.x1 + nos.x0) / 2,
    regX0: nos.x1 + 4,
    seatX0: seating.x0 - 10,
  };
}

/** "1." and "1" are both used for the operator serial. */
function serialValue(text: string, max: number): number | null {
  const m = /^(\d{1,3})\.?$/.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= max ? n : null;
}

function mid(w: Word) {
  return (w.x0 + w.x1) / 2;
}

const NAME_SUFFIX = /(Ltd\.?|Limited|LLP|Inc\.?|Corporation|Corp\.?|Pvt\.? Ltd\.?)[,.]?\s*$/i;

/** The 2011-2013 exports sometimes run two tails into one token: "VT-AXD,VT-AXE,". */
function expandRegs(text: string): string[] {
  const single = normalizeReg(text);
  if (single) return [single];
  const all = text.toUpperCase().match(/VT-?[A-Z]{3}/g);
  return all && all.length > 1 ? all.map((t) => normalizeReg(t)!).filter(Boolean) : [];
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

  const head = (pages[0]?.words ?? []).filter((w) => w.cy < 135).map((w) => w.text).join(" ");
  const asOn = parseAsOn(head);

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
    // Registrations printed above their model row (the pre-2018 exports do this when a
    // model group's count cell is vertically centred). They join the operator's next block.
    let orphanRegs: string[] = [];
    let lastHeaderRowCy = -1;

    for (const row of rows) {
      const sno = row.find((w) => w.x1 <= c.snoX1 && serialValue(w.text, 99) != null);
      const opWords = row.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1 && w !== sno);
      const aocWords = row.filter((w) => mid(w) >= c.aocX0 && mid(w) < c.aocX1);
      const validWords = row.filter((w) => mid(w) >= c.validX0 && mid(w) < c.modelX0);
      const modelWords = row.filter((w) => mid(w) >= c.modelX0 && mid(w) < c.nosX0);
      const nosWord = row.find((w) => mid(w) >= c.nosX0 && mid(w) < c.regX0 && /^\d{1,3}$/.test(w.text));
      const rightWords = row.filter((w) => mid(w) >= c.regX0);

      if (sno) {
        const seq = serialValue(sno.text, 99)!;
        if (seq > maxSeq) {
          let name = joinText(opWords);
          // Wrapped name: keep pulling short label-only lines until the legal form appears,
          // so the same operator is spelled the same way in every snapshot.
          const ri = rows.indexOf(row);
          for (let k = 1; k <= 3 && !NAME_SUFFIX.test(name) && !/,\s*$/.test(name); k += 1) {
            const next = rows[ri + k];
            if (!next) break;
            const nextOp = next.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1 && w !== sno);
            const t = joinText(nextOp);
            if (!t || nextOp.length > 5 || /\d/.test(t) || /^\(/.test(t)) break;
            name = `${name} ${t}`;
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
          if (orphanRegs.length) {
            issues.push({ level: "error", message: `${orphanRegs.length} registration(s) with no model row: ${orphanRegs.join(", ")}`, page: page.index });
            orphanRegs = [];
          }
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
        if (orphanRegs.length) {
          block.regs.push(...orphanRegs);
          orphanRegs = [];
        }
        blocks.push(block);
      } else if (block && modelWords.length && row[0].cy - block.cy < 16 && block.page === page.index) {
        block.modelWords.push(...modelWords);
        block.model = joinText(block.modelWords);
      }

      // registrations (and fragments) anywhere right of the NOs column
      for (const w of rightWords) {
        if (mid(w) >= c.seatX0 && !/^VT/i.test(w.text) && !isRegSuffix(w.text)) continue;
        const regs = expandRegs(w.text);
        if (regs.length) {
          if (block) block.regs.push(...regs);
          else orphanRegs.push(...regs);
          continue;
        }
        if (isRegPrefix(w.text)) {
          pendingPrefixes.push(w);
          continue;
        }
        if (isRegSuffix(w.text) && mid(w) < c.seatX0 && pendingPrefixes.length) {
          pendingPrefixes.shift();
          const joined = `VT-${regSuffix(w.text)}`;
          if (block) block.regs.push(joined);
          else orphanRegs.push(joined);
          issues.push({ level: "warn", message: `Re-joined split registration ${joined}`, page: page.index });
        }
      }
    }
    if (pendingPrefixes.length) {
      issues.push({ level: "error", message: `${pendingPrefixes.length} unmatched "VT-" fragment(s)`, page: page.index });
    }
    if (orphanRegs.length) {
      issues.push({ level: "error", message: `${orphanRegs.length} registration(s) with no model row: ${orphanRegs.join(", ")}`, page: page.index });
      orphanRegs = [];
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
