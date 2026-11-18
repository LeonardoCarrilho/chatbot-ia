# 🤖 ChatBot com IA

Chat com inteligência artificial: front-end em **React**, back-end em **Node.js + Express** e respostas do **Google Gemini**.

```
React (web)  →  Express (server)  →  API do Gemini
```
A chave da API fica só no servidor; o navegador nunca a vê.

## Funcionalidades
- Conversa com histórico (a IA lembra do contexto)
- Indicador de "digitando", rolagem automática e sugestões de perguntas
- Enter envia, Shift+Enter quebra linha
- Validação das mensagens, limite de requisições por IP e erros sem expor detalhes internos
- Testes do servidor com `node:test` e IA simulada (`cd server && npm test`)

## Como rodar
1. Crie uma chave no [Google AI Studio](https://aistudio.google.com/apikey).
2. Servidor:
   ```bash
   cd server
   cp .env.example .env   # cole a chave em GEMINI_API_KEY
   npm install && npm start            # http://localhost:3001
   ```
3. Front-end:
   ```bash
   cd web
   npm install && npm run dev          # http://localhost:5173
   ```
Requer Node.js 20.6 ou mais recente.

Projeto do módulo bônus de projetos full stack do curso Full Stack Turbo (TipsCode).
