import { useEffect } from "react";
import { useStore, useSetAtom } from "jotai";
import {
  TRACKED_ATOMS,
  recordHistoryAtom,
  undoAtom,
  redoAtom,
} from "../store/historyStore";

/**
 * Tracks changes to the document-state atoms and exposes undo/redo via
 * keyboard shortcuts:
 *   - Cmd/Ctrl+Z          → undo
 *   - Cmd/Ctrl+Shift+Z    → redo
 *   - Ctrl+Y              → redo (Windows convention)
 *
 * Only the atoms listed in TRACKED_ATOMS are recorded; ephemeral UI state is
 * ignored. All tracked-atom writes that happen within the same synchronous
 * tick (e.g. deleting a roof clears rectangles, configs and chimneys at once)
 * are coalesced into a single undoable step. Mount this once near the root.
 */
export function useUndoRedoHistory() {
  const store = useStore();
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);

  // Subscribe to every tracked atom and record a coalesced history entry.
  useEffect(() => {
    let scheduled = false;
    const flush = () => {
      scheduled = false;
      store.set(recordHistoryAtom);
    };
    const record = () => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(flush);
    };

    const unsubscribe = TRACKED_ATOMS.map((a) => store.sub(a, record));
    return () => unsubscribe.forEach((u) => u());
  }, [store]);

  // Keyboard shortcuts.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const key = e.key.toLowerCase();
      const isRedo =
        (key === "z" && e.shiftKey) || (key === "y" && !e.shiftKey);
      const isUndo = key === "z" && !e.shiftKey;

      if (isRedo) {
        e.preventDefault();
        redo();
      } else if (isUndo) {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
}
