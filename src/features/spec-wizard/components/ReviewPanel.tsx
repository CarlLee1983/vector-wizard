"use client";

import { useMemo, useState } from "react";
import type { FeatureDraft } from "../model/specTypes";
import { validateDraft } from "../model/validation";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";
import { draftToJson } from "../persistence/draftStorage";
import { buildReviewPrompt } from "../services/reviewPromptBuilder";
import { useI18n } from "../i18n/I18nContext";

type ReviewPanelProps = {
  draft: FeatureDraft;
};

export function ReviewPanel({ draft }: ReviewPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"summary" | "yaml">("summary");
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const canExportYaml = validation.blockingErrors.length === 0;
  const summary = useMemo(() => buildHumanSummary(draft), [draft]);
  const yaml = useMemo(() => draftToYaml(draft), [draft]);
  const reviewPrompt = useMemo(
    () => buildReviewPrompt({ yaml, summary, locale: draft.metadata.locale }),
    [yaml, summary, draft.metadata.locale]
  );

  return (
    <section className="panel stack">
      <div>
        <h2>{t("wizard.review")}</h2>
        <p className="section-help">{t("wizard.reviewHelp")}</p>
      </div>
      {validation.blockingErrors.length > 0 ? (
        <div className="error">
          {validation.blockingErrors.map((issue) => (
            <p key={issue.code}>{t(issue.messageKey as never)}</p>
          ))}
        </div>
      ) : null}
      {validation.warnings.length > 0 ? (
        <div className="warning">
          {validation.warnings.map((issue, index) => (
            <p key={`${issue.code}-${index}`}>{t(issue.messageKey as never)}</p>
          ))}
        </div>
      ) : null}
      <div className="button-row">
        <button className="secondary" type="button" onClick={() => setTab("summary")}>Summary</button>
        <button className="secondary" type="button" onClick={() => setTab("yaml")}>YAML</button>
        <button type="button" disabled={!canExportYaml} onClick={() => navigator.clipboard?.writeText(yaml)}>
          {t("wizard.copyYaml")}
        </button>
        <a
          aria-disabled={!canExportYaml}
          href={canExportYaml ? `data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}` : undefined}
          download={canExportYaml ? `${draft.metadata.title || "feature-spec"}.yaml` : undefined}
          onClick={(event) => {
            if (!canExportYaml) event.preventDefault();
          }}
        >
          {t("wizard.exportYaml")}
        </a>
        <a href={`data:application/json;charset=utf-8,${encodeURIComponent(draftToJson(draft))}`} download={`${draft.metadata.title || "feature-draft"}.json`}>
          {t("wizard.exportDraft")}
        </a>
      </div>
      <pre>{tab === "summary" ? summary : yaml}</pre>
      <div className="ai-review-section">
        <h3>{t("reviewPrompt.section.title")}</h3>
        <p className="section-help">{t("reviewPrompt.section.description")}</p>
        <button type="button">
          {t("reviewPrompt.button.idle")}
        </button>
      </div>
    </section>
  );
}
