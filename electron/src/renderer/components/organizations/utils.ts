/**
 * Organization Utilities and Helpers
 */

/**
 * Get role badge color classes based on role name
 */
export const getRoleBadgeColors = (role: string): string => {
  const colors: Record<string, string> = {
    owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    member: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return colors[role] || colors.member;
};
