# DesignHub 🎨

Seu app de gestão para designers — CRM, Agenda, Financeiro, Portfólio, Notas e Horas trabalhadas.
Dados sincronizados na nuvem via **Supabase** — acesse do PC, celular ou notebook.

---

## Passo a Passo Completo

### PARTE 1 — Criar o banco de dados (Supabase)

**1.** Acesse https://supabase.com → clique em **"Start your project"**
- Crie conta grátis (pode entrar com GitHub ou Google)

**2.** Clique em **"New Project"**
- Nome: `designhub`
- Escolha a região: **South America (São Paulo)**
- Clique **Create new project** e aguarde ~2 minutos

**3.** No menu esquerdo, clique em **"SQL Editor"** → **"New query"**
- Abra o arquivo `setup.sql` desta pasta, copie tudo e cole no editor
- Clique em **"Run"** — você verá "Success" para cada tabela ✓

**4.** Pegue suas credenciais:
- Menu esquerdo → **"Project Settings"** → **"API"**
- Copie a **Project URL** (ex: `https://abcxyz.supabase.co`)
- Copie a **anon public key** (texto longo começando com `eyJ...`)

---

### PARTE 2 — Publicar no Vercel

**5.** Crie conta no GitHub: https://github.com
- Crie repositório novo chamado `designhub` (pode ser privado)
- Clique em **"uploading an existing file"**, extraia o ZIP e envie todos os arquivos

**6.** Acesse https://vercel.com → crie conta com GitHub → **"Add New Project"**
- Selecione o repositório `designhub`
- Antes de clicar Deploy, adicione em **"Environment Variables"**:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | Project URL do passo 4 |
| `VITE_SUPABASE_ANON_KEY` | anon key do passo 4 |

- Clique **Deploy** → aguarde ~1 minuto → seu site está no ar 🚀

---

## Como os dados ficam salvos

| Situação | O que acontece |
|----------|----------------|
| Adiciona um lead | Salvo instantaneamente no Supabase |
| Abre no celular | Carrega todos os dados da nuvem |
| Sem internet | Funciona com dados locais (localStorage) |

O indicador no topo mostra: 🟢 **Nuvem ✓** quando tudo está salvo.

---

## Estrutura do projeto

```
designhub/
├── .env.example        ← modelo das variáveis
├── index.html
├── vite.config.js
├── package.json
├── vercel.json
├── setup.sql           ← ⚠️ rode isso no Supabase primeiro!
└── src/
    ├── main.jsx
    ├── App.jsx
    └── lib/
        └── supabase.js
```
