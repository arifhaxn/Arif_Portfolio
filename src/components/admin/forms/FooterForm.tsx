"use client";

import { useState } from "react";
import type { FooterContent, SocialLink } from "@/lib/content-types";
import {
  Button,
  Field,
  InlineList,
  SaveStatusText,
  SectionShell,
  StringList,
  TextArea,
  TextInput,
  useSectionSave,
} from "./formkit";

export function FooterForm({ initial }: { initial: FooterContent }) {
  const [doc, setDoc] = useState<FooterContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("footer");

  return (
    <SectionShell title="Footer" docId="footer">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(doc);
        }}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Eyebrow">
            <TextInput value={doc.eyebrow} onChange={(v) => setDoc((d) => ({ ...d, eyebrow: v }))} />
          </Field>
          <Field label="Note">
            <TextInput value={doc.note} onChange={(v) => setDoc((d) => ({ ...d, note: v }))} />
          </Field>
        </div>
        <Field label="Contact email">
          <TextInput
            type="email"
            value={doc.email}
            onChange={(v) => setDoc((d) => ({ ...d, email: v }))}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Copy-email label">
            <TextInput
              value={doc.copyLabel}
              onChange={(v) => setDoc((d) => ({ ...d, copyLabel: v }))}
            />
          </Field>
          <Field label="Copied confirmation label">
            <TextInput
              value={doc.copiedLabel}
              onChange={(v) => setDoc((d) => ({ ...d, copiedLabel: v }))}
            />
          </Field>
        </div>

        <Field label="Ribbon tags">
          <StringList
            values={doc.tags}
            placeholder="tag"
            onChange={(tags) => setDoc((d) => ({ ...d, tags }))}
          />
        </Field>

        <Field label="Sign-off lines">
          <StringList
            values={doc.signoff}
            placeholder="line"
            onChange={(signoff) => setDoc((d) => ({ ...d, signoff }))}
          />
        </Field>

        <Field label="Social links" hint="icon is the raw 24×24 SVG path">
          <InlineList<SocialLink>
            items={doc.socialLinks}
            onChange={(socialLinks) => setDoc((d) => ({ ...d, socialLinks }))}
            makeEmpty={() => ({ label: "", href: "", icon: "" })}
            addLabel="social link"
            render={(s, update) => (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TextInput value={s.label} placeholder="Label" onChange={(v) => update({ label: v })} />
                  <TextInput value={s.href} placeholder="https://…" onChange={(v) => update({ href: v })} />
                </div>
                <TextArea
                  rows={2}
                  value={s.icon}
                  placeholder="M12 .297c-6.63 0…"
                  onChange={(v) => update({ icon: v })}
                />
              </div>
            )}
          />
        </Field>

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
