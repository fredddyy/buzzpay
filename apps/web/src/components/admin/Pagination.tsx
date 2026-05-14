"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase = "min-w-[32px] h-8 rounded-lg text-[12px] font-medium transition-colors flex items-center justify-center";

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
        {total} result{total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className={btnBase + " px-2 disabled:opacity-30"}
          style={{ color: "var(--color-text-secondary)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-[12px]" style={{ color: "var(--color-text-muted)" }}>...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)}
              className={btnBase}
              style={{
                background: p === page ? "var(--color-primary)" : "transparent",
                color: p === page ? "white" : "var(--color-text-secondary)",
              }}>
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className={btnBase + " px-2 disabled:opacity-30"}
          style={{ color: "var(--color-text-secondary)" }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
