"use client"

import { useI18n } from "../i18n/I18nContext"
import type { ActionResult } from "../services/localAgent/actionResult"

export type ActionResultCardProps = {
  result: ActionResult
  onAdopt: (result: ActionResult) => void
  onDiscard: () => void
  onRetry?: () => void
}

export function ActionResultCard({ result, onAdopt, onDiscard, onRetry }: ActionResultCardProps) {
  const { t } = useI18n()
  if (result.kind === "preview") {
    return (
      <article className="action-card action-card--preview" data-action-id={result.actionId}>
        <header className="action-card__header">{result.actionId}</header>
        <div className="action-card__preview-text">{result.preview.text}</div>
        <div className="action-card__target">{result.preview.targetPath}</div>
        <footer className="action-card__actions">
          <button type="button" onClick={() => onAdopt(result)}>
            {t("actionPanel.card.adopt")}
          </button>
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.discard")}
          </button>
        </footer>
      </article>
    )
  }
  if (result.kind === "notes") {
    return (
      <article className="action-card action-card--notes" data-action-id={result.actionId}>
        <header className="action-card__header">{result.actionId}</header>
        <ul className="action-card__notes">
          {result.notes.map((n, idx) => (
            <li key={idx} data-severity={n.severity}>
              {n.text}
              {n.ref ? <code className="action-card__ref">{n.ref}</code> : null}
            </li>
          ))}
        </ul>
        <footer className="action-card__actions">
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.dismiss")}
          </button>
        </footer>
      </article>
    )
  }
  if (result.kind === "parse_error") {
    return (
      <article className="action-card action-card--error" data-action-id={result.actionId}>
        <header className="action-card__header">⚠️ {t("actionPanel.card.parseError")}</header>
        <details>
          <summary>{result.actionId}</summary>
          <pre>{result.raw}</pre>
        </details>
        <footer className="action-card__actions">
          <button type="button" onClick={onDiscard}>
            {t("actionPanel.card.discard")}
          </button>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              {t("actionPanel.card.retry")}
            </button>
          ) : null}
        </footer>
      </article>
    )
  }
  return (
    <article className="action-card action-card--error" data-action-id={result.actionId}>
      <header className="action-card__header">⚠️ {t("actionPanel.card.runError")}</header>
      <p>{result.message}</p>
      <footer className="action-card__actions">
        <button type="button" onClick={onDiscard}>
          {t("actionPanel.card.discard")}
        </button>
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            {t("actionPanel.card.retry")}
          </button>
        ) : null}
      </footer>
    </article>
  )
}
