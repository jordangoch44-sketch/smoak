"use client";

import { useState } from "react";

interface AdminCollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AdminCollapsible({
  title,
  defaultOpen = false,
  children,
}: AdminCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="admin-collapsible" data-open={open || undefined}>
      <button
        type="button"
        className="admin-collapsible__trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="admin-collapsible__chevron" aria-hidden />
      </button>
      <div className="admin-collapsible__body">{children}</div>
    </div>
  );
}
