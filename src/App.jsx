// ══════════════════════════════════════════════════════
// SCRIPT DE PATCH — adiciona Prospecção ao App.jsx
// ══════════════════════════════════════════════════════
//
// Como usar:
//   1. Coloque este arquivo na pasta raiz do projeto (onde está o package.json)
//   2. No terminal, rode:  node aplicar_prospeccao.js
//   3. Ele vai gerar um arquivo App_novo.jsx com as 3 mudanças
//   4. Confira se ficou certo e renomeie para App.jsx
//
// ══════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

const inputPath  = path.join(__dirname, "src", "App.jsx");
const outputPath = path.join(__dirname, "src", "App_novo.jsx");

if (!fs.existsSync(inputPath)) {
  console.error("❌ Não encontrei src/App.jsx. Certifique-se de rodar na pasta raiz do projeto.");
  process.exit(1);
}

let content = fs.readFileSync(inputPath, "utf-8");

let changes = 0;

// ── MUDANÇA 1: import ─────────────────────────────────────────────────────
const imp_old = `import { supabase, dbReady } from './lib/supabase.js';`;
const imp_new = `import { supabase, dbReady } from './lib/supabase.js';
import { Prospeccao } from './Prospeccao';`;

if (content.includes(imp_old) && !content.includes("import { Prospeccao }")) {
  content = content.replace(imp_old, imp_new);
  changes++;
  console.log("✅ Mudança 1: import adicionado");
} else if (content.includes("import { Prospeccao }")) {
  console.log("⚠️  Mudança 1: import já existe, pulando");
} else {
  console.error("❌ Mudança 1: não encontrei a linha do import do supabase. Verifique o arquivo.");
}

// ── MUDANÇA 2: item no array nav ──────────────────────────────────────────
const nav_old = `    { id:"leads",           label:"CRM · Leads",`;
const nav_new = `    { id:"prospeccao",       label:"Prospecção 🎯",    icon:"leads",     sec:"gestao"    },
    { id:"leads",           label:"CRM · Leads",`;

if (content.includes(nav_old) && !content.includes(`id:"prospeccao"`)) {
  content = content.replace(nav_old, nav_new);
  changes++;
  console.log("✅ Mudança 2: item 'prospeccao' adicionado no nav");
} else if (content.includes(`id:"prospeccao"`)) {
  console.log("⚠️  Mudança 2: 'prospeccao' já existe no nav, pulando");
} else {
  console.error("❌ Mudança 2: não encontrei o item 'leads' no array nav.");
}

// ── MUDANÇA 3: renderização da view ───────────────────────────────────────
const view_old = `          {view==="leads"          && <Leads leads={leads}`;
const view_new = `          {view==="prospeccao"     && <Prospeccao/>}
          {view==="leads"          && <Leads leads={leads}`;

if (content.includes(view_old) && !content.includes(`view==="prospeccao"`)) {
  content = content.replace(view_old, view_new);
  changes++;
  console.log("✅ Mudança 3: view 'prospeccao' adicionada");
} else if (content.includes(`view==="prospeccao"`)) {
  console.log("⚠️  Mudança 3: view 'prospeccao' já existe, pulando");
} else {
  console.error("❌ Mudança 3: não encontrei o bloco de renderização de 'leads'.");
}

// ── Salva resultado ───────────────────────────────────────────────────────
fs.writeFileSync(outputPath, content, "utf-8");

console.log(`\n${changes === 3 ? "🎉" : "⚠️ "} ${changes}/3 mudanças aplicadas`);
console.log(`📄 Arquivo gerado: src/App_novo.jsx`);
console.log("");

if (changes === 3) {
  console.log("Próximos passos:");
  console.log("  1. Abra src/App_novo.jsx e confira se está correto");
  console.log("  2. Renomeie App.jsx para App_backup.jsx (segurança)");
  console.log("  3. Renomeie App_novo.jsx para App.jsx");
  console.log("  4. Rode npm run dev — o menu Prospecção 🎯 vai aparecer!");
} else {
  console.log("Algumas mudanças não foram aplicadas automaticamente.");
  console.log("Aplique manualmente as que falharam seguindo as instruções no README.");
}
