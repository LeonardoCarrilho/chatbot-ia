// Cliente mínimo da API REST do Gemini (generateContent), sem SDK.
// Em sobrecarga (429/500/503), tenta de novo e depois usa um modelo reserva.
const INSTRUCAO = "Você é um assistente prestativo e objetivo. Responda em português do Brasil, a menos que o usuário peça outro idioma.";
const TEMPORARIO = new Set([429, 500, 503]);

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

export function criarGemini({
  chave,
  modelo = "gemini-flash-latest",
  reserva = "gemini-flash-lite-latest",
  tentativas = 2,
  pausaMs = 800,
  limiteMs = 12000, // pior caso: 2 modelos x 2 tentativas x 12s < 60s (maxDuration na Vercel)
  fetchFn = fetch,
}) {
  if (!chave) throw new Error("GEMINI_API_KEY não definida. Copie .env.example para .env e preencha.");
  const modelos = [...new Set([modelo, reserva].filter(Boolean))];

  async function chamar(nomeModelo, mensagens) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${nomeModelo}:generateContent`;
    let r;
    try {
      r = await fetchFn(url, {
        signal: AbortSignal.timeout(limiteMs),
        method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCAO }] },
        contents: mensagens.map((m) => ({
          role: m.papel === "bot" ? "model" : "user",
          parts: [{ text: m.texto }],
        })),
      }),
      });
    } catch (e) {
      // Tempo esgotado ou falha de rede: trata como indisponibilidade temporária.
      const erro = new Error(`[${nomeModelo}] ${e.name === "TimeoutError" ? `sem resposta em ${limiteMs / 1000}s` : e.message}`);
      erro.status = 503;
      throw erro;
    }
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      const erro = new Error(`[${nomeModelo}] ${dados.error?.message || `Gemini respondeu ${r.status}`}`);
      erro.status = r.status;
      throw erro;
    }
    const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    if (!texto) throw new Error(`[${nomeModelo}] A IA não retornou texto (a resposta pode ter sido bloqueada).`);
    return texto;
  }

  return async function responder(mensagens) {
    let ultimoErro;
    for (const nomeModelo of modelos) {
      for (let t = 1; t <= tentativas; t++) {
        try {
          return await chamar(nomeModelo, mensagens);
        } catch (e) {
          ultimoErro = e;
          if (!TEMPORARIO.has(e.status)) throw e; // chave inválida, modelo inexistente etc.: não adianta repetir
          console.warn(`Gemini temporariamente indisponível (${e.message}); tentativa ${t}/${tentativas}`);
          if (t < tentativas) await esperar(pausaMs * t);
        }
      }
    }
    ultimoErro.sobrecarga = true;
    throw ultimoErro;
  };
}
