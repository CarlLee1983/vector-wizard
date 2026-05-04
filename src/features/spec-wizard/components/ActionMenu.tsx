"use client"

import { useI18n } from "../i18n/I18nContext"
import { getActionsForStep, type ActionStepId } from "../services/localAgent/actionRegistry"
import type { MessageKey } from "../i18n/messageKeys"

export type ActionMenuProps = {
  step: ActionStepId
  onRun: (actionId: string) => void
  isRunning: boolean
}

export function ActionMenu({ step, onRun, isRunning }: ActionMenuProps) {
  const { t } = useI18n()
  const actions = getActionsForStep(step)
  if (actions.length === 0) {
    return <p className="action-menu__empty">{t("actionPanel.empty")}</p>
  }
  return (
    <ul className="action-menu">
      {actions.map((a) => (
        <li key={a.id}>
          <button type="button" disabled={isRunning} onClick={() => onRun(a.id)}>
            {t(a.labelKey as MessageKey)}
          </button>
          <small>{t(a.helpKey as MessageKey)}</small>
        </li>
      ))}
    </ul>
  )
}
