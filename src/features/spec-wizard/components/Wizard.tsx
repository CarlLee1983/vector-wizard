"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import { createEmptyDraft } from "../model/defaultDraft";
import type { FeatureDraft } from "../model/specTypes";
import { draftFromJson, loadDraft, saveDraft } from "../persistence/draftStorage";
import { FieldArray } from "./FieldArray";
import { ReviewPanel } from "./ReviewPanel";
import { WizardStep } from "./WizardStep";

const steps = ["basic", "goal", "context", "deliverables", "stories", "criteria", "examples", "boundaries", "review"] as const;
type Step = (typeof steps)[number];

function updateStory(draft: FeatureDraft, patch: Partial<FeatureDraft["epics"][number]["stories"][number]>): FeatureDraft {
  return {
    ...draft,
    epics: draft.epics.map((epic, epicIndex) =>
      epicIndex === 0
        ? {
            ...epic,
            stories: epic.stories.map((story, storyIndex) => (storyIndex === 0 ? { ...story, ...patch } : story))
          }
        : epic
    )
  };
}

export function Wizard() {
  const { locale, setLocale, t } = useI18n();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<FeatureDraft>(() => createEmptyDraft(locale));

  useEffect(() => {
    const stored = loadDraft();
    if (stored) setDraft(stored);
  }, []);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const step = steps[stepIndex];
  const firstStory = draft.epics[0].stories[0];

  const content = useMemo(() => {
    if (step === "basic") {
      return (
        <WizardStep title="基本資訊">
          <div className="field">
            <label htmlFor="title">{t("field.title")}</label>
            <input id="title" value={draft.metadata.title} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, title: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="owner">{t("field.owner")}</label>
            <input id="owner" value={draft.metadata.owner} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, owner: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="locale">Language</label>
            <select
              id="locale"
              value={locale}
              onChange={(event) => {
                const nextLocale = event.target.value as FeatureDraft["metadata"]["locale"];
                setLocale(nextLocale);
                setDraft({ ...draft, metadata: { ...draft.metadata, locale: nextLocale } });
              }}
            >
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="draftImport">{t("wizard.importDraft")}</label>
            <input
              id="draftImport"
              type="file"
              accept="application/json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setDraft(draftFromJson(await file.text()));
              }}
            />
          </div>
        </WizardStep>
      );
    }

    if (step === "goal") {
      return (
        <WizardStep title="目標與影響" method="Impact Mapping">
          <div className="field">
            <label htmlFor="problem">{t("field.problem")}</label>
            <textarea id="problem" value={draft.summary.problem} onChange={(event) => setDraft({ ...draft, summary: { ...draft.summary, problem: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="desiredOutcome">{t("field.desiredOutcome")}</label>
            <textarea id="desiredOutcome" value={draft.summary.desiredOutcome} onChange={(event) => setDraft({ ...draft, summary: { ...draft.summary, desiredOutcome: event.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="goal">{t("field.goal")}</label>
            <textarea id="goal" value={draft.goal.statement} onChange={(event) => setDraft({ ...draft, goal: { ...draft.goal, statement: event.target.value } })} />
          </div>
          <FieldArray label={t("field.successSignals")} values={draft.goal.successSignals} onChange={(successSignals) => setDraft({ ...draft, goal: { ...draft.goal, successSignals } })} />
        </WizardStep>
      );
    }

    if (step === "stories") {
      return (
        <WizardStep title="使用者故事" method="Story Mapping">
          <div className="field">
            <label htmlFor="storyTitle">{t("field.storyTitle")}</label>
            <input id="storyTitle" value={firstStory.title} onChange={(event) => setDraft(updateStory(draft, { title: event.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="userStory">{t("field.userStory")}</label>
            <textarea id="userStory" value={firstStory.userStory} onChange={(event) => setDraft(updateStory(draft, { userStory: event.target.value }))} />
          </div>
        </WizardStep>
      );
    }

    if (step === "boundaries") {
      return (
        <WizardStep title="限制、非目標與風險">
          <div className="field">
            <label htmlFor="constraints">{t("field.constraints")}</label>
            <textarea id="constraints" value={draft.agentBoundaries.constraints[0] ?? ""} onChange={(event) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, constraints: [event.target.value] } })} />
          </div>
          <div className="field">
            <label htmlFor="nonGoals">{t("field.nonGoals")}</label>
            <textarea id="nonGoals" value={draft.agentBoundaries.nonGoals[0] ?? ""} onChange={(event) => setDraft({ ...draft, agentBoundaries: { ...draft.agentBoundaries, nonGoals: [event.target.value] } })} />
          </div>
        </WizardStep>
      );
    }

    if (step === "review") return <ReviewPanel draft={draft} />;

    return (
      <WizardStep title="可選補充" method={step === "criteria" || step === "examples" ? "Specification by Example" : "Story Mapping"}>
        <p>此步驟可先略過；MVP 允許稍後補充。</p>
      </WizardStep>
    );
  }, [draft, firstStory.title, firstStory.userStory, locale, setLocale, step, t]);

  return (
    <div className="stack">
      <header>
        <h1>{t("wizard.title")}</h1>
        <p>{t("wizard.subtitle")}</p>
      </header>
      {content}
      <nav className="button-row">
        <button className="secondary" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
          {t("wizard.previous")}
        </button>
        {stepIndex < steps.length - 1 ? (
          <button type="button" onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
            {stepIndex === steps.length - 2 ? t("wizard.review") : t("wizard.next")}
          </button>
        ) : null}
      </nav>
    </div>
  );
}
