import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function submit() {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) return setError(error.message);

    navigate("/");
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-80 space-y-4">
        <h2>Defina sua nova senha</h2>
        <input
          type="password"
          placeholder="Nova senha"
          className="w-full border p-2"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={loading}
          className="w-full bg-black text-white p-2"
        >
          Salvar senha
        </button>
        {error && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
}
