"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

type TouchTargetProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: "button" | "div" | "span";
  children: ReactNode;
};

/**
 * Wraps any interactive element to ensure a minimum 44×44px tap target.
 * A zero-opacity ::after overlay centered on the element expands the hit area
 * without affecting visual size or sibling layout.
 */
export function TouchTarget({ as: Tag = "button", children, className = "", ...rest }: TouchTargetProps) {
  return (
    // @ts-expect-error — polymorphic `as` prop
    <Tag {...rest} className={`relative inline-flex items-center justify-center ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "max(100%, 44px)",
          height: "max(100%, 44px)",
        }}
      />
    </Tag>
  );
}
