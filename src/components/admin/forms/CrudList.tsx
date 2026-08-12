"use client";

// -----------------------------------------------------------------------------
// CrudList — master/detail editor for a structured section's `items` array
// -----------------------------------------------------------------------------
// Shows a list of rows (Edit / Delete / reorder per row) + an "Add" button. Edit
// and Add open the SAME item form (pre-filled when editing). Delete confirms
// first. Every committed change (add, edit, delete, reorder) persists the whole
// items array via `onPersist` (which writes the doc + revalidates), so the public
// site reflects it immediately.
// -----------------------------------------------------------------------------

import { useState } from "react";
import { Button } from "./formkit";

export function CrudList<T>({
  items,
  onPersist,
  renderRow,
  renderForm,
  makeEmpty,
  validateItem,
  itemLabel,
}: {
  items: T[];
  /** Persist the full next array (whole-doc write). Returns true on success. */
  onPersist: (next: T[]) => Promise<boolean>;
  renderRow: (item: T) => React.ReactNode;
  renderForm: (draft: T, setDraft: (updater: (d: T) => T) => void) => React.ReactNode;
  makeEmpty: () => T;
  /** Optional per-item required-field check before applying. */
  validateItem?: (item: T) => string | null;
  itemLabel: string;
}) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startAdd = () => {
    setDraft(makeEmpty());
    setEditing("new");
    setErr(null);
  };
  const startEdit = (i: number) => {
    setDraft(structuredClone(items[i]));
    setEditing(i);
    setErr(null);
  };
  const cancel = () => {
    setEditing(null);
    setDraft(null);
    setErr(null);
  };

  const apply = async () => {
    if (draft == null) return;
    const v = validateItem?.(draft) ?? null;
    if (v) {
      setErr(v);
      return;
    }
    const next =
      editing === "new"
        ? [...items, draft]
        : items.map((it, i) => (i === editing ? draft : it));
    setBusy(true);
    const ok = await onPersist(next);
    setBusy(false);
    if (ok) cancel();
    else setErr("Save failed — please retry.");
  };

  const del = async (i: number) => {
    if (!window.confirm(`Delete this ${itemLabel}? This can't be undone.`)) return;
    await onPersist(items.filter((_, j) => j !== i));
  };
  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    await onPersist(next);
  };

  if (editing !== null && draft != null) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="mb-4 text-sm font-medium text-neutral-200">
          {editing === "new" ? `Add ${itemLabel}` : `Edit ${itemLabel}`}
        </div>
        <div className="flex flex-col gap-4">
          {renderForm(draft, (updater) =>
            setDraft((d) => (d == null ? d : updater(d))),
          )}
        </div>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        <div className="mt-5 flex items-center gap-3">
          <Button variant="primary" onClick={apply} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={cancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="text-sm text-neutral-500">No items yet.</p>
      )}
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
        >
          <div className="min-w-0 flex-1">{renderRow(it)}</div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </Button>
            <Button
              variant="ghost"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
            >
              ↓
            </Button>
            <Button onClick={() => startEdit(i)}>Edit</Button>
            <Button variant="danger" onClick={() => del(i)}>
              Delete
            </Button>
          </div>
        </div>
      ))}
      <div className="mt-2">
        <Button variant="primary" onClick={startAdd}>
          + Add {itemLabel}
        </Button>
      </div>
    </div>
  );
}
