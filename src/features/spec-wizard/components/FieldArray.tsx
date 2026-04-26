"use client";

type FieldArrayProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
};

export function FieldArray({ label, values, onChange }: FieldArrayProps) {
  const normalizedValues = values.length > 0 ? values : [""];

  return (
    <div className="field">
      <label>{label}</label>
      {normalizedValues.map((value, index) => (
        <input
          aria-label={`${label} ${index + 1}`}
          key={index}
          value={value}
          onChange={(event) => {
            const next = [...normalizedValues];
            next[index] = event.target.value;
            onChange(next);
          }}
        />
      ))}
      <button className="secondary" type="button" onClick={() => onChange([...normalizedValues, ""])}>
        +
      </button>
    </div>
  );
}
