import { groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { removeRecurringOverlay } from "../lib/overlay";
import { cleanModel, normalizeReg, parseDmy, REG_PREFIX_ONLY, REG_SUFFIX_ONLY } from "../lib/text";
import type { Issue, ParseResult, RawAircraft, RawOperator, Wing } from "../lib/types";

interface Cols {
  bodyY0: number;
  snoX1: number;
  opX0: number;
  opX1: number;
  aopX0: number;
  aopX1: number;
  validX0: number;
  validX1: number;
  countX0: number;
  countX1: number;
  fleetX0: number;
  fleetX1: number;
  typeX0: number;
  typeX1: number;
  modelX0: number;
  regX0: number;
  seatX0: number;
}

function findHeader(words: Word[], re: RegExp, yMax = 145): Word | undefined {
  return words.find((w) => w.cy < yMax && re.test(w.text));
}

function detectCols(page: Page, prev: Cols | null): Cols | null {
  const w = page.words;
  const operator = findHeader(w, /^OPERATOR['\u2019]S/i);
  const sHeader = findHeader(w, /^S\.$/);
  const contact = findHeader(w, /^CONTACT$/i);
  const aop = findHeader(w, /^AOP$/i);
  const valid = findHeader(w, /^Valid$/i);
  const no = findHeader(w, /^No\.$/);
  const fleet = findHeader(w, /^Fleet$/i);
  const type = w.find((word) => word.cy < 145 && word.text === "Type");
  const model = findHeader(w, /^Model$/i);
  const registration = findHeader(w, /^Registration$/i);
  const seating = findHeader(w, /^Seating$/i);
  if (!model || !registration || !seating || !aop || !valid || !no || !fleet) return prev;
  const typeX0 = (type?.x0 ?? fleet.x1 + 20) - 30;
  const headerBottom = Math.max(...w.filter((x) => x.cy < seating.cy + 40 && x.cy >= seating.cy - 2 && x.x0 > 380).map((x) => x.y1));
  return {
    bodyY0: headerBottom + 3,
    snoX1: (sHeader?.x0 ?? 57) + 18,
    opX0: (operator?.x0 ?? 100) - 30,
    opX1: (contact?.x0 ?? 210) - 26,
    aopX0: aop.x0 - 8,
    aopX1: valid.x0 - 6,
    validX0: valid.x0 - 6,
    validX1: no.x0 - 10,
    countX0: no.x0 - 10,
    countX1: fleet.x0 - 6,
    fleetX0: fleet.x0 - 6,
    fleetX1: typeX0,
    typeX0,
    typeX1: model.x0 - 42,
    modelX0: model.x0 - 42,
    regX0: registration.x0 - 12,
    seatX0: seating.x0 - 14,
  };
}

function mid(w: Word) {
  return (w.x0 + w.x1) / 2;
}

const NAME_SUFFIX = /(Ltd\.?|Limited|LLP|Inc\.?|Authority of India|Company|Corporation|Corp\.?|Trust|Society|Services|Pvt\.? Ltd\.?|\(India\))\s*$/i;

interface PendingAircraft {
  op: RawOperator;
  reg: string;
  wing: Wing | null;
  modelWords: Word[];
  seatingRaw: string | null;
  page: number;
  cy: number;
}

export function parseNonScheduled(rawPages: Page[]): ParseResult {
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
  const pending: PendingAircraft[] = [];
  let current: RawOperator | null = null;
  let maxSeq = 0;
  let cols: Cols | null = null;

  for (const page of pages) {
    cols = detectCols(page, cols);
    if (!cols) {
      issues.push({ level: "error", message: "Could not detect columns", page: page.index });
      continue;
    }
    const c = cols;
    const body = page.words.filter((w) => w.cy > c.bodyY0);
    const rows = groupRows(body, 3.2);
    const pendingPrefixes: Word[] = [];
    let last: PendingAircraft | null = null;
    let headerRowIdx = -1;

    rows.forEach((row, ri) => {
      const snos = row.filter((w) => w.x1 <= c.snoX1 && /^\d{1,3}$/.test(w.text));
      const opWords = row.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1);
      const aopWords = row.filter((w) => mid(w) >= c.aopX0 && mid(w) < c.aopX1);
      const validWords = row.filter((w) => mid(w) >= c.validX0 && mid(w) < c.validX1);
      const countWord = row.find((w) => mid(w) >= c.countX0 && mid(w) < c.countX1 && /^\d{1,3}$/.test(w.text));
      const fleetWord = row.find((w) => mid(w) >= c.fleetX0 && mid(w) < c.fleetX1 && /^(FW|RW|B|MF|HAB|MIX)$/i.test(w.text));
      const typeWord = row.find((w) => mid(w) >= c.typeX0 && mid(w) < c.typeX1 && /^(FW|RW|B)$/.test(w.text));
      const modelWords = row.filter((w) => mid(w) >= c.modelX0 && mid(w) < c.regX0);
      const regWords = row.filter((w) => mid(w) >= c.regX0 && mid(w) < c.seatX0);
      const seatWords = row.filter((w) => mid(w) >= c.seatX0);

      if (snos.length) {
        const seq = Math.max(...snos.map((w) => Number(w.text)));
        if (seq > maxSeq) {
          let name = joinText(opWords);
          // wrapped name: pull one more short line if the name has no company suffix yet
          const next = rows[ri + 1];
          if (next && !NAME_SUFFIX.test(name)) {
            const nextOp = next.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1);
            const t = joinText(nextOp);
            if (t && nextOp.length <= 4 && !/\d|,/.test(t) && !/^\(/.test(t)) name = `${name} ${t}`;
          }
          name = name.replace(/\s*(Tel|Fax|E-?mail|Mob)\b.*$/i, "").replace(/[\s:,]+$/, "").trim();
          current = {
            seq,
            name,
            brandRaw: null,
            category: "non-scheduled",
            permitNo: aopWords.map((w) => w.text).join("").replace(/^#?/, "#") || null,
            validUntil: validWords.map((w) => parseDmy(w.text)).find(Boolean) ?? null,
            statedCount: countWord ? Number(countWord.text) : null,
            fleetCode: fleetWord?.text.toUpperCase() ?? null,
            ops: null,
            firstPage: page.index,
          };
          operators.push(current);
          maxSeq = seq;
          headerRowIdx = ri;
          last = null;
        } else {
          issues.push({ level: "warn", message: `Non-advancing serial ${seq} treated as continuation of #${current?.seq}`, page: page.index });
        }
      } else if (current && headerRowIdx >= 0 && ri - headerRowIdx <= 2) {
        const t = joinText(opWords);
        if (/^\(/.test(t)) current.brandRaw = current.brandRaw ?? t.replace(/^\(|\)$/g, "").trim();
      }
      if (!current) return;

      // registrations on this row
      const regsHere: string[] = [];
      for (const w of regWords) {
        const reg = normalizeReg(w.text);
        if (reg) regsHere.push(reg);
        else if (REG_PREFIX_ONLY.test(w.text)) pendingPrefixes.push(w);
        else if (REG_SUFFIX_ONLY.test(w.text) && pendingPrefixes.length) {
          pendingPrefixes.shift();
          regsHere.push(`VT-${w.text}`);
          issues.push({ level: "warn", message: `Re-joined split registration VT-${w.text}`, page: page.index });
        }
      }

      if (regsHere.length) {
        for (const reg of regsHere) {
          const a: PendingAircraft = {
            op: current,
            reg,
            wing: (typeWord?.text as Wing | undefined) ?? null,
            modelWords: [...modelWords],
            seatingRaw: seatWords.length ? joinText(seatWords) : null,
            page: page.index,
            cy: row[0].cy,
          };
          pending.push(a);
          last = a;
        }
        if (regsHere.length > 1) {
          issues.push({ level: "warn", message: `Multiple registrations on one row (${regsHere.join(", ")}); model/seating shared`, page: page.index });
        }
      } else if (modelWords.length) {
        // continuation line of a model name (e.g. "(CL605)", "DO-228-201")
        if (last && row[0].cy - last.cy < 16 && last.page === page.index) {
          last.modelWords.push(...modelWords);
        } else {
          // model text printed above its registration row: attach to the next reg row
          const nextRow = rows[ri + 1];
          const nextHasReg = nextRow?.some((w) => mid(w) >= c.regX0 && mid(w) < c.seatX0 && normalizeReg(w.text));
          if (nextHasReg && nextRow[0].cy - row[0].cy < 12) {
            // stash: prepend to the next aircraft by temporarily storing on a marker
            stash.push(...modelWords);
          } else {
            issues.push({ level: "warn", message: `Orphan model text "${joinText(modelWords)}"`, page: page.index });
          }
        }
      }
      if (stash.length && regsHere.length && last) {
        last.modelWords = [...stash, ...last.modelWords];
        stash.length = 0;
      }
    });
    if (pendingPrefixes.length) {
      issues.push({ level: "error", message: `${pendingPrefixes.length} unmatched "VT-" fragment(s)`, page: page.index });
    }
  }

  const aircraft: RawAircraft[] = [];
  const seen = new Map<string, PendingAircraft>();
  for (const p of pending) {
    if (seen.has(p.reg)) {
      const d = seen.get(p.reg)!;
      issues.push({ level: "error", message: `Duplicate registration ${p.reg}: #${d.op.seq} ${d.op.name} vs #${p.op.seq} ${p.op.name}`, page: p.page });
      continue;
    }
    seen.set(p.reg, p);
    aircraft.push({
      reg: p.reg,
      operatorSeq: p.op.seq,
      operatorName: p.op.name,
      operatorBrandRaw: p.op.brandRaw,
      category: "non-scheduled",
      permitNo: p.op.permitNo,
      validUntil: p.op.validUntil,
      model: cleanModel(joinText(p.modelWords)),
      seatingRaw: p.seatingRaw,
      wing: p.wing,
      ops: null,
      page: p.page,
    });
  }
  for (const op of operators) {
    const n = aircraft.filter((a) => a.operatorSeq === op.seq).length;
    if (op.statedCount != null && op.statedCount !== n) {
      issues.push({ level: "warn", message: `Count mismatch for #${op.seq} ${op.name}: stated ${op.statedCount}, parsed ${n}` });
    }
  }
  return { asOn, category: "non-scheduled", operators, aircraft, issues };
}

const stash: Word[] = [];
