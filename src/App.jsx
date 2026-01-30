import "./App.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import VisualEditAgent from "@/lib/VisualEditAgent";
import NavigationTracker from "@/lib/NavigationTracker";
import { pagesConfig } from "./pages.config";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import GerarPix from "@/components/GerarPix";
import AuthGate from "@/components/AuthGate";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import AuthCallback from "@/components/AuthCallback";
import ResetPassword from "@/components/ResetPassword";

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

/**
 * Guard SaaS: qualquer rota protegida exige login.
 */
const RequireAuth = ({ children }) => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
};

/**
 * Guard de assinatura/pagamento:
 *
 * OBJETIVO "VENDEDOR":
 * - Admin faz o fluxo normal: Quiz (/) -> Checkout (/checkout)
 * - Ao clicar "Seguir" no Checkout, o Checkout deve setar:
 *     localStorage.setItem("hb_demo_premium", "1")
 *   e navegar para a página premium (ex.: /alimentacao)
 *
 * REGRAS AQUI:
 * - Admin:
 *     - Se hb_demo_premium=1: libera tudo (acesso premium)
 *     - Se hb_demo_premium!=1: só permite "/" e "/checkout"; o resto manda para "/checkout"
 * - Não-admin:
 *     - Se não estiver no checkout, manda para "/checkout"
 *     - Se já está no checkout, deixa
 */
const RequireSubscription = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        // enquanto auth estiver carregando, não decide nada ainda
        if (isLoadingAuth) {
          if (mounted) setLoading(true);
          return;
        }

        // se não está logado, não tem o que checar aqui (RequireAuth cuida)
        if (!isAuthenticated) {
          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        if (mounted) setLoading(true);

        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const user = userData?.user;

        if (userErr || !user) {
          if (mounted) {
            setIsAdmin(false);
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        setIsAdmin(!error && data?.role === "admin");
        setLoading(false);
      } catch (e) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [isLoadingAuth, isAuthenticated]);

  if (isLoadingAuth || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Se não estiver logado, RequireAuth já cuida
  if (!isAuthenticated) return null;

  const path = location.pathname.toLowerCase();
  const isCheckout =
    path === "/checkout" || path.startsWith("/checkout/") || path.includes("checkout");

  // 🔑 Flag de demo premium (será setada no checkout quando admin clicar "Seguir")
  const demoPremium = localStorage.getItem("hb_demo_premium") === "1";

  // ✅ ADMIN: libera tudo APÓS desbloquear demo
  if (isAdmin) {
    if (demoPremium) return children;

    // Antes de desbloquear demo: só deixa quiz (/) e checkout
    if (path === "/" || isCheckout) return children;

    // Tentou acessar outra rota antes de liberar: manda para checkout
    return <Navigate to="/checkout" replace />;
  }

  // ✅ NÃO-ADMIN: se já está no checkout, deixa
  if (isCheckout) return children;

  // 🚫 NÃO-ADMIN: manda para checkout
  return <Navigate to="/checkout" replace />;
};

/**
 * /login (pública). Se já estiver autenticado, manda para next ou "/".
 */
const PublicLoginRoute = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";

  if (isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  return <AuthGate />;
};

const ProtectedRoutes = () => {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();

  const isCheckout =
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname.includes("checkout");

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />

      {Object.entries(Pages).map(([path, Page]) => {
        const pageIsCheckout = path.toLowerCase().includes("checkout") || isCheckout;

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
                {pageIsCheckout ? <GerarPix /> : null}
              </LayoutWrapper>
            }
          />
        );
      })}

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <NavigationTracker />

          <Routes>
            {/* Públicas */}
            <Route path="/login" element={<PublicLoginRoute />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Tudo protegido */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <RequireSubscription>
                    <ProtectedRoutes />
                  </RequireSubscription>
                </RequireAuth>
              }
            />
          </Routes>

          <Toaster />
          <VisualEditAgent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
