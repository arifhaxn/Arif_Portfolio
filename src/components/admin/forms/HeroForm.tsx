"use client";

import { useState } from "react";
import type { HeroContent } from "@/lib/content-types";
import {
  Button,
  Field,
  ImageField,
  SaveStatusText,
  SectionShell,
  StringList,
  TextInput,
  useSectionSave,
} from "./formkit";

export function HeroForm({ initial }: { initial: HeroContent }) {
  const [doc, setDoc] = useState<HeroContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("hero");

  return (
    <SectionShell title="Hero" docId="hero">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(doc);
        }}
        className="flex flex-col gap-5"
      >
        <Field label="Eyebrow">
          <TextInput value={doc.eyebrow} onChange={(v) => setDoc((d) => ({ ...d, eyebrow: v }))} />
        </Field>
        <Field label="Name" hint="rendered one word per line">
          <TextInput value={doc.name} onChange={(v) => setDoc((d) => ({ ...d, name: v }))} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tagline line 1">
            <TextInput
              value={doc.tagline.primary}
              onChange={(v) => setDoc((d) => ({ ...d, tagline: { ...d.tagline, primary: v } }))}
            />
          </Field>
          <Field label="Tagline line 2">
            <TextInput
              value={doc.tagline.secondary}
              onChange={(v) => setDoc((d) => ({ ...d, tagline: { ...d.tagline, secondary: v } }))}
            />
          </Field>
        </div>
        <Field label="CTA button label">
          <TextInput value={doc.ctaLabel} onChange={(v) => setDoc((d) => ({ ...d, ctaLabel: v }))} />
        </Field>
        <ImageField
          label="Portrait image"
          hint="used on the About hero"
          value={doc.portraitImage}
          storagePath="hero"
          onChange={(v) => setDoc((d) => ({ ...d, portraitImage: v }))}
        />

        <div className="mt-2 rounded-md border border-neutral-800 p-4">
          <div className="mb-3 text-sm font-medium text-neutral-300">HUD</div>
          <div className="flex flex-col gap-4">
            <Field label="Status words" hint="rotate in the live clock">
              <StringList
                values={doc.hud.statusWords}
                placeholder="BUILDING"
                onChange={(v) => setDoc((d) => ({ ...d, hud: { ...d.hud, statusWords: v } }))}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Coding-since year">
                <TextInput
                  value={doc.hud.codingSinceYear}
                  onChange={(v) => setDoc((d) => ({ ...d, hud: { ...d.hud, codingSinceYear: v } }))}
                />
              </Field>
              <Field label="Location label">
                <TextInput
                  value={doc.hud.locationLabel}
                  onChange={(v) => setDoc((d) => ({ ...d, hud: { ...d.hud, locationLabel: v } }))}
                />
              </Field>
              <Field label="Timezone" hint="IANA">
                <TextInput
                  value={doc.hud.timeZone}
                  onChange={(v) => setDoc((d) => ({ ...d, hud: { ...d.hud, timeZone: v } }))}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={status === "saving"}>
            Save
          </Button>
          <SaveStatusText status={status} error={error} />
        </div>
      </form>
    </SectionShell>
  );
}
