import { test } from "node:test";
import assert from "node:assert/strict";
import { criarApp } from "../app.js";
import { criarGemini } from "../gemini.js";

async function subir(opcoes) {
  const servidor = await new Promise((ok) => {
    const s = criarApp(opcoes).listen(0, () => ok(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const chat = async (mensagens) => {
    const r = await fetch(`${base}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensagens }),
    });
    return { status: r.status, json: await r.json() };
  };
  return { chat, fechar: () => servidor.close() };
}

test("encaminha o histórico para a IA e devolve a resposta", async () => {
  let recebido;
  const { chat, fechar } = await subir({ responder: async (m) => ((recebido = m), "Olá! Falo português, sim.") });
  const historico = [
    { papel: "usuario", texto: "oi" },
    { papel: "bot", texto: "Olá!" },
    { papel: "usuario", texto: "fala português?" },
  ];
  const r = await chat(historico);
  assert.equal(r.status, 200);
  assert.equal(r.json.resposta, "Olá! Falo português, sim.");
  assert.deepEqual(recebido, historico);
  fechar();
});

test("valida as mensagens", async () => {
  const { chat, fechar } = await subir({ responder: async () => "x" });
  assert.equal((await chat([])).status, 400);
  assert.equal((await chat([{ papel: "bot", texto: "oi" }])).status, 400);
  assert.equal((await chat([{ papel: "usuario", texto: "a".repeat(5000) }])).status, 400);
  fechar();
});

test("erro da IA vira 502 sem vazar detalhes", async () => {
  const { chat, fechar } = await subir({ responder: async () => { throw new Error("API key inválida: AIza..."); } });
  const r = await chat([{ papel: "usuario", texto: "oi" }]);
  assert.equal(r.status, 502);
  assert.doesNotMatch(r.json.erro, /AIza/);
  fechar();
});

test("limita requisições por minuto", async () => {
  const { chat, fechar } = await subir({ responder: async () => "ok", limite: 2 });
  const msg = [{ papel: "usuario", texto: "oi" }];
  await chat(msg);
  await chat(msg);
  assert.equal((await chat(msg)).status, 429);
  fechar();
});

test("cliente Gemini monta a requisição e lê a resposta", async () => {
  let pedido;
  const fetchFalso = async (url, opcoes) => {
    pedido = { url, opcoes, corpo: JSON.parse(opcoes.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Oi!" }] } }] }), { status: 200 });
  };
  const responder = criarGemini({ chave: "teste", modelo: "modelo-x", fetchFn: fetchFalso });
  const texto = await responder([{ papel: "usuario", texto: "oi" }, { papel: "bot", texto: "olá" }, { papel: "usuario", texto: "tudo bem?" }]);
  assert.equal(texto, "Oi!");
  assert.match(pedido.url, /models\/modelo-x:generateContent$/);
  assert.equal(pedido.opcoes.headers["x-goog-api-key"], "teste");
  assert.deepEqual(pedido.corpo.contents.map((c) => c.role), ["user", "model", "user"]);
});

const respostaGemini = (status, corpo) => new Response(JSON.stringify(corpo), { status });
const ok = (texto) => respostaGemini(200, { candidates: [{ content: { parts: [{ text: texto }] } }] });
const sobrecarga = () => respostaGemini(503, { error: { message: "high demand" } });

test("em sobrecarga, tenta de novo e depois usa o modelo reserva", async () => {
  const urls = [];
  const respostas = [sobrecarga(), sobrecarga(), ok("Resposta do reserva")];
  const fetchFalso = async (url) => (urls.push(url), respostas.shift());
  const responder = criarGemini({ chave: "k", modelo: "principal", reserva: "reserva", pausaMs: 1, fetchFn: fetchFalso });
  assert.equal(await responder([{ papel: "usuario", texto: "oi" }]), "Resposta do reserva");
  assert.equal(urls.length, 3);
  assert.match(urls[0], /principal/);
  assert.match(urls[1], /principal/);
  assert.match(urls[2], /reserva/);
});

test("erro definitivo (chave inválida) não é repetido", async () => {
  let chamadas = 0;
  const fetchFalso = async () => (chamadas++, respostaGemini(400, { error: { message: "API key not valid" } }));
  const responder = criarGemini({ chave: "k", pausaMs: 1, fetchFn: fetchFalso });
  await assert.rejects(responder([{ papel: "usuario", texto: "oi" }]), /API key not valid/);
  assert.equal(chamadas, 1);
});

test("sobrecarga persistente vira 503 com mensagem amigável", async () => {
  const responder = criarGemini({ chave: "k", pausaMs: 1, fetchFn: async () => sobrecarga() });
  const { chat, fechar } = await subir({ responder });
  const r = await chat([{ papel: "usuario", texto: "oi" }]);
  assert.equal(r.status, 503);
  assert.match(r.json.erro, /muita demanda/);
  fechar();
});

test("chamada que não responde é interrompida e conta como sobrecarga", async () => {
  // fetch que só termina quando o sinal de tempo-limite dispara
  const travado = (url, { signal }) =>
    new Promise((_, falhar) => signal.addEventListener("abort", () => falhar(signal.reason)));
  const responder = criarGemini({ chave: "k", limiteMs: 50, pausaMs: 1, fetchFn: travado });
  const inicio = Date.now();
  await assert.rejects(responder([{ papel: "usuario", texto: "oi" }]), (e) => e.sobrecarga && /sem resposta/.test(e.message));
  assert.ok(Date.now() - inicio < 2000);
});

test("cliente Gemini exige a chave", () => {
  assert.throws(() => criarGemini({ chave: "" }), /GEMINI_API_KEY/);
});
