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

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

/**
 * Guard de autenticação (SaaS): qualquer rota protegida exige login.
 * Redireciona para /login?next=<rota_original>
 */
const RequireAuth = ({ children }) => {
  const { isLoadingAuth, authError, isAuthenticated } = useAuth();
  const location = useLocation();

  // Loader (evita "flash" de conteúdo)
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Erros específicos
  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  // Sem login -> redireciona pra login, guardando rota original
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
};

/**
 * Rota pública de login.
 * Se já estiver autenticado, manda para a rota "next" ou "/" (home).
 */
const PublicLoginRoute = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
            <GerarPix />
          </LayoutWrapper>
        }
      />

      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}

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
            {/* Pública */}
            <Route path="/login" element={<PublicLoginRoute />} />

            {/* Tudo protegido */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <ProtectedRoutes />
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
