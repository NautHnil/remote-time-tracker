/**
 * Contexts Index
 * Central export point for all React contexts
 */

export { AuthContext, AuthProvider, useAuth } from "./AuthContext";
export type {
  AuthContextType,
  User,
  UserOrganization,
  UserPermissions,
  UserWorkspace,
} from "./AuthContext";

export { ThemeContext, ThemeProvider, useTheme } from "./ThemeContext";
export type { Theme } from "./ThemeContext";
