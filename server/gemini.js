// Cliente mínimo da API REST do Gemini (generateContent), sem SDK.
const INSTRUCAO = "Você é um assistente prestativo e objetivo. Responda em português do Brasil, a menos que o usuário peça outro idioma.";

export function criarGemini({ chave, modelo = "gemini-flash-latest", fetchFn = fetch }) {
  if (!chave) throw new Error("GEMINI_API_KEY não definida. Copie .env.example para .env e preencha.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  return async function responder(mensagens) {
    const r = await fetchFn(url, {
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
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      const erro = new Error(dados.error?.message || `Gemini respondeu ${r.status}`);
      erro.status = r.status;
      throw erro;
    }
    const texto = dados.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
    if (!texto) throw new Error("A IA não retornou texto (a resposta pode ter sido bloqueada).");
    return texto;
  };
}
