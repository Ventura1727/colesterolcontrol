import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Se não tiver sessão (ou token inválido), manda pro login
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session) navigate("/login", { replace: true });
    });
  }, [navigate]);

  async function handleUpdate() {
    setError(null);
    setInfo(null);

    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não conferem.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setError(error.message);

      setInfo("Senha atualizada com sucesso. Faça login novamente.");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (e) {
      setError(e?.message || "Erro ao atualizar senha.");
    } finally {
      setLoading(false);
    }
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
