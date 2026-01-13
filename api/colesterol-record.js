import { supabase } from '@/api/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const payload = req.body;

    // Inserir no Supabase
    const { data, error } = await supabase
      .from('colesterol_records') // nome da tabela no Supabase
      .insert([payload]);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Erro ao salvar exame:', error);
    return res.status(500).json({ error: error.message });
  }
}
