// api/water-log-post.js
import { createClient } from '@supabase/supabase-js';

// Use variáveis de ambiente próprias para o backend
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const { quantidade_ml, data, hora } = req.body;

  if (!quantidade_ml || !data || !hora) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  const { error: insertError } = await supabase
    .from('water_logs')
    .insert([
      {
        created_by: user.id,
        quantidade_ml,
        data,
        hora,
      },
    ]);

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.status(201).json({ message: 'Registro inserido com sucesso' });
};
