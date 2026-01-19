import React from "react";
import type { ButtonVariant } from "./Button";
import { cx } from "./utils";

const iconVariantClasses: Record<ButtonVariant, string> = {
  primary: "text-primary-600 hover:bg-primary-50",
  secondary: "text-gray-600 hover:bg-gray-100",
  danger: "text-red-600 hover:bg-red-50",
  ghost: "text-gray-500 hover:bg-gray-100",
  outline: "text-gray-600 hover:bg-gray-100",
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function IconButton({
  variant = "ghost",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-lg p-2 transition-colors",
        iconVariantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
