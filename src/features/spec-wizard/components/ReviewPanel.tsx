"use client";

import { useMemo, useState } from "react";
import type { FeatureDraft } from "../model/specTypes";
import { validateDraft } from "../model/validation";
import { buildHumanSummary } from "../services/summary";
import { draftToYaml } from "../services/yamlSerializer";
import { draftToJson } from "../persistence/draftStorage";
import { useI18n } from "../i18n/I18nContext";

type ReviewPanelProps = {
  draft: FeatureDraft;
};

export function ReviewPanel({ draft }: ReviewPanelProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"summary" | "yaml">("summary");
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const summary = useMemo(() => buildHumanSummary(draft), [draft]);
  const yaml = useMemo(() => draftToYaml(draft), [draft]);

  return (
    <section className="panel stack">
      <h2>{t("wizard.review")}</h2>
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
        <button type="button" disabled={validation.blockingErrors.length > 0} onClick={() => navigator.clipboard?.writeText(yaml)}>
          {t("wizard.copyYaml")}
        </button>
        <a href={`data:text/yaml;charset=utf-8,${encodeURIComponent(yaml)}`} download={`${draft.metadata.title || "feature-spec"}.yaml`}>
          {t("wizard.exportYaml")}
        </a>
        <a href={`data:application/json;charset=utf-8,${encodeURIComponent(draftToJson(draft))}`} download={`${draft.metadata.title || "feature-draft"}.json`}>
          {t("wizard.exportDraft")}
        </a>
      </div>
      <pre>{tab === "summary" ? summary : yaml}</pre>
    </section>
  );
}
