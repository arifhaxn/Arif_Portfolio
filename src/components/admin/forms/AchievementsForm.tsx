"use client";

import { useState } from "react";
import type {
  AchievementsContent,
  Achievement,
  AchievementCategory,
} from "@/lib/content-types";
import { CrudList } from "./CrudList";
import {
  Button,
  Field,
  ImageField,
  SaveStatusText,
  SectionShell,
  Select,
  StringList,
  TextInput,
  useSectionSave,
} from "./formkit";

/** Next zero-padded numeric id not already used (keeps React keys unique). */
function nextId(items: Achievement[]): string {
  const max = items.reduce((m, it) => {
    const n = parseInt(it.id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(2, "0");
}

export function AchievementsForm({ initial }: { initial: AchievementsContent }) {
  const [doc, setDoc] = useState<AchievementsContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("achievements");

  const persistItems = async (items: Achievement[]) => {
    const next = { ...doc, items };
    setDoc(next);
    return save(next);
  };

  const validateItem = (a: Achievement): string | null => {
    for (const f of ["id", "title", "issuer", "category"] as const) {
      if (!a[f]?.trim()) return `${f} is required.`;
    }
    if (!doc.categoryOrder.includes(a.category))
      return `category must be one of: ${doc.categoryOrder.join(", ")}.`;
    return null;
  };

  const categoryOptions = doc.categoryOrder.map((c) => ({ value: c, label: c }));

  return (
    <SectionShell title="Achievements" docId="achievements">
      <div className="mb-8 rounded-md border border-neutral-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-300">Section copy</span>
          <div className="flex items-center gap-3">
            <SaveStatusText status={status} error={error} />
            <Button variant="primary" onClick={() => void save(doc)} disabled={status === "saving"}>
              Save copy
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Eyebrow">
              <TextInput value={doc.eyebrow} onChange={(v) => setDoc((d) => ({ ...d, eyebrow: v }))} />
            </Field>
            <Field label="Heading">
              <TextInput value={doc.heading} onChange={(v) => setDoc((d) => ({ ...d, heading: v }))} />
            </Field>
            <Field label="Subtitle">
              <TextInput value={doc.subtitle} onChange={(v) => setDoc((d) => ({ ...d, subtitle: v }))} />
            </Field>
          </div>
          <Field label="Category order" hint="section order + the allowed categories">
            <StringList
              values={doc.categoryOrder}
              placeholder="Hackathons"
              onChange={(v) =>
                setDoc((d) => ({ ...d, categoryOrder: v as AchievementCategory[] }))
              }
            />
          </Field>
        </div>
      </div>

      <div className="mb-2 text-sm font-medium text-neutral-300">Certificates</div>
      <CrudList<Achievement>
        items={doc.items}
        onPersist={persistItems}
        itemLabel="certificate"
        makeEmpty={() => ({
          id: nextId(doc.items),
          title: "",
          issuer: "",
          category: (doc.categoryOrder[0] ?? "") as AchievementCategory,
        })}
        validateItem={validateItem}
        renderRow={(a) => (
          <div className="truncate text-sm text-neutral-200">
            <span className="font-mono text-neutral-500">{a.id}</span>{" "}
            <span className="font-medium">{a.title || "—"}</span>
            <span className="ml-2 text-xs text-neutral-600">{a.category}</span>
          </div>
        )}
        renderForm={(draft, setDraft) => (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[6rem_1fr]">
              <Field label="Id" hint="unique">
                <TextInput value={draft.id} onChange={(v) => setDraft((d) => ({ ...d, id: v }))} />
              </Field>
              <Field label="Title">
                <TextInput value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Issuer">
                <TextInput value={draft.issuer} onChange={(v) => setDraft((d) => ({ ...d, issuer: v }))} />
              </Field>
              <Field label="Category">
                <Select
                  value={draft.category}
                  onChange={(v) => setDraft((d) => ({ ...d, category: v as AchievementCategory }))}
                  options={categoryOptions}
                />
              </Field>
            </div>
            <ImageField
              label="Certificate image"
              hint="optional — shows a placeholder until set"
              value={draft.image ?? ""}
              storagePath="achievements"
              onChange={(v) => setDraft((d) => ({ ...d, image: v }))}
            />
          </>
        )}
      />
    </SectionShell>
  );
}
