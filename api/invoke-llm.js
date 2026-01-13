export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { prompt, profile, colesterolData } = req.body;

  const fullPrompt = `
Você é um especialista em saúde cardiovascular. Analise os dados históricos do usuário e forneça insights personalizados e preditivos.

Dados do perfil:
- Objetivo: ${profile?.objetivo || 'Reduzir colesterol'}
- Rank atual: ${profile?.rank || 'Iniciante'}
- XP total: ${profile?.xp_total || 0}

Histórico de Colesterol (últimos registros):
${JSON.stringify(colesterolData, null, 2)}
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: fullPrompt }],
        temperature: 0.7
      })
    });

    const result = await response.json();
    const message = result.choices?.[0]?.message?.content || 'Sem resposta da IA';

    res.status(200).json({ analysis: message });
  } catch (error) {
    console.error('Erro na IA:', error);
    res.status(500).json({ error: 'Erro ao gerar análise' });
  }
}
