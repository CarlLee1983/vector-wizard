"use client"

import { useMemo, useState } from "react"
import type { FeatureDraft } from "../model/specTypes"
import { validateDraft } from "../model/validation"
import { buildHumanSummary } from "../services/summary"
import { draftToYaml } from "../services/yamlSerializer"
import { draftToJson } from "../persistence/draftStorage"
import { buildReviewPrompt } from "../services/reviewPromptBuilder"
import { useI18n } from "../i18n/I18nContext"

type ReviewPanelProps = {
  draft: FeatureDraft
}

export function ReviewPanel({ draft }: ReviewPanelProps) {
  const { t } = useI18n()
  const [tab, setTab] = useState<"summary" | "yaml">("summary")
  const validation = useMemo(() => validateDraft(draft), [draft])
  const canExportYaml = validation.blockingErrors.length === 0
  const summary = useMemo(() => buildHumanSummary(draft), [draft])
  const yaml = useMemo(() => draftToYaml(draft), [draft])
  const reviewPrompt = useMemo(
    () => buildReviewPrompt({ yaml, summary, locale: draft.metadata.locale }),
    [yaml, summary, draft.metadata.locale]
  )

  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle")
  const [handoffState, setHandoffState] = useState<"idle" | "pending" | "success" | "failed">("idle")

  async function handleCopyReviewPrompt() {
    try {
      await navigator.clipboard.writeText(reviewPrompt)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 2000)
    } catch {
      setCopyState("failed")
    }
  }

  async function handleHandoff() {
    setHandoffState("pending")
    try {
      const response = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yaml,
          title: draft.metadata.title
        })
      })

      if (!response.ok) throw new Error("Handoff failed")
      
      setHandoffState("success")
      setTimeout(() => setHandoffState("idle"), 3000)
    } catch (error) {
      console.error(error)
      setHandoffState("failed")
      setTimeout(() => setHandoffState("idle"), 3000)
    }
  }

  const reviewButtonLabel =
    copyState === "copied"
      ? t("reviewPrompt.button.copied")
      : copyState === "failed"
        ? t("reviewPrompt.button.failed")
        : t("reviewPrompt.button.idle")

  const handoffButtonLabel =
    handoffState === "pending"
      ? t("handoff.button.pending")
      : handoffState === "success"
        ? t("handoff.button.success")
        : handoffState === "failed"
          ? t("handoff.button.failed")
          : t("handoff.button.idle")

  return (
    <section className="panel stack">
      <div>
        <h2>{t("wizard.review")}</h2>
        <p className="section-help">{t("wizard.reviewHelp")}</p>
      </div>
      {validation.blockingErrors.length > 0 ? (
        <div className="error">
          {validation.blockingErrors.map((issue) => (
            <p key={issue.code}>{issue.message || (issue.messageKey && t(issue.messageKey))}</p>
          ))}
        </div>
      ) : null}
      {validation.warnings.length > 0 ? (
        <div className="warning">
          {validation.warnings.map((issue, index) => (
            <p key={`${issue.code}-${index}`}>{issue.message || (issue.messageKey && t(issue.messageKey))}</p>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <button
          className={`secondary ${tab === "summary" ? "active" : ""}`}
          type="button"
          onClick={() => setTab("summary")}
        >
          {t("review.summary")}
        </button>
        <button
          className={`secondary ${tab === "yaml" ? "active" : ""}`}
          type="button"
          aria-label="YAML"
          onClick={() => setTab("yaml")}
        >
          {t("review.yaml")}
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" disabled={!canExportYaml} onClick={() => navigator.clipboard?.writeText(yaml)}>
          {t("wizard.copyYaml")}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!canExportYaml || handoffState === "pending"}
          onClick={handleHandoff}
        >
          {handoffButtonLabel}
        </button>
        <a
          className={!canExportYaml ? "disabled" : ""}
          aria-disabled={!canExportYaml ? "true" : undefined}
          href={canExportYaml ? `data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}` : undefined}
          download={canExportYaml ? `${draft.metadata.title || "feature-spec"}.yaml` : undefined}
          onClick={(event) => {
            if (!canExportYaml) event.preventDefault()
          }}
        >
          {t("wizard.exportYaml")}
        </a>
        <a
          className="secondary"
          href={`data:application/json;charset=utf-8,${encodeURIComponent(draftToJson(draft))}`}
          download={`${draft.metadata.title || "feature-draft"}.json`}
        >
          {t("wizard.exportDraft")}
        </a>
      </div>

      {tab === "summary" ? (
        <div className="report-view">
          <div className="report-view-content">
            <h1>{draft.metadata.title || "Untitled Feature"}</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>
              Owner: {draft.metadata.owner || "Unassigned"}
            </p>

            <section>
              <h2>Problem</h2>
              <p>{draft.summary.problem || "No problem statement provided."}</p>
            </section>

            <section>
              <h2>Desired Outcome</h2>
              <p>{draft.summary.desiredOutcome || "No desired outcome provided."}</p>
            </section>

            <section>
              <h2>Goal</h2>
              <p>{draft.goal.statement || "No goal provided."}</p>
            </section>

            <section>
              <h2>Success Signals</h2>
              <ul>
                {draft.goal.successSignals.map((signal, i) => (
                  <li key={i}>{signal}</li>
                ))}
                {draft.goal.successSignals.length === 0 && <li>No success signals provided</li>}
              </ul>
            </section>

            <section>
              <h2>Stories</h2>
              <ul>
                {draft.epics[0].stories.map((story, i) => (
                  <li key={i}>{story.title || story.userStory || "Untitled Story"}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Constraints</h2>
              <ul>
                {draft.agentBoundaries.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
                {draft.agentBoundaries.constraints.length === 0 && <li>No constraints provided</li>}
              </ul>
            </section>

            <section>
              <h2>Non-goals</h2>
              <ul>
                {draft.agentBoundaries.nonGoals.map((ng, i) => (
                  <li key={i}>{ng}</li>
                ))}
                {draft.agentBoundaries.nonGoals.length === 0 && <li>No non-goals provided</li>}
              </ul>
            </section>
          </div>
        </div>

      ) : (
        <pre className="yaml-view">{yaml}</pre>
      )}

      <div className="ai-review-section">

        <h3>{t("reviewPrompt.section.title")}</h3>
        <p className="section-help">{t("reviewPrompt.section.description")}</p>
        <button type="button" onClick={handleCopyReviewPrompt}>
          {reviewButtonLabel}
        </button>
        {copyState === "failed" ? (
          <label className="stack">
            <span>{t("reviewPrompt.fallback.label")}</span>
            <textarea readOnly value={reviewPrompt} rows={10} />
          </label>
        ) : null}
      </div>
    </section>
  )
}
