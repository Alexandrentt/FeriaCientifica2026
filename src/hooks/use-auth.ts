import { useCallback, useState } from "react";

type DemoUser = { name: string; email: string };

export function useAuth() {
  const [user, setUser] = useState<DemoUser | null>(() => {
    try {
      const raw = localStorage.getItem("epi4-demo-user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback(async (provider: string, formData?: FormData) => {
    const email = String(formData?.get("email") ?? "demo@epi4.local");
    const next = { name: email === "demo@epi4.local" ? "Operador EPI 4.0" : email.split("@")[0], email };
    localStorage.setItem("epi4-demo-user", JSON.stringify(next));
    setUser(next);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem("epi4-demo-user");
    setUser(null);
  }, []);

  return {
    isLoading: false,
    isAuthenticated: user !== null,
    user,
    signIn,
    signOut,
  };
}
