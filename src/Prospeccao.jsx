// ══════════════════════════════════════════════════════════════════════════════
// PROSPECÇÃO — Módulo completo para FluxioHUB
// ══════════════════════════════════════════════════════════════════════════════
//
// COMO INTEGRAR NO SEU FLUXIOHUB:
//
// 1. Copie este arquivo para sua pasta de componentes
// 2. No arquivo principal, adicione ao array `nav`:
//    { id:"prospeccao", label:"Prospecção", icon:"leads", sec:"gestao" }
//    (adicione antes de "kanban" para ficar na ordem certa)
//
// 3. No bloco de views (onde ficam os {view==="dashboard" && ...}), adicione:
//    {view==="prospeccao" && <Prospeccao leads={leads} setLeads={setLeads}/>}
//
// 4. Importe no topo: import { Prospeccao } from './Prospeccao';
//    (ou cole a função direto no arquivo principal antes do export default App)
//
// O componente usa a variável global `C` do FluxioHUB automaticamente.
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";

// ─── Stages do pipeline de prospecção ─────────────────────────────────────
const STAGES_PROSP = [
  { id:"identificado", label:"Identificado", color:"#6366f1", icon:"🔍" },
  { id:"abordado",     label:"Abordado",     color:"#f59e0b", icon:"📩" },
  { id:"respondeu",    label:"Respondeu",    color:"#8b5cf6", icon:"💬" },
  { id:"followup",     label:"Follow-up",    color:"#ef4444", icon:"🔁" },
  { id:"proposta",     label:"Proposta",     color:"#06b6d4", icon:"📋" },
  { id:"fechado",      label:"Fechado 🎉",   color:"#10b981", icon:"✅" },
  { id:"perdido",      label:"Perdido",      color:"#64748b", icon:"❌" },
];

const CANAIS = ["Instagram/DM","WhatsApp","LinkedIn","Email","Indicação","Pessoalmente"];

const CHANNEL_ICON = {
  "Instagram/DM":"📸","WhatsApp":"💬","LinkedIn":"💼",
  "Email":"📧","Indicação":"🤝","Pessoalmente":"🤙",
};

const NICHOS_RAPIDOS = [
  { nome:"Clínicas de estética",    dor:"Site antiquado, sem antes/depois, sem agendamento online" },
  { nome:"Advogados solo",          dor:"Logo genérica, sem diferenciação, parece escritório de 2010" },
  { nome:"Nutricionistas",          dor:"Feed do Instagram sem identidade visual consistente" },
  { nome:"Coaches e mentores",      dor:"Foto de perfil amadora, materiais visuais fracos" },
  { nome:"Dentistas",               dor:"Site não transmite confiança, sem depoimentos visíveis" },
  { nome:"Psicólogos",              dor:"Presença digital quase zero, sem identidade profissional" },
  { nome:"Personal trainers",       dor:"Brand confuso, mistura vários estilos sem coesão" },
  { nome:"Salões de beleza",        dor:"Cardápio de serviços visualmente pobre, sem personalidade" },
  { nome:"Arquitetos",              dor:"Portfólio mal apresentado, fotos sem tratamento" },
  { nome:"Restaurantes novos",      dor:"Cardápio digital horrível, logo feita no Canva" },
  { nome:"Pet shops",               dor:"Visual genérico, sem charme, poderia ser qualquer pet shop" },
  { nome:"Consultores financeiros", dor:"Não transmitem credibilidade visualmente, muito texto" },
  { nome:"Fotógrafos",              dor:"Site lento, mal organizado, portfólio sem narrativa" },
  { nome:"Academias boutique",      dor:"Identidade visual genérica, igual a 50 outras academias" },
  { nome:"Lojas de roupa locais",   dor:"Instagram sem estética definida, fotos de celular ruim" },
  { nome:"Makers e artesãos",       dor:"Embalagem e identidade que não valorizam o produto" },
];

// ─── Abordagens criativas de mensagem ────────────────────────────────────────
const ABORDAGENS = [
  {
    id:"roast",
    icon:"🔥",
    nome:"Roast Gentil",
    desc:"Você apontou algo específico que não funciona, com bom humor. Eles vão gargalhar e contratar.",
    tom:"irreverente e direto, com humor leve",
    instrucao:"Comece com uma observação bem específica e engraçada sobre algo fraco no visual/marca deles. Seja como um amigo que está sendo honesto. NÃO seja genérico. Exemplo de tom: 'olha, vi a logo de vocês e precisei parar o scroll...' — faça algo no estilo disso, mas personalizado ao segmento/nome do prospect.",
  },
  {
    id:"diagnostico",
    icon:"🎁",
    nome:"Diagnóstico Grátis",
    desc:"Ofereça valor antes de pedir qualquer coisa. Sem pitch, sem venda.",
    tom:"consultivo e generoso, sem tentar vender",
    instrucao:"Ofereça um diagnóstico gratuito de 15 minutos do visual/marca deles, sem compromisso. Mencione 1-2 coisas específicas que você poderia analisar no segmento deles. Tom: 'não estou te vendendo nada, só quero mostrar o que eu vejo'. Curto, max 4 linhas.",
  },
  {
    id:"gancho",
    icon:"🪝",
    nome:"Gancho de Curiosidade",
    desc:"Começa sem revelar que você é designer. Desperta curiosidade antes do pitch.",
    tom:"intrigante e conversacional",
    instrucao:"Comece com uma pergunta ou observação que desperta curiosidade genuína sobre o negócio deles. Só depois de criar engajamento mencione que você é designer. Estilo: 'Ei, você já pensou quanto cliente você perde só pela primeira impressão visual?' — crie algo assim, personalizado ao segmento.",
  },
  {
    id:"conselho",
    icon:"🤔",
    nome:"Pedido de Conselho",
    desc:"Você pede a opinião deles. Psicologia reversa — as pessoas adoram dar conselho.",
    tom:"humilde e curioso, como se você precisasse da opinião deles",
    instrucao:"Aborde pedindo a opinião deles sobre algo relacionado ao segmento deles — algo que um designer pensaria mas que parece ser a perspectiva do cliente. Por exemplo: 'Estou pesquisando [segmento] e queria entender: o que faz vocês escolherem um prestador de serviço pela primeira vez online?' — crie algo assim. Só no final mencione que é designer.",
  },
  {
    id:"historia",
    icon:"📖",
    nome:"Mini-história",
    desc:"Uma história rápida de como você transformou alguém do mesmo segmento.",
    tom:"narrativo e empolgante, como quem conta uma história",
    instrucao:"Crie uma mini-história de 3-4 linhas sobre como você (designer) ajudou um negócio parecido com o deles — pode ser fictício mas realista. Foque na transformação e no resultado concreto. Termine com algo que convida à conversa, não ao fechamento.",
  },
  {
    id:"direto",
    icon:"⚡",
    nome:"Direto e Real",
    desc:"Zero enrolação, zero corporativês. Só você sendo humano.",
    tom:"extremamente direto, humano e sem filtro",
    instrucao:"Seja completamente direto e humano. Zero papo de vendedor, zero 'espero que esteja bem', zero formalidade. Fale como você falaria com alguém que você acabou de conhecer numa festa. Curto, no máximo 3 linhas. Sem emoji em excesso. Mencione algo específico e real sobre o segmento deles.",
  },
  {
    id:"provocacao",
    icon:"😏",
    nome:"Provocação",
    desc:"Um desafio leve. Funciona com empreendedores confiantes.",
    tom:"confiante, levemente provocador, como quem faz uma aposta",
    instrucao:"Lance uma provocação leve — algo tipo 'aposto que vocês nunca pensaram no quanto o visual está custando clientes' ou 'a logo de vocês está boa mas dá pra deixar inesquecível'. Tom confiante, não arrogante. Faça soar como uma aposta amigável, não um ataque.",
  },
  {
    id:"reativacao",
    icon:"🔄",
    nome:"Reativação",
    desc:"Para contatos que esfriaram. Retoma sem ser chato.",
    tom:"leve, sem pressão, como quem simplesmente apareceu",
    instrucao:"Este é um follow-up para alguém que esfriou. NÃO mencione que você está tentando há algum tempo, não use 'só passando pra checar', não seja chato. Aborde como se tivesse pensado neles por um motivo genuíno — algo novo que você viu, um projeto que acabou de fazer, uma ideia que teve. Curto e sem pressão.",
  },
];

// ─── Helper: chama Claude API ─────────────────────────────────────────────────
function callClaude(messages, system="", maxTokens=1000) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  }).then(r=>r.json()).then(d=>d.content?.[0]?.text||"");
}

function getDaysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function FollowBadge({ days, stage }) {
  if (stage === "fechado" || stage === "perdido") return null;
  if (days === null) return <span style={{background:"#6366f115",color:"#818cf8",fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:700}}>Novo</span>;
  if (days >= 7)  return <span style={{background:"#ef444420",color:"#ef4444",fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:700}}>⚠️ {days}d sumiu</span>;
  if (days >= 3)  return <span style={{background:"#f59e0b20",color:"#f59e0b",fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:700}}>🕐 {days}d atrás</span>;
  return <span style={{background:"#10b98120",color:"#10b981",fontSize:10,padding:"2px 7px",borderRadius:20,fontWeight:700}}>✓ Em dia</span>;
}

// ─── Subview: Pipeline ────────────────────────────────────────────────────────
function PipelineView({ prospects, setProspects, onSelectForMsg }) {
  const [filterStage, setFilterStage] = useState("todos");
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const formRef = useRef({ name:"", segment:"", canal:"Instagram/DM", referral:"", notes:"" });

  const urgent = prospects.filter(p =>
    !["fechado","perdido"].includes(p.stage) && getDaysAgo(p.lastContact) >= 5
  );

  const filtered = prospects.filter(p =>
    filterStage === "todos" || p.stage === filterStage
  );

  function addProspect() {
    const d = formRef.current;
    if (!d.name) return;
    setProspects(prev => [...prev, {
      id: Date.now(), ...d,
      stage:"identificado", lastContact:null, createdAt: new Date().toISOString(),
    }]);
    setShowAdd(false);
    formRef.current = { name:"", segment:"", canal:"Instagram/DM", referral:"", notes:"" };
  }

  function moveStage(id, stage) {
    setProspects(prev => prev.map(p =>
      p.id === id ? { ...p, stage, lastContact: new Date().toISOString() } : p
    ));
  }

  function markContacted(id) {
    setProspects(prev => prev.map(p =>
      p.id === id ? { ...p, lastContact: new Date().toISOString() } : p
    ));
  }

  function deleteProspect(id) {
    if (window.confirm("Remover este prospect?"))
      setProspects(prev => prev.filter(p => p.id !== id));
  }

  const stageCount = id => prospects.filter(p => p.stage === id).length;

  return (
    <div>
      {/* Alerta urgentes */}
      {urgent.length > 0 && (
        <div style={{background:"#ef444412",border:"1px solid #ef444430",borderRadius:12,padding:"12px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🚨</span>
          <div>
            <span style={{color:"#ef4444",fontWeight:700,fontSize:13}}>{urgent.length} prospect{urgent.length>1?"s":""} sem contato há 5+ dias</span>
            <div style={{color:"#ef444480",fontSize:11,marginTop:2}}>{urgent.map(p=>p.name).join(", ")}</div>
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setFilterStage("todos")}
            style={{background:filterStage==="todos"?"#6366f120":"transparent",border:`1px solid ${filterStage==="todos"?"#6366f1":"#2a2a45"}`,borderRadius:20,padding:"5px 14px",color:filterStage==="todos"?"#818cf8":"#6a6a8a",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
            Todos ({prospects.length})
          </button>
          {STAGES_PROSP.map(s => (
            <button key={s.id} onClick={()=>setFilterStage(s.id)}
              style={{background:filterStage===s.id?s.color+"20":"transparent",border:`1px solid ${filterStage===s.id?s.color:"#2a2a45"}`,borderRadius:20,padding:"5px 14px",color:filterStage===s.id?s.color:"#6a6a8a",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>
              {s.icon} {s.label} ({stageCount(s.id)})
            </button>
          ))}
        </div>
        <button onClick={()=>setShowAdd(true)}
          style={{background:"linear-gradient(135deg,#6d28d9,#a78bfa)",border:"none",borderRadius:10,padding:"9px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px #7c3aed40"}}>
          + Novo Prospect
        </button>
      </div>

      {filtered.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 0",color:"#3a3a5a"}}>
          <div style={{fontSize:48,marginBottom:12}}>🌱</div>
          <div style={{fontSize:15}}>Nenhum prospect aqui</div>
          <div style={{fontSize:12,marginTop:4,color:"#2a2a45"}}>Use "Quem Abordar" para descobrir nichos</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(p => {
          const stage = STAGES_PROSP.find(s => s.id === p.stage);
          const days = getDaysAgo(p.lastContact);
          const isExp = expanded === p.id;
          return (
            <div key={p.id}
              style={{background:"#13131f",border:`1px solid ${isExp?"#6366f1":"#1e1e30"}`,borderRadius:13,padding:"14px 16px",cursor:"pointer",transition:"all .15s"}}
              onClick={()=>setExpanded(isExp?null:p.id)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:15,color:"#e8e6f0"}}>{p.name}</span>
                    <span style={{fontSize:12,color:"#5a5a7a"}}>{CHANNEL_ICON[p.canal]} {p.canal}</span>
                    <FollowBadge days={days} stage={p.stage}/>
                  </div>
                  {p.segment && <div style={{fontSize:12,color:"#5a5a7a",marginTop:3}}>{p.segment}{p.referral?` · via ${p.referral}`:""}</div>}
                  {p.notes && <div style={{fontSize:11,color:"#3a3a5a",marginTop:3,fontStyle:"italic"}}>"{p.notes}"</div>}
                </div>
                <div style={{background:stage.color+"20",color:stage.color,fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,flexShrink:0,marginLeft:10}}>
                  {stage.icon} {stage.label}
                </div>
              </div>

              {isExp && (
                <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #2a2a45"}} onClick={e=>e.stopPropagation()}>
                  <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Mover para:</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {STAGES_PROSP.map(s => (
                      <button key={s.id} onClick={()=>moveStage(p.id,s.id)}
                        style={{background:p.stage===s.id?s.color:"#1a1a2e",border:`1px solid ${s.color}40`,borderRadius:7,padding:"4px 10px",color:p.stage===s.id?"#fff":s.color,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                        {s.icon} {s.label}
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>markContacted(p.id)}
                      style={{background:"#10b98120",border:"1px solid #10b98140",borderRadius:8,padding:"7px 13px",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      ✓ Contato feito hoje
                    </button>
                    <button onClick={()=>onSelectForMsg(p)}
                      style={{background:"#6366f120",border:"1px solid #6366f140",borderRadius:8,padding:"7px 13px",color:"#818cf8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                      ✍️ Criar mensagem
                    </button>
                    <button onClick={()=>deleteProspect(p.id)}
                      style={{background:"#ef444415",border:"1px solid #ef444430",borderRadius:8,padding:"7px 10px",color:"#ef4444",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal add */}
      {showAdd && (
        <div onClick={()=>setShowAdd(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(6px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#13131f",border:"1px solid #2a2a45",borderRadius:20,padding:28,width:420,maxWidth:"92vw"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <span style={{color:"#e8e6f0",fontWeight:800,fontSize:18,fontFamily:"'Syne',sans-serif"}}>Novo Prospect</span>
              <button onClick={()=>setShowAdd(false)} style={{background:"none",border:"none",color:"#5a5a7a",cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
            </div>
            {[
              {label:"Nome / Empresa *",key:"name",ph:"Ex: Studio Ana Lima"},
              {label:"Segmento",key:"segment",ph:"Ex: Nutricionista, Dentista..."},
              {label:"Indicado por",key:"referral",ph:"Quem te indicou? (opcional)"},
              {label:"Observações",key:"notes",ph:"Qualquer detalhe útil..."},
            ].map(f => (
              <div key={f.key} style={{marginBottom:12}}>
                <div style={{fontSize:11,color:"#5a5a7a",fontWeight:600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.07em"}}>{f.label}</div>
                <input defaultValue={formRef.current[f.key]} onChange={e=>formRef.current[f.key]=e.target.value}
                  placeholder={f.ph}
                  style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:9,padding:"9px 13px",color:"#e8e6f0",fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
              </div>
            ))}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#5a5a7a",fontWeight:600,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.07em"}}>Canal</div>
              <select defaultValue={formRef.current.canal} onChange={e=>formRef.current.canal=e.target.value}
                style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:9,padding:"9px 13px",color:"#e8e6f0",fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
                {CANAIS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAdd(false)} style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:10,padding:"10px",color:"#6a6a8a",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",flex:1}}>Cancelar</button>
              <button onClick={addProspect} style={{background:"linear-gradient(135deg,#6d28d9,#a78bfa)",border:"none",borderRadius:10,padding:"10px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"inherit",flex:2,boxShadow:"0 4px 16px #7c3aed40"}}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subview: Quem Abordar ────────────────────────────────────────────────────
function QuemAbordarView({ onAddProspect }) {
  const [aiNiches, setAiNiches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [diagUrl, setDiagUrl] = useState("");
  const [diagResult, setDiagResult] = useState("");
  const [diagLoading, setDiagLoading] = useState(false);

  async function gerarNiches() {
    setLoading(true);
    setAiNiches([]);
    const txt = await callClaude([{
      role:"user",
      content:`Você é um especialista em marketing para designers freelancers brasileiros. Liste 8 tipos de negócios locais no Brasil que em 2026 têm MAIOR urgência em melhorar seu design/identidade visual, com alto potencial de pagar bem.
Para cada um, responda APENAS em JSON puro sem markdown:
[{"nicho":"nome do nicho","dor":"problema visual específico em 1 frase direta","oportunidade":"por que eles pagam bem","abordagem":"como o designer deveria aparecer para eles em 1 frase"}]`
    }],
    "Responda apenas JSON. Sem markdown, sem texto fora do JSON.", 1500);
    try {
      const clean = txt.replace(/```json|```/g,"").trim();
      setAiNiches(JSON.parse(clean));
    } catch {
      setAiNiches([{nicho:"Erro ao gerar",dor:"Tente novamente",oportunidade:"",abordagem:""}]);
    }
    setLoading(false);
  }

  async function diagnosticar() {
    if (!diagUrl) return;
    setDiagLoading(true);
    setDiagResult("");
    const txt = await callClaude([{
      role:"user",
      content:`Analise o seguinte negócio para um designer freelancer prospectar. Link/perfil: ${diagUrl}

Faça uma análise como designer experiente — seja direto e específico sobre:
1. O que está VISIVELMENTE fraco no design/identidade visual deles (baseado no segmento/nome/tipo)
2. Qual é a DOR REAL que isso causa no negócio deles (perda de clientes, falta de credibilidade, etc)
3. O GANCHO perfeito para abordar — uma observação específica que vai fazer eles ouvirem

Seja direto, não genérico. Fale como se você realmente olhou para eles. Máximo 150 palavras.`
    }], "Você é um designer freelancer experiente fazendo análise de prospecção. Seja cirúrgico e específico.");
    setDiagResult(txt);
    setDiagLoading(false);
  }

  return (
    <div>
      {/* Diagnóstico de Dor */}
      <div style={{background:"linear-gradient(135deg,#6d28d915,#13131f)",border:"1px solid #6366f130",borderRadius:16,padding:"20px 22px",marginBottom:24}}>
        <div style={{fontWeight:700,fontSize:15,color:"#e8e6f0",marginBottom:6}}>🔍 Diagnóstico de Dor com IA</div>
        <div style={{fontSize:13,color:"#6a6a8a",marginBottom:14}}>Cole o Instagram, site ou nome do negócio. A IA analisa o que está fraco visualmente e te dá o gancho perfeito para abordá-los.</div>
        <div style={{display:"flex",gap:8}}>
          <input value={diagUrl} onChange={e=>setDiagUrl(e.target.value)}
            placeholder="Ex: @clinicaestética_sp ou www.restaurante.com.br"
            style={{flex:1,background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:9,padding:"10px 13px",color:"#e8e6f0",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          <button onClick={diagnosticar} disabled={!diagUrl||diagLoading}
            style={{background:"linear-gradient(135deg,#6d28d9,#a78bfa)",border:"none",borderRadius:9,padding:"10px 18px",color:"#fff",fontSize:13,fontWeight:700,cursor:diagLoading?"wait":"pointer",fontFamily:"inherit",opacity:diagLoading?0.7:1,whiteSpace:"nowrap"}}>
            {diagLoading?"Analisando...":"Diagnosticar 🎯"}
          </button>
        </div>
        {diagResult && (
          <div style={{marginTop:14,background:"#0f0f1a",border:"1px solid #6366f130",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:11,color:"#6366f1",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Análise do Designer</div>
            <div style={{color:"#e8e6f0",fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{diagResult}</div>
            <button onClick={()=>navigator.clipboard.writeText(diagResult)}
              style={{background:"#6366f115",border:"1px solid #6366f130",borderRadius:7,padding:"6px 12px",color:"#818cf8",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginTop:10}}>
              📋 Copiar análise
            </button>
          </div>
        )}
      </div>

      {/* Nichos rápidos */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:12,color:"#5a5a7a",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>Nichos com alta demanda — clique para adicionar</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {NICHOS_RAPIDOS.map(n => (
            <button key={n.nome} onClick={()=>onAddProspect(n.nome)}
              title={n.dor}
              style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:20,padding:"6px 14px",color:"#a0a0c0",fontSize:12,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="#6366f115";e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.color="#818cf8";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#1a1a2e";e.currentTarget.style.borderColor="#2a2a45";e.currentTarget.style.color="#a0a0c0";}}>
              {n.nome}
            </button>
          ))}
        </div>
      </div>

      {/* IA de nichos */}
      <button onClick={gerarNiches} disabled={loading}
        style={{background:"linear-gradient(135deg,#6d28d9,#a78bfa)",border:"none",borderRadius:10,padding:"11px 22px",color:"#fff",fontSize:13,fontWeight:700,cursor:loading?"wait":"pointer",fontFamily:"inherit",marginBottom:20,opacity:loading?0.7:1,display:"flex",alignItems:"center",gap:8}}>
        {loading?<><span style={{fontSize:14,animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Analisando oportunidades...</>:<>🤖 Gerar oportunidades com IA</>}
      </button>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {aiNiches.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
          {aiNiches.map((n,i) => (
            <div key={i} style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"16px 18px",animation:"fadeIn .3s ease",animationDelay:`${i*0.05}s`,animationFillMode:"backwards"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#e8e6f0",marginBottom:6}}>{n.nicho}</div>
              <div style={{fontSize:12,color:"#ef4444",background:"#ef444410",borderRadius:7,padding:"5px 10px",marginBottom:8}}>❗ {n.dor}</div>
              <div style={{fontSize:12,color:"#10b981",marginBottom:6}}>💰 {n.oportunidade}</div>
              <div style={{fontSize:12,color:"#818cf8",background:"#6366f110",borderRadius:7,padding:"6px 10px",marginBottom:10}}>🎯 {n.abordagem}</div>
              <button onClick={()=>onAddProspect(n.nicho)}
                style={{background:"#1a1a2e",border:"1px solid #2a2a45",borderRadius:8,padding:"7px",color:"#a0a0c0",fontSize:12,cursor:"pointer",fontFamily:"inherit",width:"100%",fontWeight:600}}>
                + Adicionar como prospect
              </button>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ─── Subview: Gerador de Mensagem ─────────────────────────────────────────────
function GeradorView({ selectedProspect, prospects, setProspects }) {
  const [prospect, setProspect] = useState(selectedProspect || null);
  const [abordagem, setAbordagem] = useState(ABORDAGENS[0]);
  const [canal, setCanal] = useState("Instagram/DM");
  const [extra, setExtra] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(()=>{
    if (selectedProspect) setProspect(selectedProspect);
  },[selectedProspect]);

  async function gerar() {
    setLoading(true);
    setMsg("");
    const txt = await callClaude([{
      role:"user",
      content:`Escreva uma mensagem de prospecção para um designer freelancer brasileiro abordar um potencial cliente.

DADOS DO PROSPECT:
- Nome/Empresa: ${prospect?.name || "prospect não identificado"}
- Segmento: ${prospect?.segment || "não informado"}
- Canal: ${canal}
${prospect?.referral ? `- Foi indicado por: ${prospect.referral}` : ""}
${extra ? `- Contexto extra: ${extra}` : ""}

ABORDAGEM ESCOLHIDA: ${abordagem.nome}
INSTRUÇÃO DA ABORDAGEM: ${abordagem.instrucao}
TOM: ${abordagem.tom}

REGRAS ABSOLUTAS:
- NÃO comece com "Olá", "Oi" seguido de vírgula de forma robotizada
- NÃO use frases como "espero que esteja bem", "tudo bem?", "venho por meio desta"
- NÃO escreva como vendedor ou copywriter — escreva como PESSOA
- Seja específico ao segmento/nome do prospect, não genérico
- Máximo 5 linhas para ${canal === "Email" ? "email (pode ter assunto)" : canal}
- Adapte o comprimento e tom para ${canal}`
    }], "Você é um designer freelancer brasileiro criativo e irreverente que sabe prospectar de forma humana, não corporativa. Escreva mensagens que parecem escritas por uma pessoa real, não por uma IA.");
    setMsg(txt);
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2500);
  }

  function markSent() {
    if (!prospect) return;
    setProspects(prev => prev.map(p =>
      p.id === prospect.id
        ? { ...p, stage:"abordado", lastContact: new Date().toISOString() }
        : p
    ));
    alert(`✅ ${prospect.name} marcado como "Abordado" no pipeline!`);
  }

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:960}}>
      {/* Coluna esquerda — configuração */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Selecionar prospect */}
        <div style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.08em"}}>Para qual prospect?</div>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:200,overflowY:"auto"}}>
            {prospects.filter(p=>!["fechado","perdido"].includes(p.stage)).map(p => (
              <div key={p.id} onClick={()=>setProspect(p)}
                style={{background:prospect?.id===p.id?"#6366f115":"#0f0f1a",border:`1px solid ${prospect?.id===p.id?"#6366f1":"#2a2a45"}`,borderRadius:9,padding:"9px 12px",cursor:"pointer",transition:"all .13s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:"#e8e6f0",fontWeight:600,fontSize:13}}>{p.name}</div>
                    <div style={{color:"#5a5a7a",fontSize:11}}>{p.segment || "sem segmento"}</div>
                  </div>
                  {prospect?.id===p.id && <span style={{color:"#818cf8",fontWeight:800}}>✓</span>}
                </div>
              </div>
            ))}
            {prospects.filter(p=>!["fechado","perdido"].includes(p.stage)).length===0 && (
              <div style={{color:"#3a3a5a",fontSize:12,textAlign:"center",padding:"16px 0"}}>Adicione prospects no pipeline primeiro</div>
            )}
          </div>
        </div>

        {/* Canal */}
        <div style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"14px 18px"}}>
          <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Canal</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {CANAIS.map(c => (
              <button key={c} onClick={()=>setCanal(c)}
                style={{background:canal===c?"#6366f120":"#1a1a2e",border:`1px solid ${canal===c?"#6366f1":"#2a2a45"}`,borderRadius:20,padding:"5px 12px",color:canal===c?"#818cf8":"#6a6a8a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {CHANNEL_ICON[c]} {c}
              </button>
            ))}
          </div>
        </div>

        {/* Contexto extra */}
        <div style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"14px 18px"}}>
          <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Contexto extra (opcional)</div>
          <textarea value={extra} onChange={e=>setExtra(e.target.value)} rows={2}
            placeholder="Ex: Vi que eles abriram filial nova, tinham post com logo torta, fizeram campanha recente..."
            style={{background:"#0f0f1a",border:"1px solid #2a2a45",borderRadius:9,padding:"9px 12px",color:"#e8e6f0",fontSize:12,width:"100%",outline:"none",fontFamily:"inherit",boxSizing:"border-box",resize:"none",lineHeight:1.6}}/>
        </div>
      </div>

      {/* Coluna direita — abordagem + resultado */}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>

        {/* Seletor de abordagem */}
        <div style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"16px 18px"}}>
          <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.08em"}}>Abordagem — saia da caixinha</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {ABORDAGENS.map(a => (
              <div key={a.id} onClick={()=>setAbordagem(a)}
                style={{background:abordagem.id===a.id?"#6366f112":"#0f0f1a",border:`1px solid ${abordagem.id===a.id?"#6366f1":"#1e1e30"}`,borderRadius:10,padding:"10px 13px",cursor:"pointer",transition:"all .13s"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{a.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{color:abordagem.id===a.id?"#818cf8":"#e8e6f0",fontWeight:700,fontSize:13}}>{a.nome}</div>
                    <div style={{color:"#4a4a6a",fontSize:11,marginTop:1}}>{a.desc}</div>
                  </div>
                  {abordagem.id===a.id && <span style={{color:"#818cf8",fontWeight:800,flexShrink:0}}>✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Botão gerar */}
        <button onClick={gerar} disabled={!prospect||loading}
          style={{background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)",border:`1px solid ${!prospect?"#2a2a45":"transparent"}`,borderRadius:12,padding:"13px",color:!prospect?"#4a4a6a":"#fff",fontSize:14,fontWeight:800,cursor:(!prospect||loading)?"not-allowed":"pointer",fontFamily:"'Syne',sans-serif",opacity:loading?0.7:1,letterSpacing:"0.02em",boxShadow:!prospect?"none":"0 4px 20px #7c3aed50"}}>
          {loading?"✨ Gerando mensagem...":!prospect?"← Selecione um prospect":"✨ Gerar mensagem"}
        </button>

        {/* Resultado */}
        {msg && (
          <div style={{background:"#0f0f1a",border:"1px solid #6366f130",borderRadius:14,padding:"16px 18px",animation:"fadeIn .3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:11,color:"#6366f1",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                {abordagem.icon} {abordagem.nome}
              </div>
              <button onClick={gerar}
                style={{background:"none",border:"none",color:"#4a4a6a",cursor:"pointer",fontSize:14,padding:2}} title="Regenerar">🔄</button>
            </div>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={6}
              style={{background:"none",border:"none",color:"#e8e6f0",fontSize:13,width:"100%",outline:"none",fontFamily:"inherit",resize:"vertical",lineHeight:1.75,letterSpacing:"0.01em"}}/>
            <div style={{display:"flex",gap:8,marginTop:10,paddingTop:10,borderTop:"1px solid #1e1e30"}}>
              <button onClick={copy}
                style={{background:copied?"#10b98120":"#6366f120",border:`1px solid ${copied?"#10b98140":"#6366f140"}`,borderRadius:9,padding:"8px 16px",color:copied?"#10b981":"#818cf8",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flex:1,transition:"all .2s"}}>
                {copied?"✓ Copiado!":"📋 Copiar"}
              </button>
              {prospect && (
                <button onClick={markSent}
                  style={{background:"#f59e0b20",border:"1px solid #f59e0b40",borderRadius:9,padding:"8px 16px",color:"#f59e0b",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flex:1}}>
                  📩 Marcar como enviado
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subview: Sequência de Follow-up ─────────────────────────────────────────
function SequenciaView({ prospects }) {
  const [prospect, setProspect] = useState(null);
  const [sequencia, setSequencia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiados, setCopiados] = useState({});

  async function gerarSequencia() {
    if (!prospect) return;
    setLoading(true);
    setSequencia(null);
    const txt = await callClaude([{
      role:"user",
      content:`Crie uma sequência de 3 mensagens de prospecção para um designer freelancer abordar ${prospect.name} (segmento: ${prospect.segment || "não informado"}) pelo canal ${prospect.canal}.

Cada mensagem deve ter:
- Abordagem DIFERENTE das outras (não repita o mesmo tom ou gancho)
- Intervalo sugerido desde a mensagem anterior
- Tom que evolui: começa suave, fica mais direto, termina com encerramento elegante
- NÃO pareça automático — cada mensagem deve soar como uma pessoa diferente mandando

Responda APENAS em JSON:
[
  {"numero":1,"intervalo":"Dia 1","tom":"[nome do tom]","mensagem":"[texto]","objetivo":"[o que você quer que aconteça]"},
  {"numero":2,"intervalo":"3-4 dias depois","tom":"[nome do tom]","mensagem":"[texto]","objetivo":"[objetivo]"},
  {"numero":3,"intervalo":"7-10 dias depois","tom":"[nome do tom]","mensagem":"[texto]","objetivo":"[objetivo]"}
]`
    }], "Responda apenas JSON válido. Seja criativo e humano, não corporativo.", 1500);
    try {
      const clean = txt.replace(/```json|```/g,"").trim();
      setSequencia(JSON.parse(clean));
    } catch {
      setSequencia([{numero:1,intervalo:"Erro",tom:"",mensagem:txt,objetivo:"Tente novamente"}]);
    }
    setLoading(false);
  }

  function copyMsg(i, msg) {
    navigator.clipboard.writeText(msg);
    setCopiados(prev => ({...prev,[i]:true}));
    setTimeout(()=>setCopiados(prev=>({...prev,[i]:false})), 2000);
  }

  const tonColors = ["#6366f1","#f59e0b","#10b981"];

  return (
    <div style={{maxWidth:720}}>
      <div style={{background:"#13131f",border:"1px solid #1e1e30",borderRadius:14,padding:"18px 20px",marginBottom:18}}>
        <div style={{fontSize:13,color:"#6a6a8a",marginBottom:12}}>
          Planeja os <strong style={{color:"#818cf8"}}>3 primeiros contatos</strong> de uma vez — com tons diferentes e timing estratégico. Você não precisa pensar mais, só enviar no momento certo.
        </div>
        <div style={{fontSize:11,color:"#5a5a7a",fontWeight:700,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Gerar sequência para:</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          {prospects.filter(p=>!["fechado","perdido"].includes(p.stage)).map(p => (
            <button key={p.id} onClick={()=>setProspect(p)}
              style={{background:prospect?.id===p.id?"#6366f120":"#1a1a2e",border:`1px solid ${prospect?.id===p.id?"#6366f1":"#2a2a45"}`,borderRadius:20,padding:"6px 14px",color:prospect?.id===p.id?"#818cf8":"#6a6a8a",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
              {CHANNEL_ICON[p.canal]} {p.name}
            </button>
          ))}
        </div>
        <button onClick={gerarSequencia} disabled={!prospect||loading}
          style={{background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)",border:`1px solid ${!prospect?"#2a2a45":"transparent"}`,borderRadius:10,padding:"11px 22px",color:!prospect?"#4a4a6a":"#fff",fontSize:13,fontWeight:700,cursor:(!prospect||loading)?"not-allowed":"pointer",fontFamily:"inherit",opacity:loading?0.7:1}}>
          {loading?"🧠 Montando sequência...":!prospect?"Selecione um prospect":"🎯 Gerar sequência de 3"}
        </button>
      </div>

      {sequencia && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sequencia.map((s,i) => (
            <div key={i} style={{background:"#13131f",border:`1px solid ${tonColors[i]}30`,borderRadius:14,padding:"18px 20px",borderLeft:`3px solid ${tonColors[i]}`,animation:"fadeIn .4s ease",animationDelay:`${i*.1}s`,animationFillMode:"backwards"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{background:tonColors[i]+"25",color:tonColors[i],fontWeight:800,fontSize:13,padding:"3px 12px",borderRadius:20}}>Mensagem {s.numero}</span>
                    <span style={{color:"#4a4a6a",fontSize:11}}>📅 {s.intervalo}</span>
                  </div>
                  <div style={{color:"#6a6a8a",fontSize:11}}>Tom: <span style={{color:tonColors[i]}}>{s.tom}</span> · Objetivo: {s.objetivo}</div>
                </div>
                <button onClick={()=>copyMsg(i,s.mensagem)}
                  style={{background:copiados[i]?"#10b98120":"#1a1a2e",border:`1px solid ${copiados[i]?"#10b98140":"#2a2a45"}`,borderRadius:8,padding:"6px 12px",color:copiados[i]?"#10b981":"#6a6a8a",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",whiteSpace:"nowrap"}}>
                  {copiados[i]?"✓ Copiado":"📋 Copiar"}
                </button>
              </div>
              <div style={{background:"#0f0f1a",borderRadius:10,padding:"12px 14px",color:"#e8e6f0",fontSize:13,lineHeight:1.75,whiteSpace:"pre-wrap"}}>
                {s.mensagem}
              </div>
            </div>
          ))}
          <div style={{background:"#0f0f1a",border:"1px solid #1e1e30",borderRadius:12,padding:"12px 16px",color:"#5a5a7a",fontSize:12,textAlign:"center"}}>
            💡 Dica: salve estas 3 mensagens e envie em dias separados. Se responder na primeira, cancele as demais.
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL — Prospeccao
// ══════════════════════════════════════════════════════════════════════════════
export function Prospeccao({ leads, setLeads }) {
  // Estado local de prospects (separado dos leads do CRM)
  const [prospects, setProspects] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_prospects")||"[]"); } catch { return []; }
  });
  const [tab, setTab] = useState("pipeline");
  const [msgProspect, setMsgProspect] = useState(null);

  // Persiste prospects
  useEffect(()=>{
    try { localStorage.setItem("dh_prospects", JSON.stringify(prospects)); } catch {}
  }, [prospects]);

  // Converte prospect para lead no CRM
  function convertToLead(prospect) {
    if (!window.confirm(`Converter "${prospect.name}" para Lead no CRM?`)) return;
    setLeads(prev => [...prev, {
      id: Date.now(),
      name: prospect.name,
      company: prospect.segment || "",
      email: "", value: 0,
      status: "novo",
      tag: prospect.segment || "Prospecção",
      categoria: "lead",
      date: new Date().toISOString().split("T")[0],
    }]);
    setProspects(prev => prev.map(p => p.id===prospect.id ? {...p,stage:"fechado"} : p));
    alert("✅ Convertido para Lead no CRM!");
  }

  function handleAddFromNiche(segment) {
    setProspects(prev => [...prev, {
      id: Date.now(),
      name: `Prospect — ${segment}`,
      segment,
      canal: "Instagram/DM",
      stage: "identificado",
      lastContact: null,
      createdAt: new Date().toISOString(),
    }]);
    setTab("pipeline");
  }

  function handleSelectForMsg(prospect) {
    setMsgProspect(prospect);
    setTab("mensagem");
  }

  const urgentCount = prospects.filter(p =>
    !["fechado","perdido"].includes(p.stage) && getDaysAgo(p.lastContact) >= 5
  ).length;

  const TABS = [
    { id:"pipeline",  label:"⚡ Pipeline",           badge: urgentCount > 0 ? urgentCount : null },
    { id:"niches",    label:"🎯 Quem Abordar" },
    { id:"mensagem",  label:"✍️ Criar Mensagem" },
    { id:"sequencia", label:"📅 Sequência de 3" },
  ];

  // Stats rápidas
  const stats = {
    total: prospects.length,
    abordados: prospects.filter(p=>["abordado","respondeu"].includes(p.stage)).length,
    proposta: prospects.filter(p=>p.stage==="proposta").length,
    fechados: prospects.filter(p=>p.stage==="fechado").length,
  };

  return (
    <div style={{padding:"28px 32px",maxWidth:1100}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 style={{color:"#e8e6f0",fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,margin:0,letterSpacing:"-0.02em"}}>
          🎯 Prospecção
        </h1>
        <p style={{color:"#5a5a7a",margin:"5px 0 0",fontSize:13}}>Pipeline de novos clientes · abordagens criativas · follow-up inteligente</p>
      </div>

      {/* Stats */}
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        {[
          {label:"Prospects",value:stats.total,color:"#818cf8"},
          {label:"Em contato",value:stats.abordados,color:"#f59e0b"},
          {label:"Com proposta",value:stats.proposta,color:"#06b6d4"},
          {label:"Fechados",value:stats.fechados,color:"#10b981"},
        ].map(s=>(
          <div key={s.label} style={{background:"#13131f",border:`1px solid #1e1e30`,borderRadius:13,padding:"14px 20px",flex:1,minWidth:110,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.color},transparent)`}}/>
            <div style={{color:"#5a5a7a",fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>{s.label}</div>
            <div style={{color:s.color,fontSize:26,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,background:"#0f0f1a",borderRadius:12,padding:4,border:"1px solid #1e1e30",marginBottom:24,width:"fit-content",flexWrap:"wrap",gap:2}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?"#1e1e30":"transparent",border:tab===t.id?"1px solid #2a2a45":"1px solid transparent",borderRadius:9,padding:"8px 16px",color:tab===t.id?"#e8e6f0":"#5a5a7a",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?600:400,transition:"all .13s",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,position:"relative"}}>
            {t.label}
            {t.badge && <span style={{background:"#ef4444",color:"#fff",fontSize:9,fontWeight:800,padding:"0 5px",borderRadius:99,lineHeight:"14px"}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab==="pipeline" && (
        <PipelineView
          prospects={prospects}
          setProspects={setProspects}
          onSelectForMsg={handleSelectForMsg}
        />
      )}

      {tab==="niches" && (
        <QuemAbordarView onAddProspect={handleAddFromNiche}/>
      )}

      {tab==="mensagem" && (
        <GeradorView
          selectedProspect={msgProspect}
          prospects={prospects}
          setProspects={setProspects}
        />
      )}

      {tab==="sequencia" && (
        <SequenciaView prospects={prospects}/>
      )}

      {/* Converter prospects fechados para leads */}
      {prospects.filter(p=>p.stage==="proposta").length > 0 && (
        <div style={{marginTop:28,background:"#10b98110",border:"1px solid #10b98130",borderRadius:14,padding:"16px 20px"}}>
          <div style={{fontWeight:700,color:"#10b981",fontSize:14,marginBottom:10}}>🎉 Prospects com proposta — converter para Lead no CRM?</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {prospects.filter(p=>p.stage==="proposta").map(p=>(
              <button key={p.id} onClick={()=>convertToLead(p)}
                style={{background:"#10b98120",border:"1px solid #10b98140",borderRadius:9,padding:"7px 14px",color:"#10b981",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                {p.name} → CRM
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
