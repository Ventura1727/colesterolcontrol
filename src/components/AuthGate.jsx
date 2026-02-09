import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function isValidEmail(value) {
  const v = String(value || "").trim();
  return v.includes("@") && v.includes(".") && v.length >= 6;
}

function humanizeAuthError(message) {
  const m = String(message || "").toLowerCase();

  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada/spam.";
  if (m.includes("user already registered")) return "Este e-mail já está cadastrado. Clique em “Entrar”.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("too many requests")) return "Muitas tentativas. Aguarde um pouco e tente novamente.";

  return message || "Ocorreu um erro. Tente novamente.";
}

/**
 * AuthGate
 *
 * - Quando usado EMBUTIDO (ex.: Checkout), passe onSuccess(user) e ele NÃO vai navegar.
 * - Quando usado como PÁGINA, ele navega para `next` (querystring ?next=/rota).
 */
export default function AuthGate({ onSuccess, title, subtitle }) {
  const navigate = useNavigate();
  const location = useLocation();

  // view: "auth" (signin/signup) | "forgot" (reset por email)
  const [view, setView] = useState("auth");

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // esqueci senha
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "/";
  }, [location.search]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (view !== "auth") return false;
    if (!isValidEmail(email)) return false;
    if (!password || password.length < 6) return false;
    return true;
  }, [email, password, loading, view]);

  const canSubmitForgot = useMemo(() => {
    if (loading) return false;
    if (view !== "forgot") return false;
    if (!isValidEmail(forgotEmail)) return false;
    return true;
  }, [forgotEmail, loading, view]);

  async function handleSignIn(e) {
    e?.preventDefault?.();
    setError(null);
    setInfo(null);

    const em = email.trim();
    if (!isValidEmail(em)) return setError("Digite um e-mail válido.");
    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password,
      });

      if (error) {
        setError(humanizeAuthError(error.message));
        return;
      }

      const user = data?.user ?? null;
      onSuccess?.(user);

      // Se tiver onSuccess (uso embutido), NÃO navega automaticamente.
      // Se não tiver onSuccess (uso página), navega para o next.
      if (!onSuccess) {
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(humanizeAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e) {
    e?.preventDefault?.();
    setError(null);
    setInfo(null);

    const em = email.trim();
    if (!isValidEmail(em)) return setError("Digite um e-mail válido.");
    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: em,
        password,
      });

      if (error) {
        setError(humanizeAuthError(error.message));
        return;
      }

      const createdUser = data?.user ?? null;
      const hasSession = !!data?.session;

      // Se confirmação por email estiver desligada, pode logar na hora
      if (hasSession && createdUser) {
        onSuccess?.(createdUser);
        if (!onSuccess) navigate(next, { replace: true });
        return;
      }

      setInfo("Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada/spam para confirmar.");
      setMode("signin");
    } catch (err) {
      setError(humanizeAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e?.preventDefault?.();
    setError(null);
    setInfo(null);

    const em = forgotEmail.trim();
    if (!isValidEmail(em)) return setError("Digite um e-mail válido.");

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo,
      });

      if (error) {
        setError(humanizeAuthError(error.message));
        return;
      }

      setForgotSent(true);
      setInfo("Se esse e-mail estiver cadastrado, enviaremos um link para redefinição. Verifique inbox/spam.");
    } catch (err) {
      setError(humanizeAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  }

  const computedTitle =
    title ||
    (view === "forgot"
      ? "Recuperar senha"
      : mode === "signin"
      ? "Entrar"
      : "Criar conta");

  const computedSubtitle =
    subtitle ||
    (view === "forgot"
      ? "Vamos te enviar um link para redefinir sua senha."
      : mode === "signin"
      ? "Acesse sua conta para continuar."
      : "Crie sua conta para liberar o conteúdo Premium.");

  return (
    <div className="w-full">
      <div className="w-full">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              HB
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                {computedTitle}
              </h1>
              <p className="text-sm text-slate-600 leading-snug">{computedSubtitle}</p>
            </div>
          </div>

          {/* VIEW: FORGOT */}
          {view === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-300"
                  placeholder="seuemail@exemplo.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {info && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-700">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmitForgot}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-bold",
                  "bg-slate-900 text-white",
                  "transition-opacity",
                  canSubmitForgot ? "opacity-100" : "opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setView("auth");
                  setForgotSent(false);
                }}
                disabled={loading}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-bold",
                  "border border-slate-200 bg-white text-slate-900",
                  loading ? "opacity-70 cursor-not-allowed" : "hover:bg-slate-50",
                ].join(" ")}
              >
                Voltar para entrar
              </button>

              {!forgotSent && (
                <p className="pt-1 text-center text-xs text-slate-400">
                  Dica: se não encontrar, verifique a caixa de spam.
                </p>
              )}
            </form>
          ) : (
            /* VIEW: AUTH (signin/signup) */
            <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-300"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Senha</label>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-300"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Mínimo de 6 caracteres.</p>

                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setInfo(null);
                        setView("forgot");
                        setForgotEmail(email || "");
                        setForgotSent(false);
                      }}
                      disabled={loading}
                      className={[
                        "text-xs font-bold text-slate-900",
                        loading ? "cursor-not-allowed opacity-70" : "hover:underline",
                      ].join(" ")}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {info && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm text-blue-700">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-bold",
                  "bg-slate-900 text-white",
                  "transition-opacity",
                  canSubmit ? "opacity-100" : "opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                {mode === "signin"
                  ? loading
                    ? "Entrando..."
                    : "Entrar"
                  : loading
                  ? "Criando..."
                  : "Criar conta"}
              </button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-600">{mode === "signin" ? "Não tem conta?" : "Já tem conta?"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setInfo(null);
                    setMode(mode === "signin" ? "signup" : "signin");
                  }}
                  disabled={loading}
                  className={[
                    "font-bold text-slate-900",
                    loading ? "cursor-not-allowed opacity-70" : "hover:underline",
                  ].join(" ")}
                >
                  {mode === "signin" ? "Criar conta" : "Entrar"}
                </button>
              </div>

              <p className="pt-1 text-center text-xs text-slate-400">
                Ao continuar, você concorda com os termos e políticas do serviço.
              </p>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Dica: use um e-mail válido e uma senha com 6+ caracteres.
        </p>
      </div>
    </div>
  );
}
