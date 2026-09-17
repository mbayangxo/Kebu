"use client";

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

type ButtonProps = ButtonBaseProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { children: ReactNode; href?: never };
type LinkButtonProps = ButtonBaseProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & { href: string; children: ReactNode };

const SIZE_STYLES: Record<Size, { padding: string; fontSize: string; height: string; gap: string }> = {
  xs: { padding: "0 10px", fontSize: "0.625rem", height: "26px", gap: "4px" },
  sm: { padding: "0 14px", fontSize: "0.6875rem", height: "32px", gap: "5px" },
  md: { padding: "0 18px", fontSize: "0.75rem",   height: "38px", gap: "6px" },
  lg: { padding: "0 24px", fontSize: "0.875rem",  height: "46px", gap: "8px" },
};

const VARIANT_STYLES: Record<Variant, { background: string; color: string; border: string; hoverFilter?: string }> = {
  primary:   { background: KEBU.orange, color: KEBU.white, border: "none", hoverFilter: "brightness(1.08)" },
  secondary: { background: KEBU.black,  color: KEBU.white, border: "none", hoverFilter: "brightness(1.15)" },
  ghost:     { background: "transparent", color: KEBU.black, border: "none" },
  danger:    { background: KEBU.red, color: KEBU.white, border: "none", hoverFilter: "brightness(1.08)" },
  outline:   { background: "transparent", color: KEBU.black, border: `1px solid ${KEBU.border}` },
};

function buildStyle(variant: Variant, size: Size, fullWidth?: boolean) {
  const s = SIZE_STYLES[size];
  const v = VARIANT_STYLES[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    padding: s.padding,
    height: s.height,
    fontSize: s.fontSize,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    borderRadius: KEBU.radius.full,
    border: v.border,
    background: v.background,
    color: v.color,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
    transition: `filter ${KEBU.duration.fast} ${KEBU.ease.smooth}, opacity ${KEBU.duration.fast} ${KEBU.ease.smooth}`,
    width: fullWidth ? "100%" : undefined,
    fontFamily: "var(--font-jost, system-ui, sans-serif)",
  };
}

function ButtonInner({
  loading,
  leadingIcon,
  trailingIcon,
  children,
}: {
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M12 2a10 10 0 0 1 10 10" style={{ animation: "spin 0.8s linear infinite" }} />
        </svg>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span>Loading…</span>
      </>
    );
  }
  return (
    <>
      {leadingIcon}
      {children}
      {trailingIcon}
    </>
  );
}

export function KebuButton({
  variant = "primary",
  size = "md",
  loading,
  leadingIcon,
  trailingIcon,
  fullWidth,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...buildStyle(variant, size, fullWidth),
        opacity: disabled || loading ? 0.55 : 1,
        ...style,
      }}
    >
      <ButtonInner loading={loading} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </ButtonInner>
    </button>
  );
}

export function KebuLinkButton({
  variant = "primary",
  size = "md",
  loading,
  leadingIcon,
  trailingIcon,
  fullWidth,
  href,
  children,
  style,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      {...(props as object)}
      style={{
        ...buildStyle(variant, size, fullWidth),
        ...style,
      }}
    >
      <ButtonInner loading={loading} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </ButtonInner>
    </Link>
  );
}

/** Icon-only circular button */
export function KebuIconButton({
  variant = "ghost",
  size = "md",
  label,
  children,
  style,
  disabled,
  ...props
}: Omit<ButtonProps, "children" | "leadingIcon" | "trailingIcon" | "fullWidth"> & {
  label: string;
  children: ReactNode;
}) {
  const s = SIZE_STYLES[size];
  const v = VARIANT_STYLES[variant];
  const dim = s.height;
  return (
    <button
      {...props}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: dim,
        height: dim,
        borderRadius: "50%",
        border: v.border,
        background: v.background,
        color: v.color,
        cursor: "pointer",
        transition: `filter ${KEBU.duration.fast} ${KEBU.ease.smooth}`,
        opacity: disabled ? 0.55 : 1,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
