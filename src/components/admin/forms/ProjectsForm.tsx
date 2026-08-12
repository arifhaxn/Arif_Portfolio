"use client";

import { useState } from "react";
import type { ProjectsContent, Project } from "@/lib/content-types";
import { CrudList } from "./CrudList";
import {
  Field,
  ImageField,
  InlineList,
  SaveStatusText,
  SectionShell,
  StringList,
  TextArea,
  TextInput,
  useSectionSave,
} from "./formkit";

type GalleryShot = NonNullable<Project["gallery"]>[number];

export function ProjectsForm({ initial }: { initial: ProjectsContent }) {
  // Whole doc kept in state so caseStudy copy is preserved verbatim on every save.
  const [doc, setDoc] = useState<ProjectsContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("projects");

  const persistItems = async (items: Project[]) => {
    const next = { ...doc, items };
    setDoc(next);
    return save(next);
  };

  const validateItem = (p: Project): string | null => {
    for (const f of ["num", "slug", "name", "description", "repo"] as const) {
      if (!p[f]?.trim()) return `${f} is required.`;
    }
    if (!p.stack || p.stack.length === 0 || p.stack.some((s) => !s.trim()))
      return "at least one stack item is required.";
    return null;
  };

  return (
    <SectionShell title="Projects" docId="projects">
      <div className="mb-6 flex items-center gap-3 text-xs text-neutral-500">
        <span>Case-study labels are preserved automatically.</span>
        <SaveStatusText status={status} error={error} />
      </div>

      <CrudList<Project>
        items={doc.items}
        onPersist={persistItems}
        itemLabel="project"
        makeEmpty={() => ({
          num: "",
          slug: "",
          name: "",
          description: "",
          stack: [""],
          repo: "",
        })}
        validateItem={validateItem}
        renderRow={(p) => (
          <div className="truncate text-sm text-neutral-200">
            <span className="font-mono text-neutral-500">{p.num}</span>{" "}
            <span className="font-medium">{p.name || "—"}</span>
            <span className="ml-2 text-xs text-neutral-600">/{p.slug}</span>
          </div>
        )}
        renderForm={(draft, setDraft) => {
          const store = `projects/${draft.slug || "misc"}`;
          return (
            <>
              <div className="grid grid-cols-[6rem_1fr_1fr] gap-4">
                <Field label="Number">
                  <TextInput value={draft.num} onChange={(v) => setDraft((d) => ({ ...d, num: v }))} />
                </Field>
                <Field label="Name">
                  <TextInput value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                </Field>
                <Field label="Slug" hint="URL + storage folder">
                  <TextInput value={draft.slug} onChange={(v) => setDraft((d) => ({ ...d, slug: v }))} />
                </Field>
              </div>
              <Field label="Description">
                <TextArea
                  rows={2}
                  value={draft.description}
                  onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
                />
              </Field>
              <Field label="Stack">
                <StringList
                  values={draft.stack}
                  placeholder="Flutter"
                  onChange={(stack) => setDraft((d) => ({ ...d, stack }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Repository URL">
                  <TextInput value={draft.repo} onChange={(v) => setDraft((d) => ({ ...d, repo: v }))} />
                </Field>
                <Field label="Live URL" hint="optional">
                  <TextInput
                    value={draft.liveUrl ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, liveUrl: v }))}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Role" hint="optional">
                  <TextInput
                    value={draft.role ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, role: v }))}
                  />
                </Field>
                <Field label="Year" hint="optional">
                  <TextInput
                    value={draft.year ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, year: v }))}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Accent color" hint="hex, optional">
                  <TextInput
                    value={draft.accent ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, accent: v }))}
                  />
                </Field>
                <Field label="Theme color" hint="hex, optional">
                  <TextInput
                    value={draft.themeColor ?? ""}
                    onChange={(v) => setDraft((d) => ({ ...d, themeColor: v }))}
                  />
                </Field>
              </div>
              <ImageField
                label="Logo"
                hint="optional — contained on the card"
                value={draft.logo ?? ""}
                storagePath={store}
                onChange={(v) => setDraft((d) => ({ ...d, logo: v }))}
              />
              <ImageField
                label="Thumbnail image"
                hint="optional — cover-cropped card"
                value={draft.image ?? ""}
                storagePath={store}
                onChange={(v) => setDraft((d) => ({ ...d, image: v }))}
              />
              <ImageField
                label="Case-study hero image"
                hint="optional"
                value={draft.heroImage ?? ""}
                storagePath={store}
                onChange={(v) => setDraft((d) => ({ ...d, heroImage: v }))}
              />
              <Field label="Gallery" hint="optional — case-study screenshots">
                <InlineList<GalleryShot>
                  items={draft.gallery ?? []}
                  onChange={(gallery) => setDraft((d) => ({ ...d, gallery }))}
                  makeEmpty={() => ({ src: "", caption: "" })}
                  addLabel="screenshot"
                  render={(shot, update) => (
                    <>
                      <ImageField
                        label="Image"
                        value={shot.src}
                        storagePath={store}
                        onChange={(v) => update({ src: v })}
                      />
                      <TextInput
                        value={shot.caption}
                        placeholder="Caption"
                        onChange={(v) => update({ caption: v })}
                      />
                    </>
                  )}
                />
              </Field>
            </>
          );
        }}
      />
    </SectionShell>
  );
}
