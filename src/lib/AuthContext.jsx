import React, { createContext, useState, useContext, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        setIsLoadingAuth(true);

        // 1) Primeiro: pega sessão (fonte de verdade)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError) {
          console.error("Auth session error:", sessionError);
          setAuthError({ type: "auth_error", message: sessionError.message });
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const session = sessionData?.session;

        // 2) Sem sessão = precisa autenticar
        if (!session?.user) {
          setAuthError({ type: "auth_required", message: "Login required" });
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        // 3) Com sessão, confirma usuário (opcional, mas bom)
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (!mounted) return;

        if (userError) {
          console.error("Auth getUser error:", userError);
          // ainda existe sessão, mas se der erro aqui, trate como não autenticado
          setAuthError({ type: "auth_error", message: userError.message });
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const currentUser = userData?.user ?? session.user;
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
      } catch (err) {
        console.error("Unexpected auth error:", err);
        if (!mounted) return;
        setAuthError({ type: "unknown", message: err?.message || "Unknown error" });
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (!mounted) return;
        setIsLoadingAuth(false);
      }
    }

    bootstrapAuth();

    // Listener de sessão: isso é o que vai manter tudo sincronizado
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: "auth_required", message: "Login required" });
      }
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: "auth_required", message: "Login required" });
  };

  const navigateToLogin = () => {
    window.location.href = "/login";
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout,
      navigateToLogin,
    }),
    [user, isAuthenticated, isLoadingAuth, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
