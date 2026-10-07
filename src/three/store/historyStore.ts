import { atom } from "jotai";
import type { PrimitiveAtom } from "jotai";
import { rectanglesAtom, chimneysAtom, trees3DAtom } from "./rectangleStore";
import { lotsAtom } from "./lotStore";
import { solarPanelConfigsAtom } from "./solarPanelStore";

/** How many undoable steps are retained. */
export const MAX_HISTORY_STEPS = 20;

/**
 * The atoms that make up the undoable document state. Only changes to these
 * atoms are tracked by undo/redo — ephemeral UI state (selection, drawing
 * mode, hover, camera, render output, etc.) is intentionally excluded.
 */
export const TRACKED_ATOMS = [
  rectanglesAtom,
  chimneysAtom,
  trees3DAtom,
  lotsAtom,
  solarPanelConfigsAtom,
] as unknown as PrimitiveAtom<unknown>[];

/** A snapshot is the value of each tracked atom, aligned to TRACKED_ATOMS. */
export type HistorySnapshot = unknown[];

type Getter = (atom: PrimitiveAtom<unknown>) => unknown;
type Setter = (atom: PrimitiveAtom<unknown>, value: unknown) => void;

function snapshot(get: Getter): HistorySnapshot {
  return TRACKED_ATOMS.map((a) => get(a));
}

function sameSnapshot(a: HistorySnapshot, b: HistorySnapshot): boolean {
  // The codebase always updates these atoms immutably, so reference equality
  // is enough to detect a real change.
  return a.every((value, i) => value === b[i]);
}

function restore(set: Setter, snap: HistorySnapshot): void {
  TRACKED_ATOMS.forEach((a, i) => set(a, snap[i]));
}

export const undoStackAtom = atom<HistorySnapshot[]>([]);
export const redoStackAtom = atom<HistorySnapshot[]>([]);

/** The last recorded state, used to derive what changed on the next edit. */
export const historyPresentAtom = atom<HistorySnapshot | null>(null);

export const canUndoAtom = atom((get) => get(undoStackAtom).length > 0);
export const canRedoAtom = atom((get) => get(redoStackAtom).length > 0);

/**
 * Sets the baseline state without creating an undo entry, and clears history.
 * Used after the initial data is hydrated so the load itself is not undoable.
 */
export const resetHistoryAtom = atom(null, (get, set) => {
  set(historyPresentAtom, snapshot(get as Getter));
  set(undoStackAtom, []);
  set(redoStackAtom, []);
});

/**
 * Records a history entry if the tracked state changed since the last
 * recording. Triggered (coalesced) after tracked atoms change. Because undo /
 * redo set `historyPresentAtom` to the snapshot they restore, the change they
 * cause compares equal here and is correctly ignored.
 */
export const recordHistoryAtom = atom(null, (get, set) => {
  const next = snapshot(get as Getter);
  const present = get(historyPresentAtom);

  if (present === null) {
    set(historyPresentAtom, next);
    return;
  }

  if (sameSnapshot(next, present)) return;

  set(
    undoStackAtom,
    [...get(undoStackAtom), present].slice(-MAX_HISTORY_STEPS),
  );
  set(redoStackAtom, []);
  set(historyPresentAtom, next);
});

export const undoAtom = atom(null, (get, set) => {
  const past = get(undoStackAtom);
  if (past.length === 0) return;

  const previous = past[past.length - 1];
  const current = snapshot(get as Getter);

  restore(set as Setter, previous);

  set(undoStackAtom, past.slice(0, -1));
  set(
    redoStackAtom,
    [...get(redoStackAtom), current].slice(-MAX_HISTORY_STEPS),
  );
  set(historyPresentAtom, previous);
});

export const redoAtom = atom(null, (get, set) => {
  const future = get(redoStackAtom);
  if (future.length === 0) return;

  const next = future[future.length - 1];
  const current = snapshot(get as Getter);

  restore(set as Setter, next);

  set(redoStackAtom, future.slice(0, -1));
  set(
    undoStackAtom,
    [...get(undoStackAtom), current].slice(-MAX_HISTORY_STEPS),
  );
  set(historyPresentAtom, next);
});
