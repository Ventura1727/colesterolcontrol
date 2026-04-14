export default async function handler(req, res) {
  // Só aceita pedidos do tipo POST (segurança)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { prompt } = req.body;

  try {
    // Faz a chamada para o Gemini usando a sua chave que estará na Vercel
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          // Isso obriga a IA a responder apenas o JSON para não quebrar o seu app
          response_mime_type: "application/json",
        }
      })
    });

    const data = await response.json();
    
    // Extrai o texto da resposta da IA
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Devolve para o componente AIInsights
    return res.status(200).json({ analysis: aiResponse });

  } catch (error) {
    console.error("Erro na API de IA:", error);
    return res.status(500).json({ error: 'Falha ao processar inteligência artificial' });
  }
}
