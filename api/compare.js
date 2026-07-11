export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const { base64A, mimeA, descA, base64B, mimeB, descB } = req.body;

    const prompt = `Você é um especialista em identificar animais de estimação por foto e descrição, ajudando a reencontrar pets perdidos.

Descrição do pet PERDIDO: ${descA}
Descrição do animal ENCONTRADO: ${descB}

Compare as duas fotos e descrições. Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"mesmoAnimal": true, "pontuacao": 0, "motivo": "texto"}

Onde "pontuacao" vai de 0 a 100 (chance de ser o mesmo animal) e "motivo" é uma explicação curta em português, no máximo 20 palavras.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeA, data: base64A } },
              { type: 'image', source: { type: 'base64', media_type: mimeB, data: base64B } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || 'Erro ao chamar a IA' });
      return;
    }

    const texto = (data.content || []).map((b) => b.text || '').join('').trim();
    const limpo = texto.replace(/```json|```/g, '').trim();

    let resultado;
    try {
      resultado = JSON.parse(limpo);
    } catch {
      resultado = { mesmoAnimal: false, pontuacao: 0, motivo: 'Não foi possível analisar essa comparação.' };
    }

    res.status(200).json(resultado);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
