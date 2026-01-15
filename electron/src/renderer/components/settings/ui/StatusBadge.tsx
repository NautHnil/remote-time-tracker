interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const colors = {
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    warning:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    error: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    info: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    neutral: "bg-gray-100 text-gray-700 dark:bg-gray-600/50 dark:text-gray-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors[status]}`}
    >
      {children}
    </span>
  );
}
