import "./App.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import VisualEditAgent from "@/lib/VisualEditAgent";

// ⚠️ DESLIGADO: pode estar restaurando última página (ex: Premium antigo)
// import NavigationTracker from "@/lib/NavigationTracker";

import { pagesConfig } from "./pages.config";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import GerarPix from "@/components/GerarPix";
import AuthGate from "@/components/AuthGate";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import AuthCallback from "@/components/AuthCallback";
import ResetPassword from "@/components/ResetPassword";

const { Pages, Layout } = pagesConfig;

// ✅ Página inicial FORÇADA (não depende de cache/ordem/config)
const START_PAGE = "Onboarding";

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? (
    <Layout currentPageName={currentPageName}>{children}</Layout>
  ) : (
    <>{children}</>
  );

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
 * - Quem tiver plano_ativo também entra
 * - Senão, libera apenas o funil (Onboarding/Vendas/Checkout...) e trava o resto
 */
const RequireSubscription = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (isLoadingAuth) return;
        if (!isAuthenticated) return;

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        // tenta buscar role + plano_ativo
        let role = null;
        let planoAtivo = false;

        const r1 = await supabase
          .from("profiles")
          .select("role, plano_ativo")
          .eq("id", user.id)
          .single();

        if (!r1.error && r1.data) {
          role = r1.data.role ?? null;
          planoAtivo = Boolean(r1.data.plano_ativo);
        } else {
          // fallback: só role
          const r2 = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          if (!r2.error && r2.data) role = r2.data.role ?? null;
          planoAtivo = false;
        }

        const isAdmin = role === "admin";

        const path = (location.pathname || "/").toLowerCase();

        // ✅ quando tem acesso liberado
        if (isAdmin || planoAtivo) {
          if (mounted) setIsAllowed(true);
          return;
        }

        // ✅ sem plano: só deixa o funil comercial
        const funnelAllowed = [
          "/",
          "/onboarding",
          "/vendas",
          "/checkout",
          "/finalizarcompra",
          "/premium", // se existir página intermediária antiga ainda
        ];

        const ok = funnelAllowed.some(
          (p) => path === p || path.startsWith(p + "/")
        );

        if (mounted) setIsAllowed(ok);
      } catch (e) {
        if (mounted) setIsAllowed(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [isLoadingAuth, isAuthenticated, location.pathname]);

  if (isLoadingAuth || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (isAllowed) return children;

  // 🚫 sem plano e fora do funil => joga pra Vendas
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
  const pathname = (location.pathname || "/").toLowerCase();

  const isCheckout =
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname.includes("checkout");

  return (
    <Routes>
      {/* ✅ "/" NUNCA renderiza “MainPage”. Sempre manda para Onboarding */}
      <Route path="/" element={<Navigate to={`/${START_PAGE}`} replace />} />

      {/* Rotas geradas a partir das páginas */}
      {Object.entries(Pages).map(([path, Page]) => {
        const pageIsCheckout =
          path.toLowerCase().includes("checkout") || isCheckout;

        return (
          <Route
            key={path}
            path={`/${path}`}
            caseSensitive={false}
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
          {/* <NavigationTracker /> */}

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
