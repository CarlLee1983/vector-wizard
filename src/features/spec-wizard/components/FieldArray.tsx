"use client"

import { useI18n } from "../i18n/I18nContext"

type FieldArrayProps = {
  label: string
  help?: string
  helpId?: string
  placeholder?: string
  values: string[]
  onChange: (values: string[]) => void
}

export function FieldArray({ label, help, helpId, placeholder, values, onChange }: FieldArrayProps) {
  const { t } = useI18n()
  const normalizedValues = values.length > 0 ? values : [""]
  const describedBy = help ? helpId : undefined

  return (
    <div className="field">
      <label>{label}</label>
      {help ? <small id={helpId}>{help}</small> : null}
      {normalizedValues.map((value, index) => (
        <input
          aria-describedby={describedBy}
          aria-label={`${label} ${index + 1}`}
          key={index}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const next = [...normalizedValues]
            next[index] = event.target.value
            onChange(next)
          }}
        />
      ))}
      <div className="button-row">
        <button className="secondary" type="button" onClick={() => onChange([...normalizedValues, ""])}>
          + {t("wizard.addItem")}
        </button>
      </div>
    </div>
  )
}
