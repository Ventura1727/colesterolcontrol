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

import { useEffect, useMemo, useState } from "react";
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
 * - Admin entra em tudo
 * - Usuário premium (is_premium=true ou premium_until > now) entra em tudo
 * - Usuário não-premium: pode acessar SOMENTE o funil (Onboarding/Vendas/Checkout)
 *   e é redirecionado para /Vendas quando tentar página premium.
 *
 * ✅ Isso mata o loop e deixa o fluxo correto:
 * Quiz (Onboarding) -> Vendas -> Checkout -> (pago) -> Dashboard/Home etc.
 */
const RequireSubscription = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [entitlement, setEntitlement] = useState({
    isAdmin: false,
    isPremium: false,
  });

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (isLoadingAuth) return;
        if (!isAuthenticated) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        // ✅ pegar role + flags de premium (você vai criar esses campos)
        const { data, error } = await supabase
          .from("profiles")
          .select("role, is_premium, premium_until")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        const isAdmin = !error && data?.role === "admin";

        // premium_until: se existir e for no futuro
        const premiumUntil = data?.premium_until ? new Date(data.premium_until).getTime() : 0;
        const now = Date.now();
        const isPremium =
          Boolean(data?.is_premium) || (premiumUntil && premiumUntil > now);

        setEntitlement({ isAdmin, isPremium });
      } catch (e) {
        if (mounted) setEntitlement({ isAdmin: false, isPremium: false });
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

  // RequireAuth já cuida, mas mantém seguro
  if (!isAuthenticated) return null;

  // ✅ Admin/premium entram direto
  if (entitlement.isAdmin || entitlement.isPremium) return children;

  // ✅ allowlist do funil (não-premium)
  const path = location.pathname.toLowerCase();

  const isOnboarding = path === "/" || path.includes("/onboarding");
  const isVendas = path.includes("/vendas");
  const isCheckout = path.includes("/checkout");

  if (isOnboarding || isVendas || isCheckout) {
    return children;
  }

  // 🚫 tentou abrir página premium sem premium -> manda para Vendas (escolher plano)
  return <Navigate to="/Vendas" replace />;
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

            {/* Protegidas */}
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
