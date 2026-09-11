"use client";

import { ReactNode } from "react";

/** Unified load / error / empty / content shell for every shop panel. */
export function PanelShell({
  loading,
  error,
  empty,
  emptyMessage = "Nothing here yet.",
  emptyAction,
  children,
  className,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={`panel-shell-loading ${className ?? ""}`}>
        <div className="panel-shell-spinner" aria-label="Loading…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`panel-shell-error ${className ?? ""}`}>
        <p className="panel-shell-error-msg">{error}</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`panel-shell-empty ${className ?? ""}`}>
        <p className="panel-shell-empty-msg">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}

/** Inline save-error banner displayed under a form. */
export function SaveErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="save-error-banner">{error}</p>;
}

/** Consistent "Table not ready" notice when a migration hasn't run yet. */
export function TableNotReadyBanner({ migration }: { migration: string }) {
  return (
    <div className="table-not-ready-banner">
      This feature needs a database migration. Ask Kebu support to run{" "}
      <code>{migration}</code>.
    </div>
  );
}
