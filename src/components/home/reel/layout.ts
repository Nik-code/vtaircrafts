/** Rough advance width for the mono/label type used across the timeline and reel, in px per character. */
const CHAR_PX = 6.6;

export function estimateTextWidth(text: string, padding = 0) {
  return Math.round(text.length * CHAR_PX + padding);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface PackedItem<T> {
  item: T;
  /** The item's real position on the axis. */
  trueX: number;
  /** Where its label actually sits, shifted right only when its lane is busy. */
  x: number;
  lane: number;
}

/**
 * Places items into a fixed number of lanes: for each item (processed in axis
 * order) it picks whichever lane currently has the most room, then slides the
 * label right only as far as needed to clear that lane's last entry. Lane
 * count never grows, so a dense cluster of same-day events fans out sideways
 * instead of stacking the strip taller. Callers draw a leader from `trueX` to
 * `x` when they differ, so the true date stays legible even once shifted.
 */
export function packLanes<T>(
  items: T[],
  opts: { getX: (item: T) => number; getWidth: (item: T) => number; lanes: number; gap?: number },
): PackedItem<T>[] {
  const { getX, getWidth, lanes, gap = 8 } = opts;
  const laneRight = new Array(lanes).fill(-Infinity);
  const ordered = items
    .map((item, i) => ({ item, i, trueX: getX(item) }))
    .sort((a, b) => a.trueX - b.trueX || a.i - b.i);
  return ordered.map(({ item, trueX }) => {
    let lane = 0;
    for (let l = 1; l < lanes; l++) if (laneRight[l] < laneRight[lane]) lane = l;
    const x = Math.max(trueX, laneRight[lane] + gap);
    laneRight[lane] = x + getWidth(item);
    return { item, trueX, x: round2(x), lane };
  });
}
