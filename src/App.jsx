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

// ✅ Ajustado para o local onde você criou o arquivo no print: src/components/Auth/Callback.jsx
import AuthCallback from "@/components/Auth/Callback";
import ResetPassword from "@/components/ResetPassword";

const { Pages, Layout, mainPage } = pagesConfig;

const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

/**
 * Guard de login (apenas onde precisamos de login).
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
 * Guard de acesso “premium”.
 *
 * REGRAS:
 * - Admin (profiles.role === 'admin') entra direto.
 * - Usuário com plano_ativo === true entra.
 * - Páginas públicas de funil (Onboarding/Vendas/Checkout) ficam livres para não quebrar o fluxo.
 *
 * IMPORTANTE: este guard NÃO deve prender o usuário em loop.
 */
const RequireSubscription = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPlan, setHasPlan] = useState(false);

  // Rotas “funil” que NÃO podem ser bloqueadas por assinatura
  const path = (location.pathname || "").toLowerCase();
  const isFunnelPage =
    path === "/" ||
    path.startsWith("/onboarding") ||
    path.startsWith("/vendas") ||
    path.startsWith("/checkout") ||
    path.startsWith("/finalizarcompra") ||
    path.startsWith("/premium") ||
    path.startsWith("/quiz"); // ✅ alias do quiz -> não bloquear aqui

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        if (isLoadingAuth) return;

        // Se não está logado, este guard não decide nada (RequireAuth decide antes quando aplicável)
        if (!isAuthenticated) {
          if (mounted) {
            setIsAdmin(false);
            setHasPlan(false);
            setLoading(false);
          }
          return;
        }

        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          if (mounted) {
            setIsAdmin(false);
            setHasPlan(false);
            setLoading(false);
          }
          return;
        }

        // ✅ Correção: usar maybeSingle() para NÃO gerar 406 quando não existir profile
        // e garantir criação do profile via upsert.
        let role = null;
        let planoAtivo = false;

        const { data, error } = await supabase
          .from("profiles")
          .select("role, plano_ativo")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          role = data?.role ?? null;
          planoAtivo = Boolean(data?.plano_ativo);
        } else if (!error && !data) {
          // Não existe profile ainda -> cria/garante e tenta retornar dados mínimos
          const { data: created, error: upsertErr } = await supabase
            .from("profiles")
            .upsert({ id: user.id }, { onConflict: "id" })
            .select("role, plano_ativo")
            .single();

          if (!upsertErr && created) {
            role = created?.role ?? null;
            planoAtivo = Boolean(created?.plano_ativo);
          }
        } else {
          // erro real (RLS/schema). comportamento conservador
          role = null;
          planoAtivo = false;
        }

        if (!mounted) return;

        const admin = role === "admin";
        setIsAdmin(admin);
        setHasPlan(planoAtivo);
      } catch (e) {
        // comportamento conservador
        if (mounted) {
          setIsAdmin(false);
          setHasPlan(false);
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

  // Não bloqueie funil; deixe navegar e só proteja conteúdo premium
  if (isFunnelPage) return children;

  if (isLoadingAuth || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Admin entra
  if (isAdmin) return children;

  // Usuário com plano ativo entra
  if (hasPlan) return children;

  // Sem plano: manda para Vendas (seleção de plano), NÃO para Checkout direto.
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

/**
 * Define quais páginas são funil (públicas) e quais são conteúdo premium (protegidas).
 * Ajuste aqui se você criar/remover páginas.
 */
const PUBLIC_PAGE_KEYS = new Set([
  "Onboarding",
  "Vendas",
  "Checkout",
  "FinalizarCompra",
  "Home",
  "Premium",
]);

/**
 * Render de rotas de páginas.
 * - Funil: sem RequireAuth/RequireSubscription.
 * - Premium: RequireAuth + RequireSubscription.
 */
const AppPagesRoutes = () => {
  const location = useLocation();
  const pathname = (location.pathname || "").toLowerCase();

  const isCheckoutPath =
    pathname === "/checkout" || pathname.startsWith("/checkout/") || pathname.includes("checkout");

  return (
    <Routes>
      {/* ✅ Alias /quiz -> /onboarding (quiz do início) */}
      <Route path="/quiz" element={<Navigate to="/onboarding" replace />} />

      {/* Main (/) */}
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        }
      />

      {/* Todas as páginas do config */}
      {Object.entries(Pages).map(([pageKey, PageComponent]) => {
        const isPublic = PUBLIC_PAGE_KEYS.has(pageKey);

        const routePath = `/${String(pageKey).toLowerCase()}`;

        const aliasPaths =
          pageKey === "Alimentacao" ? [routePath, "/alimentação", "/alimentacao"] : [routePath];

        return aliasPaths.map((p) => (
          <Route
            key={`${pageKey}:${p}`}
            path={p}
            element={
              <LayoutWrapper currentPageName={pageKey}>
                {isPublic ? (
                  <>
                    <PageComponent />
                    {isCheckoutPath || String(pageKey).toLowerCase().includes("checkout") ? (
                      <GerarPix />
                    ) : null}
                  </>
                ) : (
                  <RequireAuth>
                    <RequireSubscription>
                      <PageComponent />
                    </RequireSubscription>
                  </RequireAuth>
                )}
              </LayoutWrapper>
            }
          />
        ));
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
            {/* Rotas públicas de auth */}
            <Route path="/login" element={<PublicLoginRoute />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* App */}
            <Route path="/*" element={<AppPagesRoutes />} />
          </Routes>

          <Toaster />
          <VisualEditAgent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
