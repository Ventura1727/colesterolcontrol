import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

function parseHashParams() {
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Validando link…");

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const { access_token, refresh_token, type } = parseHashParams();

        // Se vier token no hash, cria sessão.
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          // Remove hash (segurança e evitar loops)
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

          if (!mounted) return;

          if (error || !data?.session) {
            navigate("/login", { replace: true });
            return;
          }

          // Direciona conforme tipo
          if (type === "recovery") {
            navigate("/reset-password", { replace: true });
            return;
          }

          // Magic link / invite / etc:
          navigate("/dashboard", { replace: true });
          return;
        }

        // Se não tem tokens no hash, tenta sessão existente
        const { data: sess } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sess?.session) {
          navigate("/dashboard", { replace: true });
          return;
        }

        navigate("/login", { replace: true });
      } catch (e) {
        if (!mounted) return;
        setMsg("Link inválido. Redirecionando…");
        navigate("/login", { replace: true });
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [navigate]);

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
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Autenticação</h2>
        <p style={{ marginTop: 8, color: "#475569" }}>{msg}</p>
      </div>
    </div>
  );
}
