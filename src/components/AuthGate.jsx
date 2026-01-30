import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function isValidEmail(value) {
  const v = String(value || "").trim();
  return v.includes("@") && v.includes(".") && v.length >= 6;
}

export default function AuthGate({ onSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const next = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("next") || "/";
  }, [location.search]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!isValidEmail(email)) return false;
    if (!password || password.length < 6) return false;
    return true;
  }, [email, password, loading]);

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
        setError(error.message);
        return;
      }

      setInfo(null);
      onSuccess?.(data?.user ?? null);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Erro ao entrar. Tente novamente.");
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
      const { error } = await supabase.auth.signUp({
        email: em,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setInfo("Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada/spam.");
      setMode("signin");
    } catch (err) {
      setError(err?.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signin" ? "Entrar" : "Criar conta";
  const subtitle =
    mode === "signin"
      ? "Acesse sua conta para continuar."
      : "Crie sua conta para começar a usar o HeartBalance.";

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              HB
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                {title}
              </h1>
              <p className="text-sm text-slate-600 leading-snug">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Form */}
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
              <p className="text-xs text-slate-500">Mínimo de 6 caracteres.</p>
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
              {mode === "signin" ? (loading ? "Entrando..." : "Entrar") : (loading ? "Criando..." : "Criar conta")}
            </button>

            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-slate-600">
                {mode === "signin" ? "Não tem conta?" : "Já tem conta?"}
              </span>
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
        </div>

        {/* Footer helper (opcional) */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Dica: use um e-mail válido e uma senha com 6+ caracteres.
        </p>
      </div>
    </div>
  );
}
