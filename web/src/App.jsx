import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SUGESTOES = ["Explique o que é uma API REST", "Me dê 3 dicas para estudar JavaScript", "O que é o hook useEffect?"];

export default function App() {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const fim = useRef(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, carregando]);

  async function enviar(conteudo) {
    const pergunta = conteudo.trim();
    if (!pergunta || carregando) return;
    const historico = [...mensagens, { papel: "usuario", texto: pergunta }].slice(-30);
    setMensagens(historico);
    setTexto("");
    setErro("");
    setCarregando(true);
    try {
      const r = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Erro ao responder.");
      setMensagens((m) => [...m, { papel: "bot", texto: dados.resposta }]);
    } catch (e) {
      setErro(e.message === "Failed to fetch" ? "Servidor indisponível. Ele está rodando?" : e.message);
      setMensagens((m) => m.slice(0, -1));
      setTexto(pergunta);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>🤖 ChatBot com IA</h1>
        {mensagens.length > 0 && (
          <button className="limpar" onClick={() => { setMensagens([]); setErro(""); }}>Nova conversa</button>
        )}
      </header>

      <main className="conversa" aria-live="polite">
        {mensagens.length === 0 && (
          <div className="boas-vindas">
            <p>Olá! Pergunte qualquer coisa. Algumas ideias:</p>
            {SUGESTOES.map((s) => (
              <button key={s} className="sugestao" onClick={() => enviar(s)}>{s}</button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={`balao ${m.papel}`}>{m.texto}</div>
        ))}
        {carregando && <div className="balao bot digitando"><span /><span /><span /></div>}
        <div ref={fim} />
      </main>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <form className="entrada" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(texto); }
          }}
          placeholder="Digite sua mensagem (Enter envia, Shift+Enter quebra linha)"
          aria-label="Mensagem"
          rows={1}
          maxLength={4000}
        />
        <button type="submit" disabled={carregando || !texto.trim()}>Enviar</button>
      </form>
      <footer>Feito por Leonardo Carrilho · React, Node.js e Gemini</footer>
    </div>
  );
}
