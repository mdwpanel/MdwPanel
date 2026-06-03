import React, { createContext, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, setAuthTokenGetter, getGetMeQueryKey } from "@workspace/api-client-react";

setAuthTokenGetter(() => localStorage.getItem("mdw_token"));

type AuthUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("mdw_token"));
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const login = (newToken: string) => {
    localStorage.setItem("mdw_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("mdw_token");
    setToken(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user: (user as AuthUser) ?? null, isLoading: !!token && isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
