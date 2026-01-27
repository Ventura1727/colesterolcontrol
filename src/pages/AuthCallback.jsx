import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handle() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        navigate("/login");
        return;
      }

      const params = new URLSearchParams(window.location.hash.replace("#", "?"));
      const type = params.get("type");

      if (type === "recovery") {
        navigate("/reset-password");
      } else {
        navigate("/");
      }
    }

    handle();
  }, []);

  return (
    <div className="h-screen flex items-center justify-center">
      Processando autenticação...
    </div>
  );
}
