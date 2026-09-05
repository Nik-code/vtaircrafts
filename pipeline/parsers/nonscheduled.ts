import { groupRows, joinText, type Page, type Word } from "../lib/bbox";
import { removeRecurringOverlay } from "../lib/overlay";
import { cleanModel, isRegPrefix, isRegSuffix, normalizeReg, parseAsOn, parseDmy, regSuffix } from "../lib/text";
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
  modelX1: number;
  regX0: number;
  seatX0: number;
}

/**
 * Column headers only ever sit above the first row that carries a registration, so that
 * row bounds the search. Layouts from 2011-2017 push the header as low as y=200, which a
 * fixed cut-off would miss.
 */
function headerZone(page: Page): number {
  let firstReg = Infinity;
  for (const w of page.words) if (normalizeReg(w.text)) firstReg = Math.min(firstReg, w.cy);
  return Number.isFinite(firstReg) ? firstReg - 4 : 145;
}

function detectCols(page: Page, prev: Cols | null): Cols | null {
  const w = page.words;
  const yMax = headerZone(page);
  // "Valid (Upto)" appears in every layout and only in the header band, so it anchors the
  // search downwards; without a floor the pre-2018 title "LIST OF NON-SCHEDULED
  // OPERATOR'S PERMIT HOLDERS" would be mistaken for the operator column header.
  const valid = w.find((x) => x.cy < yMax && /^Valid$/i.test(x.text));
  // Some pre-2018 exports print the header on page 1 only; keep the previous geometry but
  // start the body at the top of the page.
  if (!valid) return prev && { ...prev, bodyY0: 0 };
  const yMin = valid.cy - 12;
  const find = (re: RegExp) => w.find((x) => x.cy < yMax && x.cy > yMin && re.test(x.text));

  const operator = find(/^OPERATOR['\u2019]?S?[,.]?$/i) ?? find(/^Name$/i);
  const sHeader = find(/^S\.$/) ?? find(/^S\.No\.?$/i) ?? find(/^S\.N\.?$/i);
  const contact = find(/^CONTACT$/i) ?? find(/^Tel[./]/i);
  const manager = find(/^ACCOUNTABLE?$/i);
  const aop = find(/^AOP$/i) ?? find(/^AOC\/AOP$/i) ?? find(/^NSOP$/i) ?? find(/^AOC$/i);
  const seating = find(/^Seating$/i) ?? find(/^Seat\.?$/i);
  const registration = find(/^Registration$/i) ?? find(/^Regn\.?$/i) ?? find(/^Reg\.$/i);
  const model = find(/^Model$/i);
  const fleet = find(/^Fleet$/i);
  const type = find(/^Type$/);
  const issueDate = find(/^Dt\.$/i);
  // "A/c No." is the pre-2017 count column, printed to the RIGHT of the aircraft type.
  const legacyCount = find(/^A\/c$/i);
  const no = legacyCount
    ?? w.find((x) => x.cy < yMax && x.cy > yMin && /^No['\u2019]?s?\.?$/i.test(x.text) && x.x0 > valid.x0);
  if (!registration || !seating || !aop || !no) return prev;
  const aopX1 = Math.min(valid.x0, issueDate?.x0 ?? Infinity) - 6;

  if (legacyCount && !model) {
    // 2011-2016: S.N | Name | [Accountable] | Tel/Fax | NSOP | Dt. of Issue | Valid upto |
    //            Aircraft Type (model text) | A/c No. | Reg. No. | Seat Cap.
    const aircraft = find(/^Aircraf?t?$/);
    if (!aircraft) return prev;
    const modelX0 = aircraft.x0 - 30;
    const countX0 = legacyCount.x0 - 10;
    const regX0 = registration.x0 - 14;
    const headerBottom = Math.max(
      ...w.filter((x) => x.cy < yMax && x.cy >= valid.cy - 2 && x.x0 > modelX0 - 40).map((x) => x.y1),
    );
    return {
      bodyY0: headerBottom + 3,
      // The serial column runs right up to the name column: "10." is wider than the
      // "S." header it sits under.
      snoX1: (operator?.x0 ?? (sHeader?.x0 ?? 29) + 45) - 6,
      opX0: (operator?.x0 ?? 70) - 6,
      opX1: (manager?.x0 ?? contact?.x0 ?? 250) - 6,
      aopX0: aop.x0 - 8,
      aopX1,
      validX0: valid.x0 - 6,
      validX1: modelX0,
      countX0,
      countX1: regX0,
      fleetX0: -1,
      fleetX1: -1,
      typeX0: -1,
      typeX1: -1,
      modelX0,
      modelX1: countX0,
      regX0,
      seatX0: seating.x0 - 14,
    };
  }

  if (!model) return prev;
  // "Fleet" only exists in some 2026 exports; without it the type column starts where the
  // count column ends.
  const typeX0 = (type?.x0 ?? (fleet ? fleet.x1 + 20 : model.x0 - 60)) - 30;
  const fleetX0 = fleet ? fleet.x0 - 6 : typeX0;
  const headerBottom = Math.max(
    ...w.filter((x) => x.cy < Math.min(seating.cy + 40, yMax) && x.cy >= seating.cy - 2 && x.x0 > 380).map((x) => x.y1),
  );
  return {
    bodyY0: headerBottom + 3,
    snoX1: (sHeader?.x0 ?? 57) + 18,
    opX0: (operator?.x0 ?? 100) - 30,
    opX1: (manager?.x0 ?? contact?.x0 ?? 210) - 26,
    aopX0: aop.x0 - 8,
    aopX1,
    validX0: valid.x0 - 6,
    validX1: no.x0 - 10,
    countX0: no.x0 - 10,
    countX1: fleetX0,
    fleetX0,
    fleetX1: typeX0,
    typeX0,
    typeX1: model.x0 - 42,
    modelX0: model.x0 - 42,
    modelX1: registration.x0 - 12,
    regX0: registration.x0 - 12,
    seatX0: seating.x0 - 14,
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

const NAME_SUFFIX = /(Ltd\.?|Limited|LLP|Inc\.?|Authority of India|Company|Corporation|Corp\.?|Trust|Society|Services|Pvt\.? Ltd\.?|\(India\))[,.]?\s*$/i;

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
  const head = (pages[0]?.words ?? []).filter((w) => w.cy < 135).map((w) => w.text).join(" ");
  const asOn = parseAsOn(head);

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
      const snos = row.filter((w) => w.x1 <= c.snoX1 && serialValue(w.text, 999) != null);
      const opWords = row.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1 && w.x1 > c.snoX1);
      const aopWords = row.filter((w) => mid(w) >= c.aopX0 && mid(w) < c.aopX1);
      const validWords = row.filter((w) => mid(w) >= c.validX0 && mid(w) < c.validX1);
      const countWord = row.find((w) => mid(w) >= c.countX0 && mid(w) < c.countX1 && /^\d{1,3}$/.test(w.text));
      const fleetWord = row.find((w) => mid(w) >= c.fleetX0 && mid(w) < c.fleetX1 && /^(FW|RW|B|MF|HAB|MIX)$/i.test(w.text));
      const typeWord = row.find((w) => mid(w) >= c.typeX0 && mid(w) < c.typeX1 && /^(FW|RW|B)$/.test(w.text));
      const modelWords = row.filter((w) => mid(w) >= c.modelX0 && mid(w) < c.modelX1);
      const regWords = row.filter((w) => mid(w) >= c.regX0 && mid(w) < c.seatX0);
      const seatWords = row.filter((w) => mid(w) >= c.seatX0);

      if (snos.length) {
        const seq = Math.max(...snos.map((w) => serialValue(w.text, 999)!));
        if (seq > maxSeq) {
          let name = joinText(opWords);
          // Wrapped name: keep pulling short label-only lines until the legal form appears.
          // Without this the same operator reads as "Arrow Aircrafts Sales" in one snapshot
          // and "Arrow Aircrafts Sales & Charters Pvt. Ltd." in the next, which would look
          // like the fleet moving between two companies.
          // A trailing comma means the address has started, so the name is complete.
          for (let k = 1; k <= 3 && !NAME_SUFFIX.test(name) && !/,\s*$/.test(name); k += 1) {
            const next = rows[ri + k];
            if (!next) break;
            const nextOp = next.filter((w) => mid(w) >= c.opX0 && mid(w) < c.opX1 && w.x1 > c.snoX1);
            const t = joinText(nextOp);
            if (!t || nextOp.length > 4 || /\d/.test(t) || /^\(/.test(t)) break;
            name = `${name} ${t}`;
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
      } else if (current && !current.name && opWords.length && page.index > current.firstPage) {
        // The row was split by a page break: the serial and permit sit at the foot of one
        // page and the operator name at the head of the next.
        const t = joinText(opWords).replace(/\s*(Tel|Fax|E-?mail|Mob)\b.*$/i, "").replace(/[\s:,]+$/, "").trim();
        if (t && !/^\(/.test(t) && !/\d/.test(t)) current.name = t;
      }
      if (!current) return;

      // registrations on this row
      const regsHere: string[] = [];
      for (const w of regWords) {
        const reg = normalizeReg(w.text);
        if (reg) regsHere.push(reg);
        else if (isRegPrefix(w.text)) pendingPrefixes.push(w);
        else if (isRegSuffix(w.text) && pendingPrefixes.length) {
          pendingPrefixes.shift();
          regsHere.push(`VT-${regSuffix(w.text)}`);
          issues.push({ level: "warn", message: `Re-joined split registration VT-${regSuffix(w.text)}`, page: page.index });
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
      wing: p.wing ?? (/\(\s*H\s*\)/i.test(joinText(p.modelWords)) ? "RW" : null),
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
