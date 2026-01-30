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
 * ✅ Guard de assinatura/pagamento:
 * - Admin (profiles.role === 'admin') entra direto em tudo
 * - Usuário sem assinatura: pode navegar no FUNIL (quiz/planos/checkout)
 * - Se tentar acessar rota premium sem assinatura -> manda para /vendas (escolha de plano)
 *
 * OBS: por enquanto a "assinatura real" está como placeholder. Você pode trocar depois
 * por um campo do profiles (ex: subscription_status / paid_until).
 */
const RequireSubscription = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  const pathname = (location.pathname || "/").toLowerCase();

  // Rotas do funil que NÃO devem ser bloqueadas por assinatura
  const isFunnelRoute = useMemo(() => {
    // ajuste aqui se você tiver nomes diferentes (ex: "/planos" ao invés de "/vendas")
    if (pathname === "/") return true;
    if (pathname.startsWith("/vendas")) return true;
    if (pathname.startsWith("/checkout")) return true;
    return false;
  }, [pathname]);

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

        const admin = !error && data?.role === "admin";
        setIsAdmin(admin);

        // ✅ Placeholder de assinatura (trocar depois por coluna real)
        // Exemplo futuro:
        // const { data: prof } = await supabase.from("profiles").select("subscription_status, paid_until").eq("id", user.id).single();
        // setHasSubscription(prof?.subscription_status === "active" || (prof?.paid_until && new Date(prof.paid_until) > new Date()));
        setHasSubscription(false);
      } catch (e) {
        if (mounted) {
          setIsAdmin(false);
          setHasSubscription(false);
        }
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

  if (!isAuthenticated) return null;

  // ✅ Admin entra direto em tudo
  if (isAdmin) return children;

  // ✅ Sem assinatura: deixa navegar no funil (quiz -> planos -> checkout)
  if (!hasSubscription && isFunnelRoute) return children;

  // ✅ Com assinatura: libera tudo
  if (hasSubscription) return children;

  // 🚫 Sem assinatura e tentando entrar em rota premium: manda para escolha de planos
  return <Navigate to="/vendas" replace />;
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
  const pathname = (location.pathname || "/").toLowerCase();

  const isCheckout =
    pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname.includes("checkout");

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
        const pageIsCheckout = String(path).toLowerCase().includes("checkout") || isCheckout;

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
