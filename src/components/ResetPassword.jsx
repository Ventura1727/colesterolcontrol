import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function parseHashParams() {
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");
  return { access_token, refresh_token, type };
}

export default function ResetPassword() {
  const navigate = useNavigate();

  const [checkingSession, setCheckingSession] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function ensureSession() {
      setCheckingSession(true);
      setError(null);

      try {
        // 1) Tenta sessão normal (storage)
        const { data: sessData } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sessData?.session) {
          setCheckingSession(false);
          return;
        }

        // 2) Se não tem sessão, tenta criar a partir do hash (caso o link de recovery caia aqui direto)
        const { access_token, refresh_token, type } = parseHashParams();

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // Limpa o hash da URL (evita reprocessar e evita expor token na barra)
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

          if (!mounted) return;

          if (error || !data?.session) {
            setCheckingSession(false);
            navigate("/login", { replace: true });
            return;
          }

          // Se for recovery, pode ficar nessa página mesmo
          if (type === "recovery") {
            setCheckingSession(false);
            return;
          }

          setCheckingSession(false);
          return;
        }

        // 3) Sem sessão e sem tokens no hash: não tem como resetar
        setCheckingSession(false);
        navigate("/login", { replace: true });
      } catch (e) {
        if (!mounted) return;
        setCheckingSession(false);
        navigate("/login", { replace: true });
      }
    }

    ensureSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleUpdate() {
    setError(null);
    setInfo(null);

    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }

      setInfo("Senha atualizada com sucesso. Faça login novamente.");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (e) {
      setError(e?.message || "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "white",
            borderRadius: 14,
            padding: 20,
            border: "1px solid rgba(15,23,42,0.10)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Carregando…</h2>
          <p style={{ marginTop: 8, color: "#475569" }}>Validando seu link de redefinição de senha.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 14,
          padding: 20,
          border: "1px solid rgba(15,23,42,0.10)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Redefinir senha</h2>
        <p style={{ marginTop: 8, color: "#475569" }}>Defina uma nova senha para sua conta.</p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#334155" }}>Nova senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)" }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#334155" }}>Confirmar nova senha</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              style={{ padding: "12px 12px", borderRadius: 10, border: "1px solid rgba(15,23,42,0.15)" }}
            />
          </label>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
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
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "#166534",
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {info}
            </div>
          )}

          <button
            onClick={handleUpdate}
            disabled={loading}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: "none",
              background: "#0f172a",
              color: "white",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Atualizando..." : "Atualizar senha"}
          </button>
        </div>
      </div>
    </div>
  );
}
