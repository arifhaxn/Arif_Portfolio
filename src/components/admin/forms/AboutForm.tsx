"use client";

import { useState } from "react";
import type {
  AboutContent,
  HeadingLine,
  HeadingSegment,
  SkillGroup,
} from "@/lib/content-types";
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

export function AboutForm({ initial }: { initial: AboutContent }) {
  const [doc, setDoc] = useState<AboutContent>(() => structuredClone(initial));
  const { status, error, save } = useSectionSave("about");

  return (
    <SectionShell title="About" docId="about">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(doc);
        }}
        className="flex flex-col gap-5"
      >
        <Field
          label="Description heading"
          hint="each block is a line; mark a segment 'accent' for the blue words"
        >
          <InlineList<HeadingLine>
            items={doc.descriptionHeading}
            onChange={(descriptionHeading) => setDoc((d) => ({ ...d, descriptionHeading }))}
            makeEmpty={() => ({ segments: [{ text: "" }] })}
            addLabel="line"
            render={(line, updateLine) => (
              <InlineList<HeadingSegment>
                items={line.segments}
                onChange={(segments) => updateLine({ segments })}
                makeEmpty={() => ({ text: "" })}
                addLabel="segment"
                render={(seg, updateSeg) => (
                  <div className="flex items-center gap-3">
                    <TextInput
                      value={seg.text}
                      placeholder="text"
                      onChange={(v) => updateSeg({ text: v })}
                    />
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-400">
                      <input
                        type="checkbox"
                        checked={!!seg.accent}
                        onChange={(e) => updateSeg({ accent: e.target.checked })}
                      />
                      accent
                    </label>
                  </div>
                )}
              />
            )}
          />
        </Field>

        <Field label="Bio">
          <TextArea rows={5} value={doc.bio} onChange={(v) => setDoc((d) => ({ ...d, bio: v }))} />
        </Field>

        <Field label="Skills eyebrow">
          <TextInput
            value={doc.skillsEyebrow}
            onChange={(v) => setDoc((d) => ({ ...d, skillsEyebrow: v }))}
          />
        </Field>

        <Field label="Skill groups">
          <InlineList<SkillGroup>
            items={doc.skills}
            onChange={(skills) => setDoc((d) => ({ ...d, skills }))}
            makeEmpty={() => ({ label: "", items: [""] })}
            addLabel="group"
            render={(group, update) => (
              <div className="flex flex-col gap-3">
                <TextInput
                  value={group.label}
                  placeholder="Group label (e.g. Languages)"
                  onChange={(v) => update({ label: v })}
                />
                <StringList
                  values={group.items}
                  placeholder="skill"
                  onChange={(items) => update({ items })}
                />
              </div>
            )}
          />
        </Field>

        <div className="rounded-md border border-neutral-800 p-4">
          <div className="mb-3 text-sm font-medium text-neutral-300">Hero status HUD</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Location">
              <TextInput
                value={doc.heroStatus.location}
                onChange={(v) =>
                  setDoc((d) => ({ ...d, heroStatus: { ...d.heroStatus, location: v } }))
                }
              />
            </Field>
            <Field label="Availability">
              <TextInput
                value={doc.heroStatus.availability}
                onChange={(v) =>
                  setDoc((d) => ({ ...d, heroStatus: { ...d.heroStatus, availability: v } }))
                }
              />
            </Field>
            <Field label="Timezone" hint="IANA">
              <TextInput
                value={doc.heroStatus.timeZone}
                onChange={(v) =>
                  setDoc((d) => ({ ...d, heroStatus: { ...d.heroStatus, timeZone: v } }))
                }
              />
            </Field>
            <Field label="Scroll cue">
              <TextInput
                value={doc.heroStatus.scrollCue}
                onChange={(v) =>
                  setDoc((d) => ({ ...d, heroStatus: { ...d.heroStatus, scrollCue: v } }))
                }
              />
            </Field>
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
