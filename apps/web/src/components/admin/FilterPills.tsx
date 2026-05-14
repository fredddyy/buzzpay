"use client";

interface FilterPillsProps {
  options: { label: string; value: string }[];
  selected: string;
  onChange: (value: string) => void;
}

export default function FilterPills({ options, selected, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
          style={{
            background: selected === o.value ? "var(--color-primary-surface)" : "transparent",
            color: selected === o.value ? "var(--color-primary)" : "var(--color-text-muted)",
            border: `1px solid ${selected === o.value ? "var(--color-primary-border)" : "var(--color-border)"}`,
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
