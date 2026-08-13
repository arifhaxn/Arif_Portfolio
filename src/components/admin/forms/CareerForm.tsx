"use client";

import { useState } from "react";
import type { CareerContent, CareerEntry } from "@/lib/content-types";
import { CrudList } from "./CrudList";
import {
  Button,
  Field,
  ImageField,
  SaveStatusText,
  SectionShell,
  Select,
  TextArea,
  TextInput,
  useSectionSave,
} from "./formkit";

export function CareerForm({ initial }: { initial: CareerContent }) {
  const [doc, setDoc] = useState<CareerContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("career");

  const persistItems = async (items: CareerEntry[]) => {
    const next = { ...doc, items };
    setDoc(next);
    return save(next);
  };

  const validateItem = (e: CareerEntry): string | null => {
    if (!e.company?.trim()) return "company is required.";
    if (!e.period?.trim()) return "period is required.";
    // Title (blue) and Description (grey) are the two halves of the detail line;
    // at least one must have text, but either may be left empty.
    if (!e.title?.trim() && !e.description?.trim())
      return "add a title and/or a description.";
    return null;
  };

  return (
    <SectionShell title="Career" docId="career">
      <div className="mb-8 flex items-end gap-4">
        <div className="flex-1">
          <Field label="Section eyebrow">
            <TextInput value={doc.eyebrow} onChange={(v) => setDoc((d) => ({ ...d, eyebrow: v }))} />
          </Field>
        </div>
        <Button variant="primary" onClick={() => void save(doc)} disabled={status === "saving"}>
          Save copy
        </Button>
        <SaveStatusText status={status} error={error} />
      </div>

      <div className="mb-2 text-sm font-medium text-neutral-300">Entries</div>
      <CrudList<CareerEntry>
        items={doc.items}
        onPersist={persistItems}
        itemLabel="entry"
        makeEmpty={() => ({
          company: "",
          title: "",
          description: "",
          period: "",
          side: "left",
        })}
        validateItem={validateItem}
        renderRow={(e) => (
          <div className="truncate text-sm text-neutral-200">
            <span className="font-medium">{e.company || "—"}</span>
            <span className="text-neutral-500"> · {e.title}</span>
            <span className="ml-2 text-xs text-neutral-600">{e.period}</span>
          </div>
        )}
        renderForm={(draft, setDraft) => (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Company">
                <TextInput value={draft.company} onChange={(v) => setDraft((d) => ({ ...d, company: v }))} />
              </Field>
              <Field label="Title" hint="blue · prominent · first on the line">
                <TextInput value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
              </Field>
            </div>
            <Field label="Description" hint="grey · follows the title on the same line">
              <TextArea
                rows={3}
                value={draft.description}
                onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Period" hint="e.g. 2023 — Present">
                <TextInput value={draft.period} onChange={(v) => setDraft((d) => ({ ...d, period: v }))} />
              </Field>
              <Field label="Side" hint="which side of the timeline">
                <Select
                  value={draft.side}
                  onChange={(v) => setDraft((d) => ({ ...d, side: v as CareerEntry["side"] }))}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
                />
              </Field>
            </div>
            <ImageField
              label="Logo"
              hint="optional — falls back to a lettermark"
              value={draft.logo ?? ""}
              storagePath="career"
              onChange={(v) => setDraft((d) => ({ ...d, logo: v }))}
            />
          </>
        )}
      />
    </SectionShell>
  );
}
