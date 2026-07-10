import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/auth";
import * as onboardingApi from "../api/onboarding";
import { ApiError } from "../api/client";

const RESIDENT_ROLES = ["resident", "tenant"];
const STAFF_ROLES = [
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];
const PLATFORM_ROLES = ["platform_superadmin"];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const homePathForRole = useCallback((role, societySlug, setupComplete = true) => {
    if (PLATFORM_ROLES.includes(role)) {
      return "/platform";
    }
    if (RESIDENT_ROLES.includes(role)) {
      return `/${societySlug}/resident`;
    }
    if (STAFF_ROLES.includes(role)) {
      if (role === "admin" && setupComplete === false) {
        return `/${societySlug}/setup`;
      }
      return `/${societySlug}/staff`;
    }
    return "/";
  }, []);

  useEffect(() => {
    getMe()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function getMe() {
    try {
      const { user: current } = await authApi.getMe();
      setUser(current);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        return;
      }
      throw err;
    }
  }

  const login = useCallback(async (societySlug, email, password) => {
    const { user: loggedIn } = await authApi.login(societySlug, email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const platformLogin = useCallback(async (email, password) => {
    const { user: loggedIn } = await authApi.platformLogin(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const signup = useCallback(async (data) => {
    const { user: registered } = await onboardingApi.signup(data);
    setUser(registered);
    return registered;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      platformLogin,
      signup,
      logout,
      homePathForRole,
    }),
    [user, loading, login, platformLogin, signup, logout, homePathForRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export { RESIDENT_ROLES, STAFF_ROLES, PLATFORM_ROLES };
