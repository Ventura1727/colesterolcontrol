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

/**
 * ✅ IMPORTANTE:
 * Use UM padrão e siga:
 * - Se você criou estes arquivos em src/components:
 *   import AuthCallback from "@/components/AuthCallback";
 *   import ResetPassword from "@/components/ResetPassword";
 *
 * - Se você criou em src/pages:
 *   import AuthCallback from "@/pages/AuthCallback";
 *   import ResetPassword from "@/pages/ResetPassword";
 */
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
 * - Admin (profiles.role === 'admin') entra direto
 * - Demais usuários: se não estiver no checkout, manda para /checkout
 *
 * Depois você pode substituir a regra do "não-admin" para checar assinatura real.
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
        if (isLoadingAuth) return;
        if (!isAuthenticated) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        if (!error && data?.role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (e) {
        // Se der erro, assume não-admin (comportamento conservador)
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
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

  // ✅ Admin: entra direto
  if (isAdmin) return children;

  // ✅ Não-admin: se já está no checkout, deixa
  const path = location.pathname.toLowerCase();
  const isCheckout =
    path === "/checkout" || path.startsWith("/checkout/") || path.includes("checkout");

  if (isCheckout) return children;

  // 🚫 Não-admin: manda para checkout
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
