"use client";

// -----------------------------------------------------------------------------
// formkit — shared building blocks for the admin edit forms
// -----------------------------------------------------------------------------
// Plain, controlled inputs + a save hook. No GSAP, no motion — a boring tool UI.
// The save hook calls the single `saveSection` Server Action (auth + validation +
// Firestore write + revalidateTag live there).
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { saveSection, type SaveResult } from "@/app/admin/content-actions";

// Cloudinary (free, no card) hosts admin-uploaded images. Unsigned upload preset
// → the browser POSTs the file directly; we store the returned secure_url. Values
// come from NEXT_PUBLIC_* env so they're available client-side.
const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Drives a section's save: calls the action, tracks status + error, auto-clears
 *  the "Saved" flash. Copy forms call save(doc) on submit; structured sections
 *  call save(doc) after each item change. */
export function useSectionSave(docId: string) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const save = useCallback(
    async (data: unknown): Promise<boolean> => {
      setStatus("saving");
      setError(null);
      try {
        const res: SaveResult = await saveSection(docId, data);
        if (res.ok) {
          setStatus("saved");
          return true;
        }
        setStatus("error");
        setError(res.error);
        return false;
      } catch {
        setStatus("error");
        setError("Network error — please retry.");
        return false;
      }
    },
    [docId],
  );

  return { status, error, save };
}

/** A small status line for the save state. */
export function SaveStatusText({
  status,
  error,
}: {
  status: SaveStatus;
  error: string | null;
}) {
  if (status === "saving") return <span className="text-sm text-neutral-400">Saving…</span>;
  if (status === "saved") return <span className="text-sm text-emerald-400">Saved ✓</span>;
  if (status === "error")
    return <span className="text-sm text-red-400">{error ?? "Save failed."}</span>;
  return null;
}

// --- primitives --------------------------------------------------------------

const inputCls =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-neutral-400">
        {label}
        {hint && <span className="ml-2 text-xs text-neutral-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
  );
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputCls} resize-y`}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "default" | "primary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<string, string> = {
    default: "border border-neutral-700 text-neutral-200 hover:border-neutral-500",
    primary: "bg-neutral-100 text-neutral-900 hover:bg-white",
    danger: "border border-red-900/60 text-red-300 hover:border-red-700 hover:text-red-200",
    ghost: "text-neutral-400 hover:text-neutral-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

/** Editable list of plain strings (add / remove / reorder). Used for HUD status
 *  words, footer tags, and a skill group's items. */
export function StringList({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const set = (i: number, v: string) =>
    onChange(values.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = values.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={v}
            placeholder={placeholder}
            onChange={(e) => set(i, e.target.value)}
            className={inputCls}
          />
          <Button variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
            ↑
          </Button>
          <Button
            variant="ghost"
            onClick={() => move(i, 1)}
            disabled={i === values.length - 1}
          >
            ↓
          </Button>
          <Button variant="ghost" onClick={() => remove(i)}>
            ✕
          </Button>
        </div>
      ))}
      <div>
        <Button onClick={() => onChange([...values, ""])}>+ Add</Button>
      </div>
    </div>
  );
}

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

/**
 * Image field: shows the current value (local path OR uploaded URL) with a
 * preview, lets the admin upload a replacement to Firebase Storage (client SDK,
 * under the signed-in admin), and keeps the raw path/URL editable so existing
 * migrated local paths are preserved untouched unless deliberately changed.
 */
export function ImageField({
  label,
  value,
  onChange,
  storagePath,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Storage folder for uploads, e.g. "projects/lead-unity". */
  storagePath: string;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      if (!CLOUDINARY_CLOUD || !CLOUDINARY_PRESET) {
        setError("Image uploads aren't configured yet.");
        return;
      }
      setUploading(true);
      setLastFile(file);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("upload_preset", CLOUDINARY_PRESET);
        // Organize uploads into a folder that mirrors the section/item.
        form.append("folder", `portfolio/${storagePath}`);
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          { method: "POST", body: form },
        );
        if (!res.ok) throw new Error("upload failed");
        const data = (await res.json()) as { secure_url?: string };
        if (!data.secure_url) throw new Error("no url returned");
        onChange(data.secure_url);
      } catch {
        setError("Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [storagePath, onChange],
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-neutral-400">
        {label}
        {hint && <span className="ml-2 text-xs text-neutral-600">{hint}</span>}
      </span>
      <div className="flex items-start gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
          {value ? (
            // Admin preview only — plain img handles arbitrary local/remote values.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-neutral-600">none</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            value={value}
            placeholder="/path/to/image or uploaded URL"
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
              className="text-xs text-neutral-400 file:mr-3 file:rounded-md file:border file:border-neutral-700 file:bg-neutral-900 file:px-2 file:py-1 file:text-neutral-200"
            />
            {uploading && <span className="text-xs text-neutral-400">Uploading…</span>}
            {error && (
              <span className="text-xs text-red-400">
                {error}{" "}
                {lastFile && (
                  <button
                    type="button"
                    onClick={() => void upload(lastFile)}
                    className="underline hover:text-red-300"
                  >
                    Retry
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline editor for an array of objects (all rows expanded + editable at once).
 * Used for the nested arrays inside the COPY sections (nav links, footer social
 * links, about skill groups, about heading lines/segments). Supports add, remove,
 * and reorder; `render` draws each item's fields and gets a partial-patch updater.
 */
export function InlineList<T>({
  items,
  onChange,
  makeEmpty,
  addLabel,
  render,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  makeEmpty: () => T;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  const update = (i: number, patch: Partial<T>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-md border border-neutral-800 bg-neutral-900/40 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">#{i + 1}</span>
            <div className="flex gap-1">
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
              <Button variant="ghost" onClick={() => remove(i)}>
                ✕
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">{render(it, (patch) => update(i, patch), i)}</div>
        </div>
      ))}
      <div>
        <Button onClick={() => onChange([...items, makeEmpty()])}>+ {addLabel}</Button>
      </div>
    </div>
  );
}

/** Section page frame: a title + the form body. */
export function SectionShell({
  title,
  docId,
  children,
}: {
  title: string;
  docId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-100">{title}</h1>
        <p className="mt-1 text-xs text-neutral-500">
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono">content/{docId}</code>
        </p>
      </div>
      {children}
    </div>
  );
}
