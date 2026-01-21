import { useState } from "react";
import { supabase } from "../supabase";

export default function AuthGate({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) return setError(error.message);
    onSuccess(data.user);
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) return setError(error.message);
    alert("Conta criada. Verifique seu email e depois faça login.");
  }

  return (
    <div style={{ maxWidth: 360, margin: "auto" }}>
      <h3>Crie sua conta ou entre</h3>

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        placeholder="Senha"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button onClick={signIn} disabled={loading}>Entrar</button>
      <button onClick={signUp} disabled={loading}>Criar conta</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
