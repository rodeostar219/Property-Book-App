import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: string;
  description: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-title">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
        {meta ? <small>{meta}</small> : null}
      </div>
      {actions ? <div className="page-title-actions">{actions}</div> : null}
    </section>
  );
}
