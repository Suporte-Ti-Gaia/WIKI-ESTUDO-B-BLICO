// Função serverless (Vercel). Recebe { provider, messages } do frontend e
// repassa para o provedor de IA escolhido, usando chaves guardadas em
// variáveis de ambiente — a chave nunca fica exposta no navegador do usuário.
//
// Resposta sempre normalizada como: { text: string, truncated: boolean }
// ou, em caso de erro: { error: string }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  const { provider = 'anthropic', messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Requisição inválida: "messages" ausente.' });
    return;
  }

  try {
    let result;
    if (provider === 'groq') result = await callGroq(messages);
    else if (provider === 'gemini') result = await callGemini(messages);
    else result = await callAnthropic(messages);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor.' });
  }
};

function erro(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ---------------------------------------------------------------
// Claude (Anthropic) — com pesquisa na web
// ---------------------------------------------------------------
async function callAnthropic(messages) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw erro(500, 'ANTHROPIC_API_KEY não configurada no servidor.');

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      messages,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw erro(resp.status, data?.error?.message || 'Erro na API da Anthropic.');

  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return { text, truncated: data.stop_reason === 'max_tokens' };
}

// ---------------------------------------------------------------
// Groq — openai/gpt-oss-120b (API gratuita, formato compatível com OpenAI)
// ---------------------------------------------------------------
async function callGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw erro(500, 'GROQ_API_KEY não configurada no servidor.');

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_tokens: 2048,
      messages,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw erro(resp.status, data?.error?.message || 'Erro na API da Groq.');

  const choice = data.choices && data.choices[0];
  const text = choice?.message?.content || '';
  return { text, truncated: choice?.finish_reason === 'length' };
}

// ---------------------------------------------------------------
// Google Gemini — gemini-3.6-flash
// ---------------------------------------------------------------
async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw erro(500, 'GEMINI_API_KEY não configurada no servidor.');

  // Gemini usa role "model" em vez de "assistant" e agrupa texto em "parts"
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: 2048 },
      }),
    }
  );
  const data = await resp.json();
  if (!resp.ok) throw erro(resp.status, data?.error?.message || 'Erro na API do Gemini.');

  const cand = data.candidates && data.candidates[0];
  const text = (cand?.content?.parts || []).map((p) => p.text || '').join('');
  return { text, truncated: cand?.finishReason === 'MAX_TOKENS' };
}
