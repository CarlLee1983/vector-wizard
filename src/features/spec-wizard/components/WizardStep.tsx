"use client";

export function WizardStep({ title, method, children }: { title: string; method?: string; children: React.ReactNode }) {
  return (
    <section className="panel stack">
      <div>
        <h2>{title}</h2>
        {method ? <small>{method}</small> : null}
      </div>
      {children}
    </section>
  );
}
