// ══════════════════════════════════════════════════════════════════════════════
// PROSPECÇÃO — Módulo FluxioHUB
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
  { id:"roast",       icon:"🔥", nome:"Roast Gentil",         desc:"Aponta algo fraco com bom humor. Eles gargalham e contratam.", instrucao:"Aponte 1 coisa específica e fraca no visual deles, com bom humor. Como amigo honesto. Personalizado pro segmento. Máx 3 linhas." },
  { id:"diagnostico", icon:"🎁", nome:"Diagnóstico Grátis",   desc:"Oferece valor antes de pedir qualquer coisa. Sem pitch.",      instrucao:"Ofereça diagnóstico gratuito de 15min do visual. Mencione 1-2 pontos do segmento. Tom: 'não estou te vendendo nada'. Máx 3 linhas." },
  { id:"gancho",      icon:"🪝", nome:"Gancho de Curiosidade",desc:"Começa sem revelar que é designer. Desperta curiosidade.",     instrucao:"Comece com pergunta/observação que desperta curiosidade sobre o negócio. Só depois mencione que é designer. Curto e direto." },
  { id:"conselho",    icon:"🤔", nome:"Pedido de Conselho",   desc:"Você pede a opinião deles. Psicologia reversa — adoram isso.", instrucao:"Peça opinião deles sobre algo do segmento. Parece perspectiva de cliente. Só no final mencione que é designer. 3 linhas max." },
  { id:"historia",    icon:"📖", nome:"Mini-história",        desc:"Uma história rápida de como transformou alguém do mesmo segmento.", instrucao:"Mini-história de 3 linhas sobre como ajudou negócio parecido. Foque na transformação. Pode ser fictício mas realista." },
  { id:"direto",      icon:"⚡", nome:"Direto e Real",        desc:"Zero enrolação, zero corporativês. Só você sendo humano.",    instrucao:"Seja direto e humano. Zero papo de vendedor, zero formalidade. Como numa festa. Máximo 3 linhas. Sem emoji em excesso." },
  { id:"provocacao",  icon:"😏", nome:"Provocação",           desc:"Um desafio leve. Funciona com empreendedores confiantes.",    instrucao:"Lance provocação leve: 'aposto que nunca pensaram no quanto o visual está custando clientes'. Tom confiante, não arrogante. 2-3 linhas." },
  { id:"reativacao",  icon:"🔄", nome:"Reativação",           desc:"Para contatos frios. Retoma sem ser chato.",                  instrucao:"Follow-up pra quem esfriou. NÃO mencione tentativas anteriores. Aborde como se tivesse pensado neles por motivo genuíno. 2-3 linhas." },
];

// ─── API ──────────────────────────────────────────────────────────────────────
async function callClaude(messages, system = "", maxTokens = 400) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("⚠️ VITE_ANTHROPIC_API_KEY não configurada no Vercel.");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "";
}

function diasAtras(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function Badge({ dias, stage }) {
  if (["fechado","perdido"].includes(stage)) return null;
  if (dias === null)  return <span style={bs("#6366f1","#818cf8")}>Novo</span>;
  if (dias >= 7)      return <span style={bs("#ef4444","#ef4444")}>⚠️ {dias}d sumido</span>;
  if (dias >= 3)      return <span style={bs("#f59e0b","#f59e0b")}>🕐 {dias}d atrás</span>;
  return <span style={bs("#10b981","#10b981")}>✓ Em dia</span>;
}
function bs(bg, color) {
  return { background:`${bg}18`, color, fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:700 };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function Pipeline({ prospects, setProspects, onMensagem }) {
  const [filtro,    setFiltro]   = useState("todos");
  const [showAdd,   setShowAdd]  = useState(false);
  const [expanded,  setExpanded] = useState(null);
  const [loadDor,   setLoadDor]  = useState(null); // id do prospect sendo analisado
  const [editNota,  setEditNota] = useState({}); // { [id]: texto }
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
      dor_ia: "", notas_dor: "",
      last_contact: null, created_at: new Date().toISOString(),
    }]);
    setShowAdd(false);
    form.current = { name:"", segment:"", canal:"Instagram/DM", referral:"", notes:"" };
  }

  async function analisarDor(p) {
    setLoadDor(p.id);
    try {
      const contexto = [p.name, p.segment, p.canal, p.notes].filter(Boolean).join(", ");
      const txt = await callClaude(
        [{ role:"user", content:`Prospect para prospecção de design: ${contexto}\n\nDiga em 3 pontos curtos:\n1. Provável fraqueza visual/design desse negócio\n2. A dor real que isso causa (perda de cliente, credibilidade)\n3. Gancho de abordagem ideal\n\nSeja específico e cirúrgico. Máx 100 palavras.` }],
        "Você é designer freelancer experiente analisando prospects para prospecção. Seja direto e prático.",
        350
      );
      setProspects(prev => prev.map(x => x.id === p.id ? { ...x, dor_ia: txt } : x));
    } catch(e) {
      setProspects(prev => prev.map(x => x.id === p.id ? { ...x, dor_ia: `Erro: ${e.message}` } : x));
    }
    setLoadDor(null);
  }

  function salvarNota(id) {
    const nota = editNota[id] ?? "";
    setProspects(prev => prev.map(x => x.id === id ? { ...x, notas_dor: nota } : x));
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
              {s.icon||""} {s.label}
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
          const notaLocal = editNota[p.id] !== undefined ? editNota[p.id] : (p.notas_dor || "");

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
                    {(p.dor_ia || p.notas_dor) && (
                      <span style={{ background:"#6366f118", color:"#818cf8", fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>🧠 Dor mapeada</span>
                    )}
                  </div>
                  {p.segment && <div style={{ fontSize:12, color:"#5a5a7a", marginTop:3 }}>{p.segment}{p.referral?` · via ${p.referral}`:""}</div>}
                  {p.notes   && <div style={{ fontSize:11, color:"#3a3a5a", marginTop:3, fontStyle:"italic" }}>"{p.notes}"</div>}
                </div>
                <div style={{ background:`${stage.color}20`, color:stage.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, flexShrink:0, marginLeft:10 }}>
                  {stage.icon} {stage.label}
                </div>
              </div>

              {aberto && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #2a2a45" }}
                  onClick={e => e.stopPropagation()}>

                  {/* ── Mover estágio ── */}
                  <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Mover para:</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                    {STAGES.map(s => (
                      <button key={s.id}
                        onClick={() => setProspects(prev => prev.map(x => x.id===p.id ? {...x, stage:s.id, last_contact:new Date().toISOString()} : x))}
                        style={{ background:p.stage===s.id?s.color:"#1a1a2e", border:`1px solid ${s.color}40`, borderRadius:7, padding:"4px 10px", color:p.stage===s.id?"#fff":s.color, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Análise de Dor da IA ── */}
                  <div style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <span style={{ color:"#818cf8", fontWeight:700, fontSize:12 }}>🧠 Análise de Dor — IA</span>
                      <button
                        onClick={() => analisarDor(p)}
                        disabled={loadDor === p.id}
                        style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:7, padding:"5px 12px", color:"#fff", fontSize:11, fontWeight:700, cursor:loadDor===p.id?"wait":"pointer", fontFamily:"inherit", opacity:loadDor===p.id?0.7:1 }}>
                        {loadDor === p.id ? "⏳ Analisando..." : p.dor_ia ? "🔄 Reanalisar" : "⚡ Analisar agora"}
                      </button>
                    </div>
                    {p.dor_ia ? (
                      <div style={{ color:"#c4c4e0", fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{p.dor_ia}</div>
                    ) : (
                      <div style={{ color:"#3a3a5a", fontSize:12, fontStyle:"italic" }}>
                        Clique em "Analisar agora" para a IA mapear as dores e oportunidades desse prospect.
                      </div>
                    )}
                  </div>

                  {/* ── Suas observações pessoais ── */}
                  <div style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ color:"#f59e0b", fontWeight:700, fontSize:12 }}>✍️ Minhas observações</span>
                      {(editNota[p.id] !== undefined) && (
                        <button
                          onClick={() => { salvarNota(p.id); setEditNota(prev => { const n={...prev}; delete n[p.id]; return n; }); }}
                          style={{ background:"#10b98120", border:"1px solid #10b98140", borderRadius:7, padding:"4px 10px", color:"#10b981", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          💾 Salvar
                        </button>
                      )}
                    </div>
                    <textarea
                      value={notaLocal}
                      onChange={e => setEditNota(prev => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="O que você percebeu sobre esse prospect? Algo que a IA não captou, comportamento nas redes, objeções prováveis, timing..."
                      rows={3}
                      style={{ width:"100%", background:"#13131f", border:"1px solid #2a2a45", borderRadius:8, padding:"9px 12px", color:"#e8e6f0", fontSize:12, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.7, boxSizing:"border-box" }}
                    />
                    {p.notas_dor && editNota[p.id] === undefined && (
                      <div style={{ color:"#5a5a7a", fontSize:10, marginTop:4 }}>✓ Salvo — clique no campo para editar</div>
                    )}
                  </div>

                  {/* ── Ações ── */}
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
      [{ role:"user", content:`Liste 6 tipos de negócios locais no Brasil em 2026 com maior urgência para melhorar design/identidade visual e que pagam bem.\nSomente JSON:\n[{"nicho":"","dor":"1 frase","oportunidade":"por que pagam","abordagem":"como aparecer pra eles"}]` }],
      "Responda apenas JSON puro. Sem markdown, sem texto fora do JSON.",
      800
    );
    try { setAiNichos(JSON.parse(txt.replace(/```json|```/g,"").trim())); }
    catch { setAiNichos([{ nicho:"Erro ao gerar", dor:"Tente novamente", oportunidade:"", abordagem:"" }]); }
    setLoadNichos(false);
  }

  async function diagnosticar() {
    if (!diagUrl) return;
    setLoadDiag(true); setDiagRes("");
    const txt = await callClaude(
      [{ role:"user", content:`Analise para prospecção de design: "${diagUrl}"\n\n1. Fraqueza visual provável\n2. Dor real (perda de cliente, credibilidade)\n3. Gancho de abordagem específico\n\nMáx 100 palavras. Seja cirúrgico.` }],
      "Você é designer freelancer experiente fazendo análise de prospecção.",
      350
    );
    setDiagRes(txt); setLoadDiag(false);
  }

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#6d28d915,#13131f)", border:"1px solid #6366f130", borderRadius:16, padding:"20px 22px", marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#e8e6f0", marginBottom:6 }}>🔍 Diagnóstico de Perfil</div>
        <div style={{ fontSize:13, color:"#6a6a8a", marginBottom:14 }}>Cole o Instagram, site ou nome do negócio. A IA analisa o que está fraco e te dá o gancho ideal.</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={diagUrl} onChange={e => setDiagUrl(e.target.value)}
            placeholder="@clinicaestetica_sp · www.restaurante.com.br · 'Dentista João Silva'"
            style={{ flex:1, background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          <button onClick={diagnosticar} disabled={!diagUrl || loadDiag}
            style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:9, padding:"10px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:loadDiag?"wait":"pointer", fontFamily:"inherit", opacity:loadDiag?0.7:1, whiteSpace:"nowrap" }}>
            {loadDiag ? "⏳ Analisando..." : "Analisar 🎯"}
          </button>
        </div>
        {diagRes && (
          <div style={{ marginTop:16, background:"#13131f", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ color:"#818cf8", fontWeight:700, fontSize:12, marginBottom:8 }}>Resultado da análise:</div>
            <div style={{ color:"#c4c4e0", fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{diagRes}</div>
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <button
                onClick={() => {
                  const nome = diagUrl.replace(/https?:\/\//,"").replace(/www\./,"").split("/")[0].split("?")[0];
                  onAdd(nome);
                  alert("Adicionado ao pipeline! Vá em ⚡ Pipeline e expanda o card para salvar essa análise.");
                }}
                style={{ background:"#6366f120", border:"1px solid #6366f140", borderRadius:8, padding:"7px 14px", color:"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Adicionar ao pipeline
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#e8e6f0", marginBottom:12 }}>🎯 Nichos com alta oportunidade</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10 }}>
          {NICHOS.map(n => (
            <div key={n.nome}
              style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:12, padding:"13px 15px", cursor:"default" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#6366f150"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#1e1e30"}>
              <div style={{ fontWeight:700, fontSize:13, color:"#e8e6f0", marginBottom:5 }}>{n.nome}</div>
              <div style={{ fontSize:12, color:"#5a5a7a", marginBottom:10, lineHeight:1.5 }}>{n.dor}</div>
              <button onClick={() => onAdd(n.nome)}
                style={{ background:"#6366f118", border:"1px solid #6366f130", borderRadius:7, padding:"5px 12px", color:"#818cf8", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Adicionar ao pipeline
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:14, padding:"18px 20px" }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#e8e6f0", marginBottom:6 }}>🤖 Descobrir novos nichos com IA</div>
        <div style={{ fontSize:12, color:"#5a5a7a", marginBottom:14 }}>A IA analisa o mercado atual e sugere 6 nichos com maior potencial agora.</div>
        <button onClick={gerarNichos} disabled={loadNichos}
          style={{ background: loadNichos?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"1px solid #6366f140", borderRadius:10, padding:"10px 20px", color:loadNichos?"#5a5a7a":"#fff", fontSize:13, fontWeight:700, cursor:loadNichos?"wait":"pointer", fontFamily:"inherit", opacity:loadNichos?0.7:1 }}>
          {loadNichos ? "⏳ Analisando mercado..." : "🤖 Gerar oportunidades"}
        </button>
        {aiNichos.length > 0 && (
          <div style={{ marginTop:18, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
            {aiNichos.map((n,i) => (
              <div key={i} style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:12, padding:"13px 15px" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#a78bfa", marginBottom:5 }}>{n.nicho}</div>
                <div style={{ fontSize:11, color:"#5a5a7a", marginBottom:4 }}>🔴 {n.dor}</div>
                <div style={{ fontSize:11, color:"#5a5a7a", marginBottom:4 }}>💰 {n.oportunidade}</div>
                <div style={{ fontSize:11, color:"#5a5a7a", marginBottom:10 }}>📌 {n.abordagem}</div>
                <button onClick={() => onAdd(n.nicho)}
                  style={{ background:"#a78bfa18", border:"1px solid #a78bfa30", borderRadius:7, padding:"5px 12px", color:"#a78bfa", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  + Adicionar ao pipeline
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR MENSAGEM
// ─────────────────────────────────────────────────────────────────────────────
function CriarMensagem({ selectedProspect, prospects }) {
  const [selId,     setSelId]     = useState(selectedProspect?.id || "");
  const [abordagem, setAbordagem] = useState("roast");
  const [mensagem,  setMensagem]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [copiado,   setCopiado]   = useState(false);
  const [erro,      setErro]      = useState("");

  const prospect = prospects.find(p => String(p.id) === String(selId));
  const ab = ABORDAGENS.find(a => a.id === abordagem);

  async function gerar() {
    if (!prospect) return;
    setLoading(true); setMensagem(""); setErro("");
    try {
      const contexto = [
        prospect.name,
        prospect.segment && `Segmento: ${prospect.segment}`,
        prospect.dor_ia  && `Análise de dor: ${prospect.dor_ia}`,
        prospect.notas_dor && `Observações minhas: ${prospect.notas_dor}`,
        prospect.referral && `Indicado por: ${prospect.referral}`,
      ].filter(Boolean).join("\n");
      const txt = await callClaude(
        [{ role:"user", content:`Escreva mensagem de prospecção para:\n${contexto}\n\nEstilo: ${ab.instrucao}\n\nRegras absolutas:\n- NÃO comece com "Olá", "Oi", "Ei"\n- NÃO use "espero que esteja bem"\n- NÃO seja genérico\n- Máx 5 linhas` }],
        "Você é designer freelancer brasileiro escrevendo DMs de prospecção. Seja humano, criativo e específico. Nunca genérico.",
        300
      );
      setMensagem(txt);
    } catch(e) {
      setErro(e.message);
    }
    setLoading(false);
  }

  function copiar() {
    navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prospect</div>
        <select value={String(selId)} onChange={e => setSelId(e.target.value)}
          style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">Selecionar prospect...</option>
          {prospects.map(p => <option key={p.id} value={String(p.id)}>{p.name} {p.segment?`— ${p.segment}`:""}</option>)}
        </select>
      </div>

      {prospect && (prospect.dor_ia || prospect.notas_dor) && (
        <div style={{ background:"#0f0f1a", border:"1px solid #6366f130", borderRadius:12, padding:"12px 16px", marginBottom:18 }}>
          <div style={{ color:"#818cf8", fontWeight:700, fontSize:11, marginBottom:6 }}>🧠 Contexto salvo desse prospect:</div>
          {prospect.dor_ia && <div style={{ color:"#8a8aaa", fontSize:12, lineHeight:1.6, marginBottom:prospect.notas_dor?8:0 }}>{prospect.dor_ia.substring(0,200)}{prospect.dor_ia.length>200?"...":""}</div>}
          {prospect.notas_dor && <div style={{ color:"#f59e0b88", fontSize:12, lineHeight:1.6, fontStyle:"italic" }}>✍️ {prospect.notas_dor}</div>}
        </div>
      )}

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Abordagem</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
          {ABORDAGENS.map(a => (
            <button key={a.id} onClick={() => setAbordagem(a.id)}
              style={{ background:abordagem===a.id?"#6366f130":"#13131f", border:`1px solid ${abordagem===a.id?"#6366f1":"#1e1e30"}`, borderRadius:10, padding:"11px 13px", textAlign:"left", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ fontSize:16, marginBottom:4 }}>{a.icon}</div>
              <div style={{ color:abordagem===a.id?"#a78bfa":"#c4c4e0", fontWeight:700, fontSize:12 }}>{a.nome}</div>
              <div style={{ color:"#5a5a7a", fontSize:11, marginTop:3, lineHeight:1.4 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={gerar} disabled={!prospect || loading}
        style={{ background:(!prospect||loading)?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"1px solid #6366f140", borderRadius:10, padding:"12px 24px", color:(!prospect||loading)?"#5a5a7a":"#fff", fontSize:14, fontWeight:700, cursor:(!prospect||loading)?"not-allowed":"pointer", fontFamily:"inherit", width:"100%", marginBottom:16, opacity:loading?0.7:1 }}>
        {loading ? "⏳ Gerando..." : "✨ Gerar mensagem"}
      </button>

      {erro && (
        <div style={{ background:"#ef444415", border:"1px solid #ef444440", borderRadius:12, padding:"14px 18px", marginBottom:16 }}>
          <div style={{ color:"#ef4444", fontWeight:700, fontSize:13, marginBottom:4 }}>❌ Erro ao gerar</div>
          <div style={{ color:"#ef4444aa", fontSize:12 }}>{erro}</div>
          {erro.includes("VITE_ANTHROPIC") && (
            <div style={{ color:"#f59e0b", fontSize:12, marginTop:8 }}>
              👉 Vá em Vercel → projeto → Settings → Environment Variables → adicione VITE_ANTHROPIC_API_KEY com sua chave do console.anthropic.com. Depois faça um novo deploy.
            </div>
          )}
        </div>
      )}

      {mensagem && (
        <div style={{ background:"#13131f", border:"1px solid #2a2a45", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:"#818cf8", fontWeight:700, fontSize:13 }}>{ab?.icon} {ab?.nome}</span>
            <button onClick={copiar}
              style={{ background:copiado?"#10b98120":"#6366f120", border:`1px solid ${copiado?"#10b98140":"#6366f140"}`, borderRadius:8, padding:"6px 14px", color:copiado?"#10b981":"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {copiado ? "✓ Copiado!" : "📋 Copiar"}
            </button>
          </div>
          <div style={{ color:"#e8e6f0", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{mensagem}</div>
          <button onClick={gerar}
            style={{ background:"none", border:"1px solid #2a2a45", borderRadius:8, padding:"7px 14px", color:"#5a5a7a", fontSize:12, cursor:"pointer", fontFamily:"inherit", marginTop:12 }}>
            🔄 Gerar outra versão
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUÊNCIA DE 3
// ─────────────────────────────────────────────────────────────────────────────
function Sequencia({ prospects }) {
  const [selId,    setSelId]    = useState("");
  const [msgs,     setMsgs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [copiado,  setCopiado]  = useState(null);

  const prospect = prospects.find(p => String(p.id) === String(selId));

  async function gerar() {
    if (!prospect) return;
    setLoading(true); setMsgs([]);
    const contexto = [
      prospect.name,
      prospect.segment && `Segmento: ${prospect.segment}`,
      prospect.dor_ia  && `Dor mapeada: ${prospect.dor_ia}`,
      prospect.notas_dor && `Minhas observações: ${prospect.notas_dor}`,
    ].filter(Boolean).join("\n");
    const txt = await callClaude(
      [{ role:"user", content:`Crie sequência de 3 mensagens de prospecção para:\n${contexto}\n\nJSON somente:\n[{"dia":"Dia 1","tom":"direto","msg":"..."},{"dia":"Dia 3-4","tom":"valor","msg":"..."},{"dia":"Dia 7-10","tom":"encerramento","msg":"..."}]\n\nRegras: cada mensagem max 4 linhas, estilo diferente, sem começar com Oi/Olá, sem "espero que esteja bem"` }],
      "Responda apenas JSON puro. Sem markdown.",
      600
    );
    try { setMsgs(JSON.parse(txt.replace(/```json|```/g,"").trim())); }
    catch { setMsgs([{dia:"Erro",tom:"",msg:"Tente novamente"}]); }
    setLoading(false);
  }

  function copiar(txt, i) {
    navigator.clipboard.writeText(txt);
    setCopiado(i);
    setTimeout(() => setCopiado(null), 2000);
  }

  return (
    <div>
      <div style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
        <div style={{ color:"#e8e6f0", fontWeight:700, fontSize:14, marginBottom:4 }}>📅 Estratégia de 3 mensagens</div>
        <div style={{ color:"#5a5a7a", fontSize:12 }}>Dia 1 → Dia 3-4 → Dia 7-10. Cada uma com tom diferente. Se não responder após a 3ª, deixa quieto por 30 dias.</div>
      </div>

      <div style={{ marginBottom:16 }}>
        <select value={String(selId)} onChange={e => setSelId(e.target.value)}
          style={{ background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
          <option value="">Selecionar prospect...</option>
          {prospects.map(p => <option key={p.id} value={String(p.id)}>{p.name} {p.segment?`— ${p.segment}`:""}</option>)}
        </select>
      </div>

      {prospect && (prospect.dor_ia || prospect.notas_dor) && (
        <div style={{ background:"#0f0f1a", border:"1px solid #6366f130", borderRadius:12, padding:"12px 16px", marginBottom:14 }}>
          <div style={{ color:"#818cf8", fontWeight:700, fontSize:11, marginBottom:4 }}>🧠 Contexto que será usado:</div>
          {prospect.dor_ia && <div style={{ color:"#8a8aaa", fontSize:12, lineHeight:1.5 }}>{prospect.dor_ia.substring(0,150)}...</div>}
          {prospect.notas_dor && <div style={{ color:"#f59e0b88", fontSize:12, marginTop:4, fontStyle:"italic" }}>✍️ {prospect.notas_dor}</div>}
        </div>
      )}

      <button onClick={gerar} disabled={!prospect || loading}
        style={{ background:(!prospect||loading)?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"1px solid #6366f140", borderRadius:10, padding:"12px 24px", color:(!prospect||loading)?"#5a5a7a":"#fff", fontSize:14, fontWeight:700, cursor:(!prospect||loading)?"not-allowed":"pointer", fontFamily:"inherit", width:"100%", marginBottom:20, opacity:loading?0.7:1 }}>
        {loading ? "⏳ Gerando sequência..." : "📅 Gerar sequência de 3"}
      </button>

      {msgs.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ background:"#13131f", border:"1px solid #2a2a45", borderRadius:14, padding:"16px 18px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ background:"#6366f130", color:"#818cf8", fontWeight:800, fontSize:12, padding:"3px 10px", borderRadius:20 }}>{m.dia}</span>
                  <span style={{ color:"#5a5a7a", fontSize:12 }}>{m.tom}</span>
                </div>
                <button onClick={() => copiar(m.msg, i)}
                  style={{ background:copiado===i?"#10b98120":"#1a1a2e", border:`1px solid ${copiado===i?"#10b98140":"#2a2a45"}`, borderRadius:8, padding:"5px 12px", color:copiado===i?"#10b981":"#5a5a7a", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {copiado===i ? "✓ Copiado!" : "📋 Copiar"}
                </button>
              </div>
              <div style={{ color:"#e8e6f0", fontSize:13, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{m.msg}</div>
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
  const [syncStatus,  setSyncStatus]  = useState("idle");
  const loaded = useRef(false);

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

  async function setProspects(updater) {
    const novo = typeof updater === "function" ? updater(prospects) : updater;
    setLocal(novo);
    localStorage.setItem("dh_prospects", JSON.stringify(novo));
    if (!dbReady || !loaded.current) return;
    setSyncStatus("loading");
    try {
      await supabase.from("prospects").upsert(novo);
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
      dor_ia: "", notas_dor: "",
      last_contact: null, created_at: new Date().toISOString(),
    }]);
    setTab("pipeline");
  }

  function handleMensagem(prospect) {
    setMsgProspect(prospect);
    setTab("mensagem");
  }

  const urgentes = prospects.filter(p => !["fechado","perdido"].includes(p.stage) && diasAtras(p.last_contact) >= 5).length;
  const stats = {
    total:    prospects.length,
    contato:  prospects.filter(p => ["abordado","respondeu"].includes(p.stage)).length,
    proposta: prospects.filter(p => p.stage === "proposta").length,
    fechados: prospects.filter(p => p.stage === "fechado").length,
  };

  const TABS = [
    { id:"pipeline",  label:"⚡ Pipeline",      badge: urgentes > 0 ? urgentes : null },
    { id:"nichos",    label:"🎯 Quem Abordar" },
    { id:"mensagem",  label:"✍️ Criar Mensagem" },
    { id:"sequencia", label:"📅 Sequência de 3" },
  ];

  const syncColor = { idle:"#3a3a5a", loading:"#818cf8", ok:"#10b981", error:"#ef4444" }[syncStatus];
  const syncLabel = { idle:"", loading:"Salvando...", ok:"Salvo ✓", error:"Erro ao salvar" }[syncStatus];

  return (
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
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
        <p style={{ color:"#5a5a7a", margin:0, fontSize:13 }}>Pipeline de novos clientes · análise de dor por prospect · abordagens criativas</p>
      </div>

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

      <div style={{ display:"flex", gap:2, background:"#0f0f1a", borderRadius:12, padding:4, border:"1px solid #1e1e30", marginBottom:24, width:"fit-content", flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:tab===t.id?"#1e1e30":"transparent", border:tab===t.id?"1px solid #2a2a45":"1px solid transparent", borderRadius:9, padding:"8px 16px", color:tab===t.id?"#e8e6f0":"#5a5a7a", cursor:"pointer", fontSize:13, fontWeight:tab===t.id?600:400, fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            {t.label}
            {t.badge && <span style={{ background:"#ef4444", color:"#fff", fontSize:9, fontWeight:800, padding:"0 5px", borderRadius:99, lineHeight:"14px" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

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
            Quando fechar, mova para "Fechado" e adicione como Lead no CRM.
          </div>
        </div>
      )}
    </div>
  );
}
