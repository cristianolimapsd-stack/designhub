import { useState, useEffect, useRef } from "react";
import { supabase, dbReady } from './lib/supabase.js';

// ─── Persistência local (fallback offline) ────────────────────────────────────
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

const C = {
  bg:"#080810", surface:"#0f0f1a", card:"#14141f", cardHover:"#1a1a2e",
  border:"#1e1e30", accent:"#a78bfa", accentGlow:"#7c3aed",
  teal:"#2dd4bf", orange:"#fb923c", red:"#f87171", green:"#4ade80",
  yellow:"#facc15", text:"#e2e8f0", muted:"#64748b", subtle:"#334155",
  pink:"#f472b6",
};

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const NOW_MONTH = "2026-03";
const NOW_YEAR  = 2026;
const NOW_MO    = 2; // index 0-based = March

// ─── Initial Data ─────────────────────────────────────────────────────────────
const CATEGORIA = {
  lead:         { label:"Lead",          color:C.yellow, icon:"⚡" },
  cliente_fixo: { label:"Cliente Ativo",  color:C.teal,   icon:"⭐" },
};

const STATUS_DEMANDA = {
  triagem:     { label:"Triagem",      color:"#94a3b8", icon:"📥" },
  em_criacao:  { label:"Em Criação",   color:"#a78bfa", icon:"✏️"  },
  revisao:     { label:"Revisão",      color:"#38bdf8", icon:"🔍" },
  aprovacao:   { label:"Aprovação",    color:"#fb923c", icon:"👀" },
  finalizado:  { label:"Finalizado",   color:"#4ade80", icon:"✅" },
};
const KANBAN_COLS = ["triagem","em_criacao","revisao","aprovacao","finalizado"];

const initLeads = [
  { id:1, name:"Mateus Costa",   company:"Pixel Studio",  email:"mateus@pixel.io",  value:4500,  status:"novo",       date:"2026-03-01", tag:"Design",   categoria:"lead",         briefing_padrao:"" },
  { id:2, name:"Fernanda Lima",  company:"Brand Co",      email:"fer@brandco.com",  value:12000, status:"negociando", date:"2026-02-28", tag:"Branding", categoria:"lead",         briefing_padrao:"" },
  { id:3, name:"Lucas Andrade",  company:"Tech Venture",  email:"lucas@tv.com",     value:8500,  status:"proposta",   date:"2026-02-25", tag:"UI/UX",    categoria:"lead",         briefing_padrao:"" },
  { id:4, name:"Ana Beatriz",    company:"Startup XYZ",   email:"ana@xyz.com",      value:3200,  status:"fechado",    date:"2026-02-20", tag:"Logo",     categoria:"cliente_fixo", briefing_padrao:"Cores: rosa (#FF6B9D) e branco. Fonte: Poppins Bold. Tom jovem e descontraído. Evitar azul." },
  { id:5, name:"Roberto Mendes", company:"Agência Sol",   email:"roberto@sol.com",  value:6700,  status:"perdido",    date:"2026-02-18", tag:"Web",      categoria:"lead",         briefing_padrao:"" },
  { id:6, name:"Clara Nunes",    company:"Studio N",      email:"clara@n.com",      value:5800,  status:"fechado",    date:"2026-03-02", tag:"UI/UX",    categoria:"cliente_fixo", briefing_padrao:"Identidade clean e minimalista. Paleta: preto, branco e dourado (#D4AF37). Fonte: Playfair Display títulos, DM Sans corpo." },
  { id:7, name:"Pedro Ramos",    company:"VisualLab",     email:"pedro@vl.com",     value:9200,  status:"proposta",   date:"2026-03-03", tag:"Branding", categoria:"lead",         briefing_padrao:"" },
];

const initTasks = [
  { id:1, title:"Apresentar proposta para Brand Co",        time:"09:00", date:"2026-03-05", done:false, priority:"alta",  type:"reuniao" },
  { id:2, title:"Entregar identidade visual Tech Venture",  time:"11:30", date:"2026-03-05", done:false, priority:"alta",  type:"entrega" },
  { id:3, title:"Revisão de mockups Pixel Studio",          time:"14:00", date:"2026-03-05", done:true,  priority:"media", type:"tarefa"  },
  { id:4, title:"Call de alinhamento com Lucas",            time:"16:00", date:"2026-03-06", done:false, priority:"media", type:"reuniao" },
  { id:5, title:"Atualizar portfólio",                      time:"18:00", date:"2026-03-07", done:false, priority:"baixa", type:"tarefa"  },
  { id:6, title:"Enviar briefing Agência Sol",              time:"10:00", date:"2026-03-10", done:false, priority:"alta",  type:"entrega" },
];

const initPortfolio = [
  { id:1, title:"Identidade Visual — Pixel Studio", url:"https://behance.net", tag:"Branding", year:"2025", month:"2025-11", value:4500,  cover:"🎨", description:"Rebranding completo com sistema de identidade visual." },
  { id:2, title:"UI Kit — Tech Venture App",        url:"https://figma.com",   tag:"UI/UX",    year:"2025", month:"2025-09", value:8500,  cover:"📱", description:"Design system com mais de 200 componentes." },
  { id:3, title:"Website — Brand Co",               url:"https://dribbble.com",tag:"Web",      year:"2024", month:"2024-06", value:6000,  cover:"🌐", description:"Landing page institucional e campanha digital." },
];

const initTimerHistory = [];
const initDemandas = [];

const STATUS = {
  novo:       { label:"Novo",       color:C.teal   },
  negociando: { label:"Negociando", color:C.yellow },
  proposta:   { label:"Proposta",   color:C.accent },
  fechado:    { label:"Fechado",    color:C.green  },
  perdido:    { label:"Perdido",    color:C.red    },
};
const PRIORITY = { alta:{ dot:C.red }, media:{ dot:C.yellow }, baixa:{ dot:C.teal } };
const TYPE = { reuniao:{icon:"🤝",label:"Reunião"}, entrega:{icon:"📦",label:"Entrega"}, tarefa:{icon:"✅",label:"Tarefa"} };

// ─── Icons ─────────────────────────────────────────────────────────────────────
function Ico({ n, s=16, c="currentColor" }) {
  const M = {
    dashboard:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    leads:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    agenda:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    timer:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    finance:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    portfolio:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    note:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    plus:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    close:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    trash:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    edit:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    check:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    play:<svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pause:<svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    menu:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    search:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    list:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    calendar:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    kanban:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="18"/><rect x="10" y="3" width="5" height="12"/><rect x="17" y="3" width="5" height="15"/></svg>,
    externalLink:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    chevL:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
    chevR:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
    clock:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    bar:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    save:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
    star:<svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    user:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    link:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    instagram:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
    palette:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill={c}/><circle cx="17.5" cy="10.5" r=".5" fill={c}/><circle cx="8.5" cy="7.5" r=".5" fill={c}/><circle cx="6.5" cy="12.5" r=".5" fill={c}/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>,
  };
  return M[n] || null;
}

// ─── Timer Hook ────────────────────────────────────────────────────────────────
function useTimer(onSave) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [goal] = useState(8 * 3600);
  const intervalRef = useRef(null);
  const secondsRef = useRef(0); // ref para evitar stale closure no reset

  // mantém secondsRef sempre atualizado
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  useEffect(() => {
    if (running) intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const today = () => new Date().toISOString().split("T")[0];

  const fmt = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const fmtH = s => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
    if (h === 0) return `${m}min`;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const toggle = () => setRunning(r => !r);
  const reset = () => {
    setRunning(false);
    const secs = secondsRef.current;
    if (secs > 0) onSave(today(), secs);
    setSeconds(0);
    secondsRef.current = 0;
  };

  return { seconds, running, goal, fmt, fmtH, toggle, reset, today: today() };
}

// ─── Shared UI ─────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, w=480 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:w, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 30px 70px rgba(0,0,0,0.6)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:17, fontFamily:"'Syne',sans-serif" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="close" s={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text", options, placeholder }) {
  const base = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" };
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>}
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={{ ...base, cursor:"pointer" }}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={base}/>
      }
    </div>
  );
}

function Btn({ children, onClick, full, variant="primary", small }) {
  const vs = {
    primary:{ background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, color:"#fff", boxShadow:`0 4px 18px ${C.accentGlow}40`, border:"none" },
    ghost:  { background:`${C.accent}15`, color:C.accent, border:`1px solid ${C.accent}30`, boxShadow:"none" },
    danger: { background:`${C.red}15`,    color:C.red,    border:`1px solid ${C.red}30`,    boxShadow:"none" },
    muted:  { background:C.card,          color:C.muted,  border:`1px solid ${C.border}`,   boxShadow:"none" },
  };
  return (
    <button onClick={onClick} style={{ ...vs[variant], borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:small?"7px 12px":"10px 18px", fontSize:small?12:13, width:full?"100%":"auto", transition:"opacity 0.15s" }}>
      {children}
    </button>
  );
}

function Toggle({ opts, val, onChange }) {
  return (
    <div style={{ display:"flex", background:C.surface, borderRadius:9, padding:3, border:`1px solid ${C.border}`, gap:2 }}>
      {opts.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)} style={{ background:val===o.v?C.card:"transparent", border:val===o.v?`1px solid ${C.border}`:"1px solid transparent", borderRadius:7, padding:"6px 12px", color:val===o.v?C.text:C.muted, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6, transition:"all 0.13s" }}>
          <Ico n={o.icon} s={13} c={val===o.v?C.accent:C.muted}/>{o.label}
        </button>
      ))}
    </div>
  );
}

function MonthPicker({ value, onChange, label }) {
  // value = "YYYY-MM"
  const [yr, mo] = value.split("-").map(Number);
  const prev = () => { const d = new Date(yr, mo-2, 1); onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); };
  const next = () => { const d = new Date(yr, mo, 1); onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`); };
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      {label && <span style={{ color:C.muted, fontSize:12 }}>{label}</span>}
      <div style={{ display:"flex", alignItems:"center", gap:2, background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"5px 10px" }}>
        <button onClick={prev} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:"2px 4px", display:"flex" }}><Ico n="chevL" s={14}/></button>
        <span style={{ color:C.text, fontSize:13, fontWeight:600, minWidth:110, textAlign:"center" }}>{MONTHS[mo-1]} {yr}</span>
        <button onClick={next} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:"2px 4px", display:"flex" }}><Ico n="chevR" s={14}/></button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ leads, tasks, timer, timerHistory, setView, demandas=[] }) {
  const today = new Date().toISOString().split("T")[0];
  const totalV = leads.filter(l=>l.status==="fechado").reduce((a,b)=>a+b.value,0);
  const pipeline = leads.filter(l=>!["fechado","perdido"].includes(l.status)).reduce((a,b)=>a+b.value,0);
  const todT = tasks.filter(t=>t.date===today);
  const pct = Math.min(100, Math.round((timer.seconds/timer.goal)*100));

  // Last 7 days timer
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(2026,2,5-i); // from March 5 back
    const key = d.toISOString().split("T")[0];
    const rec = timerHistory.find(h=>h.date===key);
    return { label:d.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric"}), secs: key===today?timer.seconds:(rec?.seconds||0) };
  }).reverse();
  const maxSecs = Math.max(...last7.map(d=>d.secs), 1);

  return (
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, margin:0, letterSpacing:"-0.02em" }}>Bom dia! ☀️</h1>
        <p style={{ color:C.muted, margin:"5px 0 0", fontSize:13 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>

      {/* Timer */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 24px", marginBottom:22, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ width:46, height:46, borderRadius:12, background:timer.running?`${C.accentGlow}22`:C.border, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${timer.running?C.accent:C.border}` }}>
          <Ico n="timer" s={20} c={timer.running?C.accent:C.muted}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
            <span style={{ color:timer.running?C.teal:C.text, fontFamily:"'Syne',sans-serif", fontSize:28, fontWeight:800, letterSpacing:"0.02em" }}>{timer.fmt(timer.seconds)}</span>
            <span style={{ color:C.muted, fontSize:13 }}>{timer.running?"trabalhando":"pausado"} · {pct}% da meta diária</span>
          </div>
          <div style={{ marginTop:8, height:4, background:C.surface, borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.accentGlow},${C.accent})`, borderRadius:99, transition:"width 0.5s" }}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={timer.toggle} variant={timer.running?"ghost":"primary"} small><Ico n={timer.running?"pause":"play"} s={13} c={timer.running?C.accent:"#fff"}/>{timer.running?"Pausar":"Iniciar"}</Btn>
          <Btn onClick={timer.reset} variant="danger" small><Ico n="save" s={12} c={C.red}/>Salvar dia</Btn>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display:"flex", gap:14, marginBottom:22, flexWrap:"wrap" }}>
        {[
          { label:"Receita fechada", value:`R$ ${totalV.toLocaleString("pt-BR")}`, sub:`${leads.filter(l=>l.status==="fechado").length} projetos`, accent:C.green, onClick:null },
          { label:"Em pipeline",     value:`R$ ${pipeline.toLocaleString("pt-BR")}`, sub:`${leads.filter(l=>!["fechado","perdido"].includes(l.status)).length} ativos`, accent:C.accent, onClick:null },
          { label:"Total de leads",  value:leads.length, sub:`${leads.filter(l=>l.status==="novo").length} novos`, accent:C.teal, onClick:null },
          { label:"Tarefas hoje",    value:`${todT.filter(t=>t.done).length}/${todT.length}`, sub:`${todT.filter(t=>!t.done).length} pendentes`, accent:C.orange, onClick:null },
        ].map(m=>(
          <div key={m.label} onClick={m.onClick} style={{ flex:1, minWidth:160, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden", cursor:m.onClick?"pointer":"default" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${m.accent},transparent)` }}/>
            <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>{m.label}</div>
            <div style={{ color:m.accent, fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
            <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban resumo em tempo real */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 22px", marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>🗂 Kanban — visão geral</span>
          <button onClick={()=>setView("kanban")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", fontWeight:600 }}>Abrir Kanban →</button>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {KANBAN_COLS.map(col=>{
            const cfg = STATUS_DEMANDA[col];
            const n = demandas.filter(d=>d.status===col).length;
            const atrasados = demandas.filter(d=>d.status===col&&d.prazo&&d.prazo<today).length;
            return (
              <div key={col} style={{ flex:1, background:C.surface, border:`1px solid ${n>0?cfg.color+"30":C.border}`, borderRadius:11, padding:"12px 14px", textAlign:"center" }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{cfg.icon}</div>
                <div style={{ color:n>0?cfg.color:C.muted, fontWeight:800, fontSize:20, fontFamily:"'Syne',sans-serif" }}>{n}</div>
                <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{cfg.label}</div>
                {atrasados>0&&<div style={{ background:`${C.red}20`, color:C.red, fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:99, marginTop:5 }}>{atrasados} atrasado{atrasados>1?"s":""}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        {/* Timer 7 days */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>Horas — últimos 7 dias</span>
            <button onClick={()=>setView("timer")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", fontWeight:600 }}>Ver histórico →</button>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
            {last7.map((d,i)=>(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <div style={{ width:"100%", background:d.secs>0?`linear-gradient(180deg,${C.accent},${C.accentGlow})`:C.surface, borderRadius:"5px 5px 0 0", height:`${d.secs>0?(d.secs/maxSecs*65):4}px`, minHeight:d.secs>0?6:4, transition:"height 0.4s", boxShadow:d.secs>0?`0 0 8px ${C.accentGlow}40`:"none" }}/>
                <span style={{ color:C.muted, fontSize:9 }}>{d.label.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today + recent leads */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>Agenda de Hoje</span>
            <button onClick={()=>setView("agenda")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", fontWeight:600 }}>Ver agenda →</button>
          </div>
          {todT.length===0&&<div style={{ color:C.muted, fontSize:13, padding:"20px 0", textAlign:"center" }}>Nenhuma tarefa para hoje 🎉</div>}
          {todT.slice(0,5).map(t=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}`, opacity:t.done?0.5:1 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:PRIORITY[t.priority].dot, flexShrink:0 }}/>
              <span style={{ fontFamily:"monospace", fontSize:12, color:C.muted, width:42, flexShrink:0 }}>{t.time}</span>
              <span style={{ fontSize:14, flexShrink:0 }}>{TYPE[t.type].icon}</span>
              <span style={{ color:t.done?C.muted:C.text, fontSize:13, flex:1, textDecoration:t.done?"line-through":"none" }}>{t.title}</span>
              {t.type==="entrega"&&<span style={{ background:`${C.teal}15`, color:C.teal, fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:600, flexShrink:0 }}>demanda</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TIMER HISTORY
// ══════════════════════════════════════════════════════════════════════════════
function TimerHistoryView({ timerHistory, timer }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const [yr, mo] = selMonth.split("-").map(Number);

  const fmtH = s => {
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
    if (h===0) return `${m}min`;
    return m>0?`${h}h ${m}min`:`${h}h`;
  };

  const today = new Date().toISOString().split("T")[0];
  const allHistory = [...timerHistory];
  const todayIdx = allHistory.findIndex(h=>h.date===today);
  if (timer.seconds > 0) {
    if (todayIdx >= 0) allHistory[todayIdx] = { ...allHistory[todayIdx], seconds: allHistory[todayIdx].seconds + timer.seconds };
    else allHistory.push({ date:today, seconds:timer.seconds });
  }

  const monthRecords = allHistory
    .filter(h => h.date.startsWith(selMonth))
    .sort((a,b)=>b.date.localeCompare(a.date));

  const totalSecs = monthRecords.reduce((a,b)=>a+b.seconds,0);
  const avgSecs = monthRecords.length ? Math.round(totalSecs/monthRecords.length) : 0;
  const maxSecs = Math.max(...monthRecords.map(h=>h.seconds), 1);
  const goalSecs = 8*3600;

  // Build full month grid
  const daysInMo = new Date(yr,mo,0).getDate();
  const allDays = Array.from({length:daysInMo},(_,i)=>{
    const d = i+1;
    const key = `${yr}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const rec = allHistory.find(h=>h.date===key);
    return { day:d, key, secs:rec?.seconds||0 };
  });

  return (
    <div style={{ padding:"28px 32px", maxWidth:900 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Horas Trabalhadas</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Histórico de tempo por dia</p>
        </div>
        <MonthPicker value={selMonth} onChange={setSelMonth}/>
      </div>

      {/* Summary cards */}
      <div style={{ display:"flex", gap:14, marginBottom:24 }}>
        {[
          { label:"Total no mês", value:fmtH(totalSecs), sub:`${monthRecords.length} dias registrados`, accent:C.accent },
          { label:"Média diária", value:fmtH(avgSecs), sub:"dias trabalhados", accent:C.teal },
          { label:"Meta mensal (8h/dia)", value:`${Math.round(totalSecs/(goalSecs*22)*100)}%`, sub:`meta: ${fmtH(goalSecs*22)}`, accent:C.green },
        ].map(m=>(
          <div key={m.label} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${m.accent},transparent)` }}/>
            <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{m.label}</div>
            <div style={{ color:m.accent, fontSize:24, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
            <div style={{ color:C.muted, fontSize:12, marginTop:3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Bar chart — all days of month */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px", marginBottom:20 }}>
        <div style={{ marginBottom:16 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>Distribuição diária — {MONTHS[mo-1]} {yr}</span>
        </div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:120, overflowX:"auto" }}>
          {allDays.map(d=>{
            const pct = d.secs/maxSecs;
            const overGoal = d.secs >= goalSecs;
            return (
              <div key={d.day} style={{ minWidth:22, flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, position:"relative" }}>
                <div title={d.secs>0?fmtH(d.secs):"Sem registro"} style={{ width:"100%", background:d.secs>0?(overGoal?`linear-gradient(180deg,${C.green},${C.teal})`:`linear-gradient(180deg,${C.accent},${C.accentGlow})`):C.surface, borderRadius:"5px 5px 0 0", height:`${d.secs>0?Math.max(pct*105,6):4}px`, transition:"height 0.4s", boxShadow:d.secs>0?`0 0 8px ${overGoal?C.green:C.accentGlow}40`:"none", cursor:"pointer" }}/>
                <span style={{ color:C.muted, fontSize:9 }}>{d.day}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:10, height:10, borderRadius:3, background:`linear-gradient(135deg,${C.accent},${C.accentGlow})` }}/><span style={{ color:C.muted, fontSize:11 }}>Abaixo da meta (8h)</span></div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:10, height:10, borderRadius:3, background:`linear-gradient(135deg,${C.green},${C.teal})` }}/><span style={{ color:C.muted, fontSize:11 }}>Meta atingida</span></div>
        </div>
      </div>

      {/* Day list */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
        <div style={{ padding:"12px 18px", background:C.surface, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Registros do mês · {monthRecords.length} dias</span>
        </div>
        {monthRecords.length===0&&<div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:14 }}>Nenhum registro neste mês.</div>}
        {monthRecords.map((rec,i)=>{
          const pct = Math.min(100, Math.round(rec.seconds/goalSecs*100));
          const over = rec.seconds >= goalSecs;
          const dow = new Date(rec.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"long"});
          return (
            <div key={rec.date} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 18px", borderBottom:i<monthRecords.length-1?`1px solid ${C.border}`:"none" }}
              onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${over?C.green:C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Ico n="clock" s={18} c={over?C.green:C.accent}/>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ color:C.text, fontSize:13, fontWeight:600, textTransform:"capitalize" }}>{dow}, {new Date(rec.date+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span>
                  <span style={{ color:over?C.green:C.accent, fontSize:14, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{fmtH(rec.seconds)}</span>
                </div>
                <div style={{ height:4, background:C.surface, borderRadius:99 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:over?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accentGlow},${C.accent})`, borderRadius:99 }}/>
                </div>
                <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{pct}% da meta diária de 8h {over&&"✓"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CRM
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BRIEFING EDITOR (inline, com auto-save)
// ══════════════════════════════════════════════════════════════════════════════
function BriefingEditor({ lead, onSave }) {
  const [text, setText] = useState(lead.briefing_padrao||"");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setText(lead.briefing_padrao||""); }, [lead.id]);

  const handleChange = (v) => {
    setText(v);
    setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(lead.id, v); setSaved(true); }, 800);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <textarea
        value={text}
        onChange={e=>handleChange(e.target.value)}
        placeholder="Ex: Cores principais (#FFCC00, preto). Fonte: Montserrat Bold títulos, Lato corpo. Tom profissional e direto. Evitar elementos muito coloridos..."
        style={{ flex:1, minHeight:160, background:"#0f0f1a", border:"1px solid #1e1e30", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.7 }}
      />
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
        <span style={{ color:saved?"#4ade80":"#64748b", fontSize:11 }}>{saved?"✓ Salvo":"Editando..."}</span>
      </div>
    </div>
  );
}

function Leads({ leads, setLeads }) {
  const [vm, setVm] = useState("table");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [fs, setFs] = useState("todos");
  const [fc, setFc] = useState("todos"); // filtro categoria
  const [briefingId, setBriefingId] = useState(null); // drawer briefing
  const E = { name:"", company:"", email:"", value:"", status:"novo", tag:"", categoria:"lead", briefing_padrao:"" };
  const [form, setForm] = useState(E);

  const filtered = leads.filter(l=>
    (fs==="todos"||l.status===fs) &&
    (fc==="todos"||l.categoria===fc) &&
    (l.name.toLowerCase().includes(search.toLowerCase())||l.company.toLowerCase().includes(search.toLowerCase()))
  );
  const openAdd = (status="novo") => { setForm({...E,status}); setEditId(null); setModal(true); };
  const openEdit = l => { setForm({...l,value:String(l.value)}); setEditId(l.id); setModal(true); };
  const save = () => {
    const lead = { ...form, value:parseFloat(form.value)||0, date:new Date().toISOString().split("T")[0] };
    if (editId) setLeads(ls=>ls.map(l=>l.id===editId?{...lead,id:editId}:l));
    else setLeads(ls=>[...ls,{...lead,id:Date.now()}]);
    setModal(false);
  };
  const del = id => setLeads(ls=>ls.filter(l=>l.id!==id));
  const move = (id, status) => setLeads(ls=>ls.map(l=>l.id===id?{...l,status}:l));
  const converter = id => setLeads(ls=>ls.map(l=>l.id===id?{...l,categoria:"cliente_fixo",status:l.status==="novo"?"fechado":l.status}:l));
  const saveBriefing = (id, text) => setLeads(ls=>ls.map(l=>l.id===id?{...l,briefing_padrao:text}:l));

  const briefingLead = leads.find(l=>l.id===briefingId);

  const TotalFixo = leads.filter(l=>l.categoria==="cliente_fixo"&&l.status==="fechado").reduce((a,b)=>a+b.value,0);
  const TotalLead  = leads.filter(l=>l.categoria==="lead"&&l.status==="fechado").reduce((a,b)=>a+b.value,0);

  return (
    <div style={{ padding:"28px 32px" }}>
      {/* Drawer Briefing */}
      {briefingLead && (
        <div style={{ position:"fixed", inset:0, zIndex:900 }} onClick={()=>setBriefingId(null)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:420, background:C.surface, borderLeft:`1px solid ${C.border}`, padding:28, display:"flex", flexDirection:"column", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${C.accentGlow}22`, display:"flex", alignItems:"center", justifyContent:"center", color:C.accent, fontWeight:700, fontSize:15 }}>{briefingLead.name.charAt(0)}</div>
                  <div>
                    <div style={{ color:C.text, fontWeight:700, fontSize:16 }}>{briefingLead.name}</div>
                    <div style={{ color:C.muted, fontSize:12 }}>{briefingLead.company}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <span style={{ background:`${(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).color}18`, color:(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).color, fontSize:11, padding:"2px 10px", borderRadius:99, fontWeight:700 }}>
                    {(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).icon} {(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).label}
                  </span>
                  <span style={{ background:`${STATUS[briefingLead.status].color}18`, color:STATUS[briefingLead.status].color, fontSize:11, padding:"2px 10px", borderRadius:99, fontWeight:700 }}>{STATUS[briefingLead.status].label}</span>
                </div>
              </div>
              <button onClick={()=>setBriefingId(null)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="close" s={18}/></button>
            </div>

            {/* Info rápida */}
            <div style={{ background:C.card, borderRadius:12, padding:"13px 16px", marginBottom:18, border:`1px solid ${C.border}` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Valor</div><div style={{ color:C.green, fontWeight:700, fontSize:14 }}>R$ {briefingLead.value.toLocaleString("pt-BR")}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Tag</div><div style={{ color:C.teal, fontWeight:600, fontSize:13 }}>{briefingLead.tag}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Email</div><div style={{ color:C.text, fontSize:12 }}>{briefingLead.email}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Data</div><div style={{ color:C.text, fontSize:12 }}>{briefingLead.date}</div></div>
              </div>
            </div>

            {/* Briefing */}
            <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <label style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>
                  📋 Briefing Padrão da Marca
                </label>
                {briefingLead.categoria!=="cliente_fixo" && (
                  <span style={{ color:C.yellow, fontSize:10 }}>⚠ converta para Cliente Ativo</span>
                )}
              </div>
              <BriefingEditor lead={briefingLead} onSave={saveBriefing} />
            </div>

            {/* Ações */}
            <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:8 }}>
              {briefingLead.categoria!=="cliente_fixo" && (
                <button onClick={()=>{converter(briefingLead.id);}} style={{ background:`linear-gradient(135deg,${C.teal}88,${C.teal})`, border:"none", borderRadius:10, padding:"11px 18px", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  ⭐ Converter em Cliente Ativo
                </button>
              )}
              <button onClick={()=>{openEdit(briefingLead);setBriefingId(null);}} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 18px", color:C.text, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <Ico n="edit" s={13} c={C.muted}/> Editar dados
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>CRM · Contatos</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{leads.length} contatos · <span style={{ color:C.teal }}>⭐ R$ {TotalFixo.toLocaleString("pt-BR")} (fixos)</span> · <span style={{ color:C.yellow }}>⚡ R$ {TotalLead.toLocaleString("pt-BR")} (leads)</span></p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Toggle val={vm} onChange={setVm} opts={[{v:"table",label:"Tabela",icon:"list"},{v:"kanban",label:"Kanban",icon:"kanban"}]}/>
          <Btn onClick={()=>openAdd()}><Ico n="plus" s={14} c="#fff"/> Novo Contato</Btn>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <div style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}><Ico n="search" s={14} c={C.muted}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contato ou empresa..." style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px 9px 34px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["todos","lead","cliente_fixo"].map(cat=>{
            const cfg = cat==="todos" ? {label:"Todos",color:C.accent,icon:""} : CATEGORIA[cat];
            return (
              <button key={cat} onClick={()=>setFc(cat)} style={{ background:fc===cat?`${cfg.color}18`:C.card, border:`1px solid ${fc===cat?cfg.color:C.border}`, borderRadius:8, padding:"7px 13px", color:fc===cat?cfg.color:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["todos",...Object.keys(STATUS)].map(s=>(
            <button key={s} onClick={()=>setFs(s)} style={{ background:fs===s?`${C.accent}18`:C.card, border:`1px solid ${fs===s?C.accent:C.border}`, borderRadius:8, padding:"7px 12px", color:fs===s?C.accent:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              {s==="todos"?"Status":STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      {vm==="table" ? (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>
              {["Contato","Empresa","Categoria","Tag","Valor","Status",""].map(h=>(
                <th key={h} style={{ padding:"12px 18px", textAlign:"left", color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((l,i)=>{
                const cat = CATEGORIA[l.categoria]||CATEGORIA.lead;
                return (
                  <tr key={l.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", cursor:"pointer" }}
                    onClick={()=>setBriefingId(l.id)}
                    onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"13px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:33, height:33, borderRadius:9, background:`${cat.color}22`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.color, fontWeight:700, fontSize:13 }}>{l.name.charAt(0)}</div>
                        <div><div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{l.name}</div><div style={{ color:C.muted, fontSize:11 }}>{l.email}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:"13px 18px", color:C.muted, fontSize:13 }}>{l.company}</td>
                    <td style={{ padding:"13px 18px" }}>
                      <span style={{ background:`${cat.color}15`, color:cat.color, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>
                        {cat.icon} {cat.label}
                      </span>
                      {l.briefing_padrao && <span style={{ marginLeft:6, fontSize:12 }} title="Briefing salvo">📋</span>}
                    </td>
                    <td style={{ padding:"13px 18px" }}><span style={{ background:`${C.teal}15`, color:C.teal, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:600 }}>{l.tag}</span></td>
                    <td style={{ padding:"13px 18px", color:C.text, fontSize:13, fontWeight:700 }}>R$ {l.value.toLocaleString("pt-BR")}</td>
                    <td style={{ padding:"13px 18px" }}><span style={{ background:`${STATUS[l.status].color}18`, color:STATUS[l.status].color, fontSize:11, padding:"4px 11px", borderRadius:99, fontWeight:600 }}>{STATUS[l.status].label}</span></td>
                    <td style={{ padding:"13px 18px" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:8 }}>
                        {l.categoria!=="cliente_fixo"&&<button onClick={()=>converter(l.id)} title="Converter em Cliente Ativo" style={{ background:`${C.teal}15`, border:`1px solid ${C.teal}30`, borderRadius:7, padding:"4px 8px", color:C.teal, cursor:"pointer", fontSize:11, fontWeight:700 }}>⭐</button>}
                        <button onClick={()=>openEdit(l)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="edit" s={14}/></button>
                        <button onClick={()=>del(l.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:4 }}><Ico n="trash" s={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{ padding:40, textAlign:"center", color:C.muted }}>Nenhum contato encontrado.</div>}
        </div>
      ) : (
        <div style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:14 }}>
          {Object.entries(STATUS).map(([status,cfg])=>{
            const col = filtered.filter(l=>l.status===status);
            return (
              <div key={status} style={{ minWidth:238, width:238, flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"0 2px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:cfg.color }}/>
                    <span style={{ color:C.text, fontWeight:700, fontSize:13 }}>{cfg.label}</span>
                    <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:11, padding:"1px 8px", borderRadius:99, fontWeight:700 }}>{col.length}</span>
                  </div>
                  <span style={{ color:C.muted, fontSize:11 }}>R$ {col.reduce((a,b)=>a+b.value,0).toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10, minHeight:80 }}>
                  {col.map(l=>{
                    const cat = CATEGORIA[l.categoria]||CATEGORIA.lead;
                    return (
                      <div key={l.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px", borderLeft:`3px solid ${cfg.color}`, cursor:"pointer" }}
                        onClick={()=>setBriefingId(l.id)}
                        onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                        onMouseLeave={e=>e.currentTarget.style.background=C.card}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:27, height:27, borderRadius:7, background:`${cat.color}22`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.color, fontWeight:700, fontSize:12 }}>{l.name.charAt(0)}</div>
                            <div>
                              <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{l.name}</div>
                              <div style={{ color:C.muted, fontSize:11 }}>{l.company}</div>
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>openEdit(l)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="edit" s={12}/></button>
                            <button onClick={()=>del(l.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:2 }}><Ico n="trash" s={12}/></button>
                          </div>
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                            <span style={{ background:`${C.teal}15`, color:C.teal, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{l.tag}</span>
                            <span style={{ background:`${cat.color}15`, color:cat.color, fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:700 }}>{cat.icon}</span>
                            {l.briefing_padrao && <span style={{ fontSize:11 }} title="Briefing salvo">📋</span>}
                          </div>
                          <span style={{ color:C.text, fontWeight:700, fontSize:12 }}>R$ {l.value.toLocaleString("pt-BR")}</span>
                        </div>
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                          {l.categoria!=="cliente_fixo"&&(
                            <button onClick={()=>converter(l.id)} style={{ background:`${C.teal}10`, border:`1px solid ${C.teal}28`, borderRadius:6, padding:"2px 7px", color:C.teal, fontSize:10, cursor:"pointer", fontWeight:700 }}>⭐ Converter</button>
                          )}
                          {Object.keys(STATUS).filter(s=>s!==status).map(s=>(
                            <button key={s} onClick={()=>move(l.id,s)} style={{ background:`${STATUS[s].color}10`, border:`1px solid ${STATUS[s].color}28`, borderRadius:6, padding:"2px 7px", color:STATUS[s].color, fontSize:10, cursor:"pointer", fontWeight:600 }}>→ {STATUS[s].label}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>openAdd(status)} style={{ background:`${cfg.color}08`, border:`1px dashed ${cfg.color}40`, borderRadius:10, padding:"10px", color:cfg.color, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                    <Ico n="plus" s={12} c={cfg.color}/> Adicionar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Editar Contato":"Novo Contato"}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Nome" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Field label="Empresa" value={form.company} onChange={v=>setForm(f=>({...f,company:v}))}/>
          <Field label="Email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
          <Field label="Valor (R$)" value={form.value} onChange={v=>setForm(f=>({...f,value:v}))} type="number"/>
          <Field label="Tag / Serviço" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))}/>
          <Field label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={Object.entries(STATUS).map(([k,v])=>({value:k,label:v.label}))}/>
        </div>
        <Field label="Categoria" value={form.categoria} onChange={v=>setForm(f=>({...f,categoria:v}))} options={Object.entries(CATEGORIA).map(([k,v])=>({value:k,label:`${v.icon} ${v.label}`}))}/>
        {form.categoria==="cliente_fixo" && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>📋 Briefing Padrão da Marca</label>
            <textarea value={form.briefing_padrao||""} onChange={e=>setForm(f=>({...f,briefing_padrao:e.target.value}))} placeholder="Ex: Cores principais (#FFCC00, #000). Fontes: Montserrat Bold títulos, Lato corpo. Tom de voz: profissional e direto. Evitar elementos muito coloridos..." rows={4} style={{ background:"#0f0f1a", border:"1px solid #1e1e30", borderRadius:9, padding:"10px 13px", color:"#e2e8f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
          </div>
        )}
        <Btn onClick={save} full>{editId?"Salvar alterações":"Adicionar Contato"}</Btn>
      </Modal>
    </div>
  );
}
// ══════════════════════════════════════════════════════════════════════════════
// AGENDA
// ══════════════════════════════════════════════════════════════════════════════
function Agenda({ tasks, setTasks }) {
  const today = new Date().toISOString().split("T")[0];
  const [vm, setVm] = useState("list");
  const [modal, setModal] = useState(false);
  const [calBase, setCalBase] = useState(new Date(2026,2,1));
  const [selDay, setSelDay] = useState(today);
  const [form, setForm] = useState({ title:"", time:"09:00", date:today, priority:"media", type:"tarefa" });

  const toggle = id => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const del = id => setTasks(ts=>ts.filter(t=>t.id!==id));
  const add = () => {
    if (!form.title) return;
    setTasks(ts=>[...ts,{...form,id:Date.now(),done:false}]);
    setForm(f=>({...f,title:"",time:"09:00"}));
    setModal(false);
  };

  const sorted = [...tasks].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  const yr=calBase.getFullYear(), mo=calBase.getMonth();
  const firstDay=new Date(yr,mo,1).getDay();
  const daysInMo=new Date(yr,mo+1,0).getDate();
  const mName=calBase.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
  const dk=d=>`${yr}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const byDate={};
  tasks.forEach(t=>{if(!byDate[t.date])byDate[t.date]=[];byDate[t.date].push(t);});
  const sideTasks=(byDate[selDay]||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));

  const TaskRow = ({ t }) => (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:`1px solid ${C.border}`, opacity:t.done?0.5:1 }}
      onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <button onClick={()=>toggle(t.id)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        {t.done&&<Ico n="check" s={10} c="#000"/>}
      </button>
      <div style={{ width:7, height:7, borderRadius:"50%", background:PRIORITY[t.priority].dot, flexShrink:0 }}/>
      <span style={{ fontFamily:"monospace", fontSize:12, color:C.muted, flexShrink:0, width:42 }}>{t.time}</span>
      <span style={{ fontSize:15, flexShrink:0 }}>{TYPE[t.type].icon}</span>
      <span style={{ color:t.done?C.muted:C.text, fontSize:13, flex:1, textDecoration:t.done?"line-through":"none" }}>{t.title}</span>
      <span style={{ color:C.muted, fontSize:11, flexShrink:0 }}>{t.date}</span>
      <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:3 }}><Ico n="trash" s={12}/></button>
    </div>
  );

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Agenda</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{tasks.filter(t=>!t.done).length} tarefas pendentes</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Toggle val={vm} onChange={setVm} opts={[{v:"list",label:"Lista",icon:"list"},{v:"calendar",label:"Calendário",icon:"calendar"}]}/>
          <Btn onClick={()=>{setForm(f=>({...f,date:selDay}));setModal(true);}}><Ico n="plus" s={14} c="#fff"/> Nova Tarefa</Btn>
        </div>
      </div>
      {vm==="list" ? (
        <div style={{ maxWidth:820 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>Progresso geral</span>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:160, height:5, background:C.surface, borderRadius:99 }}>
                <div style={{ height:"100%", width:`${tasks.length?(tasks.filter(t=>t.done).length/tasks.length*100):0}%`, background:`linear-gradient(90deg,${C.accentGlow},${C.teal})`, borderRadius:99 }}/>
              </div>
              <span style={{ color:C.accent, fontSize:13, fontWeight:700 }}>{tasks.filter(t=>t.done).length}/{tasks.length}</span>
            </div>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            {sorted.length===0&&<div style={{ padding:40, textAlign:"center", color:C.muted }}>Sem tarefas. 🎉</div>}
            {sorted.map(t=><TaskRow key={t.id} t={t}/>)}
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:18 }}>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 22px", borderBottom:`1px solid ${C.border}` }}>
              <button onClick={()=>setCalBase(new Date(yr,mo-1,1))} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:6 }}><Ico n="chevL" s={17}/></button>
              <span style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, textTransform:"capitalize" }}>{mName}</span>
              <button onClick={()=>setCalBase(new Date(yr,mo+1,1))} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:6 }}><Ico n="chevR" s={17}/></button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}` }}>
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=>(
                <div key={d} style={{ padding:"10px 0", textAlign:"center", color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{d}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
              {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`} style={{ minHeight:88, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}/>)}
              {Array(daysInMo).fill(null).map((_,i)=>{
                const d=i+1, key=dk(d), dt=byDate[key]||[];
                const isTod=key===today, isSel=key===selDay;
                return (
                  <div key={d} onClick={()=>setSelDay(key)} style={{ minHeight:88, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"7px", cursor:"pointer", background:isSel?`${C.accent}12`:isTod?`${C.accentGlow}08`:"transparent", transition:"background 0.13s" }}
                    onMouseEnter={e=>{if(!isSel&&!isTod)e.currentTarget.style.background=C.cardHover;}}
                    onMouseLeave={e=>{if(!isSel&&!isTod)e.currentTarget.style.background="transparent";}}>
                    <div style={{ marginBottom:4 }}>
                      <span style={{ width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:isTod?C.accent:isSel?`${C.accent}25`:"transparent", color:isTod?"#fff":isSel?C.accent:C.muted, fontSize:12, fontWeight:isTod||isSel?700:400 }}>{d}</span>
                    </div>
                    {dt.slice(0,3).map(t=>(
                      <div key={t.id} style={{ background:`${PRIORITY[t.priority].dot}1a`, borderLeft:`2px solid ${PRIORITY[t.priority].dot}`, borderRadius:"0 4px 4px 0", padding:"2px 5px", marginBottom:2, fontSize:10, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        <span style={{ color:C.muted }}>{t.time} </span>{t.title}
                      </div>
                    ))}
                    {dt.length>3&&<div style={{ fontSize:10, color:C.muted }}>+{dt.length-3}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{new Date(selDay+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})}</span>
              <Btn onClick={()=>{setForm(f=>({...f,date:selDay}));setModal(true);}} variant="ghost" small><Ico n="plus" s={12} c={C.accent}/></Btn>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {sideTasks.length===0&&<div style={{ padding:30, textAlign:"center", color:C.muted, fontSize:13 }}>Sem tarefas neste dia.</div>}
              {sideTasks.map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 14px", borderBottom:`1px solid ${C.border}`, opacity:t.done?0.5:1 }}>
                  <button onClick={()=>toggle(t.id)} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>
                    {t.done&&<Ico n="check" s={10} c="#000"/>}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.done?C.muted:C.text, fontSize:13, textDecoration:t.done?"line-through":"none", marginBottom:3 }}>{t.title}</div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <span style={{ fontFamily:"monospace", fontSize:11, color:C.muted }}>{t.time}</span>
                      <span style={{ fontSize:13 }}>{TYPE[t.type].icon}</span>
                      <span style={{ background:`${PRIORITY[t.priority].dot}18`, color:PRIORITY[t.priority].dot, fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700, textTransform:"uppercase" }}>{t.priority}</span>
                    </div>
                  </div>
                  <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="trash" s={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title="Nova Tarefa">
        <Field label="Título" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Ex: Call com cliente..."/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Data" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
          <Field label="Horário" value={form.time} onChange={v=>setForm(f=>({...f,time:v}))} type="time"/>
          <Field label="Prioridade" value={form.priority} onChange={v=>setForm(f=>({...f,priority:v}))} options={[{value:"alta",label:"Alta"},{value:"media",label:"Média"},{value:"baixa",label:"Baixa"}]}/>
          <Field label="Tipo" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={Object.entries(TYPE).map(([k,v])=>({value:k,label:v.label}))}/>
        </div>
        <Btn onClick={add} full>Adicionar Tarefa</Btn>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCEIRO — REFATORADO + FILTRO POR MÊS
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// FINANCEIRO INTELIGENTE + GAMIFICAÇÃO
// ══════════════════════════════════════════════════════════════════════════════
function Finance({ leads, demandas, timerHistory }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const [meta, setMeta] = useLocalStorage("dh_meta_mensal", 5000);
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(String(meta));

  const today = new Date().toISOString().split("T")[0];

  // ── Receita real: demandas finalizadas ──────────────────────────────────────
  const receitaMes = (monthKey) =>
    demandas.filter(d => d.status === "finalizado" && d.data_criacao?.startsWith(monthKey))
            .reduce((a,b) => a + (parseFloat(b.valor)||0), 0);

  const moReceita   = receitaMes(selMonth);
  const moJobs      = demandas.filter(d => d.status==="finalizado" && d.data_criacao?.startsWith(selMonth));
  const moEmAndamento = demandas.filter(d => d.status !== "finalizado" && d.data_criacao?.startsWith(selMonth));

  // Mês anterior
  const [yr, mo] = selMonth.split("-").map(Number);
  const prevDate  = new Date(yr, mo-2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
  const prevReceita = receitaMes(prevMonth);
  const diffPct = prevReceita > 0 ? Math.round((moReceita - prevReceita) / prevReceita * 100) : null;

  // ── Gráfico 8 meses ─────────────────────────────────────────────────────────
  const chartMonths = Array.from({length:8},(_,i)=>{
    const d = new Date(NOW_YEAR, NOW_MO - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const val = receitaMes(key);
    const jobs = demandas.filter(d2 => d2.status==="finalizado" && d2.data_criacao?.startsWith(key)).length;
    return { key, label:MONTHS_SHORT[d.getMonth()], val, jobs };
  }).reverse();
  const maxChart = Math.max(...chartMonths.map(m=>m.val), meta, 1);

  // ── Ranking clientes ────────────────────────────────────────────────────────
  const clientes = leads.filter(l => l.categoria === "cliente_fixo");
  const rankClientes = clientes.map(c => ({
    ...c,
    total: demandas.filter(d => d.cliente_id===c.id && d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0),
    jobs:  demandas.filter(d => d.cliente_id===c.id && d.status==="finalizado").length,
  })).sort((a,b) => b.total - a.total);

  // ── Ranking por tag/serviço ─────────────────────────────────────────────────
  const tagMap = {};
  demandas.filter(d=>d.status==="finalizado").forEach(d=>{
    const tag = d.tag || "Sem tag";
    if (!tagMap[tag]) tagMap[tag] = { total:0, count:0 };
    tagMap[tag].total += parseFloat(d.valor)||0;
    tagMap[tag].count++;
  });
  const rankTags = Object.entries(tagMap).map(([tag,v])=>({tag,...v})).sort((a,b)=>b.total-a.total);

  // ── Meta progress ───────────────────────────────────────────────────────────
  const metaPct = meta > 0 ? Math.min(100, Math.round(moReceita / meta * 100)) : 0;
  const metaBatida = moReceita >= meta;

  // ── GAMIFICAÇÃO ─────────────────────────────────────────────────────────────
  const totalJobs = demandas.filter(d=>d.status==="finalizado").length;
  const totalReceita = demandas.filter(d=>d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0);

  // XP e Nível
  const xp = Math.floor(totalReceita / 100) + (totalJobs * 50);
  const niveis = [
    { nome:"Iniciante",     min:0,     max:500,   icon:"🌱", cor:C.muted   },
    { nome:"Freelancer",    min:500,   max:2000,  icon:"⚡", cor:C.yellow  },
    { nome:"Profissional",  min:2000,  max:5000,  icon:"🚀", cor:C.accent  },
    { nome:"Expert",        min:5000,  max:15000, icon:"💎", cor:C.teal    },
    { nome:"Lenda",         min:15000, max:99999, icon:"🏆", cor:C.orange  },
  ];
  const nivel = niveis.findLast(n => xp >= n.min) || niveis[0];
  const nextNivel = niveis[niveis.indexOf(nivel)+1];
  const xpPct = nextNivel ? Math.round((xp - nivel.min) / (nextNivel.min - nivel.min) * 100) : 100;

  // Streak de dias trabalhados (timer)
  let streak = 0;
  const d = new Date(); d.setDate(d.getDate()-1);
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (timerHistory.find(h=>h.date===key&&h.seconds>3600)) { streak++; d.setDate(d.getDate()-1); }
    else break;
    if (streak > 365) break;
  }

  // Conquistas
  const conquistas = [
    { id:"first_job",   icon:"🎯", nome:"Primeiro Job",     desc:"Complete seu primeiro job",           ok: totalJobs >= 1 },
    { id:"jobs5",       icon:"⚡", nome:"5 Jobs",           desc:"Complete 5 jobs finalizados",         ok: totalJobs >= 5 },
    { id:"jobs10",      icon:"🔥", nome:"10 Jobs",          desc:"Complete 10 jobs finalizados",        ok: totalJobs >= 10 },
    { id:"jobs25",      icon:"💪", nome:"25 Jobs",          desc:"Complete 25 jobs finalizados",        ok: totalJobs >= 25 },
    { id:"r5k",         icon:"💰", nome:"R$ 5k",            desc:"Acumule R$ 5.000 em receita",        ok: totalReceita >= 5000 },
    { id:"r10k",        icon:"💎", nome:"R$ 10k",           desc:"Acumule R$ 10.000 em receita",       ok: totalReceita >= 10000 },
    { id:"r50k",        icon:"🏆", nome:"R$ 50k",           desc:"Acumule R$ 50.000 em receita",       ok: totalReceita >= 50000 },
    { id:"meta",        icon:"🎉", nome:"Meta batida!",      desc:"Bata a meta mensal de receita",       ok: metaBatida },
    { id:"streak3",     icon:"🔁", nome:"3 dias seguidos",   desc:"Trabalhe 3 dias seguidos (1h+)",      ok: streak >= 3 },
    { id:"streak7",     icon:"🗓", nome:"Semana completa",   desc:"7 dias seguidos de trabalho",         ok: streak >= 7 },
    { id:"clientes3",   icon:"⭐", nome:"3 clientes ativos", desc:"Tenha 3 clientes ativos",             ok: clientes.length >= 3 },
  ];

  // Ranking melhores meses (todos os meses com receita)
  const allMonthsRank = [...new Set(demandas.filter(d=>d.status==="finalizado").map(d=>d.data_criacao?.slice(0,7)).filter(Boolean))]
    .map(key => ({ key, label:`${MONTHS_SHORT[parseInt(key.split("-")[1])-1]}/${key.split("-")[0]}`, val: receitaMes(key) }))
    .sort((a,b) => b.val - a.val).slice(0,5);

  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 54px)", overflowY:"auto" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>💰 Financeiro</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Receita real das demandas finalizadas</p>
        </div>
        <MonthPicker value={selMonth} onChange={setSelMonth} label="Mês:"/>
      </div>

      {/* ── NÍVEL + XP ── */}
      <div style={{ background:`linear-gradient(135deg,${nivel.cor}15,${C.card})`, border:`1px solid ${nivel.cor}30`, borderRadius:16, padding:"20px 24px", marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ width:60, height:60, borderRadius:16, background:`${nivel.cor}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0 }}>{nivel.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div>
              <span style={{ color:nivel.cor, fontWeight:800, fontSize:18, fontFamily:"'Syne',sans-serif" }}>{nivel.nome}</span>
              <span style={{ color:C.muted, fontSize:13, marginLeft:10 }}>{xp.toLocaleString("pt-BR")} XP</span>
            </div>
            {nextNivel && <span style={{ color:C.muted, fontSize:12 }}>Próximo: {nextNivel.icon} {nextNivel.nome} ({(nextNivel.min - xp).toLocaleString("pt-BR")} XP)</span>}
          </div>
          <div style={{ height:8, background:C.surface, borderRadius:99 }}>
            <div style={{ height:"100%", width:`${xpPct}%`, background:`linear-gradient(90deg,${nivel.cor},${nivel.cor}99)`, borderRadius:99, transition:"width 0.5s", boxShadow:`0 0 10px ${nivel.cor}50` }}/>
          </div>
          <div style={{ display:"flex", gap:20, marginTop:8 }}>
            <span style={{ color:C.muted, fontSize:12 }}>🏅 {totalJobs} jobs finalizados</span>
            <span style={{ color:C.muted, fontSize:12 }}>💰 R$ {totalReceita.toLocaleString("pt-BR")} total</span>
            <span style={{ color:C.muted, fontSize:12 }}>🔥 {streak} dias de streak</span>
          </div>
        </div>
      </div>

      {/* ── META MENSAL ── */}
      <div style={{ background:metaBatida?`linear-gradient(135deg,${C.green}15,${C.card})`:`${C.card}`, border:`1px solid ${metaBatida?C.green:C.border}`, borderRadius:16, padding:"20px 24px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:15 }}>🎯 Meta de {MONTHS[mo-1]}</span>
            {metaBatida && <span style={{ background:`${C.green}20`, color:C.green, fontSize:12, padding:"3px 10px", borderRadius:99, fontWeight:700, animation:"pulse 1s infinite" }}>🎉 META BATIDA!</span>}
          </div>
          {editMeta ? (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={metaInput} onChange={e=>setMetaInput(e.target.value)} type="number"
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.text, fontSize:13, width:120, outline:"none", fontFamily:"inherit" }}/>
              <button onClick={()=>{ setMeta(parseFloat(metaInput)||5000); setEditMeta(false); }}
                style={{ background:`${C.green}20`, border:`1px solid ${C.green}40`, borderRadius:8, padding:"6px 12px", color:C.green, cursor:"pointer", fontSize:12, fontWeight:700 }}>Salvar</button>
              <button onClick={()=>setEditMeta(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico n="close" s={14}/></button>
            </div>
          ) : (
            <button onClick={()=>{ setMetaInput(String(meta)); setEditMeta(true); }}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.muted, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
              <Ico n="edit" s={12} c={C.muted}/> Editar meta
            </button>
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <span style={{ color:metaBatida?C.green:C.text, fontWeight:800, fontSize:28, fontFamily:"'Syne',sans-serif" }}>R$ {moReceita.toLocaleString("pt-BR")}</span>
          <span style={{ color:C.muted, fontSize:14 }}>de R$ {meta.toLocaleString("pt-BR")}</span>
        </div>
        <div style={{ height:12, background:C.surface, borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${metaPct}%`, background:metaBatida?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accentGlow},${C.accent})`, borderRadius:99, transition:"width 0.6s", boxShadow:metaBatida?`0 0 14px ${C.green}60`:"none" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          <span style={{ color:C.muted, fontSize:12 }}>{metaPct}% da meta · {moJobs.length} jobs finalizados</span>
          {diffPct !== null && (
            <span style={{ color:diffPct>=0?C.green:C.red, fontSize:12, fontWeight:700 }}>
              {diffPct>=0?"▲":"▼"} {Math.abs(diffPct)}% vs mês anterior
            </span>
          )}
        </div>
        {/* Jobs em andamento */}
        {moEmAndamento.length > 0 && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`, color:C.muted, fontSize:12 }}>
            🔄 {moEmAndamento.length} demanda{moEmAndamento.length>1?"s":""} em andamento · R$ {moEmAndamento.reduce((a,b)=>a+(parseFloat(b.valor)||0),0).toLocaleString("pt-BR")} potencial
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        {/* ── GRÁFICO ── */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>📊 Receita — últimos 8 meses</span>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130, position:"relative" }}>
            {/* Linha da meta */}
            <div style={{ position:"absolute", left:0, right:0, bottom:`${Math.min(100,meta/maxChart*130)}px`, borderTop:`1px dashed ${C.accent}50`, zIndex:1 }}>
              <span style={{ position:"absolute", right:0, top:-16, color:C.accent, fontSize:9, fontWeight:700 }}>META</span>
            </div>
            {chartMonths.map((m,i)=>{
              const isSel = m.key === selMonth;
              const bateu = m.val >= meta;
              return (
                <div key={i} onClick={()=>setSelMonth(m.key)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, cursor:"pointer", zIndex:2 }}>
                  {m.val>0&&<span style={{ color:isSel?C.accent:C.muted, fontSize:9, fontWeight:700 }}>R${(m.val/1000).toFixed(1)}k</span>}
                  <div style={{ width:"100%", background:m.val>0?(bateu?`linear-gradient(180deg,${C.green},${C.teal})`:isSel?`linear-gradient(180deg,${C.accent},${C.accentGlow})`:`linear-gradient(180deg,${C.subtle},${C.border})`):C.surface, borderRadius:"6px 6px 0 0", height:`${m.val>0?Math.max(m.val/maxChart*120,6):4}px`, transition:"all 0.3s", boxShadow:isSel?`0 0 12px ${C.accentGlow}50`:"none", border:isSel?`1px solid ${C.accent}40`:"none" }}/>
                  <span style={{ color:isSel?C.accent:C.muted, fontSize:10, fontWeight:isSel?700:400 }}>{m.label}</span>
                  {m.jobs>0&&<span style={{ color:C.muted, fontSize:9 }}>{m.jobs}j</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RANKING MESES ── */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>🏆 Melhores meses</span>
          {allMonthsRank.length === 0 ? (
            <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Ainda sem dados de receita.</div>
          ) : allMonthsRank.map((m,i)=>{
            const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
            const pct = Math.round(m.val / allMonthsRank[0].val * 100);
            return (
              <div key={m.key} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>{medals[i]}</span>
                    <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{m.label}</span>
                  </div>
                  <span style={{ color:i===0?C.green:C.text, fontWeight:700, fontSize:14 }}>R$ {m.val.toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ height:4, background:C.surface, borderRadius:99 }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:i===0?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accent},${C.accentGlow})`, borderRadius:99 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        {/* ── RANKING CLIENTES ── */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>⭐ Ranking de Clientes</span>
          {rankClientes.length === 0 ? (
            <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Nenhum cliente ativo ainda.</div>
          ) : rankClientes.map((c,i)=>{
            const medals = ["🥇","🥈","🥉"];
            const maxV = rankClientes[0].total || 1;
            return (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <span style={{ fontSize:i<3?18:13, minWidth:20 }}>{medals[i]||`${i+1}.`}</span>
                <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.teal}40,${C.accentGlow}40)`, display:"flex", alignItems:"center", justifyContent:"center", color:C.teal, fontWeight:800, fontSize:14, flexShrink:0 }}>
                  {c.name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ color:C.text, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                    <span style={{ color:C.green, fontSize:13, fontWeight:700, flexShrink:0, marginLeft:8 }}>R$ {c.total.toLocaleString("pt-BR")}</span>
                  </div>
                  <div style={{ height:4, background:C.surface, borderRadius:99 }}>
                    <div style={{ height:"100%", width:`${Math.round(c.total/maxV*100)}%`, background:i===0?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.teal},${C.accent})`, borderRadius:99 }}/>
                  </div>
                  <span style={{ color:C.muted, fontSize:11 }}>{c.jobs} job{c.jobs!==1?"s":""}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RANKING SERVIÇOS ── */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>🏷 Receita por Serviço</span>
          {rankTags.length === 0 ? (
            <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Nenhum job finalizado ainda.</div>
          ) : rankTags.map((t,i)=>{
            const maxV = rankTags[0].total || 1;
            const colors = [C.accent, C.teal, C.orange, C.pink, C.green, C.yellow];
            const cor = colors[i % colors.length];
            return (
              <div key={t.tag} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:cor }}/>
                    <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{t.tag}</span>
                    <span style={{ background:`${cor}18`, color:cor, fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700 }}>{t.count}x</span>
                  </div>
                  <span style={{ color:C.text, fontSize:13, fontWeight:700 }}>R$ {t.total.toLocaleString("pt-BR")}</span>
                </div>
                <div style={{ height:5, background:C.surface, borderRadius:99 }}>
                  <div style={{ height:"100%", width:`${Math.round(t.total/maxV*100)}%`, background:cor, borderRadius:99, opacity:0.8 }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONQUISTAS ── */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
        <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>🏅 Conquistas — {conquistas.filter(c=>c.ok).length}/{conquistas.length} desbloqueadas</span>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {conquistas.map(c=>(
            <div key={c.id} style={{ background:c.ok?`${C.green}10`:C.surface, border:`1px solid ${c.ok?C.green+"40":C.border}`, borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, opacity:c.ok?1:0.45, transition:"all 0.2s" }}>
              <span style={{ fontSize:24, filter:c.ok?"none":"grayscale(1)" }}>{c.icon}</span>
              <div>
                <div style={{ color:c.ok?C.text:C.muted, fontWeight:700, fontSize:13 }}>{c.nome}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{c.desc}</div>
              </div>
              {c.ok && <span style={{ marginLeft:"auto", color:C.green, fontSize:16 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTFÓLIO — com Valor e Mês
// ══════════════════════════════════════════════════════════════════════════════
function Portfolio({ items, setItems }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterTag, setFilterTag] = useState("todos");
  const E = { title:"", url:"", tag:"Design", year:String(new Date().getFullYear()), month:NOW_MONTH, value:"", cover:"🎨", description:"" };
  const [form, setForm] = useState(E);
  const COVERS = ["🎨","📱","🌐","✏️","🖼️","💎","🚀","🎭","🖥️","📸","🎬","⚡"];
  const TAGS = ["Design","Branding","UI/UX","Logo","Web","Motion","3D","Print","Social","Foto"];
  const tagC = { Design:C.accent, Branding:C.orange, "UI/UX":C.teal, Logo:C.pink, Web:C.green, Motion:C.yellow, "3D":C.red, Print:C.muted, Social:C.teal, Foto:C.orange };

  const openAdd = () => { setForm(E); setEditId(null); setModal(true); };
  const openEdit = i => { setForm({...i, value:String(i.value||"")}); setEditId(i.id); setModal(true); };
  const save = () => {
    if (!form.title || !form.url) return;
    const item = { ...form, value:parseFloat(form.value)||0 };
    if (editId) setItems(is=>is.map(i=>i.id===editId?{...item,id:editId}:i));
    else setItems(is=>[...is,{...item,id:Date.now()}]);
    setModal(false);
  };
  const del = id => setItems(is=>is.filter(i=>i.id!==id));

  const allTags = ["todos",...new Set(items.map(i=>i.tag))];
  const filtered = items.filter(i=>filterTag==="todos"||i.tag===filterTag);
  const totalValue = items.reduce((a,b)=>a+(b.value||0),0);
  const fmtMonth = m => { if(!m) return ""; const [y,mo]=m.split("-"); return `${MONTHS_SHORT[Number(mo)-1]} ${y}`; };

  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Portfólio</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{items.length} projetos · R$ {totalValue.toLocaleString("pt-BR")} em valor total</p>
        </div>
        <Btn onClick={openAdd}><Ico n="plus" s={14} c="#fff"/> Novo Projeto</Btn>
      </div>

      {/* Tag filter */}
      <div style={{ display:"flex", gap:7, marginBottom:20, flexWrap:"wrap" }}>
        {allTags.map(t=>(
          <button key={t} onClick={()=>setFilterTag(t)} style={{ background:filterTag===t?`${C.accent}18`:C.card, border:`1px solid ${filterTag===t?C.accent:C.border}`, borderRadius:8, padding:"7px 14px", color:filterTag===t?C.accent:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>
            {t==="todos"?"Todos":t}
          </button>
        ))}
      </div>

      {items.length===0&&(
        <div style={{ background:C.card, border:`2px dashed ${C.border}`, borderRadius:16, padding:60, textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>🎨</div>
          <div style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:8 }}>Portfólio vazio</div>
          <div style={{ color:C.muted, fontSize:14, marginBottom:20 }}>Adicione seus projetos com links para Behance, Dribbble, Figma e mais.</div>
          <Btn onClick={openAdd}><Ico n="plus" s={14} c="#fff"/> Adicionar primeiro projeto</Btn>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))", gap:18 }}>
        {filtered.map(item=>{
          const tc = tagC[item.tag]||C.accent;
          return (
            <div key={item.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", transition:"transform 0.2s,box-shadow 0.2s" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 16px 40px rgba(0,0,0,0.4)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ height:110, background:`linear-gradient(135deg,${C.accentGlow}20,${tc}20)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, borderBottom:`1px solid ${C.border}`, position:"relative" }}>
                <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${C.accentGlow}10,transparent)` }}/>
                {item.cover}
                <div style={{ position:"absolute", top:10, right:10, display:"flex", gap:6 }}>
                  <button onClick={()=>openEdit(item)} style={{ width:28, height:28, background:`${C.surface}cc`, border:`1px solid ${C.border}`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)" }}><Ico n="edit" s={12} c={C.muted}/></button>
                  <button onClick={()=>del(item.id)} style={{ width:28, height:28, background:`${C.surface}cc`, border:`1px solid ${C.border}`, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", backdropFilter:"blur(4px)" }}><Ico n="trash" s={12} c={C.red}/></button>
                </div>
              </div>
              <div style={{ padding:"15px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                  <span style={{ color:C.text, fontWeight:700, fontSize:14, lineHeight:1.3, flex:1, paddingRight:8 }}>{item.title}</span>
                </div>
                {item.description&&<p style={{ color:C.muted, fontSize:12, lineHeight:1.5, margin:"0 0 10px" }}>{item.description}</p>}
                {/* Value + Month row */}
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {item.value>0&&(
                    <span style={{ background:`${C.green}15`, color:C.green, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>R$ {item.value.toLocaleString("pt-BR")}</span>
                  )}
                  {item.month&&(
                    <span style={{ background:`${C.muted}18`, color:C.muted, fontSize:11, padding:"3px 10px", borderRadius:99 }}>{fmtMonth(item.month)}</span>
                  )}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ background:`${tc}18`, color:tc, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:600 }}>{item.tag}</span>
                  <a href={item.url.startsWith("http")?item.url:"https://"+item.url} target="_blank" rel="noopener noreferrer" style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30`, borderRadius:8, padding:"6px 12px", color:C.accent, fontSize:12, fontWeight:600, textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                    <Ico n="externalLink" s={12} c={C.accent}/> Abrir
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Editar Projeto":"Novo Projeto"} w={520}>
        <Field label="Título do projeto" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Ex: Identidade Visual — Marca XYZ"/>
        <Field label="URL (Behance, Figma, Dribbble...)" value={form.url} onChange={v=>setForm(f=>({...f,url:v}))} placeholder="https://behance.net/..."/>
        <Field label="Descrição curta (opcional)" value={form.description||""} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Breve descrição do projeto..."/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Categoria" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))} options={TAGS.map(t=>({value:t,label:t}))}/>
          <Field label="Valor do projeto (R$)" value={form.value||""} onChange={v=>setForm(f=>({...f,value:v}))} type="number" placeholder="0"/>
          <Field label="Mês de entrega" value={form.month||""} onChange={v=>setForm(f=>({...f,month:v}))} type="month"/>
          <Field label="Ano" value={form.year} onChange={v=>setForm(f=>({...f,year:v}))} type="number"/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Ícone de capa</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {COVERS.map(cv=>(
              <button key={cv} onClick={()=>setForm(f=>({...f,cover:cv}))} style={{ width:40, height:40, fontSize:20, background:form.cover===cv?`${C.accent}25`:C.surface, border:`1px solid ${form.cover===cv?C.accent:C.border}`, borderRadius:9, cursor:"pointer" }}>{cv}</button>
            ))}
          </div>
        </div>
        <Btn onClick={save} full>{editId?"Salvar alterações":"Adicionar Projeto"}</Btn>
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTAS
// ══════════════════════════════════════════════════════════════════════════════
function Notes({ notes, setNotes }) {
  const [active, setActive] = useState(notes[0]?.id||null);
  const [newT, setNewT] = useState("");
  const curr = notes.find(n=>n.id===active);
  const addNote = () => {
    if (!newT) return;
    const n = { id:Date.now(), title:newT, content:"", date:new Date().toISOString().split("T")[0] };
    setNotes(ns=>[...ns,n]); setActive(n.id); setNewT("");
  };
  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 56px)", display:"flex", flexDirection:"column" }}>
      <div style={{ marginBottom:18 }}><h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Notas</h1><p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Briefings, referências e ideias</p></div>
      <div style={{ display:"flex", gap:16, flex:1, minHeight:0 }}>
        <div style={{ width:248, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"12px 13px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", gap:7 }}>
              <input value={newT} onChange={e=>setNewT(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addNote()} placeholder="Nova nota..." style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", color:C.text, fontSize:12, outline:"none", fontFamily:"inherit" }}/>
              <button onClick={addNote} style={{ background:`${C.accent}20`, border:`1px solid ${C.accent}`, borderRadius:8, padding:"8px 10px", color:C.accent, cursor:"pointer" }}><Ico n="plus" s={13}/></button>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto" }}>
            {notes.map(n=>(
              <div key={n.id} onClick={()=>setActive(n.id)} style={{ padding:"11px 13px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:active===n.id?`${C.accent}10`:"transparent", borderLeft:`3px solid ${active===n.id?C.accent:"transparent"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:active===n.id?C.accent:C.text, fontSize:13, fontWeight:600 }}>{n.title}</span>
                  <button onClick={e=>{e.stopPropagation();setNotes(ns=>ns.filter(x=>x.id!==n.id));if(active===n.id)setActive(null);}} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:0, fontSize:16 }}>×</button>
                </div>
                <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{n.date}</div>
                {n.content&&<div style={{ color:C.muted, fontSize:11, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.content}</div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, display:"flex", flexDirection:"column" }}>
          {curr ? (
            <>
              <div style={{ padding:"15px 20px", borderBottom:`1px solid ${C.border}` }}>
                <input value={curr.title} onChange={e=>setNotes(ns=>ns.map(n=>n.id===active?{...n,title:e.target.value}:n))} style={{ background:"none", border:"none", color:C.text, fontSize:18, fontWeight:700, fontFamily:"'Syne',sans-serif", outline:"none", width:"100%" }}/>
                <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{curr.date}</div>
              </div>
              <textarea value={curr.content} onChange={e=>setNotes(ns=>ns.map(n=>n.id===active?{...n,content:e.target.value}:n))} placeholder="Escreva sua nota aqui..." style={{ flex:1, background:"none", border:"none", padding:"20px", color:C.text, fontSize:14, lineHeight:1.7, outline:"none", resize:"none", fontFamily:"'DM Sans',sans-serif" }}/>
            </>
          ) : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:14 }}>Selecione uma nota.</div>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
const INIT_NOTES = [
  { id:1, title:"Briefing Brand Co", content:"Cliente quer rebranding completo. Cores: azul + dourado. Público 30-50 anos.", date:"2026-03-04" },
  { id:2, title:"Referências UI Kit", content:"Ver Material 3, Apple HIG e Radix UI para o projeto Tech Venture.", date:"2026-03-03" },
];


// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES FIXOS
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES ATIVOS
// ══════════════════════════════════════════════════════════════════════════════
function ClientesFixos({ leads, setLeads, portfolio, demandas, setDemandas, tasks, setTasks }) {
  const clientes = leads.filter(l => l.categoria === "cliente_fixo");
  const [selId, setSelId] = useState(clientes[0]?.id || null);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [tab, setTab] = useState("briefing");
  const [showAddProj, setShowAddProj] = useState(false);
  const [modalDemanda, setModalDemanda] = useState(false);
  const [editDemandaId, setEditDemandaId] = useState(null);
  const ED = { titulo:"", descricao:"", prazo:"", valor:"", status:"triagem", cliente_id:null };
  const [formD, setFormD] = useState(ED);

  const E = {
    name:"", company:"", email:"", value:"", status:"fechado", tag:"",
    categoria:"cliente_fixo", briefing_padrao:"",
    cores:"", fontes:"", redes:"", telefone:"", notas_internas:"",
  };
  const [form, setForm] = useState(E);

  const sel = clientes.find(c => c.id === selId);

  const openAdd  = () => { setForm(E); setEditId(null); setModal(true); };
  const openEdit = c  => { setForm({...E,...c, value:String(c.value||"")}); setEditId(c.id); setModal(true); };
  const save = () => {
    const cliente = { ...form, value:parseFloat(form.value)||0, date: form.date||new Date().toISOString().split("T")[0] };
    if (editId) {
      setLeads(ls => ls.map(l => l.id===editId ? {...cliente, id:editId} : l));
    } else {
      const novo = {...cliente, id:Date.now()};
      setLeads(ls => [...ls, novo]);
      setSelId(novo.id);
    }
    setModal(false);
  };
  const del = id => {
    setLeads(ls => ls.filter(l => l.id !== id));
    setSelId(clientes.find(c => c.id !== id)?.id || null);
  };
  const updateField = (id, field, val) => {
    setLeads(ls => ls.map(l => l.id===id ? {...l, [field]:val} : l));
  };

  // Demandas deste cliente
  const demandasCliente = sel ? demandas.filter(d => d.cliente_id === sel.id) : [];

  const openAddDemanda = () => {
    setFormD({...ED, cliente_id: sel?.id});
    setEditDemandaId(null);
    setModalDemanda(true);
  };
  const openEditDemanda = d => {
    setFormD({...d, valor:String(d.valor||"")});
    setEditDemandaId(d.id);
    setModalDemanda(true);
  };
  const saveDemanda = () => {
    if (!formD.titulo) return;
    const demanda = { ...formD, valor:parseFloat(formD.valor)||0, data_criacao: new Date().toISOString().split("T")[0] };
    if (editDemandaId) {
      setDemandas(ds => ds.map(d => d.id===editDemandaId ? {...demanda, id:editDemandaId} : d));
    } else {
      const nova = {...demanda, id:Date.now()};
      setDemandas(ds => [...ds, nova]);
      // Criar tarefa na agenda automaticamente se tiver prazo
      if (nova.prazo) {
        const tarefa = {
          id: Date.now()+1,
          title: `📋 ${nova.titulo}${sel ? ` · ${sel.name}` : ""}`,
          time: "09:00",
          date: nova.prazo,
          done: false,
          priority: "alta",
          type: "entrega",
        };
        setTasks(ts => [...ts, tarefa]);
      }
    }
    setModalDemanda(false);
  };
  const delDemanda = id => setDemandas(ds => ds.filter(d => d.id !== id));
  const moveDemanda = (id, status) => setDemandas(ds => ds.map(d => d.id===id ? {...d,status} : d));

  // Projetos vinculados
  const projIds = sel?.projeto_ids || [];
  const projCliente = sel
    ? portfolio.filter(p => {
        const manualMatch = projIds.includes(p.id);
        const autoMatch =
          p.description?.toLowerCase().includes(sel.name.toLowerCase()) ||
          (sel.company && p.description?.toLowerCase().includes(sel.company.toLowerCase())) ||
          (sel.company && p.title?.toLowerCase().includes(sel.company.toLowerCase()));
        return manualMatch || autoMatch;
      })
    : [];
  const projDisponiveis = portfolio.filter(p => !projCliente.find(pc => pc.id === p.id));
  const vincularProjeto = (projId) => {
    const novaLista = [...new Set([...projIds, projId])];
    updateField(sel.id, "projeto_ids", novaLista);
  };
  const desvincularProjeto = (projId) => {
    updateField(sel.id, "projeto_ids", projIds.filter(id => id !== projId));
  };

  const totalPago = sel ? demandas.filter(d => d.cliente_id === sel.id && d.status === "finalizado").reduce((a,b) => a + (parseFloat(b.valor)||0), 0) : 0;

  const parseCores = (str) => {
    if (!str) return [];
    return str.split(",").map(s => s.trim()).filter(Boolean).map(s => {
      const hex = s.match(/#[0-9a-fA-F]{3,6}/)?.[0];
      const nome = s.replace(/#[0-9a-fA-F]{3,6}/, "").trim();
      return { hex, nome: nome || hex || s };
    });
  };

  // Link público do formulário de pedidos
  const slug = sel ? sel.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") : "";
  const linkPedido = sel ? `${window.location.origin}/#pedido/${slug}/${sel.id}` : "";

  const NotesSave = ({ clienteId, value }) => {
    const [txt, setTxt] = useState(value||"");
    const [saved, setSaved] = useState(false);
    const ref = useRef(null);
    useEffect(()=>{ setTxt(value||""); },[clienteId]);
    const change = v => {
      setTxt(v); setSaved(false);
      clearTimeout(ref.current);
      ref.current = setTimeout(()=>{ updateField(clienteId,"notas_internas",v); setSaved(true); },700);
    };
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
        <textarea value={txt} onChange={e=>change(e.target.value)}
          placeholder="Anotações internas sobre o cliente, preferências, histórico de conversas..."
          style={{ flex:1, minHeight:200, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.7 }}
        />
        <div style={{ display:"flex", justifyContent:"flex-end", marginTop:5 }}>
          <span style={{ color:saved?C.green:C.muted, fontSize:11 }}>{saved?"✓ Salvo":"Editando..."}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 54px)", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>⭐ Clientes Ativos</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>
            {clientes.length} cliente{clientes.length!==1?"s":""} · R$ {demandas.filter(d => clientes.find(c=>c.id===d.cliente_id) && d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0).toLocaleString("pt-BR")} em receita total
          </p>
        </div>
        <Btn onClick={openAdd}><Ico n="plus" s={14} c="#fff"/> Novo Cliente</Btn>
      </div>

      {clientes.length === 0 ? (
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ textAlign:"center", maxWidth:380 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⭐</div>
            <div style={{ color:C.text, fontWeight:700, fontSize:18, marginBottom:8 }}>Nenhum cliente ativo ainda</div>
            <div style={{ color:C.muted, fontSize:14, marginBottom:24, lineHeight:1.6 }}>
              Adicione clientes ou converta leads na aba CRM clicando em ⭐.
            </div>
            <Btn onClick={openAdd}><Ico n="plus" s={14} c="#fff"/> Adicionar cliente</Btn>
          </div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20, flex:1, minHeight:0 }}>

          {/* Lista */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, overflowY:"auto", paddingRight:4 }}>
            {clientes.map(c => {
              const isSel = c.id === selId;
              const nDemandas = demandas.filter(d=>d.cliente_id===c.id).length;
              return (
                <div key={c.id} onClick={()=>{ setSelId(c.id); setTab("briefing"); }}
                  style={{ background:isSel?`${C.teal}12`:C.card, border:`1px solid ${isSel?C.teal:C.border}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s", position:"relative" }}>
                  <div style={{ position:"absolute", top:0, left:0, bottom:0, width:3, background:isSel?C.teal:"transparent", borderRadius:"14px 0 0 14px" }}/>
                  <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:11, background:`linear-gradient(135deg,${C.teal}40,${C.accentGlow}40)`, display:"flex", alignItems:"center", justifyContent:"center", color:C.teal, fontWeight:800, fontSize:16, flexShrink:0 }}>
                      {c.name.charAt(0)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ color:isSel?C.teal:C.text, fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                      <div style={{ color:C.muted, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.company||"—"}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      <span style={{ background:`${C.teal}15`, color:C.teal, fontSize:11, padding:"2px 9px", borderRadius:99, fontWeight:600 }}>{c.tag||"—"}</span>
                      {nDemandas>0 && <span style={{ background:`${C.accent}15`, color:C.accent, fontSize:11, padding:"2px 9px", borderRadius:99, fontWeight:600 }}>{nDemandas} 📋</span>}
                    </div>
                    <span style={{ color:C.green, fontSize:13, fontWeight:700 }}>R$ {demandas.filter(d=>d.cliente_id===c.id&&d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Perfil */}
          {sel && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Header */}
              <div style={{ background:`linear-gradient(135deg,${C.teal}18,${C.accentGlow}12)`, borderBottom:`1px solid ${C.border}`, padding:"20px 24px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:56, height:56, borderRadius:15, background:`linear-gradient(135deg,${C.teal}60,${C.accentGlow}60)`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:22, fontFamily:"'Syne',sans-serif", flexShrink:0 }}>
                      {sel.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ color:C.text, fontWeight:800, fontSize:20, fontFamily:"'Syne',sans-serif", marginBottom:3 }}>{sel.name}</div>
                      <div style={{ color:C.muted, fontSize:13, marginBottom:6 }}>{sel.company}{sel.email && ` · ${sel.email}`}</div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span style={{ background:`${C.teal}20`, color:C.teal, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>⭐ Cliente Ativo</span>
                        {sel.tag && <span style={{ background:`${C.accent}18`, color:C.accent, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:600 }}>{sel.tag}</span>}
                        {sel.telefone && <span style={{ background:C.surface, color:C.muted, fontSize:11, padding:"3px 10px", borderRadius:99 }}>📱 {sel.telefone}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Receita (demandas finalizadas)</div>
                      <div style={{ color:C.green, fontWeight:800, fontSize:22, fontFamily:"'Syne',sans-serif" }}>R$ {totalPago.toLocaleString("pt-BR")}</div>
                      <div style={{ color:C.muted, fontSize:10, marginTop:2 }}>{demandas.filter(d=>d.cliente_id===sel.id&&d.status==="finalizado").length} job{demandas.filter(d=>d.cliente_id===sel.id&&d.status==="finalizado").length!==1?"s":""} finalizado{demandas.filter(d=>d.cliente_id===sel.id&&d.status==="finalizado").length!==1?"s":""}</div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      {sel.redes && (
                        <a href={sel.redes.startsWith("http")?sel.redes:"https://"+sel.redes} target="_blank" rel="noopener noreferrer"
                          style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30`, borderRadius:8, padding:"6px 12px", color:C.accent, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, textDecoration:"none" }}>
                          <Ico n="instagram" s={13} c={C.accent}/> Redes
                        </a>
                      )}
                      <button onClick={()=>openEdit(sel)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.muted, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>
                        <Ico n="edit" s={13} c={C.muted}/> Editar
                      </button>
                      <button onClick={()=>del(sel.id)} style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:8, padding:"6px 10px", color:C.red, cursor:"pointer", display:"flex", alignItems:"center" }}>
                        <Ico n="trash" s={13} c={C.red}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, background:C.surface }}>
                {[
                  {id:"briefing",  label:"📋 Briefing & Marca"},
                  {id:"demandas",  label:`📥 Demandas (${demandasCliente.length})`},
                  {id:"projetos",  label:`🗂 Portfólio (${projCliente.length})`},
                  {id:"notas",     label:"📝 Notas"},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    style={{ padding:"12px 18px", background:"none", border:"none", borderBottom:`2px solid ${tab===t.id?C.teal:"transparent"}`, color:tab===t.id?C.teal:C.muted, cursor:"pointer", fontSize:13, fontWeight:tab===t.id?700:400, transition:"all 0.15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex:1, overflowY:"auto", padding:"22px 24px" }}>

                {/* ── BRIEFING ── */}
                {tab==="briefing" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                    <div>
                      <div style={{ marginBottom:10 }}>
                        <label style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>🎨 Paleta de Cores</label>
                      </div>
                      {parseCores(sel.cores).length > 0 ? (
                        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 }}>
                          {parseCores(sel.cores).map((cor,i)=>(
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 12px" }}>
                              {cor.hex && <div style={{ width:22, height:22, borderRadius:6, background:cor.hex, border:`1px solid ${C.border}`, flexShrink:0 }}/>}
                              <div>
                                {cor.hex && <div style={{ color:C.muted, fontSize:10, fontFamily:"monospace" }}>{cor.hex}</div>}
                                <div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{cor.nome}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ color:C.muted, fontSize:13, marginBottom:10 }}>Nenhuma cor cadastrada.</div>}
                      <CoresEditor clienteId={sel.id} value={sel.cores||""} onSave={updateField}/>
                    </div>
                    <div>
                      <label style={{ display:"block", color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:8 }}>🔤 Fontes</label>
                      {sel.fontes ? (
                        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                          {sel.fontes.split(",").map(f=>f.trim()).filter(Boolean).map((f,i)=>(
                            <div key={i} style={{ color:C.text, fontSize:14, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ color:C.accent }}>Aa</span> {f}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <InlineEdit clienteId={sel.id} field="fontes" value={sel.fontes||""} onSave={updateField} placeholder="Ex: Montserrat Bold (títulos), Lato Regular (corpo)"/>
                    </div>
                    <div>
                      <label style={{ display:"block", color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:8 }}>📋 Manual / Briefing Geral</label>
                      <BriefingInline clienteId={sel.id} value={sel.briefing_padrao||""} onSave={updateField}/>
                    </div>
                    {/* Link do formulário de pedidos */}
                    <div style={{ background:`${C.accent}08`, border:`1px solid ${C.accent}25`, borderRadius:12, padding:"14px 16px" }}>
                      <div style={{ color:C.accent, fontSize:12, fontWeight:700, marginBottom:8 }}>🔗 Link de Pedidos do Cliente</div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <div style={{ flex:1, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 12px", fontSize:11, color:C.muted, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {linkPedido}
                        </div>
                        <button onClick={()=>navigator.clipboard.writeText(linkPedido)}
                          style={{ background:`${C.accent}20`, border:`1px solid ${C.accent}40`, borderRadius:8, padding:"8px 12px", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                          Copiar link
                        </button>
                      </div>
                      <div style={{ color:C.muted, fontSize:11, marginTop:6 }}>Envie esse link para o cliente preencher pedidos. Eles cairão direto na aba Demandas.</div>
                    </div>
                  </div>
                )}

                {/* ── DEMANDAS ── */}
                {tab==="demandas" && (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <span style={{ color:C.muted, fontSize:13 }}>{demandasCliente.length} demanda{demandasCliente.length!==1?"s":""}</span>
                      <button onClick={openAddDemanda}
                        style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30`, borderRadius:9, padding:"7px 14px", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                        <Ico n="plus" s={13} c={C.accent}/> Nova demanda
                      </button>
                    </div>

                    {demandasCliente.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                        <div style={{ fontSize:32, marginBottom:10 }}>📥</div>
                        <div style={{ fontSize:14, marginBottom:6 }}>Nenhuma demanda ainda.</div>
                        <div style={{ fontSize:12 }}>Crie manualmente ou compartilhe o link de pedidos na aba Briefing.</div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {demandasCliente.map(d => {
                          const st = STATUS_DEMANDA[d.status] || STATUS_DEMANDA.triagem;
                          const atrasado = d.prazo && d.prazo < new Date().toISOString().split("T")[0] && d.status !== "finalizado";
                          return (
                            <div key={d.id} style={{ background:C.surface, border:`1px solid ${atrasado?C.red:C.border}`, borderRadius:12, padding:"14px 16px", borderLeft:`3px solid ${atrasado?C.red:st.color}` }}>
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                                    <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{d.titulo}</span>
                                    {atrasado && <span style={{ background:`${C.red}20`, color:C.red, fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:700 }}>ATRASADO</span>}
                                  </div>
                                  {d.descricao && <div style={{ color:C.muted, fontSize:13, lineHeight:1.5, marginBottom:6 }}>{d.descricao}</div>}
                                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                                    <span style={{ background:`${st.color}20`, color:st.color, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>{st.icon} {st.label}</span>
                                    {d.prazo && <span style={{ color:atrasado?C.red:C.muted, fontSize:12 }}>📅 {d.prazo}</span>}
                                    {d.valor > 0 && <span style={{ color:C.green, fontSize:13, fontWeight:700 }}>R$ {d.valor.toLocaleString("pt-BR")}</span>}
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:6, marginLeft:12, flexShrink:0 }}>
                                  <button onClick={()=>openEditDemanda(d)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:3 }}><Ico n="edit" s={13}/></button>
                                  <button onClick={()=>delDemanda(d.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:3 }}><Ico n="trash" s={13}/></button>
                                </div>
                              </div>
                              {/* Botões de status */}
                              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                                {Object.entries(STATUS_DEMANDA).filter(([k])=>k!==d.status).map(([k,v])=>(
                                  <button key={k} onClick={()=>moveDemanda(d.id,k)}
                                    style={{ background:`${v.color}12`, border:`1px solid ${v.color}30`, borderRadius:7, padding:"3px 10px", color:v.color, fontSize:11, cursor:"pointer", fontWeight:600 }}>
                                    → {v.icon} {v.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PORTFÓLIO ── */}
                {tab==="projetos" && (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                      <span style={{ color:C.muted, fontSize:13 }}>{projCliente.length} projeto{projCliente.length!==1?"s":""} vinculado{projCliente.length!==1?"s":""}</span>
                      {projDisponiveis.length > 0 && (
                        <button onClick={()=>setShowAddProj(v=>!v)}
                          style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}30`, borderRadius:9, padding:"7px 14px", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
                          <Ico n="plus" s={13} c={C.accent}/> Vincular projeto
                        </button>
                      )}
                    </div>
                    {showAddProj && (
                      <div style={{ background:C.surface, border:`1px solid ${C.accent}40`, borderRadius:12, marginBottom:16, overflow:"hidden" }}>
                        <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between" }}>
                          <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>Selecione um projeto do portfólio</span>
                          <button onClick={()=>setShowAddProj(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico n="close" s={14}/></button>
                        </div>
                        {projDisponiveis.map(p=>(
                          <div key={p.id} onClick={()=>{ vincularProjeto(p.id); setShowAddProj(false); }}
                            style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
                            onMouseEnter={e=>e.currentTarget.style.background=C.cardHover}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <span style={{ fontSize:20 }}>{p.cover}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{p.title}</div>
                              <div style={{ color:C.muted, fontSize:11 }}>{p.tag}{p.month && ` · ${p.month}`}</div>
                            </div>
                            {p.value>0 && <span style={{ color:C.green, fontSize:13, fontWeight:700 }}>R$ {p.value.toLocaleString("pt-BR")}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {projCliente.length === 0 ? (
                      <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                        <div style={{ fontSize:32, marginBottom:10 }}>🗂</div>
                        <div style={{ fontSize:14 }}>Nenhum projeto vinculado.</div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {projCliente.map(p=>(
                          <div key={p.id} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
                            <div style={{ width:44, height:44, borderRadius:11, background:`${C.accentGlow}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{p.cover}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:3 }}>{p.title}</div>
                              {p.description && <div style={{ color:C.muted, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.description}</div>}
                              <div style={{ display:"flex", gap:8, marginTop:5 }}>
                                <span style={{ background:`${C.teal}15`, color:C.teal, fontSize:11, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{p.tag}</span>
                                {p.month && <span style={{ color:C.muted, fontSize:11 }}>{p.month}</span>}
                              </div>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                              {p.value>0 && <div style={{ color:C.green, fontWeight:700, fontSize:14 }}>R$ {p.value.toLocaleString("pt-BR")}</div>}
                              <a href={p.url} target="_blank" rel="noopener noreferrer"
                                style={{ color:C.accent, fontSize:12, display:"flex", alignItems:"center", gap:4, textDecoration:"none" }}>
                                <Ico n="externalLink" s={12} c={C.accent}/> Abrir
                              </a>
                              {projIds.includes(p.id) && (
                                <button onClick={()=>desvincularProjeto(p.id)}
                                  style={{ background:"none", border:"none", color:C.muted, fontSize:11, cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:3 }}>
                                  <Ico n="close" s={10} c={C.muted}/> desvincular
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── NOTAS ── */}
                {tab==="notas" && (
                  <NotesSave clienteId={sel.id} value={sel.notas_internas||""}/>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal cliente */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Editar Cliente":"Novo Cliente Ativo"} w={560}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Nome" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Field label="Empresa" value={form.company||""} onChange={v=>setForm(f=>({...f,company:v}))}/>
          <Field label="Email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
          <Field label="Telefone / WhatsApp" value={form.telefone||""} onChange={v=>setForm(f=>({...f,telefone:v}))} placeholder="(11) 99999-9999"/>
          <Field label="Tag / Serviço" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))}/>
          {/* Valor total calculado automaticamente pelas demandas finalizadas */}
        </div>
        <Field label="Redes sociais / Site (URL)" value={form.redes||""} onChange={v=>setForm(f=>({...f,redes:v}))} placeholder="https://instagram.com/..."/>
        <Field label="Fontes (separadas por vírgula)" value={form.fontes||""} onChange={v=>setForm(f=>({...f,fontes:v}))} placeholder="Montserrat Bold, Lato Regular"/>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>🎨 Cores (ex: #FF0000 Vermelho, #000 Preto)</label>
          <input value={form.cores||""} onChange={e=>setForm(f=>({...f,cores:e.target.value}))} placeholder="#A78BFA Roxo Principal, #2DD4BF Teal Secundária" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>📋 Briefing / Manual da Marca</label>
          <textarea value={form.briefing_padrao||""} onChange={e=>setForm(f=>({...f,briefing_padrao:e.target.value}))}
            placeholder="Tom de voz, referências visuais, o que evitar, público-alvo..."
            rows={3} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
        </div>
        <Btn onClick={save} full>{editId?"Salvar alterações":"Adicionar Cliente"}</Btn>
      </Modal>

      {/* Modal demanda */}
      <Modal open={modalDemanda} onClose={()=>setModalDemanda(false)} title={editDemandaId?"Editar Demanda":"Nova Demanda"}>
        <Field label="Título" value={formD.titulo} onChange={v=>setFormD(f=>({...f,titulo:v}))} placeholder="Ex: Banner para stories, Landing page..."/>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Descrição</label>
          <textarea value={formD.descricao||""} onChange={e=>setFormD(f=>({...f,descricao:e.target.value}))}
            placeholder="Detalhes do pedido, referências, observações..."
            rows={3} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Prazo" value={formD.prazo||""} onChange={v=>setFormD(f=>({...f,prazo:v}))} type="date"/>
          <Field label="Valor (R$)" value={formD.valor||""} onChange={v=>setFormD(f=>({...f,valor:v}))} type="number"/>
          <Field label="Status" value={formD.status} onChange={v=>setFormD(f=>({...f,status:v}))} options={Object.entries(STATUS_DEMANDA).map(([k,v])=>({value:k,label:`${v.icon} ${v.label}`}))}/>
        </div>
        <Btn onClick={saveDemanda} full>{editDemandaId?"Salvar alterações":"Criar Demanda"}</Btn>
      </Modal>
    </div>
  );
}

// Sub-componentes internos do perfil
function InlineEdit({ clienteId, field, value, onSave, placeholder }) {
  const [txt, setTxt] = useState(value||"");
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ setTxt(value||""); },[clienteId, value]);
  const change = v => {
    setTxt(v); setSaved(false);
    clearTimeout(ref.current);
    ref.current = setTimeout(()=>{ onSave(clienteId,field,v); setSaved(true); },700);
  };
  return (
    <div>
      <input value={txt} onChange={e=>change(e.target.value)} placeholder={placeholder}
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
      <div style={{ textAlign:"right", marginTop:4 }}>
        <span style={{ color:saved?C.green:C.muted, fontSize:10 }}>{saved?"✓ Salvo":""}</span>
      </div>
    </div>
  );
}

function CoresEditor({ clienteId, value, onSave }) {
  const [txt, setTxt] = useState(value||"");
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ setTxt(value||""); },[clienteId, value]);
  const change = v => {
    setTxt(v); setSaved(false);
    clearTimeout(ref.current);
    ref.current = setTimeout(()=>{ onSave(clienteId,"cores",v); setSaved(true); },700);
  };
  return (
    <div>
      <input value={txt} onChange={e=>change(e.target.value)} placeholder="#A78BFA Roxo Principal, #2DD4BF Teal, #000000 Preto"
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        <span style={{ color:C.muted, fontSize:10 }}>Formato: #HEX Nome, separe por vírgula</span>
        <span style={{ color:saved?C.green:C.muted, fontSize:10 }}>{saved?"✓ Salvo":""}</span>
      </div>
    </div>
  );
}

function BriefingInline({ clienteId, value, onSave }) {
  const [txt, setTxt] = useState(value||"");
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{ setTxt(value||""); },[clienteId, value]);
  const change = v => {
    setTxt(v); setSaved(false);
    clearTimeout(ref.current);
    ref.current = setTimeout(()=>{ onSave(clienteId,"briefing_padrao",v); setSaved(true); },700);
  };
  return (
    <div>
      <textarea value={txt} onChange={e=>change(e.target.value)} rows={5}
        placeholder="Ex: Marca jovem e descontraída. Sempre usar fundo escuro. Público 18-30 anos. Evitar fontes serifadas. Referências: Nubank, Spotify..."
        style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.7 }}/>
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:4 }}>
        <span style={{ color:saved?C.green:C.muted, fontSize:10 }}>{saved?"✓ Salvo":""}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMULÁRIO PÚBLICO DE PEDIDOS
// ══════════════════════════════════════════════════════════════════════════════
function FormularioPedido({ setDemandas, setTasks }) {
  // Detecta cliente pelo hash: #pedido/slug/id
  const hash = window.location.hash;
  const match = hash.match(/#pedido\/[^/]+\/(\d+)/);
  const clienteId = match ? parseInt(match[1]) : null;

  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo:"", descricao:"", prazo:"" });
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(false);

  // Busca o cliente DIRETO do Supabase (não depende do localStorage do designer)
  useEffect(() => {
    if (!clienteId) { setLoading(false); return; }
    async function buscar() {
      try {
        if (dbReady) {
          const { data, error } = await supabase
            .from("leads")
            .select("*")
            .eq("id", clienteId)
            .single();
          // aceita qualquer lead com esse ID (categoria pode não estar migrada ainda)
          setCliente(data || null);
        } else {
          // Supabase não configurado
          setCliente(null);
        }
      } catch(e) {
        setCliente(null);
      } finally {
        setLoading(false);
      }
    }
    buscar();
  }, [clienteId]);

  const enviar = async () => {
    if (!form.titulo || !cliente) { setErro(true); return; }
    const nova = {
      id: Date.now(),
      titulo: form.titulo,
      descricao: form.descricao,
      prazo: form.prazo,
      valor: 0,
      status: "triagem",
      cliente_id: cliente.id,
      data_criacao: new Date().toISOString().split("T")[0],
    };
    // Salva direto no Supabase (fonte da verdade para o designer ver)
    if (dbReady) {
      try { await supabase.from("demandas").insert([{ ...nova, id: undefined }]); } catch(e) {}
    }
    // Atualiza estado local também (se o designer estiver com o app aberto)
    if (setDemandas) setDemandas(ds => [...ds, nova]);
    setEnviado(true);
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.muted, fontSize:16 }}>Carregando...</div>
    </div>
  );

  if (!cliente) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", color:C.muted }}>
        <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
        <div style={{ fontSize:16, color:C.text, marginBottom:8 }}>Link inválido ou cliente não encontrado.</div>
        <div style={{ fontSize:13 }}>Verifique o link com seu designer.</div>
      </div>
    </div>
  );

  if (enviado) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", maxWidth:400, padding:32 }}>
        <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
        <div style={{ color:C.text, fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", marginBottom:8 }}>Pedido enviado!</div>
        <div style={{ color:C.muted, fontSize:15, lineHeight:1.6 }}>Seu pedido foi recebido e já está em triagem. Entraremos em contato em breve.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:520 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:60, height:60, borderRadius:16, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26, fontWeight:800, color:"#fff", fontFamily:"'Syne',sans-serif" }}>
            {cliente.name.charAt(0)}
          </div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, margin:"0 0 6px" }}>Fazer um pedido</h1>
          <p style={{ color:C.muted, fontSize:14, margin:0 }}>Olá, {cliente.name.split(" ")[0]}! Preencha os dados do seu pedido.</p>
        </div>

        {/* Formulário */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28 }}>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Título do pedido *</label>
            <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}
              placeholder="Ex: Banner para stories, Logo nova, Landing page..."
              style={{ background:C.surface, border:`1px solid ${erro&&!form.titulo?C.red:C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
            {erro && !form.titulo && <div style={{ color:C.red, fontSize:11, marginTop:4 }}>Campo obrigatório</div>}
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Descrição do pedido</label>
            <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
              placeholder="Descreva o que precisa: referências, tamanhos, cores preferidas, textos, links..."
              rows={5} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Prazo desejado</label>
            <input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}
              style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:14, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
          </div>
          <button onClick={enviar}
            style={{ width:"100%", background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:12, padding:"14px", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", boxShadow:`0 4px 20px ${C.accentGlow}40` }}>
            Enviar pedido →
          </button>
        </div>
        <p style={{ textAlign:"center", color:C.muted, fontSize:12, marginTop:16 }}>Powered by FluxioHUB</p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// KANBAN
// ══════════════════════════════════════════════════════════════════════════════
function Kanban({ demandas, setDemandas, leads }) {
  const [dragId,    setDragId]    = useState(null);
  const [dragOver,  setDragOver]  = useState(null);
  const [modalCard, setModalCard] = useState(null); // demanda selecionada
  const [filterCli, setFilterCli] = useState("todos");

  const today = new Date().toISOString().split("T")[0];

  // Clientes ativos para filtro
  const clientes = leads.filter(l => l.categoria === "cliente_fixo");

  // Demandas filtradas
  const demandasFiltradas = filterCli === "todos"
    ? demandas
    : demandas.filter(d => String(d.cliente_id) === String(filterCli));

  const mover = (id, novoStatus) => {
    setDemandas(ds => ds.map(d => d.id === id ? { ...d, status: novoStatus } : d));
  };

  // Drag handlers
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e, col) => {
    e.preventDefault();
    setDragOver(col);
  };
  const onDrop = (e, col) => {
    e.preventDefault();
    if (dragId) mover(dragId, col);
    setDragId(null);
    setDragOver(null);
  };
  const onDragEnd = () => { setDragId(null); setDragOver(null); };

  const getCliente = (clienteId) => leads.find(l => l.id === clienteId || l.id === parseInt(clienteId));

  const isAtrasado = (d) => d.prazo && d.prazo < today && d.status !== "finalizado";

  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 54px)", display:"flex", flexDirection:"column" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexShrink:0 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>🗂 Kanban</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>
            {demandas.length} demanda{demandas.length!==1?"s":""} · {demandas.filter(d=>isAtrasado(d)).length} atrasada{demandas.filter(d=>isAtrasado(d)).length!==1?"s":""}
          </p>
        </div>
        {/* Filtro por cliente */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.muted, fontSize:12 }}>Cliente:</span>
          <select value={filterCli} onChange={e=>setFilterCli(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"7px 12px", color:C.text, fontSize:13, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
            <option value="todos">Todos</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Colunas */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, flex:1, minHeight:0, overflowX:"auto" }}>
        {KANBAN_COLS.map(col => {
          const cfg = STATUS_DEMANDA[col];
          const cards = demandasFiltradas.filter(d => d.status === col);
          const isOver = dragOver === col;

          return (
            <div key={col}
              onDragOver={e => onDragOver(e, col)}
              onDrop={e => onDrop(e, col)}
              onDragLeave={() => setDragOver(null)}
              style={{ display:"flex", flexDirection:"column", background:isOver?`${cfg.color}10`:C.surface, border:`1px solid ${isOver?cfg.color:C.border}`, borderRadius:14, transition:"all 0.15s", minWidth:200 }}>

              {/* Cabeçalho da coluna */}
              <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{cfg.icon}</span>
                    <span style={{ color:cfg.color, fontWeight:700, fontSize:13 }}>{cfg.label}</span>
                  </div>
                  <span style={{ background:`${cfg.color}20`, color:cfg.color, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99 }}>{cards.length}</span>
                </div>
                {/* Barra de progresso */}
                <div style={{ marginTop:8, height:2, background:C.border, borderRadius:99 }}>
                  <div style={{ height:2, background:cfg.color, borderRadius:99, width:demandas.length>0?`${Math.round((cards.length/Math.max(demandas.length,1))*100)}%`:"0%", transition:"width 0.3s" }}/>
                </div>
              </div>

              {/* Cards */}
              <div style={{ flex:1, overflowY:"auto", padding:"10px 10px", display:"flex", flexDirection:"column", gap:8 }}>
                {cards.length === 0 && (
                  <div style={{ textAlign:"center", padding:"20px 0", color:C.muted, fontSize:12, opacity:0.6 }}>
                    {isOver ? "Soltar aqui" : "Vazio"}
                  </div>
                )}
                {cards.map(d => {
                  const cliente = getCliente(d.cliente_id);
                  const atrasado = isAtrasado(d);
                  const isDragging = dragId === d.id;
                  const diasRestantes = d.prazo ? Math.ceil((new Date(d.prazo) - new Date(today)) / (1000*60*60*24)) : null;

                  return (
                    <div key={d.id}
                      draggable
                      onDragStart={e => onDragStart(e, d.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => setModalCard(d)}
                      style={{
                        background: isDragging ? `${cfg.color}15` : C.card,
                        border: `1px solid ${atrasado ? C.red : isDragging ? cfg.color : C.border}`,
                        borderLeft: `3px solid ${atrasado ? C.red : cfg.color}`,
                        borderRadius: 11,
                        padding: "12px 13px",
                        cursor: "grab",
                        opacity: isDragging ? 0.5 : 1,
                        transition: "all 0.13s",
                        userSelect: "none",
                      }}>

                      {/* Título + alerta */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6, gap:6 }}>
                        <span style={{ color:C.text, fontWeight:700, fontSize:13, lineHeight:1.4 }}>{d.titulo}</span>
                        {atrasado && (
                          <span style={{ background:`${C.red}20`, color:C.red, fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:99, whiteSpace:"nowrap", flexShrink:0 }}>ATRASADO</span>
                        )}
                      </div>

                      {/* Cliente */}
                      {cliente && (
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:7 }}>
                          <div style={{ width:18, height:18, borderRadius:5, background:`linear-gradient(135deg,${C.teal}50,${C.accentGlow}50)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:C.teal, flexShrink:0 }}>
                            {cliente.name.charAt(0)}
                          </div>
                          <span style={{ color:C.teal, fontSize:12, fontWeight:600 }}>{cliente.name}</span>
                        </div>
                      )}

                      {/* Tag */}
                      {d.tag && (
                        <div style={{ marginBottom:7 }}>
                          <span style={{ background:`${C.accent}15`, color:C.accent, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{d.tag}</span>
                        </div>
                      )}

                      {/* Prazo */}
                      {d.prazo && (
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:4 }}>
                          <span style={{ fontSize:11 }}>📅</span>
                          <span style={{ color: atrasado ? C.red : diasRestantes !== null && diasRestantes <= 2 ? C.orange : C.muted, fontSize:11, fontWeight: atrasado||diasRestantes<=2 ? 700 : 400 }}>
                            {atrasado
                              ? `${Math.abs(diasRestantes)}d atrasado`
                              : diasRestantes === 0
                              ? "Vence hoje!"
                              : diasRestantes === 1
                              ? "Amanhã"
                              : d.prazo}
                          </span>
                        </div>
                      )}

                      {/* Botões mover */}
                      <div style={{ display:"flex", gap:4, marginTop:9, paddingTop:8, borderTop:`1px solid ${C.border}`, flexWrap:"wrap" }}>
                        {KANBAN_COLS.filter(k => k !== col).map(k => {
                          const v = STATUS_DEMANDA[k];
                          const idx = KANBAN_COLS.indexOf(k);
                          const cur = KANBAN_COLS.indexOf(col);
                          const isNext = idx === cur + 1;
                          if (!isNext && idx !== cur - 1) return null; // só próxima e anterior
                          return (
                            <button key={k} onClick={e => { e.stopPropagation(); mover(d.id, k); }}
                              style={{ background:`${v.color}15`, border:`1px solid ${v.color}30`, borderRadius:6, padding:"3px 8px", color:v.color, fontSize:10, cursor:"pointer", fontWeight:700, display:"flex", alignItems:"center", gap:3 }}>
                              {isNext ? "→" : "←"} {v.icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal detalhe do card */}
      {modalCard && (() => {
        const d = demandas.find(x => x.id === modalCard.id) || modalCard;
        const cliente = getCliente(d.cliente_id);
        const st = STATUS_DEMANDA[d.status] || STATUS_DEMANDA.triagem;
        const atrasado = isAtrasado(d);
        return (
          <div onClick={()=>setModalCard(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:"100%", maxWidth:480 }}>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ background:`${st.color}20`, color:st.color, fontSize:12, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>{st.icon} {st.label}</span>
                    {atrasado && <span style={{ background:`${C.red}20`, color:C.red, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>ATRASADO</span>}
                  </div>
                  <h2 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, margin:0 }}>{d.titulo}</h2>
                </div>
                <button onClick={()=>setModalCard(null)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4, marginLeft:8 }}><Ico n="close" s={18}/></button>
              </div>

              {/* Info */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                {cliente && (
                  <div style={{ display:"flex", alignItems:"center", gap:10, background:C.surface, borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.teal}50,${C.accentGlow}50)`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:C.teal }}>
                      {cliente.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{cliente.name}</div>
                      <div style={{ color:C.muted, fontSize:12 }}>{cliente.company||"—"}</div>
                    </div>
                  </div>
                )}
                {d.descricao && (
                  <div style={{ background:C.surface, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ color:C.muted, fontSize:11, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>Descrição</div>
                    <div style={{ color:C.text, fontSize:13, lineHeight:1.6 }}>{d.descricao}</div>
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {d.prazo && (
                    <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px" }}>
                      <div style={{ color:C.muted, fontSize:11, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prazo</div>
                      <div style={{ color:atrasado?C.red:C.text, fontWeight:700, fontSize:14 }}>📅 {d.prazo}</div>
                    </div>
                  )}
                  {d.valor > 0 && (
                    <div style={{ background:C.surface, borderRadius:10, padding:"10px 14px" }}>
                      <div style={{ color:C.muted, fontSize:11, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.07em" }}>Valor</div>
                      <div style={{ color:C.green, fontWeight:700, fontSize:14 }}>R$ {d.valor.toLocaleString("pt-BR")}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mover para */}
              <div>
                <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Mover para</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {KANBAN_COLS.filter(k => k !== d.status).map(k => {
                    const v = STATUS_DEMANDA[k];
                    return (
                      <button key={k} onClick={() => { setDemandas(ds => ds.map(x => x.id===d.id ? {...x,status:k} : x)); setModalCard({...d,status:k}); }}
                        style={{ background:`${v.color}15`, border:`1px solid ${v.color}40`, borderRadius:9, padding:"8px 14px", color:v.color, fontSize:12, cursor:"pointer", fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                        {v.icon} {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}


export default function App() {
  // Detecta rota pública de pedido via hash
  const hashRoute = window.location.hash.startsWith("#pedido/") ? "pedido" : null;
  const [view, setView] = useState(hashRoute || "dashboard");

  // Estado local (sempre funciona, mesmo offline)
  const [leads,        setLeadsLocal]        = useLocalStorage("dh_leads",     initLeads);
  const [tasks,        setTasksLocal]        = useLocalStorage("dh_tasks",     initTasks);
  const [timerHistory, setTimerHistoryLocal] = useLocalStorage("dh_timer",     initTimerHistory);
  const [portfolio,    setPortfolioLocal]    = useLocalStorage("dh_portfolio", initPortfolio);
  const [notes,        setNotesLocal]        = useLocalStorage("dh_notes",     INIT_NOTES);
  const [demandas,     setDemandasLocal]     = useLocalStorage("dh_demandas",  initDemandas);
  const [col, setCol] = useState(false);

  // Estado de sincronização
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | loading | ok | error
  const loaded = useRef(false);

  // ── Carrega dados do Supabase na abertura do app ───────────────────────────
  useEffect(() => {
    if (!dbReady) return;
    async function loadFromCloud() {
      setSyncStatus("loading");
      try {
        const [lR, tR, pR, nR, hR, dR] = await Promise.all([
          supabase.from("leads").select("*"),
          supabase.from("tasks").select("*"),
          supabase.from("portfolio").select("*"),
          supabase.from("notes").select("*"),
          supabase.from("timer_history").select("*"),
          supabase.from("demandas").select("*"),
        ]);
        if (lR.data?.length) setLeadsLocal(lR.data);
        if (tR.data?.length) setTasksLocal(tR.data);
        if (pR.data?.length) setPortfolioLocal(pR.data);
        if (nR.data?.length) setNotesLocal(nR.data);
        if (hR.data?.length) setTimerHistoryLocal(hR.data);
        if (dR.data?.length) setDemandasLocal(dR.data);
        setSyncStatus("ok");
      } catch {
        setSyncStatus("error");
      } finally {
        loaded.current = true;
      }
    }
    loadFromCloud();
  }, []);

  // ── Sincroniza tabelas com ID numérico ─────────────────────────────────────
  async function syncTable(table, records) {
    if (!dbReady || !loaded.current) return;
    try {
      if (records.length === 0) {
        await supabase.from(table).delete().neq("id", -1);
      } else {
        await supabase.from(table).upsert(records);
        const ids = records.map(r => r.id);
        await supabase.from(table).delete().not("id", "in", `(${ids.join(",")})`);
      }
      setSyncStatus("ok");
    } catch { setSyncStatus("error"); }
  }

  // ── Sincroniza timer_history (chave = date) ────────────────────────────────
  async function syncTimerHistory(records) {
    if (!dbReady || !loaded.current) return;
    try {
      if (records.length === 0) {
        await supabase.from("timer_history").delete().neq("date", "");
      } else {
        await supabase.from("timer_history").upsert(records, { onConflict: "date" });
        const dates = records.map(r => `'${r.date}'`).join(",");
        await supabase.from("timer_history").delete().not("date", "in", `(${dates})`);
      }
      setSyncStatus("ok");
    } catch { setSyncStatus("error"); }
  }

  // ── Setters que atualizam local + nuvem ────────────────────────────────────
  const setLeads = v => {
    const val = typeof v === "function" ? v(leads) : v;
    setLeadsLocal(val); syncTable("leads", val);
  };
  const setTasks = v => {
    const val = typeof v === "function" ? v(tasks) : v;
    setTasksLocal(val); syncTable("tasks", val);
  };
  const setPortfolio = v => {
    const val = typeof v === "function" ? v(portfolio) : v;
    setPortfolioLocal(val); syncTable("portfolio", val);
  };
  const setNotes = v => {
    const val = typeof v === "function" ? v(notes) : v;
    setNotesLocal(val); syncTable("notes", val);
  };
  const setTimerHistory = v => {
    const val = typeof v === "function" ? v(timerHistory) : v;
    setTimerHistoryLocal(val); syncTimerHistory(val);
  };
  const setDemandas = v => {
    const val = typeof v === "function" ? v(demandas) : v;
    setDemandasLocal(val); syncTable("demandas", val);
  };

  const saveTimerDay = (date, secs) => {
    setTimerHistory(h => {
      const idx = h.findIndex(r=>r.date===date);
      if (idx >= 0) {
        const copy = [...h];
        copy[idx] = { ...copy[idx], seconds: copy[idx].seconds + secs };
        return copy;
      }
      return [...h, { date, seconds:secs }];
    });
  };

  const timer = useTimer(saveTimerDay);

  // ── Indicador de status de sync no topbar ──────────────────────────────────
  const SyncDot = () => {
    if (!dbReady) return (
      <div title="Sem banco de dados configurado" style={{ display:"flex", alignItems:"center", gap:6, background:`${C.yellow}15`, border:`1px solid ${C.yellow}30`, borderRadius:8, padding:"5px 10px" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:C.yellow }}/>
        <span style={{ color:C.yellow, fontSize:11, fontWeight:600 }}>Local</span>
      </div>
    );
    return (
      <div title={syncStatus === "ok" ? "Dados salvos na nuvem" : syncStatus === "loading" ? "Sincronizando..." : "Erro ao sincronizar"} style={{ display:"flex", alignItems:"center", gap:6, background:`${syncStatus==="ok"?C.green:syncStatus==="loading"?C.accent:C.red}15`, border:`1px solid ${syncStatus==="ok"?C.green:syncStatus==="loading"?C.accent:C.red}30`, borderRadius:8, padding:"5px 10px" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:syncStatus==="ok"?C.green:syncStatus==="loading"?C.accent:C.red, boxShadow:syncStatus==="loading"?`0 0 6px ${C.accent}`:"none" }}/>
        <span style={{ color:syncStatus==="ok"?C.green:syncStatus==="loading"?C.accent:C.red, fontSize:11, fontWeight:600 }}>
          {syncStatus==="ok"?"Nuvem ✓":syncStatus==="loading"?"Sincronizando":"Erro"}
        </span>
      </div>
    );
  };

  const nav = [
    { id:"dashboard",       label:"Dashboard",        icon:"dashboard", sec:"principal" },
    { id:"leads",           label:"CRM · Leads",       icon:"leads",     sec:"gestao"    },
    { id:"clientes_fixos",  label:"Clientes Ativos",   icon:"star",      sec:"gestao"    },
    { id:"kanban",          label:"Kanban",            icon:"kanban",    sec:"gestao"    },
    { id:"agenda",          label:"Agenda",            icon:"agenda",    sec:"gestao"    },
    { id:"finance",         label:"Financeiro",        icon:"finance",   sec:"gestao"    },
    { id:"timer",           label:"Horas Trabalhadas", icon:"clock",     sec:"gestao"    },
    { id:"portfolio",       label:"Portfólio",         icon:"portfolio", sec:"criativo"  },
    { id:"notes",           label:"Notas",             icon:"note",      sec:"criativo"  },
  ];
  const secs = [{ id:"principal", label:"Principal" },{ id:"gestao", label:"Gestão" },{ id:"criativo", label:"Criativo" }];

  // Rota pública: renderiza só o formulário, sem sidebar
  if (view === "pedido") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          *{box-sizing:border-box;margin:0;padding:0;}
          body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;}
          input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5);}
        `}</style>
        <FormularioPedido setDemandas={setDemandas} setTasks={setTasks}/>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};font-family:'DM Sans',sans-serif;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:${C.surface};}
        ::-webkit-scrollbar-thumb{background:${C.subtle};border-radius:2px;}
        a{text-decoration:none;}
        input[type=date]::-webkit-calendar-picker-indicator,
        input[type=month]::-webkit-calendar-picker-indicator{filter:invert(0.5);}
      `}</style>
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:col?62:218, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", transition:"width 0.22s ease", flexShrink:0 }}>
          <div style={{ padding:"17px 13px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:col?"center":"space-between" }}>
            {!col&&(
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14, color:"#fff" }}>F</div>
                <span style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, letterSpacing:"-0.02em" }}>Fluxio<span style={{ color:C.accent }}>HUB</span></span>
              </div>
            )}
            <button onClick={()=>setCol(c=>!c)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="menu" s={15}/></button>
          </div>
          <nav style={{ flex:1, overflowY:"auto", padding:"10px 7px" }}>
            {secs.map(sec=>(
              <div key={sec.id}>
                {!col&&<div style={{ color:C.muted, fontSize:9, textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700, padding:"10px 9px 5px" }}>{sec.label}</div>}
                {nav.filter(n=>n.sec===sec.id).map(item=>{
                  const atrasados = item.id==="kanban" ? demandas.filter(d=>d.prazo&&d.prazo<new Date().toISOString().split("T")[0]&&d.status!=="finalizado").length : 0;
                  return (
                  <button key={item.id} onClick={()=>setView(item.id)} title={col?item.label:""} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:col?"10px":"9px 11px", borderRadius:9, background:view===item.id?`${C.accent}16`:"transparent", border:view===item.id?`1px solid ${C.accent}28`:"1px solid transparent", color:view===item.id?C.accent:C.muted, cursor:"pointer", fontSize:13, fontWeight:view===item.id?600:400, transition:"all 0.13s", justifyContent:col?"center":"flex-start", marginBottom:1, position:"relative" }}>
                    <Ico n={item.icon} s={15} c={view===item.id?C.accent:C.muted}/>
                    {!col&&<span style={{ flex:1, textAlign:"left" }}>{item.label}</span>}
                    {!col&&atrasados>0&&<span style={{ background:C.red, color:"#fff", fontSize:10, fontWeight:800, padding:"1px 6px", borderRadius:99, minWidth:18, textAlign:"center" }}>{atrasados}</span>}
                  </button>
                  );
                })}
              </div>
            ))}
          </nav>
          {!col&&(
            <div style={{ padding:"11px 13px", borderTop:`1px solid ${C.border}` }}>
              <div style={{ background:C.card, borderRadius:10, padding:"9px 12px", border:`1px solid ${timer.running?C.accentGlow+"40":C.border}`, transition:"border-color 0.3s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>Timer</span>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:timer.running?C.green:C.muted, boxShadow:timer.running?`0 0 6px ${C.green}`:"none", transition:"all 0.3s" }}/>
                </div>
                <div style={{ color:timer.running?C.teal:C.text, fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:15, letterSpacing:"0.02em" }}>{timer.fmt(timer.seconds)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Main */}
        <div style={{ flex:1, overflow:"auto" }}>
          <div style={{ padding:"0 24px", height:54, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:C.surface, position:"sticky", top:0, zIndex:10 }}>
            <span style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>{nav.find(n=>n.id===view)?.label||view}</span>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <SyncDot/>
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"6px 13px", display:"flex", alignItems:"center", gap:7 }}>
                <Ico n="search" s={13} c={C.muted}/>
                <input placeholder="Buscar..." style={{ background:"none", border:"none", color:C.text, fontSize:13, outline:"none", width:110, fontFamily:"inherit" }}/>
              </div>
              <div style={{ width:32, height:32, borderRadius:9, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13 }}>F</div>
            </div>
          </div>
          {view==="dashboard"      && <Dashboard leads={leads} tasks={tasks} timer={timer} timerHistory={timerHistory} setView={setView} demandas={demandas}/>}
          {view==="kanban"         && <Kanban demandas={demandas} setDemandas={setDemandas} leads={leads}/>}
          {view==="leads"          && <Leads leads={leads} setLeads={setLeads}/>}
          {view==="clientes_fixos" && <ClientesFixos leads={leads} setLeads={setLeads} portfolio={portfolio} demandas={demandas} setDemandas={setDemandas} tasks={tasks} setTasks={setTasks}/>}
          {view==="pedido"         && <FormularioPedido leads={leads} setDemandas={setDemandas} setTasks={setTasks}/>}
          {view==="agenda"         && <Agenda tasks={tasks} setTasks={setTasks}/>}
          {view==="finance"        && <Finance leads={leads} demandas={demandas} timerHistory={timerHistory}/>}
          {view==="timer"          && <TimerHistoryView timerHistory={timerHistory} timer={timer}/>}
          {view==="portfolio"      && <Portfolio items={portfolio} setItems={setPortfolio}/>}
          {view==="notes"          && <Notes notes={notes} setNotes={setNotes}/>}
        </div>
      </div>
    </>
  );
}
