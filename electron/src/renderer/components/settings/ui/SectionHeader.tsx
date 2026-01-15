interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export function SectionHeader({
  icon,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 dark:from-primary-400/20 dark:to-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
