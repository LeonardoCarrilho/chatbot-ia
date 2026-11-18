import { criarApp } from "./app.js";
import { criarGemini } from "./gemini.js";

const responder = criarGemini({ chave: process.env.GEMINI_API_KEY, modelo: process.env.GEMINI_MODEL });
const porta = process.env.PORT || 3001;

criarApp({ responder, origem: process.env.WEB_ORIGIN || "http://localhost:5173" })
  .listen(porta, () => console.log(`Servidor do chatbot em http://localhost:${porta}`));
