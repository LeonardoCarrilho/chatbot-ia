import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "/api");
const SUGESTOES = ["Explique o que é uma API REST", "Me dê 3 dicas para estudar JavaScript", "O que é o hook useEffect?"];

// Conversa de exemplo exibida na primeira visita, para mostrar o app em uso.
const EXEMPLO = [
  { papel: "usuario", texto: "Qual a diferença entre let e const no JavaScript?" },
  { papel: "bot", texto: "As duas criam variáveis com escopo de bloco. A diferença está na reatribuição:\n\n• let permite trocar o valor depois: let total = 0; total = 10;\n• const não permite reatribuir: const taxa = 0.1; taxa = 0.2 gera erro.\n\nUm detalhe: const impede trocar a referência, não o conteúdo. Um array declarado com const ainda aceita push.\n\nRegra prática: use const por padrão e let só quando o valor precisar mudar." },
  { papel: "usuario", texto: "Me dá um exemplo com array?" },
  { papel: "bot", texto: "Claro:\n\nconst frutas = [\"maçã\"];\nfrutas.push(\"banana\"); // funciona: muda o conteúdo\nfrutas = [\"uva\"];      // erro: tenta trocar a referência\n\nO array continua sendo o mesmo objeto, só ganhou um item novo." },
];

export default function App() {
  const [mensagens, setMensagens] = useState(EXEMPLO);
  const [exemplo, setExemplo] = useState(true);
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
    const base = exemplo ? [] : mensagens;
    setExemplo(false);
    const historico = [...base, { papel: "usuario", texto: pergunta }].slice(-30);
    setMensagens(historico);
    setTexto("");
    setErro("");
    setCarregando(true);
    try {
      const r = await fetch(`${API}/chat`, {
        signal: AbortSignal.timeout(60000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico }),
      });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.erro || "Erro ao responder.");
      setMensagens((m) => [...m, { papel: "bot", texto: dados.resposta }]);
    } catch (e) {
      setErro(
        e.name === "TimeoutError" ? "A IA demorou demais para responder. Tente de novo."
          : e.message === "Failed to fetch" ? "Servidor indisponível. Ele está rodando?"
          : e instanceof SyntaxError ? "O servidor não respondeu corretamente. Tente de novo."
          : e.message
      );
      setMensagens((m) => m.slice(0, -1));
      setTexto(pergunta);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Conversa <span>com IA</span></h1>
        {mensagens.length > 0 && (
          <button className="limpar" onClick={() => { setMensagens([]); setExemplo(false); setErro(""); }}>Nova conversa</button>
        )}
      </header>

      <main className="conversa" aria-live="polite">
        {mensagens.length === 0 && (
          <div className="boas-vindas">
            <p>Pergunte qualquer coisa. Algumas ideias:</p>
            {SUGESTOES.map((s) => (
              <button key={s} className="sugestao" onClick={() => enviar(s)}>{s}</button>
            ))}
          </div>
        )}
        {exemplo && <p className="aviso-exemplo">Exemplo de conversa. Escreva abaixo para começar a sua.</p>}
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
          placeholder="Escreva sua mensagem. Enter envia, Shift+Enter pula linha."
          aria-label="Mensagem"
          rows={1}
          maxLength={4000}
        />
        <button type="submit" disabled={carregando || !texto.trim()}>Enviar</button>
      </form>
      <footer>Feito por Leonardo Carrilho com React, Node.js e Gemini.</footer>
    </div>
  );
}
