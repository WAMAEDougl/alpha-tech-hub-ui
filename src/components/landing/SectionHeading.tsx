import type { ReactNode } from "react";

/** One heading style for every section: left-aligned title, a short plain sentence beside it, a hairline underneath. */
export default function SectionHeading({ title, intro, action }: { title: ReactNode; intro?: string; action?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h2 className="text-3xl md:text-[2.5rem] leading-[1.1] font-heading">{title}</h2>
        {intro && <p className="max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">{intro}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
