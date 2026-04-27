"use client"

export function WizardStep({ title, method, children }: { title: string; method?: string; children: React.ReactNode }) {
  return (
    <section className="panel stack">
      <div>
        {method ? <span className="method-tag">{method}</span> : null}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}
