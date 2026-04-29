"use client"

import { useI18n } from "../i18n/I18nContext"
import type { RaidEntry, RaidStatus } from "../model/specTypes"

const STATUS_OPTIONS: RaidStatus[] = ["open", "validating", "validated", "invalidated"]

type RaidArrayProps = {
  label: string
  idPrefix: "R" | "Q"
  allowMitigation: boolean
  help?: string
  helpId?: string
  placeholder?: string
  entries: RaidEntry[]
  onChange: (entries: RaidEntry[]) => void
}

function nextId(prefix: "R" | "Q", entries: RaidEntry[]): string {
  const existingNumbers = entries
    .map((entry) => {
      const match = entry.id.match(/^[RQ]-(\d+)$/)
      return match ? Number.parseInt(match[1], 10) : 0
    })
    .filter((n) => Number.isFinite(n) && n > 0)
  const max = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  return `${prefix}-${String(max + 1).padStart(3, "0")}`
}

export function RaidArray({
  label,
  idPrefix,
  allowMitigation,
  help,
  helpId,
  placeholder,
  entries,
  onChange
}: RaidArrayProps) {
  const { t } = useI18n()

  function patch(index: number, partial: Partial<RaidEntry>) {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, ...partial } : entry)))
  }

  return (
    <div className="field stack">
      <span>{label}</span>
      {help ? <small id={helpId}>{help}</small> : null}
      <div className="stack" aria-describedby={helpId}>
        {entries.map((entry, index) => (
          <div key={entry.id} className="raid-row stack">
            <label className="stack">
              <span>{t("field.raidId")}</span>
              <input type="text" value={entry.id} onChange={(event) => patch(index, { id: event.target.value })} />
            </label>
            <label className="stack">
              <span>{`${label} ${index + 1}`}</span>
              <input
                type="text"
                aria-label={`${label} ${index + 1}`}
                placeholder={placeholder}
                value={entry.text}
                onChange={(event) => patch(index, { text: event.target.value })}
              />
            </label>
            <label className="stack">
              <span>{t("field.raidStatus")}</span>
              <small>{t("field.raidStatusHelp")}</small>
              <select
                aria-label={`Status ${entry.id}`}
                value={entry.status}
                onChange={(event) => patch(index, { status: event.target.value as RaidStatus })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {t(`raidStatus.${status}` as const)}
                  </option>
                ))}
              </select>
            </label>
            {allowMitigation ? (
              <label className="stack">
                <span>{t("field.riskMitigation")}</span>
                <small>{t("field.riskMitigationHelp")}</small>
                <textarea
                  aria-label={`${t("field.riskMitigation")} ${entry.id}`}
                  placeholder={t("field.riskMitigationPlaceholder")}
                  value={entry.mitigation ?? ""}
                  onChange={(event) => {
                    const next = event.target.value
                    patch(index, { mitigation: next.trim() === "" ? undefined : next })
                  }}
                />
              </label>
            ) : null}
            <button
              type="button"
              className="secondary"
              aria-label={`Remove ${entry.id}`}
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              −
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => onChange([...entries, { id: nextId(idPrefix, entries), text: "", status: "open" }])}
        >
          + {t("wizard.addItem")}
        </button>
      </div>
    </div>
  )
}
