# Wiki-Bíblia — versão hospedada de forma independente

Este pacote tem tudo que você precisa para colocar o Wiki-Bíblia no ar,
fora do Claude, com uma chave de API real da Anthropic por trás.

```
wiki-biblia-standalone/
├── index.html          → a página (frontend)
├── api/
│   └── gerar.js         → função de servidor que chama a Anthropic com sua chave
├── package.json
├── .env.example
└── .gitignore
```

A chave de API **nunca** fica no navegador do usuário — ela mora apenas no
servidor (`api/gerar.js`), lida de uma variável de ambiente. O frontend só
conversa com `/api/gerar`, que é o seu próprio backend.

---

## 1. Antes de começar

A página tem um seletor de **provedor de IA** (Claude, Groq ou Gemini). Você
só precisa configurar a chave do(s) provedor(es) que pretende disponibilizar
— se não configurar uma chave, aquela opção simplesmente retorna erro quando
selecionada, sem afetar as outras.

- **Claude (Anthropic)** — console.anthropic.com → "API Keys". Cobrança por
  uso; é o único dos três com pesquisa real na web ativada neste projeto.
- **Groq — openai/gpt-oss-120b** — console.groq.com → "API Keys". A Groq tem
  uma camada gratuita com limites de taxa (requisições por minuto/dia); dá
  para gerar estudos sem custo dentro desses limites.
- **Google Gemini — gemini-3.6-flash** — aistudio.google.com/apikey. O Gemini
  também tem uma camada gratuita com limites de taxa.

Em todos os casos, confira os limites e termos atuais de cada provedor antes
de divulgar a página publicamente, pois eles mudam com frequência.

- **Conta na Vercel** (gratuita): vercel.com — é a forma mais simples de
  hospedar isso, porque já roda arquivos estáticos e funções de servidor
  juntos, sem configuração extra.

---

## 2. Opção A — sem usar terminal (recomendado)

1. Crie um repositório novo no GitHub e suba estes arquivos para ele
   (pelo próprio site do GitHub: "Add file" → "Upload files").
2. Entre em vercel.com, clique em **Add New → Project** e importe esse
   repositório.
3. Antes de clicar em "Deploy", abra **Environment Variables** e adicione as
   chaves dos provedores que você for usar (pode adicionar só uma, ou as
   três):
   - `ANTHROPIC_API_KEY` — começa com `sk-ant-...`
   - `GROQ_API_KEY` — começa com `gsk_...`
   - `GEMINI_API_KEY` — chave do Google AI Studio
4. Clique em **Deploy**. Em cerca de 1 minuto, a Vercel te entrega uma URL
   pública, algo como `https://wiki-biblia-seunome.vercel.app`.
5. Pronto — abra a URL e teste o botão "Gerar estudo".

---

## 3. Opção B — usando terminal (CLI da Vercel)

```bash
npm install -g vercel
cd wiki-biblia-standalone
vercel login
vercel                       # primeiro deploy (ambiente de preview)
vercel env add ANTHROPIC_API_KEY   # repita para GROQ_API_KEY e GEMINI_API_KEY,
                                    # conforme os provedores que for usar
vercel --prod                # deploy final, em produção
```

---

## 4. Testando localmente antes de publicar (opcional)

```bash
npm install -g vercel
cd wiki-biblia-standalone
cp .env.example .env.local   # e edite .env.local com sua chave real
vercel dev
```

Isso abre o site em `http://localhost:3000` já com a função `/api/gerar`
funcionando.

---

## 5. Segurança e custo — pontos de atenção

- **Nunca** coloque a chave de API diretamente no `index.html` — ela ficaria
  visível a qualquer pessoa que abrisse o código-fonte da página.
- Como essa página fica pública, qualquer visitante pode clicar em "Gerar
  estudo" e consumir créditos da sua chave. Se for compartilhar o link
  amplamente, considere:
  - Ativar a **proteção por senha** da Vercel (planos pagos), ou
  - Adicionar uma verificação simples no `api/gerar.js` (por exemplo, exigir
    um cabeçalho/senha compartilhada que só quem você autorizar conhece).
- Cada geração faz até 8 chamadas encadeadas à Anthropic (para não cortar o
  estudo pela metade) — isso é normal e está previsto no código, mas
  significa que o custo por estudo gerado é um pouco maior que uma única
  chamada.

---

## 6. Trocar de host (alternativas à Vercel)

A estrutura (`index.html` estático + uma função que recebe POST e chama a
Anthropic) funciona, com pequenos ajustes de sintaxe, em qualquer lugar que
rode funções serverless em Node.js:

- **Netlify Functions** — mova `api/gerar.js` para `netlify/functions/gerar.js`
  e troque `module.exports = async function handler(req, res)` pela assinatura
  do Netlify (`exports.handler = async (event) => {...}`).
- **Cloudflare Pages Functions** — pasta `functions/api/gerar.js`, assinatura
  `export async function onRequestPost(context) {...}`.
- **Servidor próprio (VPS)** — rode com Express/Node normal, servindo
  `index.html` como estático e `api/gerar.js` como uma rota `POST /api/gerar`.
