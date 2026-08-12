"use client";

import { useState } from "react";
import type { NavbarContent, NavLink } from "@/lib/content-types";
import {
  Button,
  Field,
  ImageField,
  InlineList,
  SaveStatusText,
  SectionShell,
  Select,
  TextInput,
  useSectionSave,
} from "./formkit";

export function NavbarForm({ initial }: { initial: NavbarContent }) {
  const [doc, setDoc] = useState<NavbarContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("navbar");

  return (
    <SectionShell title="Navbar" docId="navbar">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(doc);
        }}
        className="flex flex-col gap-5"
      >
        <div className="rounded-md border border-neutral-800 p-4">
          <div className="mb-3 text-sm font-medium text-neutral-300">Wordmark</div>
          <div className="flex flex-col gap-4">
            <ImageField
              label="Logo"
              value={doc.wordmark.logo}
              storagePath="navbar"
              onChange={(v) => setDoc((d) => ({ ...d, wordmark: { ...d.wordmark, logo: v } }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Alt text">
                <TextInput
                  value={doc.wordmark.alt}
                  onChange={(v) => setDoc((d) => ({ ...d, wordmark: { ...d.wordmark, alt: v } }))}
                />
              </Field>
              <Field label="Home link aria-label">
                <TextInput
                  value={doc.wordmark.homeAriaLabel}
                  onChange={(v) =>
                    setDoc((d) => ({ ...d, wordmark: { ...d.wordmark, homeAriaLabel: v } }))
                  }
                />
              </Field>
            </div>
          </div>
        </div>

        <Field label="Links" hint="side chooses which corner">
          <InlineList<NavLink>
            items={doc.links}
            onChange={(links) => setDoc((d) => ({ ...d, links }))}
            makeEmpty={() => ({ label: "", href: "", side: "left" })}
            addLabel="link"
            render={(link, update) => (
              <div className="grid grid-cols-[1fr_1fr_8rem] gap-3">
                <TextInput value={link.label} placeholder="Label" onChange={(v) => update({ label: v })} />
                <TextInput value={link.href} placeholder="/href" onChange={(v) => update({ href: v })} />
                <Select
                  value={link.side}
                  onChange={(v) => update({ side: v as NavLink["side"] })}
                  options={[
                    { value: "left", label: "Left" },
                    { value: "right", label: "Right" },
                  ]}
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
