// ══════════════════════════════════════════════════════════════════════════════
// PROSPECÇÃO — Módulo FluxioHUB  (com Supabase)
// ══════════════════════════════════════════════════════════════════════════════
//
// COMO INTEGRAR NO App.jsx — só 3 linhas:
//
// 1) No topo do App.jsx, após os outros imports:
//       import { Prospeccao } from './Prospeccao';
//
// 2) No array `nav`, antes da linha do "leads":
//       { id:"prospeccao", label:"Prospecção 🎯", icon:"leads", sec:"gestao" },
//
// 3) Onde ficam as views (perto do fim do App.jsx), antes do {view==="leads"...}:
//       {view==="prospeccao" && <Prospeccao/>}
//
// BANCO DE DADOS: rode o arquivo criar_tabela_prospects.sql no Supabase primeiro!
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { supabase, dbReady } from './lib/supabase.js';

// ─── Dados fixos ──────────────────────────────────────────────────────────────
const STAGES = [
  { id:"identificado", label:"Identificado",  color:"#6366f1", icon:"🔍" },
  { id:"abordado",     label:"Abordado",      color:"#f59e0b", icon:"📩" },
  { id:"respondeu",    label:"Respondeu",     color:"#8b5cf6", icon:"💬" },
  { id:"followup",     label:"Follow-up",     color:"#ef4444", icon:"🔁" },
  { id:"proposta",     label:"Proposta",      color:"#06b6d4", icon:"📋" },
  { id:"fechado",      label:"Fechado 🎉",    color:"#10b981", icon:"✅" },
  { id:"perdido",      label:"Perdido",       color:"#64748b", icon:"❌" },
];

const CANAIS = ["Instagram/DM","WhatsApp","LinkedIn","Email","Indicação","Pessoalmente"];

const CANAL_ICON = {
  "Instagram/DM":"📸","WhatsApp":"💬","LinkedIn":"💼",
  "Email":"📧","Indicação":"🤝","Pessoalmente":"🤙",
};

const NICHOS = [
  { nome:"Clínicas de estética",    dor:"Site antiquado, sem antes/depois, sem agendamento online" },
  { nome:"Advogados solo",          dor:"Logo genérica, sem diferenciação, parece escritório de 2010" },
  { nome:"Nutricionistas",          dor:"Feed sem identidade visual consistente" },
  { nome:"Coaches e mentores",      dor:"Foto de perfil amadora, materiais visuais fracos" },
  { nome:"Dentistas",               dor:"Site não transmite confiança, sem depoimentos visíveis" },
  { nome:"Psicólogos",              dor:"Presença digital quase zero, sem identidade profissional" },
  { nome:"Personal trainers",       dor:"Brand confuso, mistura vários estilos sem coesão" },
  { nome:"Salões de beleza",        dor:"Cardápio de serviços visualmente pobre, sem personalidade" },
  { nome:"Arquitetos",              dor:"Portfólio mal apresentado, fotos sem tratamento" },
  { nome:"Restaurantes novos",      dor:"Cardápio digital horrível, logo feita no Canva" },
  { nome:"Pet shops",               dor:"Visual genérico, sem charme, igual a qualquer outro pet" },
  { nome:"Consultores financeiros", dor:"Não transmitem credibilidade visualmente, muito texto" },
  { nome:"Fotógrafos",              dor:"Site lento, mal organizado, portfólio sem narrativa" },
  { nome:"Academias boutique",      dor:"Identidade visual genérica, igual a 50 outras academias" },
  { nome:"Lojas de roupa locais",   dor:"Instagram sem estética definida, fotos de celular ruim" },
  { nome:"Makers e artesãos",       dor:"Embalagem e identidade que não valorizam o produto" },
];

const ABORDAGENS = [
  { id:"roast",      icon:"🔥", nome:"Roast Gentil",        desc:"Aponta algo fraco com bom humor. Eles gargalham e contratam.", instrucao:"Comece com uma observação específica e engraçada sobre algo fraco no visual deles. Seja como um amigo sendo honesto. NÃO seja genérico. Personalize para o segmento e nome do prospect." },
  { id:"diagnostico",icon:"🎁", nome:"Diagnóstico Grátis",  desc:"Oferece valor antes de pedir qualquer coisa. Sem pitch.",      instrucao:"Ofereça um diagnóstico gratuito de 15 min do visual/marca deles. Mencione 1-2 pontos específicos do segmento. Tom: 'não estou te vendendo nada, só quero mostrar o que vejo'. Máx 4 linhas." },
  { id:"gancho",     icon:"🪝", nome:"Gancho de Curiosidade",desc:"Começa sem revelar que é designer. Desperta curiosidade.",      instrucao:"Comece com pergunta ou observação que desperta curiosidade genuína sobre o negócio deles. Só depois mencione que é designer." },
  { id:"conselho",   icon:"🤔", nome:"Pedido de Conselho",   desc:"Você pede a opinião deles. Psicologia reversa — adoram isso.",  instrucao:"Aborde pedindo a opinião deles sobre algo do segmento. Parece perspectiva de cliente. Só no final mencione que é designer." },
  { id:"historia",   icon:"📖", nome:"Mini-história",        desc:"Uma história rápida de como transformou alguém do mesmo segmento.", instrucao:"Mini-história de 3-4 linhas sobre como ajudou negócio parecido. Pode ser fictício mas realista. Foque na transformação e resultado." },
  { id:"direto",     icon:"⚡", nome:"Direto e Real",        desc:"Zero enrolação, zero corporativês. Só você sendo humano.",     instrucao:"Seja completamente direto e humano. Zero papo de vendedor, zero formalidade. Fale como numa festa. Máximo 3 linhas. Sem emoji em excesso." },
  { id:"provocacao", icon:"😏", nome:"Provocação",           desc:"Um desafio leve. Funciona com empreendedores confiantes.",     instrucao:"Lance provocação leve — 'aposto que nunca pensaram no quanto o visual está custando clientes'. Tom confiante, não arrogante." },
  { id:"reativacao", icon:"🔄", nome:"Reativação",           desc:"Para contatos frios. Retoma sem ser chato.",                   instrucao:"Follow-up para quem esfriou. NÃO mencione tentativas anteriores. Aborde como se tivesse pensado neles por um motivo genuíno agora." },
];

// ─── Chama Claude API ─────────────────────────────────────────────────────────
function callClaude(messages, system = "", maxTokens = 1000) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  })
    .then(r => r.json())
    .then(d => d.content?.[0]?.text || "");
}

function diasAtras(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function Badge({ dias, stage }) {
  if (["fechado","perdido"].includes(stage)) return null;
  if (dias === null)    return <span style={bs("#6366f1","#818cf8")}>Novo</span>;
  if (dias >= 7)  return <span style={bs("#ef4444","#ef4444")}>⚠️ {dias}d sumido</span>;
  if (dias >= 3)  return <span style={bs("#f59e0b","#f59e0b")}>🕐 {dias}d atrás</span>;
  return <span style={bs("#10b981","#10b981")}>✓ Em dia</span>;
}
function bs(bg, color) {
  return { background:`${bg}18`, color, fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:700 };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function Pipeline({ prospects, setProspects, onMensagem }) {
  const [filtro,   setFiltro]   = useState("todos");
  const [showAdd,  setShowAdd]  = useState(false);
  const [expanded, setExpanded] = useState(null);
  const form = useRef({ name:"", segment:"", canal:"Instagram/DM", referral:"", notes:"" });

  const urgentes = prospects.filter(p =>
    !["fechado","perdido"].includes(p.stage) && diasAtras(p.last_contact) >= 5
  );
  const filtrados = prospects.filter(p => filtro === "todos" || p.stage === filtro);

  function adicionar() {
    const d = { ...form.current };
    if (!d.name.trim()) return;
    setProspects(prev => [...prev, {
      id: Date.now(), ...d, stage:"identificado",
      last_contact: null, created_at: new Date().toISOString(),
    }]);
    setShowAdd(false);
    form.current = { name:"", segment:"", canal:"Instagram/DM", referral:"", notes:"" };
  }

  const btn = (bg, color, border) => ({
    background: bg, border:`1px solid ${border}`, borderRadius:8, padding:"7px 13px",
    color, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
  });

  return (
    <div>
      {urgentes.length > 0 && (
        <div style={{ background:"#ef444412", border:"1px solid #ef444330", borderRadius:12, padding:"12px 16px", marginBottom:18 }}>
          <span style={{ color:"#ef4444", fontWeight:700, fontSize:13 }}>
            🚨 {urgentes.length} prospect{urgentes.length>1?"s":""} sem contato há 5+ dias:
          </span>
          <span style={{ color:"#ef444480", fontSize:12, marginLeft:8 }}>{urgentes.map(p=>p.name).join(", ")}</span>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {[{ id:"todos", label:`Todos (${prospects.length})`, color:"#6366f1" }, ...STAGES].map(s => (
            <button key={s.id} onClick={() => setFiltro(s.id)}
              style={{ background:filtro===s.id?`${s.color}20`:"transparent", border:`1px solid ${filtro===s.id?s.color:"#2a2a45"}`, borderRadius:20, padding:"5px 14px", color:filtro===s.id?s.color:"#6a6a8a", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit" }}>
              {s.icon||""} {s.label || `${s.label} (${prospects.filter(p=>p.stage===s.id).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:10, padding:"9px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px #7c3aed40" }}>
          + Novo Prospect
        </button>
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#3a3a5a" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🌱</div>
          <div style={{ fontSize:15 }}>Nenhum prospect aqui ainda</div>
          <div style={{ fontSize:12, marginTop:4 }}>Use "Quem Abordar" para encontrar nichos</div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtrados.map(p => {
          const stage = STAGES.find(s => s.id === p.stage) || STAGES[0];
          const dias  = diasAtras(p.last_contact);
          const aberto = expanded === p.id;
          return (
            <div key={p.id}
              onClick={() => setExpanded(aberto ? null : p.id)}
              style={{ background:"#13131f", border:`1px solid ${aberto?"#6366f1":"#1e1e30"}`, borderRadius:13, padding:"14px 16px", cursor:"pointer", transition:"border-color .15s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:700, fontSize:15, color:"#e8e6f0" }}>{p.name}</span>
                    <span style={{ fontSize:12, color:"#5a5a7a" }}>{CANAL_ICON[p.canal]} {p.canal}</span>
                    <Badge dias={dias} stage={p.stage}/>
                  </div>
                  {p.segment  && <div style={{ fontSize:12, color:"#5a5a7a", marginTop:3 }}>{p.segment}{p.referral?` · via ${p.referral}`:""}</div>}
                  {p.notes    && <div style={{ fontSize:11, color:"#3a3a5a", marginTop:3, fontStyle:"italic" }}>"{p.notes}"</div>}
                </div>
                <div style={{ background:`${stage.color}20`, color:stage.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, flexShrink:0, marginLeft:10 }}>
                  {stage.icon} {stage.label}
                </div>
              </div>

              {aberto && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #2a2a45" }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Mover para:</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                    {STAGES.map(s => (
                      <button key={s.id}
                        onClick={() => setProspects(prev => prev.map(x => x.id===p.id ? {...x, stage:s.id, last_contact:new Date().toISOString()} : x))}
                        style={{ background:p.stage===s.id?s.color:"#1a1a2e", border:`1px solid ${s.color}40`, borderRadius:7, padding:"4px 10px", color:p.stage===s.id?"#fff":s.color, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button style={btn("#10b98120","#10b981","#10b98140")}
                      onClick={() => setProspects(prev => prev.map(x => x.id===p.id ? {...x, last_contact:new Date().toISOString()} : x))}>
                      ✓ Contato feito hoje
                    </button>
                    <button style={btn("#6366f120","#818cf8","#6366f140")}
                      onClick={() => onMensagem(p)}>
                      ✍️ Criar mensagem
                    </button>
                    <button style={btn("#ef444415","#ef4444","#ef444430")}
                      onClick={() => window.confirm("Remover?") && setProspects(prev => prev.filter(x => x.id!==p.id))}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal adicionar */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#13131f", border:"1px solid #2a2a45", borderRadius:20, padding:28, width:420, maxWidth:"92vw" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ color:"#e8e6f0", fontWeight:800, fontSize:18, fontFamily:"'Syne',sans-serif" }}>Novo Prospect</span>
              <button onClick={() => setShowAdd(false)} style={{ background:"none", border:"none", color:"#5a5a7a", cursor:"pointer", fontSize:24 }}>×</button>
            </div>
            {[
              { label:"Nome / Empresa *", key:"name",     ph:"Ex: Studio Ana Lima" },
              { label:"Segmento",         key:"segment",  ph:"Ex: Nutricionista, Dentista..." },
              { label:"Indicado por",     key:"referral", ph:"Quem te indicou? (opcional)" },
              { label:"Observações",      key:"notes",    ph:"Qualquer detalhe útil..." },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>{f.label}</div>
                <input defaultValue={form.current[f.key]} onChange={e => form.current[f.key] = e.target.value} placeholder={f.ph}
                  style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"9px 13px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
              </div>
            ))}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Canal</div>
              <select defaultValue="Instagram/DM" onChange={e => form.current.canal = e.target.value}
                style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"9px 13px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
                {CANAIS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowAdd(false)}
                style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:10, padding:10, color:"#6a6a8a", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flex:1 }}>
                Cancelar
              </button>
              <button onClick={adicionar}
                style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:10, padding:10, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", flex:2 }}>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUEM ABORDAR
// ─────────────────────────────────────────────────────────────────────────────
function QuemAbordar({ onAdd }) {
  const [aiNichos,   setAiNichos]   = useState([]);
  const [loadNichos, setLoadNichos] = useState(false);
  const [diagUrl,    setDiagUrl]    = useState("");
  const [diagRes,    setDiagRes]    = useState("");
  const [loadDiag,   setLoadDiag]   = useState(false);

  async function gerarNichos() {
    setLoadNichos(true); setAiNichos([]);
    const txt = await callClaude(
      [{ role:"user", content:`8 tipos de negócios locais no Brasil em 2026 com maior urgência para melhorar design/identidade visual e que pagam bem por isso.
Responda APENAS JSON sem markdown:
[{"nicho":"","dor":"problema visual em 1 frase","oportunidade":"por que pagam bem","abordagem":"como o designer aparece para eles em 1 frase"}]` }],
      "Responda apenas JSON puro. Sem markdown, sem texto fora do JSON.", 1500
    );
    try { setAiNichos(JSON.parse(txt.replace(/```json|```/g,"").trim())); }
    catch { setAiNichos([{ nicho:"Erro", dor:"Tente novamente", oportunidade:"", abordagem:"" }]); }
    setLoadNichos(false);
  }

  async function diagnosticar() {
    if (!diagUrl) return;
    setLoadDiag(true); setDiagRes("");
    const txt = await callClaude(
      [{ role:"user", content:`Analise este negócio para um designer freelancer prospectar: ${diagUrl}

Como designer experiente, seja direto sobre:
1. O que está VISIVELMENTE fraco no design/identidade visual
2. A DOR REAL que isso causa (perda de clientes, falta de credibilidade)
3. O GANCHO perfeito — uma observação específica que vai fazer eles ouvirem

Máx 150 palavras. Seja cirúrgico, não genérico.` }],
      "Você é um designer freelancer experiente fazendo análise de prospecção."
    );
    setDiagRes(txt); setLoadDiag(false);
  }

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#6d28d915,#13131f)", border:"1px solid #6366f130", borderRadius:16, padding:"20px 22px", marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#e8e6f0", marginBottom:6 }}>🔍 Diagnóstico de Dor com IA</div>
        <div style={{ fontSize:13, color:"#6a6a8a", marginBottom:14 }}>Cole o Instagram, site ou nome do negócio. A IA analisa o que está fraco e te dá o gancho perfeito.</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={diagUrl} onChange={e => setDiagUrl(e.target.value)}
            placeholder="@clinicaestetica_sp · www.restaurante.com.br · 'Dentista João Silva'"
            style={{ flex:1, background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          <button onClick={diagnosticar} disabled={!diagUrl || loadDiag}
            style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:9, padding:"10px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:loadDiag?"wait":"pointer", fontFamily:"inherit", opacity:loadDiag?0.7:1, whiteSpace:"nowrap" }}>
            {loadDiag ? "Analisando..." : "Diagnosticar 🎯"}
          </button>
        </div>
        {diagRes && (
          <div style={{ marginTop:14, background:"#0f0f1a", border:"1px solid #6366f130", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:"#818cf8", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Análise</div>
            <div style={{ color:"#e8e6f0", fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{diagRes}</div>
            <button onClick={() => navigator.clipboard.writeText(diagRes)}
              style={{ background:"#6366f115", border:"1px solid #6366f130", borderRadius:7, padding:"6px 12px", color:"#818cf8", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginTop:10 }}>
              📋 Copiar análise
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:12, color:"#5a5a7a", fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Nichos quentes — clique para adicionar no pipeline</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
          {NICHOS.map(n => (
            <button key={n.nome} onClick={() => onAdd(n.nome)} title={`Dor: ${n.dor}`}
              style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:20, padding:"6px 14px", color:"#a0a0c0", fontSize:12, cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#6366f115"; e.currentTarget.style.borderColor="#6366f1"; e.currentTarget.style.color="#818cf8"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="#1a1a2e";   e.currentTarget.style.borderColor="#2a2a45";  e.currentTarget.style.color="#a0a0c0"; }}>
              {n.nome}
            </button>
          ))}
        </div>
      </div>

      <button onClick={gerarNichos} disabled={loadNichos}
        style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:10, padding:"11px 22px", color:"#fff", fontSize:13, fontWeight:700, cursor:loadNichos?"wait":"pointer", fontFamily:"inherit", marginBottom:20, opacity:loadNichos?0.7:1 }}>
        {loadNichos ? "🤖 Analisando mercado..." : "🤖 Gerar oportunidades com IA"}
      </button>

      {aiNichos.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
          {aiNichos.map((n, i) => (
            <div key={i} style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"16px 18px" }}>
              <div style={{ fontWeight:700, fontSize:14, color:"#e8e6f0", marginBottom:6 }}>{n.nicho}</div>
              <div style={{ fontSize:12, color:"#ef4444", background:"#ef444410", borderRadius:7, padding:"5px 10px", marginBottom:8 }}>❗ {n.dor}</div>
              <div style={{ fontSize:12, color:"#10b981", marginBottom:6 }}>💰 {n.oportunidade}</div>
              <div style={{ fontSize:12, color:"#818cf8", background:"#6366f110", borderRadius:7, padding:"6px 10px", marginBottom:10 }}>🎯 {n.abordagem}</div>
              <button onClick={() => onAdd(n.nicho)}
                style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:8, padding:7, color:"#a0a0c0", fontSize:12, cursor:"pointer", fontFamily:"inherit", width:"100%", fontWeight:600 }}>
                + Adicionar ao Pipeline
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR MENSAGEM
// ─────────────────────────────────────────────────────────────────────────────
function CriarMensagem({ selectedProspect, prospects, setProspects }) {
  const [prospect,  setProspect]  = useState(selectedProspect || null);
  const [abordagem, setAbordagem] = useState(ABORDAGENS[0]);
  const [canal,     setCanal]     = useState("Instagram/DM");
  const [extra,     setExtra]     = useState("");
  const [msg,       setMsg]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [copiado,   setCopiado]   = useState(false);

  useEffect(() => { if (selectedProspect) setProspect(selectedProspect); }, [selectedProspect]);

  async function gerar() {
    setLoading(true); setMsg("");
    const txt = await callClaude([{
      role:"user",
      content:`Escreva uma mensagem de prospecção para um designer freelancer brasileiro.

PROSPECT:
- Nome/Empresa: ${prospect?.name || "não informado"}
- Segmento: ${prospect?.segment || "não informado"}
- Canal: ${canal}
${prospect?.referral ? `- Indicado por: ${prospect.referral}` : ""}
${extra ? `- Contexto: ${extra}` : ""}

ABORDAGEM: ${abordagem.nome}
INSTRUÇÃO: ${abordagem.instrucao}

REGRAS ABSOLUTAS:
- NÃO comece com "Olá," ou "Oi," de forma robotizada
- NÃO use "espero que esteja bem" ou "venho por meio desta"
- NÃO escreva como vendedor — escreva como PESSOA
- Seja específico ao segmento, não genérico
- Máx 5 linhas${canal === "Email" ? " (inclua uma linha de assunto)" : ""}`
    }], "Você é um designer freelancer brasileiro criativo que sabe prospectar de forma humana.");
    setMsg(txt); setLoading(false);
  }

  function copiar() {
    navigator.clipboard.writeText(msg);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  const ativos = prospects.filter(p => !["fechado","perdido"].includes(p.stage));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:960 }}>
      {/* Coluna esquerda */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"16px 18px" }}>
          <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Para qual prospect?</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto" }}>
            {ativos.length === 0 && <div style={{ color:"#3a3a5a", fontSize:12, textAlign:"center", padding:"16px 0" }}>Adicione prospects no Pipeline primeiro</div>}
            {ativos.map(p => (
              <div key={p.id} onClick={() => setProspect(p)}
                style={{ background:prospect?.id===p.id?"#6366f115":"#0f0f1a", border:`1px solid ${prospect?.id===p.id?"#6366f1":"#2a2a45"}`, borderRadius:9, padding:"9px 12px", cursor:"pointer" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ color:"#e8e6f0", fontWeight:600, fontSize:13 }}>{p.name}</div>
                    <div style={{ color:"#5a5a7a", fontSize:11 }}>{p.segment || "sem segmento"}</div>
                  </div>
                  {prospect?.id===p.id && <span style={{ color:"#818cf8", fontWeight:800 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"14px 18px" }}>
          <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Canal</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {CANAIS.map(c => (
              <button key={c} onClick={() => setCanal(c)}
                style={{ background:canal===c?"#6366f120":"#1a1a2e", border:`1px solid ${canal===c?"#6366f1":"#2a2a45"}`, borderRadius:20, padding:"5px 12px", color:canal===c?"#818cf8":"#6a6a8a", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                {CANAL_ICON[c]} {c}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"14px 18px" }}>
          <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Contexto extra (opcional)</div>
          <textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2}
            placeholder="Ex: Vi que abriram filial nova, tinham post com logo torta..."
            style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:9, padding:"9px 12px", color:"#e8e6f0", fontSize:12, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"none", lineHeight:1.6 }}/>
        </div>
      </div>

      {/* Coluna direita */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"16px 18px" }}>
          <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Estilo de abordagem</div>
          <div style={{ display:"flex", flexDirection:"column", gap:7, maxHeight:340, overflowY:"auto" }}>
            {ABORDAGENS.map(a => (
              <div key={a.id} onClick={() => setAbordagem(a)}
                style={{ background:abordagem.id===a.id?"#6366f112":"#0f0f1a", border:`1px solid ${abordagem.id===a.id?"#6366f1":"#1e1e30"}`, borderRadius:10, padding:"10px 13px", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>{a.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:abordagem.id===a.id?"#818cf8":"#e8e6f0", fontWeight:700, fontSize:13 }}>{a.nome}</div>
                    <div style={{ color:"#4a4a6a", fontSize:11, marginTop:1 }}>{a.desc}</div>
                  </div>
                  {abordagem.id===a.id && <span style={{ color:"#818cf8", fontWeight:800 }}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={gerar} disabled={!prospect || loading}
          style={{ background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:`1px solid ${!prospect?"#2a2a45":"transparent"}`, borderRadius:12, padding:13, color:!prospect?"#4a4a6a":"#fff", fontSize:14, fontWeight:800, cursor:(!prospect||loading)?"not-allowed":"pointer", fontFamily:"'Syne',sans-serif", opacity:loading?0.7:1 }}>
          {loading ? "✨ Gerando..." : !prospect ? "← Selecione um prospect" : "✨ Gerar mensagem"}
        </button>

        {msg && (
          <div style={{ background:"#0f0f1a", border:"1px solid #6366f130", borderRadius:14, padding:"16px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:11, color:"#818cf8", fontWeight:700 }}>{abordagem.icon} {abordagem.nome}</div>
              <button onClick={gerar} title="Gerar outro" style={{ background:"none", border:"none", color:"#4a4a6a", cursor:"pointer", fontSize:16 }}>🔄</button>
            </div>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={6}
              style={{ background:"none", border:"none", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.75 }}/>
            <div style={{ display:"flex", gap:8, marginTop:10, paddingTop:10, borderTop:"1px solid #1e1e30" }}>
              <button onClick={copiar}
                style={{ background:copiado?"#10b98120":"#6366f120", border:`1px solid ${copiado?"#10b98140":"#6366f140"}`, borderRadius:9, padding:"8px 16px", color:copiado?"#10b981":"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flex:1 }}>
                {copiado ? "✓ Copiado!" : "📋 Copiar"}
              </button>
              {prospect && (
                <button
                  onClick={() => {
                    setProspects(prev => prev.map(p => p.id===prospect.id ? {...p, stage:"abordado", last_contact:new Date().toISOString()} : p));
                    alert(`✅ ${prospect.name} marcado como "Abordado"!`);
                  }}
                  style={{ background:"#f59e0b20", border:"1px solid #f59e0b40", borderRadius:9, padding:"8px 16px", color:"#f59e0b", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flex:1 }}>
                  📩 Marcar enviado
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUÊNCIA DE 3
// ─────────────────────────────────────────────────────────────────────────────
function Sequencia({ prospects }) {
  const [prospect,  setProspect]  = useState(null);
  const [sequencia, setSequencia] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [copiados,  setCopiados]  = useState({});

  async function gerar() {
    if (!prospect) return;
    setLoading(true); setSequencia(null);
    const txt = await callClaude([{
      role:"user",
      content:`Sequência de 3 mensagens de prospecção para designer freelancer abordar ${prospect.name} (${prospect.segment || "negócio local"}) pelo canal ${prospect.canal}.

Cada mensagem com abordagem DIFERENTE. Tom evolui: suave → mais direto → encerramento elegante.
NÃO pareça automático — cada mensagem deve soar como pessoa real.

Responda APENAS JSON:
[
  {"numero":1,"intervalo":"Dia 1","tom":"nome do tom","mensagem":"texto","objetivo":"o que você quer que aconteça"},
  {"numero":2,"intervalo":"3-4 dias depois","tom":"nome do tom","mensagem":"texto","objetivo":"objetivo"},
  {"numero":3,"intervalo":"7-10 dias depois","tom":"nome do tom","mensagem":"texto","objetivo":"objetivo"}
]`
    }], "Responda apenas JSON válido. Sem markdown. Seja criativo e humano.", 1500);
    try { setSequencia(JSON.parse(txt.replace(/```json|```/g,"").trim())); }
    catch { setSequencia([{ numero:1, intervalo:"Erro", tom:"", mensagem:txt, objetivo:"Tente novamente" }]); }
    setLoading(false);
  }

  const cores = ["#6366f1","#f59e0b","#10b981"];
  const ativos = prospects.filter(p => !["fechado","perdido"].includes(p.stage));

  return (
    <div style={{ maxWidth:720 }}>
      <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"18px 20px", marginBottom:18 }}>
        <div style={{ fontSize:13, color:"#6a6a8a", marginBottom:14 }}>
          Planeja os <strong style={{ color:"#818cf8" }}>3 primeiros contatos</strong> de uma vez — tons diferentes, timing estratégico. Só enviar no momento certo.
        </div>
        <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Gerar sequência para:</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          {ativos.length === 0 && <div style={{ color:"#3a3a5a", fontSize:12 }}>Adicione prospects no Pipeline primeiro</div>}
          {ativos.map(p => (
            <button key={p.id} onClick={() => setProspect(p)}
              style={{ background:prospect?.id===p.id?"#6366f120":"#1a1a2e", border:`1px solid ${prospect?.id===p.id?"#6366f1":"#2a2a45"}`, borderRadius:20, padding:"6px 14px", color:prospect?.id===p.id?"#818cf8":"#6a6a8a", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
              {CANAL_ICON[p.canal]} {p.name}
            </button>
          ))}
        </div>
        <button onClick={gerar} disabled={!prospect || loading}
          style={{ background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:`1px solid ${!prospect?"#2a2a45":"transparent"}`, borderRadius:10, padding:"11px 22px", color:!prospect?"#4a4a6a":"#fff", fontSize:13, fontWeight:700, cursor:(!prospect||loading)?"not-allowed":"pointer", fontFamily:"inherit", opacity:loading?0.7:1 }}>
          {loading ? "🧠 Montando sequência..." : !prospect ? "Selecione um prospect acima" : "🎯 Gerar sequência de 3"}
        </button>
      </div>

      {sequencia && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {sequencia.map((s, i) => (
            <div key={i} style={{ background:"#13131f", border:`1px solid ${cores[i]}30`, borderRadius:14, padding:"18px 20px", borderLeft:`3px solid ${cores[i]}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ background:`${cores[i]}25`, color:cores[i], fontWeight:800, fontSize:13, padding:"3px 12px", borderRadius:20 }}>Mensagem {s.numero}</span>
                    <span style={{ color:"#4a4a6a", fontSize:11 }}>📅 {s.intervalo}</span>
                  </div>
                  <div style={{ color:"#6a6a8a", fontSize:11 }}>Tom: <span style={{ color:cores[i] }}>{s.tom}</span> · {s.objetivo}</div>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(s.mensagem); setCopiados(p=>({...p,[i]:true})); setTimeout(()=>setCopiados(p=>({...p,[i]:false})),2000); }}
                  style={{ background:copiados[i]?"#10b98120":"#1a1a2e", border:`1px solid ${copiados[i]?"#10b98140":"#2a2a45"}`, borderRadius:8, padding:"6px 12px", color:copiados[i]?"#10b981":"#6a6a8a", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  {copiados[i] ? "✓ Copiado" : "📋 Copiar"}
                </button>
              </div>
              <div style={{ background:"#0f0f1a", borderRadius:10, padding:"12px 14px", color:"#e8e6f0", fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap" }}>
                {s.mensagem}
              </div>
            </div>
          ))}
          <div style={{ background:"#0f0f1a", border:"1px solid #1e1e30", borderRadius:12, padding:"12px 16px", color:"#5a5a7a", fontSize:12, textAlign:"center" }}>
            💡 Se responderem na mensagem 1, cancele as demais e converse normalmente.
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function Prospeccao() {
  const [prospects, setLocal] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_prospects") || "[]"); } catch { return []; }
  });
  const [tab,         setTab]         = useState("pipeline");
  const [msgProspect, setMsgProspect] = useState(null);
  const [syncStatus,  setSyncStatus]  = useState("idle"); // idle | loading | ok | error
  const loaded = useRef(false);

  // Carrega do Supabase na abertura
  useEffect(() => {
    if (!dbReady) { loaded.current = true; return; }
    (async () => {
      try {
        const { data } = await supabase.from("prospects").select("*");
        if (data?.length > 0) {
          setLocal(data);
          localStorage.setItem("dh_prospects", JSON.stringify(data));
        }
      } catch {}
      loaded.current = true;
    })();
  }, []);

  // Salva no Supabase + localStorage sempre que mudar
  async function setProspects(updater) {
    const novo = typeof updater === "function" ? updater(prospects) : updater;
    setLocal(novo);
    localStorage.setItem("dh_prospects", JSON.stringify(novo));
    if (!dbReady || !loaded.current) return;
    setSyncStatus("loading");
    try {
      await supabase.from("prospects").upsert(novo);
      // Remove os que foram deletados
      if (novo.length > 0) {
        const ids = novo.map(p => p.id);
        await supabase.from("prospects").delete().not("id","in",`(${ids.join(",")})`);
      } else {
        await supabase.from("prospects").delete().neq("id", 0);
      }
      setSyncStatus("ok");
    } catch {
      setSyncStatus("error");
    }
  }

  function handleAddNiche(segment) {
    setProspects(prev => [...prev, {
      id: Date.now(), name:`Prospect — ${segment}`, segment,
      canal:"Instagram/DM", stage:"identificado",
      last_contact: null, created_at: new Date().toISOString(),
    }]);
    setTab("pipeline");
  }

  function handleMensagem(prospect) {
    setMsgProspect(prospect);
    setTab("mensagem");
  }

  const urgentes  = prospects.filter(p => !["fechado","perdido"].includes(p.stage) && diasAtras(p.last_contact) >= 5).length;
  const stats = {
    total:    prospects.length,
    contato:  prospects.filter(p => ["abordado","respondeu"].includes(p.stage)).length,
    proposta: prospects.filter(p => p.stage === "proposta").length,
    fechados: prospects.filter(p => p.stage === "fechado").length,
  };

  const TABS = [
    { id:"pipeline",  label:"⚡ Pipeline",        badge: urgentes > 0 ? urgentes : null },
    { id:"nichos",    label:"🎯 Quem Abordar" },
    { id:"mensagem",  label:"✍️ Criar Mensagem" },
    { id:"sequencia", label:"📅 Sequência de 3" },
  ];

  const syncColor = { idle:"#3a3a5a", loading:"#818cf8", ok:"#10b981", error:"#ef4444" }[syncStatus];
  const syncLabel = { idle:"", loading:"Salvando...", ok:"Salvo ✓", error:"Erro ao salvar" }[syncStatus];

  return (
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:4 }}>
          <h1 style={{ color:"#e8e6f0", fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, margin:0 }}>
            🎯 Prospecção
          </h1>
          {dbReady && syncStatus !== "idle" && (
            <div style={{ background:`${syncColor}18`, border:`1px solid ${syncColor}40`, borderRadius:8, padding:"3px 10px", display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:syncColor }}/>
              <span style={{ fontSize:10, fontWeight:700, color:syncColor }}>{syncLabel}</span>
            </div>
          )}
        </div>
        <p style={{ color:"#5a5a7a", margin:0, fontSize:13 }}>Pipeline de novos clientes · abordagens criativas · follow-up inteligente</p>
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        {[
          { label:"Prospects",    value:stats.total,    color:"#818cf8" },
          { label:"Em contato",   value:stats.contato,  color:"#f59e0b" },
          { label:"Com proposta", value:stats.proposta, color:"#06b6d4" },
          { label:"Fechados",     value:stats.fechados, color:"#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:13, padding:"14px 20px", flex:1, minWidth:110, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${s.color},transparent)` }}/>
            <div style={{ color:"#5a5a7a", fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>{s.label}</div>
            <div style={{ color:s.color, fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, background:"#0f0f1a", borderRadius:12, padding:4, border:"1px solid #1e1e30", marginBottom:24, width:"fit-content", flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:tab===t.id?"#1e1e30":"transparent", border:tab===t.id?"1px solid #2a2a45":"1px solid transparent", borderRadius:9, padding:"8px 16px", color:tab===t.id?"#e8e6f0":"#5a5a7a", cursor:"pointer", fontSize:13, fontWeight:tab===t.id?600:400, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            {t.label}
            {t.badge && <span style={{ background:"#ef4444", color:"#fff", fontSize:9, fontWeight:800, padding:"0 5px", borderRadius:99, lineHeight:"14px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab==="pipeline"  && <Pipeline     prospects={prospects} setProspects={setProspects} onMensagem={handleMensagem}/>}
      {tab==="nichos"    && <QuemAbordar  onAdd={handleAddNiche}/>}
      {tab==="mensagem"  && <CriarMensagem selectedProspect={msgProspect} prospects={prospects} setProspects={setProspects}/>}
      {tab==="sequencia" && <Sequencia    prospects={prospects}/>}

      {stats.proposta > 0 && (
        <div style={{ marginTop:28, background:"#10b98110", border:"1px solid #10b98130", borderRadius:14, padding:"16px 20px" }}>
          <div style={{ fontWeight:700, color:"#10b981", fontSize:14, marginBottom:4 }}>
            🎉 {stats.proposta} prospect{stats.proposta>1?"s":""} com proposta enviada!
          </div>
          <div style={{ color:"#5a5a7a", fontSize:12 }}>
            Quando fechar, mova para "Fechado" e depois adicione como Lead no CRM.
          </div>
        </div>
      )}
    </div>
  );
}
