interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "orange" | "purple";
}

export function StatCard({
  label,
  value,
  icon,
  color = "blue",
}: StatCardProps) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br p-[1px]">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-10 dark:opacity-20`}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
          {icon && (
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg`}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
