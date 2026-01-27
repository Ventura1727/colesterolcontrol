import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function isValidEmail(value) {
  const v = String(value || "").trim();
  // validação simples e suficiente para UI
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
    if (!password || password.length < 6) return false; // supabase geralmente exige 6+
    return true;
  }, [email, password, loading]);

  async function handleSignIn() {
    setError(null);
    setInfo(null);

    const e = email.trim();
    if (!isValidEmail(e)) return setError("Digite um e-mail válido.");
    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // sucesso
      setInfo(null);
      onSuccess?.(data?.user ?? null);

      // navega para a rota original (ou "/")
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || "Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setError(null);
    setInfo(null);

    const e = email.trim();
    if (!isValidEmail(e)) return setError("Digite um e-mail válido.");
    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: e,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // O comportamento aqui depende do Supabase:
      // - se confirmação de email estiver ON: usuário precisa confirmar
      // - se estiver OFF: já consegue logar
      setInfo("Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada/spam.");

      // por UX, volta para "Entrar"
      setMode("signin");
    } catch (err) {
      setError(err?.message || "Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#475569", lineHeight: 1.4 }}>
            {mode === "signin"
              ? "Acesse sua conta para continuar."
              : "Crie sua conta para começar a usar o Heartbalance."}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#334155" }}>E-mail</span>
            <input
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,0.15)",
                outline: "none",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#334155" }}>Senha</span>
            <input
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,0.15)",
                outline: "none",
                fontSize: 14,
              }}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Mínimo de 6 caracteres.
            </span>
          </label>

          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#b91c1c",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {info && (
            <div
              style={{
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.20)",
                color: "#1d4ed8",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {info}
            </div>
          )}

          {mode === "signin" ? (
            <button
              onClick={handleSignIn}
              disabled={!canSubmit}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "12px 12px",
                borderRadius: 10,
                border: "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontWeight: 700,
                fontSize: 14,
                background: "#0f172a",
                color: "white",
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={!canSubmit}
              style={{
                marginTop: 4,
                width: "100%",
                padding: "12px 12px",
                borderRadius: 10,
                border: "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
                fontWeight: 700,
                fontSize: 14,
                background: "#0f172a",
                color: "white",
                opacity: canSubmit ? 1 : 0.6,
              }}
            >
              {loading ? "Criando..." : "Criar conta"}
            </button>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6, fontSize: 13 }}>
            <span style={{ color: "#64748b" }}>
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
              style={{
                border: "none",
                background: "transparent",
                color: "#0f172a",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                padding: 0,
              }}
            >
              {mode === "signin" ? "Criar conta" : "Entrar"}
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
            Ao continuar, você concorda com os termos e políticas do serviço.
          </div>
        </div>
      </div>
    </div>
  );
}
