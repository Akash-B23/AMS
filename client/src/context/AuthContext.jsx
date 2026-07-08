import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/auth";
import { ApiError } from "../api/client";

const RESIDENT_ROLES = ["resident", "tenant"];
const STAFF_ROLES = [
  "manager",
  "admin",
  "association_staff",
  "treasurer",
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const homePathForRole = useCallback((role) => {
    if (RESIDENT_ROLES.includes(role)) {
      return "/resident";
    }
    if (STAFF_ROLES.includes(role)) {
      return "/staff";
    }
    return "/login";
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

  const login = useCallback(async (email, password) => {
    const { user: loggedIn } = await authApi.login(email, password);
    setUser(loggedIn);
    return loggedIn;
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
      logout,
      homePathForRole,
    }),
    [user, loading, login, logout, homePathForRole],
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

export { RESIDENT_ROLES, STAFF_ROLES };
