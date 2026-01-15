interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/50 shadow-sm hover:shadow-md dark:shadow-none transition-shadow duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
