// Função serverless da Vercel: expõe o servidor do chat em /api/*.
import express from "express";
import { criarApp } from "../server/app.js";
import { criarGemini } from "../server/gemini.js";

const responder = criarGemini({ chave: process.env.GEMINI_API_KEY, modelo: process.env.GEMINI_MODEL || undefined });
const app = express();
app.set("trust proxy", true); // IP real do visitante para o limite de mensagens
app.use("/api", criarApp({ responder, origem: process.env.WEB_ORIGIN || false, limite: 10 }));

export default app;
