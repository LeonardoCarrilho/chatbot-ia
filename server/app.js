import express from "express";
import cors from "cors";

const MAX_MENSAGENS = 30;
const MAX_CARACTERES = 4000;

// Limite simples por IP: N requisições por minuto (protege a chave de uso abusivo).
function limitador(maximo = 20, janelaMs = 60_000) {
  const acessos = new Map();
  return (req, res, next) => {
    const agora = Date.now();
    const lista = (acessos.get(req.ip) || []).filter((t) => agora - t < janelaMs);
    if (lista.length >= maximo) return res.status(429).json({ erro: "Muitas mensagens. Aguarde um minuto." });
    lista.push(agora);
    acessos.set(req.ip, lista);
    next();
  };
}

export function validarMensagens(mensagens) {
  if (!Array.isArray(mensagens) || mensagens.length === 0) return "Envie ao menos uma mensagem.";
  if (mensagens.length > MAX_MENSAGENS) return "Conversa longa demais. Comece uma nova.";
  for (const m of mensagens) {
    if (!m || !["usuario", "bot"].includes(m.papel) || typeof m.texto !== "string" || !m.texto.trim()) {
      return "Formato de mensagem inválido.";
    }
    if (m.texto.length > MAX_CARACTERES) return `Cada mensagem pode ter até ${MAX_CARACTERES} caracteres.`;
  }
  if (mensagens.at(-1).papel !== "usuario") return "A última mensagem deve ser do usuário.";
  return null;
}

export function criarApp({ responder, origem = "*", limite = 20 }) {
  const app = express();
  app.use(cors({ origin: origem }));
  app.use(express.json({ limit: "200kb" }));

  app.get("/saude", (req, res) => res.json({ ok: true }));

  app.post("/chat", limitador(limite), async (req, res) => {
    const erro = validarMensagens(req.body?.mensagens);
    if (erro) return res.status(400).json({ erro });
    try {
      res.json({ resposta: await responder(req.body.mensagens) });
    } catch (e) {
      console.error("Erro na IA:", e.message);
      res.status(502).json({ erro: "Não consegui falar com a IA agora. Tente novamente." });
    }
  });

  return app;
}
