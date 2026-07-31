/**
 * Utils Index
 * Central export point for all utility functions
 */

export * from "./requestQueue";

export const getRoleName = (roleName?: string) => {
  if (!roleName || roleName === "") return "";
  if (roleName === "admin") return "Administrator";
  if (roleName === "user") return "User";
  if (roleName === "member") return "Member";
};
