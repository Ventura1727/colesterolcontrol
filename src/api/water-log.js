import { supabase } from '@/api/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { quantidade_ml, data, hora } = req.body;

    // Recupera usuário autenticado
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;

    const created_by = authData.user.email;

    const { error } = await supabase
      .from('water_logs')
      .insert([{ quantidade_ml, data, hora, created_by }]);

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
