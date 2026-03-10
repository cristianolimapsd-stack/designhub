import React, { useState, useEffect, useRef } from "react";
import { supabase, dbReady } from './lib/supabase.js';
import { Prospeccao } from './Prospeccao';

// ─── Persistência local (fallback offline) ────────────────────────────────────
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored);
      // Valida tipo básico — se esperado array e veio outra coisa, descarta
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed;
    } catch {
      // Dado corrompido — limpa e usa valor inicial
      try { localStorage.removeItem(key); } catch {}
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

// Limpa chaves corrompidas conhecidas na inicialização
try {
  ["dh_demandas","dh_leads","dh_tasks","dh_portfolio","dh_timer_history","dh_notes","dh_despesas"].forEach(k => {
    const v = localStorage.getItem(k);
    if (v) { try { const p = JSON.parse(v); if (!Array.isArray(p)) localStorage.removeItem(k); } catch { localStorage.removeItem(k); } }
  });
} catch {}

const THEMES = {
  dark: {
    bg:"#080810", surface:"#0f0f1a", card:"#14141f", cardHover:"#1a1a2e",
    border:"#1e1e30", accent:"#a78bfa", accentGlow:"#7c3aed",
    teal:"#2dd4bf", orange:"#fb923c", red:"#f87171", green:"#4ade80",
    yellow:"#facc15", text:"#e2e8f0", muted:"#64748b", subtle:"#334155",
    pink:"#f472b6",
  },
  light: {
    bg:"#f1f5f9", surface:"#ffffff", card:"#ffffff", cardHover:"#f8fafc",
    border:"#e2e8f0", accent:"#7c3aed", accentGlow:"#6d28d9",
    teal:"#0d9488", orange:"#ea580c", red:"#dc2626", green:"#16a34a",
    yellow:"#ca8a04", text:"#0f172a", muted:"#64748b", subtle:"#cbd5e1",
    pink:"#db2777",
  }
};
let C = THEMES.dark;

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const NOW_MONTH = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}`;
const NOW_YEAR  = new Date().getFullYear();
const NOW_MO    = new Date().getMonth();

const CATEGORIA = {
  lead:         { label:"Lead",          color:C.yellow, icon:"⚡" },
  cliente_fixo: { label:"Cliente Ativo",  color:C.teal,   icon:"⭐" },
};

const STATUS_DEMANDA = {
  agenda:      { label:"Agenda",       color:"#818cf8", icon:"📆" },
  triagem:     { label:"Triagem",      color:"#94a3b8", icon:"📥" },
  em_criacao:  { label:"Em Criação",   color:"#a78bfa", icon:"✏️"  },
  revisao:     { label:"Revisão",      color:"#38bdf8", icon:"🔍" },
  aprovacao:   { label:"Aprovação",    color:"#fb923c", icon:"👀" },
  finalizado:  { label:"Finalizado",   color:"#4ade80", icon:"✅" },
};
const KANBAN_COLS = ["agenda","triagem","em_criacao","revisao","aprovacao","finalizado"];

const initLeads = [];
const initTasks = [];
const initPortfolio = [];
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

function useTimer(onSave) {
  const todayKey = new Date().toISOString().split("T")[0];
  const stored = (() => { try { return JSON.parse(localStorage.getItem("dh_timer_state")||"{}"); } catch { return {}; } })();
  const isToday   = stored.date === todayKey;
  const initBase  = isToday ? (stored.baseSeconds || 0) : 0;
  const initRun   = isToday ? (stored.running || false) : false;
  const initStart = isToday ? (stored.startedAt || null) : null;
  const calcInitSecs = () => {
    if (initRun && initStart) return initBase + Math.floor((Date.now() - initStart) / 1000);
    return initBase;
  };
  const [seconds,  setSeconds]  = useState(calcInitSecs);
  const [running,  setRunning]  = useState(initRun);
  const [goal]                  = useState(8 * 3600);
  const intervalRef  = useRef(null);
  const secondsRef   = useRef(seconds);
  const baseRef      = useRef(initBase);
  const startedAtRef = useRef(initRun ? (initStart || Date.now()) : null);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  const persist = (isRunning) => {
    try {
      localStorage.setItem("dh_timer_state", JSON.stringify({
        date: todayKey, baseSeconds: baseRef.current, running: isRunning,
        startedAt: isRunning ? startedAtRef.current : null,
      }));
    } catch {}
  };
  useEffect(() => {
    if (running) {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      baseRef.current = secondsRef.current;
      startedAtRef.current = Date.now();
      persist(true);
      const base = baseRef.current;
      const t0   = startedAtRef.current;
      intervalRef.current = setInterval(() => {
        setSeconds(base + Math.floor((Date.now() - t0) / 1000));
      }, 500);
    } else {
      clearInterval(intervalRef.current);
      baseRef.current = secondsRef.current;
      startedAtRef.current = null;
      persist(false);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);
  const today = () => new Date().toISOString().split("T")[0];
  const fmt  = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const fmtH = s => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); if (h === 0) return `${m}min`; return m > 0 ? `${h}h ${m}min` : `${h}h`; };
  const toggle = () => setRunning(r => !r);
  const reset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    const secs = secondsRef.current;
    if (secs > 0) onSave(today(), secs);
    setSeconds(0);
    secondsRef.current = 0;
    baseRef.current = 0;
    startedAtRef.current = null;
    try { localStorage.removeItem("dh_timer_state"); } catch {}
  };
  return { seconds, running, goal, dailyGoal: goal, fmt, fmtH, toggle, reset, today: today() };
}

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

function Dashboard({ leads, tasks, timer, timerHistory, setView, demandas: _dashDemandas=[], setFocusMode }) {
  const demandas = Array.isArray(_dashDemandas) ? _dashDemandas : [];
  const today = new Date().toISOString().split("T")[0];
  const totalV = leads.filter(l=>l.status==="fechado").reduce((a,b)=>a+b.value,0);
  const pipeline = leads.filter(l=>!["fechado","perdido"].includes(l.status)).reduce((a,b)=>a+b.value,0);
  const todT = tasks.filter(t=>t.date===today);
  const pct = Math.min(100, Math.round((timer.seconds/timer.goal)*100));
  const last7 = Array.from({length:7},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const rec = timerHistory.find(h=>h.date===key);
    return { label:d.toLocaleDateString("pt-BR",{weekday:"short",day:"numeric"}), secs: key===today?timer.seconds:(rec?.seconds||0) };
  });
  const maxSecs = Math.max(...last7.map(d=>d.secs), 1);
  return (
    <div className="main-padding" style={{ padding:"28px 32px", maxWidth:1100 }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, margin:0, letterSpacing:"-0.02em" }}>{(()=>{const h=new Date().getHours();return h<12?"Bom dia! ☀️":h<18?"Boa tarde! 🌤":"Boa noite! 🌙";})()}</h1>
        <p style={{ color:C.muted, margin:"5px 0 0", fontSize:13 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 20px", marginBottom:22 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:timer.running?`${C.accentGlow}22`:C.border, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${timer.running?C.accent:C.border}`, flexShrink:0 }}>
            <Ico n="timer" s={19} c={timer.running?C.accent:C.muted}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap" }}>
              <span style={{ color:timer.running?C.teal:C.text, fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, letterSpacing:"0.02em" }}>{timer.fmt(timer.seconds)}</span>
              <span style={{ color:C.muted, fontSize:12 }}>{timer.running?"trabalhando":"pausado"} · {pct}% da meta</span>
            </div>
            <div style={{ marginTop:6, height:4, background:C.surface, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.accentGlow},${C.accent})`, borderRadius:99, transition:"width 0.5s" }}/>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <Btn onClick={timer.toggle} variant={timer.running?"ghost":"primary"} small><Ico n={timer.running?"pause":"play"} s={13} c={timer.running?C.accent:"#fff"}/>{timer.running?"Pausar":"Iniciar"}</Btn>
          <Btn onClick={timer.reset} variant="danger" small><Ico n="save" s={12} c={C.red}/>Salvar dia</Btn>
          <Btn onClick={()=>setFocusMode(true)} variant="ghost" small>🎯 Foco</Btn>
        </div>
      </div>
      <div className="dashboard-metrics" style={{ display:"flex", gap:14, marginBottom:22, flexWrap:"wrap" }}>
        {[
          { label:"Receita fechada", value:`R$ ${totalV.toLocaleString("pt-BR")}`, sub:`${leads.filter(l=>l.status==="fechado").length} projetos`, accent:C.green },
          { label:"Em pipeline",     value:`R$ ${pipeline.toLocaleString("pt-BR")}`, sub:`${leads.filter(l=>!["fechado","perdido"].includes(l.status)).length} ativos`, accent:C.accent },
          { label:"Total de leads",  value:leads.length, sub:`${leads.filter(l=>l.status==="novo").length} novos`, accent:C.teal },
          { label:"Tarefas hoje",    value:`${todT.filter(t=>t.done).length}/${todT.length}`, sub:`${todT.filter(t=>!t.done).length} pendentes`, accent:C.orange },
        ].map(m=>(
          <div key={m.label} style={{ flex:1, minWidth:160, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${m.accent},transparent)` }}/>
            <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:10 }}>{m.label}</div>
            <div style={{ color:m.accent, fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
            <div style={{ color:C.muted, fontSize:12, marginTop:4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 22px", marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>🗂 Kanban — visão geral</span>
          <button onClick={()=>setView("kanban")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", fontWeight:600 }}>Abrir Kanban →</button>
        </div>
        <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4 }}>
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
      {(() => {
        const urgentes = demandas.filter(d => d.status !== "finalizado" && d.prazo && d.prazo <= new Date(Date.now()+2*86400000).toISOString().split("T")[0]);
        if (urgentes.length === 0) return null;
        return (
          <div style={{ background:`${C.red}10`, border:`1px solid ${C.red}30`, borderRadius:14, padding:"16px 22px", marginBottom:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:16 }}>🚨</span>
              <span style={{ color:C.red, fontWeight:700, fontSize:14 }}>{urgentes.length} demanda{urgentes.length>1?"s":""} urgente{urgentes.length>1?"s":""}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {urgentes.map(d=>{
                const dias = Math.ceil((new Date(d.prazo) - new Date(today)) / 86400000);
                return (
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, background:`${C.red}08`, borderRadius:9, padding:"9px 14px", border:`1px solid ${C.red}20` }}>
                    <span style={{ fontSize:13 }}>{dias < 0 ? "🔴" : dias === 0 ? "🟠" : "🟡"}</span>
                    <span style={{ color:C.text, fontSize:13, flex:1, fontWeight:600 }}>{d.titulo}</span>
                    <span style={{ color:C.red, fontSize:12, fontWeight:700 }}>{dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "Vence hoje!" : "Amanhã"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div className="grid-2col" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusMode({ timer, onClose }) {
  const pct = timer.dailyGoal > 0 ? Math.min(100, Math.round(timer.seconds / timer.dailyGoal * 100)) : 0;
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(()=>setTick(t=>t+1),1000); return ()=>clearInterval(i); },[]);
  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');`}</style>
      <button onClick={onClose} style={{ position:"absolute", top:24, right:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 16px", color:C.muted, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>✕ Sair do foco</button>
      <div style={{ textAlign:"center" }}>
        <div style={{ color:C.muted, fontSize:13, textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:16 }}>{timer.running ? "🎯 em foco" : "⏸ pausado"}</div>
        <div style={{ color:timer.running?C.teal:C.text, fontFamily:"'Syne',sans-serif", fontSize:"clamp(64px,15vw,120px)", fontWeight:800, letterSpacing:"0.04em", lineHeight:1, marginBottom:28, textShadow:timer.running?`0 0 40px ${C.teal}60`:"none", transition:"text-shadow 0.5s" }}>{timer.fmt(timer.seconds)}</div>
        <div style={{ position:"relative", width:200, height:200, margin:"0 auto 36px" }}>
          <svg width="200" height="200" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="100" cy="100" r="88" fill="none" stroke={C.border} strokeWidth="8"/>
            <circle cx="100" cy="100" r="88" fill="none" stroke={timer.running?C.teal:C.accent} strokeWidth="8" strokeDasharray={`${2*Math.PI*88}`} strokeDashoffset={`${2*Math.PI*88*(1-pct/100)}`} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s linear" }}/>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ color:timer.running?C.teal:C.accent, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28 }}>{pct}%</div>
            <div style={{ color:C.muted, fontSize:11 }}>da meta</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
          <button onClick={timer.toggle} style={{ background:timer.running?`${C.accent}20`:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:`1px solid ${timer.running?C.accent:C.accent}`, borderRadius:16, padding:"16px 40px", color:timer.running?C.accent:"#fff", fontSize:18, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", letterSpacing:"0.04em", boxShadow:timer.running?"none":`0 4px 20px ${C.accentGlow}50` }}>{timer.running?"⏸ Pausar":"▶ Iniciar"}</button>
          <button onClick={timer.reset} style={{ background:`${C.red}15`, border:`1px solid ${C.red}30`, borderRadius:16, padding:"16px 28px", color:C.red, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💾 Salvar dia</button>
        </div>
        <div style={{ color:C.muted, fontSize:12, marginTop:24 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
      </div>
    </div>
  );
}

function TimerHistoryView({ timerHistory, timer }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const [yr, mo] = selMonth.split("-").map(Number);
  const fmtH = s => { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); if (h===0) return `${m}min`; return m>0?`${h}h ${m}min`:`${h}h`; };
  const today = new Date().toISOString().split("T")[0];
  const allHistory = [...timerHistory];
  const todayIdx = allHistory.findIndex(h=>h.date===today);
  if (timer.seconds > 0) {
    if (todayIdx >= 0) allHistory[todayIdx] = { ...allHistory[todayIdx], seconds: allHistory[todayIdx].seconds + timer.seconds };
    else allHistory.push({ date:today, seconds:timer.seconds });
  }
  const monthRecords = allHistory.filter(h => h.date.startsWith(selMonth)).sort((a,b)=>b.date.localeCompare(a.date));
  const totalSecs = monthRecords.reduce((a,b)=>a+b.seconds,0);
  const avgSecs = monthRecords.length ? Math.round(totalSecs/monthRecords.length) : 0;
  const maxSecs = Math.max(...monthRecords.map(h=>h.seconds), 1);
  const goalSecs = 8*3600;
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
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"22px 24px", marginBottom:20 }}>
        <div style={{ marginBottom:16 }}><span style={{ color:C.text, fontWeight:700, fontSize:14 }}>Distribuição diária — {MONTHS[mo-1]} {yr}</span></div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:120, overflowX:"auto" }}>
          {allDays.map(d=>{
            const pct = d.secs/maxSecs;
            const overGoal = d.secs >= goalSecs;
            return (
              <div key={d.day} style={{ minWidth:22, flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, position:"relative" }}>
                <div title={d.secs>0?fmtH(d.secs):"Sem registro"} style={{ width:"100%", background:d.secs>0?(overGoal?`linear-gradient(180deg,${C.green},${C.teal})`:`linear-gradient(180deg,${C.accent},${C.accentGlow})`):C.surface, borderRadius:"5px 5px 0 0", height:`${d.secs>0?Math.max(pct*105,6):4}px`, transition:"height 0.4s", cursor:"pointer" }}/>
                <span style={{ color:C.muted, fontSize:9 }}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>
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
            <div key={rec.date} style={{ display:"flex", alignItems:"center", gap:16, padding:"14px 18px", borderBottom:i<monthRecords.length-1?`1px solid ${C.border}`:"none" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${over?C.green:C.accent}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ico n="clock" s={18} c={over?C.green:C.accent}/></div>
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

function BriefingEditor({ lead, onSave }) {
  const [text, setText] = useState(lead.briefing_padrao||"");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => { setText(lead.briefing_padrao||""); }, [lead.id]);
  const handleChange = (v) => {
    setText(v); setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { onSave(lead.id, v); setSaved(true); }, 800);
  };
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <textarea value={text} onChange={e=>handleChange(e.target.value)} placeholder="Ex: Cores principais (#FFCC00, preto). Fonte: Montserrat Bold títulos, Lato corpo. Tom profissional e direto..." style={{ flex:1, minHeight:160, background:"#0f0f1a", border:"1px solid #1e1e30", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontSize:13, outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.7 }}/>
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
        <span style={{ color:saved?"#4ade80":"#64748b", fontSize:11 }}>{saved?"✓ Salvo":"Editando..."}</span>
      </div>
    </div>
  );
}

function Leads({ leads, setLeads, demandas, setDemandas }) {
  const [vm, setVm] = useState("table");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [fs, setFs] = useState("todos");
  const [fc, setFc] = useState("todos");
  const [briefingId, setBriefingId] = useState(null);
  const E = { name:"", company:"", email:"", value:"", status:"novo", tag:"", categoria:"lead", briefing_padrao:"" };
  const [form, setForm] = useState(E);
  const filtered = leads.filter(l=>(fs==="todos"||l.status===fs)&&(fc==="todos"||l.categoria===fc)&&(l.name.toLowerCase().includes(search.toLowerCase())||l.company.toLowerCase().includes(search.toLowerCase())));
  const openAdd = (status="novo") => { setForm({...E,status}); setEditId(null); setModal(true); };
  const openEdit = l => { setForm({...l,value:String(l.value)}); setEditId(l.id); setModal(true); };
  const save = () => {
    const lead = { ...form, value:parseFloat(form.value)||0, date:new Date().toISOString().split("T")[0] };
    if (editId) setLeads(ls=>ls.map(l=>l.id===editId?{...lead,id:editId}:l));
    else setLeads(ls=>[...ls,{...lead,id:Date.now()}]);
    setModal(false);
  };
  const del = id => { if (!window.confirm("Excluir este contato?")) return; setLeads(ls=>ls.filter(l=>l.id!==id)); if (setDemandas) setDemandas(ds=>ds.filter(d=>d.cliente_id!==id)); };
  const move = (id, status) => setLeads(ls=>ls.map(l=>l.id===id?{...l,status}:l));
  const converter = id => setLeads(ls=>ls.map(l=>l.id===id?{...l,categoria:"cliente_fixo",status:l.status==="novo"?"fechado":l.status}:l));
  const saveBriefing = (id, text) => setLeads(ls=>ls.map(l=>l.id===id?{...l,briefing_padrao:text}:l));
  const briefingLead = leads.find(l=>l.id===briefingId);
  const TotalFixo = leads.filter(l=>l.categoria==="cliente_fixo"&&l.status==="fechado").reduce((a,b)=>a+b.value,0);
  const TotalLead  = leads.filter(l=>l.categoria==="lead"&&l.status==="fechado").reduce((a,b)=>a+b.value,0);
  return (
    <div style={{ padding:"28px 32px" }}>
      {briefingLead && (
        <div style={{ position:"fixed", inset:0, zIndex:900 }} onClick={()=>setBriefingId(null)}>
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:420, background:C.surface, borderLeft:`1px solid ${C.border}`, padding:28, display:"flex", flexDirection:"column", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${C.accentGlow}22`, display:"flex", alignItems:"center", justifyContent:"center", color:C.accent, fontWeight:700, fontSize:15 }}>{briefingLead.name.charAt(0)}</div>
                  <div><div style={{ color:C.text, fontWeight:700, fontSize:16 }}>{briefingLead.name}</div><div style={{ color:C.muted, fontSize:12 }}>{briefingLead.company}</div></div>
                </div>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <span style={{ background:`${(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).color}18`, color:(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).color, fontSize:11, padding:"2px 10px", borderRadius:99, fontWeight:700 }}>{(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).icon} {(CATEGORIA[briefingLead.categoria]||CATEGORIA.lead).label}</span>
                  <span style={{ background:`${STATUS[briefingLead.status].color}18`, color:STATUS[briefingLead.status].color, fontSize:11, padding:"2px 10px", borderRadius:99, fontWeight:700 }}>{STATUS[briefingLead.status].label}</span>
                </div>
              </div>
              <button onClick={()=>setBriefingId(null)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="close" s={18}/></button>
            </div>
            <div style={{ background:C.card, borderRadius:12, padding:"13px 16px", marginBottom:18, border:`1px solid ${C.border}` }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Valor</div><div style={{ color:C.green, fontWeight:700, fontSize:14 }}>R$ {briefingLead.value.toLocaleString("pt-BR")}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Tag</div><div style={{ color:C.teal, fontWeight:600, fontSize:13 }}>{briefingLead.tag}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Email</div><div style={{ color:C.text, fontSize:12 }}>{briefingLead.email}</div></div>
                <div><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>Data</div><div style={{ color:C.text, fontSize:12 }}>{briefingLead.date}</div></div>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <label style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>📋 Briefing Padrão da Marca</label>
                {briefingLead.categoria!=="cliente_fixo" && <span style={{ color:C.yellow, fontSize:10 }}>⚠ converta para Cliente Ativo</span>}
              </div>
              <BriefingEditor lead={briefingLead} onSave={saveBriefing} />
            </div>
            <div style={{ marginTop:18, display:"flex", flexDirection:"column", gap:8 }}>
              {briefingLead.categoria!=="cliente_fixo" && (
                <button onClick={()=>{converter(briefingLead.id);}} style={{ background:`linear-gradient(135deg,${C.teal}88,${C.teal})`, border:"none", borderRadius:10, padding:"11px 18px", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>⭐ Converter em Cliente Ativo</button>
              )}
              <button onClick={()=>{openEdit(briefingLead);setBriefingId(null);}} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 18px", color:C.text, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Ico n="edit" s={13} c={C.muted}/> Editar dados</button>
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
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <div style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}><Ico n="search" s={14} c={C.muted}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar contato ou empresa..." style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px 9px 34px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["todos","lead","cliente_fixo"].map(cat=>{
            const cfg = cat==="todos" ? {label:"Todos",color:C.accent,icon:""} : CATEGORIA[cat];
            return <button key={cat} onClick={()=>setFc(cat)} style={{ background:fc===cat?`${cfg.color}18`:C.card, border:`1px solid ${fc===cat?cfg.color:C.border}`, borderRadius:8, padding:"7px 13px", color:fc===cat?cfg.color:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>{cfg.icon} {cfg.label}</button>;
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
            <thead><tr style={{ borderBottom:`1px solid ${C.border}` }}>{["Contato","Empresa","Categoria","Tag","Valor","Status",""].map(h=><th key={h} style={{ padding:"12px 18px", textAlign:"left", color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((l,i)=>{
                const cat = CATEGORIA[l.categoria]||CATEGORIA.lead;
                return (
                  <tr key={l.id} style={{ borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none", cursor:"pointer" }} onClick={()=>setBriefingId(l.id)} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"13px 18px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:33, height:33, borderRadius:9, background:`${cat.color}22`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.color, fontWeight:700, fontSize:13 }}>{l.name.charAt(0)}</div>
                        <div><div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{l.name}</div><div style={{ color:C.muted, fontSize:11 }}>{l.email}</div></div>
                      </div>
                    </td>
                    <td style={{ padding:"13px 18px" }}><div style={{ color:C.muted, fontSize:13 }}>{l.company}</div>{l.telefone&&<div style={{ color:C.muted, fontSize:11, marginTop:2 }}>📱 {l.telefone}</div>}</td>
                    <td style={{ padding:"13px 18px" }}><span style={{ background:`${cat.color}15`, color:cat.color, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>{cat.icon} {cat.label}</span>{l.briefing_padrao&&<span style={{ marginLeft:6, fontSize:12 }} title="Briefing salvo">📋</span>}</td>
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
                      <div key={l.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px", borderLeft:`3px solid ${cfg.color}`, cursor:"pointer" }} onClick={()=>setBriefingId(l.id)} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background=C.card}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:27, height:27, borderRadius:7, background:`${cat.color}22`, display:"flex", alignItems:"center", justifyContent:"center", color:cat.color, fontWeight:700, fontSize:12 }}>{l.name.charAt(0)}</div>
                            <div><div style={{ color:C.text, fontSize:12, fontWeight:600 }}>{l.name}</div><div style={{ color:C.muted, fontSize:11 }}>{l.company}</div></div>
                          </div>
                          <div style={{ display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>openEdit(l)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="edit" s={12}/></button>
                            <button onClick={()=>del(l.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:2 }}><Ico n="trash" s={12}/></button>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                          {l.categoria!=="cliente_fixo"&&<button onClick={()=>converter(l.id)} style={{ background:`${C.teal}10`, border:`1px solid ${C.teal}28`, borderRadius:6, padding:"2px 7px", color:C.teal, fontSize:10, cursor:"pointer", fontWeight:700 }}>⭐ Converter</button>}
                          {Object.keys(STATUS).filter(s=>s!==status).map(s=>(
                            <button key={s} onClick={()=>move(l.id,s)} style={{ background:`${STATUS[s].color}10`, border:`1px solid ${STATUS[s].color}28`, borderRadius:6, padding:"2px 7px", color:STATUS[s].color, fontSize:10, cursor:"pointer", fontWeight:600 }}>→ {STATUS[s].label}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>openAdd(status)} style={{ background:`${cfg.color}08`, border:`1px dashed ${cfg.color}40`, borderRadius:10, padding:"10px", color:cfg.color, cursor:"pointer", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}><Ico n="plus" s={12} c={cfg.color}/> Adicionar</button>
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
          <Field label="Telefone / WhatsApp" value={form.telefone||""} onChange={v=>setForm(f=>({...f,telefone:v}))} placeholder="(11) 99999-9999"/>
          <Field label="Valor (R$)" value={form.value} onChange={v=>setForm(f=>({...f,value:v}))} type="number"/>
          <Field label="Tag / Serviço" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))}/>
          <Field label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={Object.entries(STATUS).map(([k,v])=>({value:k,label:v.label}))}/>
        </div>
        <Field label="Categoria" value={form.categoria} onChange={v=>setForm(f=>({...f,categoria:v}))} options={Object.entries(CATEGORIA).map(([k,v])=>({value:k,label:`${v.icon} ${v.label}`}))}/>
        {form.categoria==="cliente_fixo" && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>📋 Briefing Padrão da Marca</label>
            <textarea value={form.briefing_padrao||""} onChange={e=>setForm(f=>({...f,briefing_padrao:e.target.value}))} placeholder="Ex: Cores principais (#FFCC00, #000). Fontes: Montserrat Bold títulos, Lato corpo..." rows={4} style={{ background:"#0f0f1a", border:"1px solid #1e1e30", borderRadius:9, padding:"10px 13px", color:"#e2e8f0", fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
          </div>
        )}
        <Btn onClick={save} full>{editId?"Salvar alterações":"Adicionar Contato"}</Btn>
      </Modal>
    </div>
  );
}

function Agenda({ tasks, setTasks, demandas, setDemandas }) {
  const today = new Date().toISOString().split("T")[0];
  const [vm, setVm] = useState("list");
  const [modal, setModal] = useState(false);
  const [calBase, setCalBase] = useState(new Date());
  const [selDay, setSelDay] = useState(today);
  const [form, setForm] = useState({ title:"", time:"09:00", date:today, priority:"media", type:"tarefa" });
  const [editTaskId, setEditTaskId] = useState(null);
  const toggle = id => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t));
  const del = id => { if (!window.confirm("Excluir esta tarefa?")) return; setTasks(ts=>ts.filter(t=>t.id!==id)); if (setDemandas) setDemandas(ds=>ds.filter(d=>d.task_id!==id)); };
  const openEdit = t => { setForm({ title:t.title, time:t.time, date:t.date, priority:t.priority, type:t.type }); setEditTaskId(t.id); setModal(true); };
  const openNew = (date) => { setForm(f=>({...f,title:"",time:"09:00",date:date||today})); setEditTaskId(null); setModal(true); };
  const save = () => {
    if (!form.title) return;
    if (editTaskId) {
      setTasks(ts=>ts.map(t=>t.id===editTaskId?{...t,...form}:t));
      if (setDemandas) setDemandas(ds=>ds.map(d=>d.task_id===editTaskId?{...d,titulo:form.title,prazo:form.date}:d));
    } else {
      const newId = Date.now();
      setTasks(ts=>[...ts,{...form,id:newId,done:false}]);
      if (setDemandas) setDemandas(ds=>[...ds,{id:newId+1,titulo:form.title,descricao:"",prazo:form.date,valor:0,status:"agenda",cliente_id:null,tag:form.type==="reuniao"?"Reunião":form.type==="entrega"?"Entrega":"Tarefa",task_id:newId,data_criacao:new Date().toISOString().split("T")[0]}]);
    }
    setForm(f=>({...f,title:"",time:"09:00"}));
    setModal(false);
    setEditTaskId(null);
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
  const [listFilter, setListFilter] = useState("todos");
  const today2 = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now()+7*86400000).toISOString().split("T")[0];
  const filteredTasks = sorted.filter(t => {
    if (listFilter==="hoje") return t.date===today2;
    if (listFilter==="semana") return t.date>=today2&&t.date<=weekEnd;
    if (listFilter==="atrasadas") return t.date<today2&&!t.done;
    return true;
  });
  const TaskRow = ({ t }) => (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:`1px solid ${C.border}`, opacity:t.done?0.5:1 }} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <button onClick={()=>toggle(t.id)} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{t.done&&<Ico n="check" s={10} c="#000"/>}</button>
      <div style={{ width:7, height:7, borderRadius:"50%", background:PRIORITY[t.priority].dot, flexShrink:0 }}/>
      <span style={{ fontFamily:"monospace", fontSize:12, color:C.muted, flexShrink:0, width:42 }}>{t.time}</span>
      <span style={{ fontSize:15, flexShrink:0 }}>{TYPE[t.type].icon}</span>
      <span style={{ color:t.done?C.muted:C.text, fontSize:13, flex:1, textDecoration:t.done?"line-through":"none" }}>{t.title}</span>
      <span style={{ color:C.muted, fontSize:11, flexShrink:0 }}>{t.date}</span>
      <button onClick={()=>openEdit(t)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:3 }}><Ico n="edit" s={12}/></button>
      <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:3 }}><Ico n="trash" s={12}/></button>
    </div>
  );
  return (
    <div className="main-padding" style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Agenda</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{tasks.filter(t=>!t.done).length} tarefas pendentes</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <Toggle val={vm} onChange={setVm} opts={[{v:"list",label:"Lista",icon:"list"},{v:"calendar",label:"Cal",icon:"calendar"}]}/>
          <Btn onClick={()=>openNew(selDay)}><Ico n="plus" s={14} c="#fff"/> Nova Tarefa</Btn>
        </div>
      </div>
      {vm==="list" ? (
        <div style={{ maxWidth:820 }}>
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {[{v:"todos",l:"Todos",c:C.muted},{v:"hoje",l:"Hoje",c:C.accent},{v:"semana",l:"Esta semana",c:C.teal},{v:"atrasadas",l:"Atrasadas",c:C.red}].map(f=>(
              <button key={f.v} onClick={()=>setListFilter(f.v)} style={{ background:listFilter===f.v?`${f.c}20`:C.card, border:`1px solid ${listFilter===f.v?f.c:C.border}`, borderRadius:8, padding:"6px 14px", color:listFilter===f.v?f.c:C.muted, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>{f.l}</button>
            ))}
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 18px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>Progresso geral</span>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:160, height:5, background:C.surface, borderRadius:99 }}><div style={{ height:"100%", width:`${tasks.length?(tasks.filter(t=>t.done).length/tasks.length*100):0}%`, background:`linear-gradient(90deg,${C.accentGlow},${C.teal})`, borderRadius:99 }}/></div>
              <span style={{ color:C.accent, fontSize:13, fontWeight:700 }}>{tasks.filter(t=>t.done).length}/{tasks.length}</span>
            </div>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
            {filteredTasks.length===0&&<div style={{ padding:40, textAlign:"center", color:C.muted }}>Sem tarefas neste filtro. 🎉</div>}
            {filteredTasks.map(t=><TaskRow key={t.id} t={t}/>)}
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
              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><div key={d} style={{ padding:"10px 0", textAlign:"center", color:C.muted, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{d}</div>)}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
              {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`} style={{ minHeight:88, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}/>)}
              {Array(daysInMo).fill(null).map((_,i)=>{
                const d=i+1, key=dk(d), dt=byDate[key]||[];
                const isTod=key===today, isSel=key===selDay;
                return (
                  <div key={d} onClick={()=>setSelDay(key)} style={{ minHeight:88, borderRight:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"7px", cursor:"pointer", background:isSel?`${C.accent}12`:isTod?`${C.accentGlow}08`:"transparent" }} onMouseEnter={e=>{if(!isSel&&!isTod)e.currentTarget.style.background=C.cardHover;}} onMouseLeave={e=>{if(!isSel&&!isTod)e.currentTarget.style.background="transparent";}}>
                    <div style={{ marginBottom:4 }}><span style={{ width:24, height:24, display:"inline-flex", alignItems:"center", justifyContent:"center", borderRadius:"50%", background:isTod?C.accent:isSel?`${C.accent}25`:"transparent", color:isTod?"#fff":isSel?C.accent:C.muted, fontSize:12, fontWeight:isTod||isSel?700:400 }}>{d}</span></div>
                    {dt.slice(0,3).map(t=><div key={t.id} style={{ background:`${PRIORITY[t.priority].dot}1a`, borderLeft:`2px solid ${PRIORITY[t.priority].dot}`, borderRadius:"0 4px 4px 0", padding:"2px 5px", marginBottom:2, fontSize:10, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}><span style={{ color:C.muted }}>{t.time} </span>{t.title}</div>)}
                    {dt.length>3&&<div style={{ fontSize:10, color:C.muted }}>+{dt.length-3}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>{new Date(selDay+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})}</span>
              <Btn onClick={()=>openNew(selDay)} variant="ghost" small><Ico n="plus" s={12} c={C.accent}/></Btn>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {sideTasks.length===0&&<div style={{ padding:30, textAlign:"center", color:C.muted, fontSize:13 }}>Sem tarefas neste dia.</div>}
              {sideTasks.map(t=>(
                <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 14px", borderBottom:`1px solid ${C.border}`, opacity:t.done?0.5:1 }}>
                  <button onClick={()=>toggle(t.id)} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${t.done?C.green:C.border}`, background:t.done?C.green:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>{t.done&&<Ico n="check" s={10} c="#000"/>}</button>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.done?C.muted:C.text, fontSize:13, textDecoration:t.done?"line-through":"none", marginBottom:3 }}>{t.title}</div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}><span style={{ fontFamily:"monospace", fontSize:11, color:C.muted }}>{t.time}</span><span style={{ fontSize:13 }}>{TYPE[t.type].icon}</span></div>
                  </div>
                  <button onClick={()=>openEdit(t)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="edit" s={12}/></button>
                  <button onClick={()=>del(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="trash" s={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <Modal open={modal} onClose={()=>setModal(false)} title={editTaskId?"Editar Tarefa":"Nova Tarefa"}>
        <Field label="Título" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Ex: Call com cliente..."/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Data" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
          <Field label="Horário" value={form.time} onChange={v=>setForm(f=>({...f,time:v}))} type="time"/>
          <Field label="Prioridade" value={form.priority} onChange={v=>setForm(f=>({...f,priority:v}))} options={[{value:"alta",label:"Alta"},{value:"media",label:"Média"},{value:"baixa",label:"Baixa"}]}/>
          <Field label="Tipo" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={Object.entries(TYPE).map(([k,v])=>({value:k,label:v.label}))}/>
        </div>
        <Btn onClick={save} full>{editTaskId?"Salvar alterações":"Adicionar Tarefa"}</Btn>
      </Modal>
    </div>
  );
}

function Finance({ leads, demandas, timerHistory, despesas=[], setDespesas }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const [meta, setMeta] = useLocalStorage("dh_meta_mensal", 5000);
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(String(meta));
  const [modalDesp, setModalDesp] = useState(false);
  const [formDesp, setFormDesp] = useState({ id:0, descricao:"", valor:"", categoria:"ferramenta", data:"" });
  const [editDespId, setEditDespId] = useState(null);
  const today = new Date().toISOString().split("T")[0];
  const receitaMes = (monthKey) => demandas.filter(d=>d.status==="finalizado"&&d.data_criacao?.startsWith(monthKey)).reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const moReceita = receitaMes(selMonth);
  const moJobs = demandas.filter(d=>d.status==="finalizado"&&d.data_criacao?.startsWith(selMonth));
  const moEmAndamento = demandas.filter(d=>d.status!=="finalizado"&&d.data_criacao?.startsWith(selMonth));
  const [yr, mo] = selMonth.split("-").map(Number);
  const prevDate = new Date(yr,mo-2,1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
  const prevReceita = receitaMes(prevMonth);
  const diffPct = prevReceita>0?Math.round((moReceita-prevReceita)/prevReceita*100):null;
  const chartMonths = Array.from({length:8},(_,i)=>{
    const d = new Date(NOW_YEAR,NOW_MO-i,1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return { key, label:MONTHS_SHORT[d.getMonth()], val:receitaMes(key), jobs:demandas.filter(d2=>d2.status==="finalizado"&&d2.data_criacao?.startsWith(key)).length };
  }).reverse();
  const maxChart = Math.max(...chartMonths.map(m=>m.val),meta,1);
  const clientes = leads.filter(l=>l.categoria==="cliente_fixo");
  const rankClientes = clientes.map(c=>({...c,total:demandas.filter(d=>String(d.cliente_id)===String(c.id)&&d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0),jobs:demandas.filter(d=>String(d.cliente_id)===String(c.id)&&d.status==="finalizado").length})).sort((a,b)=>b.total-a.total);
  const tagMap = {};
  demandas.filter(d=>d.status==="finalizado").forEach(d=>{const tag=d.tag||"Sem tag";if(!tagMap[tag])tagMap[tag]={total:0,count:0};tagMap[tag].total+=parseFloat(d.valor)||0;tagMap[tag].count++;});
  const rankTags = Object.entries(tagMap).map(([tag,v])=>({tag,...v})).sort((a,b)=>b.total-a.total);
  const despMes = despesas.filter(d=>(d.data||"").startsWith(selMonth));
  const totalDesp = despMes.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const lucroMes = moReceita-totalDesp;
  const catDesp = ["ferramenta","marketing","equipamento","educação","outro"];
  const catColors = {ferramenta:C.accent,marketing:C.pink,equipamento:C.orange,educação:C.teal,outro:C.muted};
  const saveDesp = () => {
    if (!formDesp.descricao||!formDesp.valor) return;
    const d = {...formDesp,valor:parseFloat(formDesp.valor)||0,id:editDespId||Date.now()};
    if (editDespId) setDespesas(ds=>ds.map(x=>x.id===editDespId?d:x));
    else setDespesas(ds=>[...ds,d]);
    setModalDesp(false); setFormDesp({id:0,descricao:"",valor:"",categoria:"ferramenta",data:selMonth+"-01"}); setEditDespId(null);
  };
  const delDesp = id => { if(window.confirm("Excluir despesa?")) setDespesas(ds=>ds.filter(d=>d.id!==id)); };
  const metaPct = meta>0?Math.min(100,Math.round(moReceita/meta*100)):0;
  const metaBatida = moReceita>=meta;
  const totalJobs = demandas.filter(d=>d.status==="finalizado").length;
  const totalReceita = demandas.filter(d=>d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const xp = Math.floor(totalReceita/100)+(totalJobs*50);
  const niveis = [
    {nome:"Iniciante",min:0,max:500,icon:"🌱",cor:C.muted},
    {nome:"Freelancer",min:500,max:2000,icon:"⚡",cor:C.yellow},
    {nome:"Profissional",min:2000,max:5000,icon:"🚀",cor:C.accent},
    {nome:"Expert",min:5000,max:15000,icon:"💎",cor:C.teal},
    {nome:"Lenda",min:15000,max:99999,icon:"🏆",cor:C.orange},
  ];
  const nivel = niveis.findLast(n=>xp>=n.min)||niveis[0];
  const nextNivel = niveis[niveis.indexOf(nivel)+1];
  const xpPct = nextNivel?Math.round((xp-nivel.min)/(nextNivel.min-nivel.min)*100):100;
  let streak = 0;
  const sd = new Date(); sd.setDate(sd.getDate()-1);
  while(true){const key=sd.toISOString().split("T")[0];if(timerHistory.find(h=>h.date===key&&h.seconds>3600)){streak++;sd.setDate(sd.getDate()-1);}else break;if(streak>365)break;}
  const conquistas = [
    {id:"first_job",icon:"🎯",nome:"Primeiro Job",desc:"Complete seu primeiro job",ok:totalJobs>=1},
    {id:"jobs5",icon:"⚡",nome:"5 Jobs",desc:"Complete 5 jobs finalizados",ok:totalJobs>=5},
    {id:"jobs10",icon:"🔥",nome:"10 Jobs",desc:"Complete 10 jobs finalizados",ok:totalJobs>=10},
    {id:"jobs25",icon:"💪",nome:"25 Jobs",desc:"Complete 25 jobs finalizados",ok:totalJobs>=25},
    {id:"r5k",icon:"💰",nome:"R$ 5k",desc:"Acumule R$ 5.000 em receita",ok:totalReceita>=5000},
    {id:"r10k",icon:"💎",nome:"R$ 10k",desc:"Acumule R$ 10.000 em receita",ok:totalReceita>=10000},
    {id:"r50k",icon:"🏆",nome:"R$ 50k",desc:"Acumule R$ 50.000 em receita",ok:totalReceita>=50000},
    {id:"meta",icon:"🎉",nome:"Meta batida!",desc:"Bata a meta mensal de receita",ok:metaBatida},
    {id:"streak3",icon:"🔁",nome:"3 dias seguidos",desc:"Trabalhe 3 dias seguidos (1h+)",ok:streak>=3},
    {id:"streak7",icon:"🗓",nome:"Semana completa",desc:"7 dias seguidos de trabalho",ok:streak>=7},
    {id:"clientes3",icon:"⭐",nome:"3 clientes ativos",desc:"Tenha 3 clientes ativos",ok:clientes.length>=3},
  ];
  const allMonthsRank = [...new Set(demandas.filter(d=>d.status==="finalizado").map(d=>d.data_criacao?.slice(0,7)).filter(Boolean))].map(key=>({key,label:`${MONTHS_SHORT[parseInt(key.split("-")[1])-1]}/${key.split("-")[0]}`,val:receitaMes(key)})).sort((a,b)=>b.val-a.val).slice(0,5);
  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 54px)", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div><h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>💰 Financeiro</h1><p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Receita real das demandas finalizadas</p></div>
        <MonthPicker value={selMonth} onChange={setSelMonth} label="Mês:"/>
      </div>
      <div style={{ background:`linear-gradient(135deg,${nivel.cor}15,${C.card})`, border:`1px solid ${nivel.cor}30`, borderRadius:16, padding:"20px 24px", marginBottom:20, display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ width:60, height:60, borderRadius:16, background:`${nivel.cor}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, flexShrink:0 }}>{nivel.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div><span style={{ color:nivel.cor, fontWeight:800, fontSize:18, fontFamily:"'Syne',sans-serif" }}>{nivel.nome}</span><span style={{ color:C.muted, fontSize:13, marginLeft:10 }}>{xp.toLocaleString("pt-BR")} XP</span></div>
            {nextNivel&&<span style={{ color:C.muted, fontSize:12 }}>Próximo: {nextNivel.icon} {nextNivel.nome}</span>}
          </div>
          <div style={{ height:8, background:C.surface, borderRadius:99 }}><div style={{ height:"100%", width:`${xpPct}%`, background:`linear-gradient(90deg,${nivel.cor},${nivel.cor}99)`, borderRadius:99, boxShadow:`0 0 10px ${nivel.cor}50` }}/></div>
          <div style={{ display:"flex", gap:20, marginTop:8 }}>
            <span style={{ color:C.muted, fontSize:12 }}>🏅 {totalJobs} jobs finalizados</span>
            <span style={{ color:C.muted, fontSize:12 }}>💰 R$ {totalReceita.toLocaleString("pt-BR")} total</span>
            <span style={{ color:C.muted, fontSize:12 }}>🔥 {streak} dias de streak</span>
          </div>
        </div>
      </div>
      <div style={{ background:metaBatida?`linear-gradient(135deg,${C.green}15,${C.card})`:C.card, border:`1px solid ${metaBatida?C.green:C.border}`, borderRadius:16, padding:"20px 24px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:15 }}>🎯 Meta de {MONTHS[mo-1]}</span>
            {metaBatida&&<span style={{ background:`${C.green}20`, color:C.green, fontSize:12, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>🎉 META BATIDA!</span>}
          </div>
          {editMeta?(
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={metaInput} onChange={e=>setMetaInput(e.target.value)} type="number" style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.text, fontSize:13, width:120, outline:"none", fontFamily:"inherit" }}/>
              <button onClick={()=>{setMeta(parseFloat(metaInput)||5000);setEditMeta(false);}} style={{ background:`${C.green}20`, border:`1px solid ${C.green}40`, borderRadius:8, padding:"6px 12px", color:C.green, cursor:"pointer", fontSize:12, fontWeight:700 }}>Salvar</button>
              <button onClick={()=>setEditMeta(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico n="close" s={14}/></button>
            </div>
          ):(
            <button onClick={()=>{setMetaInput(String(meta));setEditMeta(true);}} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 12px", color:C.muted, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", gap:5 }}><Ico n="edit" s={12} c={C.muted}/> Editar meta</button>
          )}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:10 }}>
          <span style={{ color:metaBatida?C.green:C.text, fontWeight:800, fontSize:28, fontFamily:"'Syne',sans-serif" }}>R$ {moReceita.toLocaleString("pt-BR")}</span>
          <span style={{ color:C.muted, fontSize:14 }}>de R$ {meta.toLocaleString("pt-BR")}</span>
        </div>
        <div style={{ height:12, background:C.surface, borderRadius:99, overflow:"hidden" }}><div style={{ height:"100%", width:`${metaPct}%`, background:metaBatida?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accentGlow},${C.accent})`, borderRadius:99, transition:"width 0.6s" }}/></div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
          <span style={{ color:C.muted, fontSize:12 }}>{metaPct}% da meta · {moJobs.length} jobs finalizados</span>
          {diffPct!==null&&<span style={{ color:diffPct>=0?C.green:C.red, fontSize:12, fontWeight:700 }}>{diffPct>=0?"▲":"▼"} {Math.abs(diffPct)}% vs mês anterior</span>}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>📊 Receita — últimos 8 meses</span>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130, position:"relative" }}>
            <div style={{ position:"absolute", left:0, right:0, bottom:`${Math.min(100,meta/maxChart*130)}px`, borderTop:`1px dashed ${C.accent}50`, zIndex:1 }}><span style={{ position:"absolute", right:0, top:-16, color:C.accent, fontSize:9, fontWeight:700 }}>META</span></div>
            {chartMonths.map((m,i)=>{
              const isSel=m.key===selMonth, bateu=m.val>=meta;
              return (
                <div key={i} onClick={()=>setSelMonth(m.key)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:5, cursor:"pointer", zIndex:2 }}>
                  {m.val>0&&<span style={{ color:isSel?C.accent:C.muted, fontSize:9, fontWeight:700 }}>R${(m.val/1000).toFixed(1)}k</span>}
                  <div style={{ width:"100%", background:m.val>0?(bateu?`linear-gradient(180deg,${C.green},${C.teal})`:isSel?`linear-gradient(180deg,${C.accent},${C.accentGlow})`:`linear-gradient(180deg,${C.subtle},${C.border})`):C.surface, borderRadius:"6px 6px 0 0", height:`${m.val>0?Math.max(m.val/maxChart*120,6):4}px`, transition:"all 0.3s" }}/>
                  <span style={{ color:isSel?C.accent:C.muted, fontSize:10, fontWeight:isSel?700:400 }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>🏆 Melhores meses</span>
          {allMonthsRank.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Ainda sem dados de receita.</div>:allMonthsRank.map((m,i)=>{
            const medals=["🥇","🥈","🥉","4️⃣","5️⃣"], pct=Math.round(m.val/allMonthsRank[0].val*100);
            return (<div key={m.key} style={{ marginBottom:14 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ fontSize:16 }}>{medals[i]}</span><span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{m.label}</span></div><span style={{ color:i===0?C.green:C.text, fontWeight:700, fontSize:14 }}>R$ {m.val.toLocaleString("pt-BR")}</span></div><div style={{ height:4, background:C.surface, borderRadius:99 }}><div style={{ height:"100%", width:`${pct}%`, background:i===0?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.accent},${C.accentGlow})`, borderRadius:99 }}/></div></div>);
          })}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>⭐ Ranking de Clientes</span>
          {rankClientes.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Nenhum cliente ativo ainda.</div>:rankClientes.map((c,i)=>{
            const medals=["🥇","🥈","🥉"], maxV=rankClientes[0].total||1;
            return (<div key={c.id} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}><span style={{ fontSize:i<3?18:13, minWidth:20 }}>{medals[i]||`${i+1}.`}</span><div style={{ width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${C.teal}40,${C.accentGlow}40)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.teal,fontWeight:800,fontSize:14,flexShrink:0 }}>{c.name.charAt(0)}</div><div style={{ flex:1,minWidth:0 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ color:C.text,fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</span><span style={{ color:C.green,fontSize:13,fontWeight:700,flexShrink:0,marginLeft:8 }}>R$ {c.total.toLocaleString("pt-BR")}</span></div><div style={{ height:4,background:C.surface,borderRadius:99 }}><div style={{ height:"100%",width:`${Math.round(c.total/maxV*100)}%`,background:i===0?`linear-gradient(90deg,${C.green},${C.teal})`:`linear-gradient(90deg,${C.teal},${C.accent})`,borderRadius:99 }}/></div><span style={{ color:C.muted,fontSize:11 }}>{c.jobs} job{c.jobs!==1?"s":""}</span></div></div>);
          })}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>🏷 Receita por Serviço</span>
          {rankTags.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 0" }}>Nenhum job finalizado ainda.</div>:rankTags.map((t,i)=>{
            const maxV=rankTags[0].total||1, colors=[C.accent,C.teal,C.orange,C.pink,C.green,C.yellow], cor=colors[i%colors.length];
            return (<div key={t.tag} style={{ marginBottom:14 }}><div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:8,height:8,borderRadius:"50%",background:cor }}/><span style={{ color:C.text,fontSize:13,fontWeight:600 }}>{t.tag}</span><span style={{ background:`${cor}18`,color:cor,fontSize:10,padding:"1px 7px",borderRadius:99,fontWeight:700 }}>{t.count}x</span></div><span style={{ color:C.text,fontSize:13,fontWeight:700 }}>R$ {t.total.toLocaleString("pt-BR")}</span></div><div style={{ height:5,background:C.surface,borderRadius:99 }}><div style={{ height:"100%",width:`${Math.round(t.total/maxV*100)}%`,background:cor,borderRadius:99,opacity:0.8 }}/></div></div>);
          })}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 22px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>💸 Despesas do mês</span>
            <span style={{ color:C.red, fontSize:13, fontWeight:700 }}>− R$ {totalDesp.toLocaleString("pt-BR")}</span>
            <span style={{ color:lucroMes>=0?C.green:C.red, fontSize:13, fontWeight:700 }}>= Lucro: R$ {lucroMes.toLocaleString("pt-BR")}</span>
          </div>
          <button onClick={()=>{setFormDesp({id:0,descricao:"",valor:"",categoria:"ferramenta",data:selMonth+"-01"});setEditDespId(null);setModalDesp(true);}} style={{ background:`${C.accent}20`, border:`1px solid ${C.accent}40`, borderRadius:9, padding:"7px 14px", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>+ Adicionar despesa</button>
        </div>
        {despMes.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"14px 0" }}>Nenhuma despesa neste mês.</div>:(
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {despMes.sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(d=>{
              const cor=catColors[d.categoria]||C.muted;
              return (<div key={d.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.surface, borderRadius:10, borderLeft:`3px solid ${cor}` }}><div style={{ flex:1 }}><div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{d.descricao}</div><div style={{ display:"flex", gap:8, marginTop:3 }}><span style={{ background:`${cor}15`, color:cor, fontSize:10, padding:"1px 8px", borderRadius:99, fontWeight:600 }}>{d.categoria}</span><span style={{ color:C.muted, fontSize:11 }}>{d.data}</span></div></div><span style={{ color:C.red, fontWeight:800, fontSize:14 }}>R$ {Number(d.valor).toLocaleString("pt-BR")}</span><button onClick={()=>{setFormDesp({...d,valor:String(d.valor)});setEditDespId(d.id);setModalDesp(true);}} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:7, padding:"4px 8px", color:C.muted, cursor:"pointer", fontSize:11 }}>✏️</button><button onClick={()=>delDesp(d.id)} style={{ background:`${C.red}10`, border:`1px solid ${C.red}25`, borderRadius:7, padding:"4px 8px", color:C.red, cursor:"pointer", fontSize:11 }}>🗑</button></div>);
            })}
          </div>
        )}
      </div>
      {modalDesp&&(
        <div onClick={()=>setModalDesp(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:"100%", maxWidth:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>{editDespId?"Editar":"Nova"} Despesa</span>
              <button onClick={()=>setModalDesp(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:22 }}>×</button>
            </div>
            <Field label="Descrição" value={formDesp.descricao} onChange={v=>setFormDesp(f=>({...f,descricao:v}))} placeholder="Ex: Adobe CC, Domínio..."/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 14px" }}>
              <Field label="Valor (R$)" value={formDesp.valor} onChange={v=>setFormDesp(f=>({...f,valor:v}))} type="number"/>
              <Field label="Data" value={formDesp.data} onChange={v=>setFormDesp(f=>({...f,data:v}))} type="date"/>
            </div>
            <Field label="Categoria" value={formDesp.categoria} onChange={v=>setFormDesp(f=>({...f,categoria:v}))} options={catDesp.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
            <button onClick={saveDesp} style={{ width:"100%", background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:11, padding:"13px", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", marginTop:4 }}>{editDespId?"Salvar alterações":"Adicionar despesa"}</button>
          </div>
        </div>
      )}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 24px" }}>
        <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>🏅 Conquistas — {conquistas.filter(c=>c.ok).length}/{conquistas.length} desbloqueadas</span>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
          {conquistas.map(c=>(
            <div key={c.id} style={{ background:c.ok?`${C.green}10`:C.surface, border:`1px solid ${c.ok?C.green+"40":C.border}`, borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10, opacity:c.ok?1:0.45 }}>
              <span style={{ fontSize:24, filter:c.ok?"none":"grayscale(1)" }}>{c.icon}</span>
              <div><div style={{ color:c.ok?C.text:C.muted, fontWeight:700, fontSize:13 }}>{c.nome}</div><div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{c.desc}</div></div>
              {c.ok&&<span style={{ marginLeft:"auto", color:C.green, fontSize:16 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Portfolio({ portfolio, setPortfolio }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filt, setFilt] = useState("todos");
  const [form, setForm] = useState({ title:"", tag:"", url:"", img:"", destaque:false });
  const tags = [...new Set(portfolio.map(p=>p.tag).filter(Boolean))];
  const filtered = filt==="todos"?portfolio:portfolio.filter(p=>p.tag===filt);
  const openEdit = p => { setForm(p); setEditId(p.id); setModal(true); };
  const save = () => {
    if (!form.title) return;
    if (editId) setPortfolio(ps=>ps.map(p=>p.id===editId?{...form,id:editId}:p));
    else setPortfolio(ps=>[...ps,{...form,id:Date.now()}]);
    setForm({title:"",tag:"",url:"",img:"",destaque:false}); setEditId(null); setModal(false);
  };
  const del = id => { if (!window.confirm("Excluir?")) return; setPortfolio(ps=>ps.filter(p=>p.id!==id)); };
  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div><h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>Portfólio</h1><p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{portfolio.length} projetos</p></div>
        <Btn onClick={()=>setModal(true)}><Ico n="plus" s={14} c="#fff"/> Adicionar</Btn>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["todos",...tags].map(t=>(
          <button key={t} onClick={()=>setFilt(t)} style={{ background:filt===t?`${C.accent}18`:C.card, border:`1px solid ${filt===t?C.accent:C.border}`, borderRadius:8, padding:"6px 13px", color:filt===t?C.accent:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>{t}</button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:16 }}>
        {filtered.map(p=>(
          <div key={p.id} style={{ background:C.card, border:`1px solid ${p.destaque?C.accent:C.border}`, borderRadius:14, overflow:"hidden", transition:"transform 0.15s, box-shadow 0.15s", cursor:"pointer" }} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 40px rgba(0,0,0,0.3)`;}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            <div style={{ height:160, background:p.img?`url(${p.img}) center/cover`:C.surface, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              {!p.img&&<Ico n="portfolio" s={40} c={C.border}/>}
              {p.destaque&&<div style={{ position:"absolute", top:10, right:10, background:C.accent, borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700, color:"#fff" }}>★ Destaque</div>}
            </div>
            <div style={{ padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div><div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{p.title}</div><span style={{ background:`${C.teal}18`, color:C.teal, fontSize:11, padding:"2px 9px", borderRadius:99, marginTop:5, display:"inline-block", fontWeight:600 }}>{p.tag}</span></div>
                <div style={{ display:"flex", gap:6 }}>
                  {p.url&&<a href={p.url} target="_blank" rel="noreferrer" style={{ color:C.accent, padding:4, display:"flex" }}><Ico n="externalLink" s={14} c={C.accent}/></a>}
                  <button onClick={()=>openEdit(p)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="edit" s={14}/></button>
                  <button onClick={()=>del(p.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:4 }}><Ico n="trash" s={14}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{ color:C.muted, fontSize:14, padding:40, textAlign:"center" }}>Nenhum projeto aqui ainda. Adicione seu primeiro!</div>}
      </div>
      <Modal open={modal} onClose={()=>{setModal(false);setEditId(null);setForm({title:"",tag:"",url:"",img:"",destaque:false});}} title={editId?"Editar Projeto":"Novo Projeto"}>
        <Field label="Título" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Ex: Brand Identity — Cliente X"/>
        <Field label="Tag/Categoria" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))} placeholder="Ex: Branding, UI/UX, Motion"/>
        <Field label="URL (link externo)" value={form.url} onChange={v=>setForm(f=>({...f,url:v}))} placeholder="https://behance.net/..."/>
        <Field label="URL da imagem de capa" value={form.img} onChange={v=>setForm(f=>({...f,img:v}))} placeholder="https://..."/>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <button onClick={()=>setForm(f=>({...f,destaque:!f.destaque}))} style={{ width:20, height:20, borderRadius:6, border:`2px solid ${form.destaque?C.accent:C.border}`, background:form.destaque?C.accent:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{form.destaque&&<Ico n="check" s={10} c="#fff"/>}</button>
          <span style={{ color:C.muted, fontSize:13 }}>Marcar como destaque</span>
        </div>
        <Btn onClick={save} full>{editId?"Salvar alterações":"Adicionar Projeto"}</Btn>
      </Modal>
    </div>
  );
}

function Notes({ notes, setNotes }) {
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const note = notes.find(n=>n.id===selId);
  const updateNote = (field, val) => setNotes(ns=>ns.map(n=>n.id===selId?{...n,[field]:val,updated:new Date().toISOString()}:n));
  const newNote = () => {
    const n = { id:Date.now(), title:"Nova nota", content:"", color:"#1e1e30", updated:new Date().toISOString() };
    setNotes(ns=>[n,...ns]);
    setSelId(n.id);
  };
  const del = id => { setNotes(ns=>ns.filter(n=>n.id!==id)); if(selId===id) setSelId(null); };
  const filtered = notes.filter(n=>n.title.toLowerCase().includes(search.toLowerCase())||n.content?.toLowerCase().includes(search.toLowerCase()));
  const COLORS = ["#1e1e30","#1a2e1a","#2e1a1a","#1a1a2e","#2e2a1a"];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", height:"calc(100vh - 54px)" }}>
      <div style={{ background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"16px 16px 10px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1, position:"relative" }}>
              <div style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)" }}><Ico n="search" s={13} c={C.muted}/></div>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 9px 7px 30px", color:C.text, fontSize:12, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box" }}/>
            </div>
            <button onClick={newNote} style={{ background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:8, padding:"0 12px", color:C.accent, cursor:"pointer" }}><Ico n="plus" s={16} c={C.accent}/></button>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          {filtered.length===0&&<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"30px 16px" }}>{search?"Nenhuma nota encontrada.":"Nenhuma nota ainda.\nClique em + para criar."}</div>}
          {filtered.map(n=>(
            <div key={n.id} onClick={()=>setSelId(n.id)} style={{ padding:"13px 16px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, borderLeft:`3px solid ${n.id===selId?C.accent:"transparent"}`, background:n.id===selId?C.cardHover:"transparent" }} onMouseEnter={e=>{ if(n.id!==selId) e.currentTarget.style.background=C.cardHover; }} onMouseLeave={e=>{ if(n.id!==selId) e.currentTarget.style.background="transparent"; }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontWeight:600, color:C.text, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{n.title||"Sem título"}</div>
                <button onClick={e=>{e.stopPropagation();del(n.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2, opacity:0.5 }}><Ico n="trash" s={11}/></button>
              </div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{n.updated?new Date(n.updated).toLocaleDateString("pt-BR",{day:"numeric",month:"short"}):"hoje"}</div>
              <div style={{ color:C.muted, fontSize:12, marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.content?.substring(0,60)||"Nota vazia..."}</div>
            </div>
          ))}
        </div>
      </div>
      {note ? (
        <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
          <div style={{ padding:"14px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:14 }}>
            <input value={note.title} onChange={e=>updateNote("title",e.target.value)} style={{ background:"none", border:"none", color:C.text, fontSize:18, fontWeight:700, fontFamily:"'Syne',sans-serif", outline:"none", flex:1 }}/>
            <div style={{ display:"flex", gap:7 }}>
              {COLORS.map(col=><button key={col} onClick={()=>updateNote("color",col)} style={{ width:18, height:18, borderRadius:"50%", background:col, border:`2px solid ${note.color===col?C.accent:"transparent"}`, cursor:"pointer" }}/>)}
            </div>
          </div>
          <textarea value={note.content} onChange={e=>updateNote("content",e.target.value)} placeholder="Escreva aqui..." style={{ flex:1, background:note.color||C.card, border:"none", padding:"22px 26px", color:C.text, fontSize:14, outline:"none", fontFamily:"inherit", resize:"none", lineHeight:1.8 }}/>
          <div style={{ padding:"8px 22px", borderTop:`1px solid ${C.border}`, color:C.muted, fontSize:11 }}>Último edit: {note.updated?new Date(note.updated).toLocaleString("pt-BR"):"agora"}</div>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:C.muted }}>
          <div style={{ textAlign:"center" }}>
            <Ico n="note" s={50} c={C.border}/>
            <div style={{ marginTop:14, fontSize:14 }}>Selecione uma nota ou crie uma nova</div>
            <button onClick={newNote} style={{ marginTop:14, background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:9, padding:"10px 20px", color:C.accent, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>+ Nova nota</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kanban({ demandas: _demandas, setDemandas, leads }) {
  // Garante que demandas é sempre um array válido
  const demandas = Array.isArray(_demandas) ? _demandas.filter(d=>d&&typeof d==="object") : [];
  const demandasRef = useRef(demandas);
  useEffect(() => { demandasRef.current = demandas; }, [demandas]);
  const today = new Date().toISOString().split("T")[0];
  const [modal, setModal] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [form, setForm] = useState({ titulo:"", descricao:"", prazo:"", valor:"", status:"agenda", cliente_id:"", tag:"" });
  const [editId, setEditId] = useState(null);
  const [filterCli, setFilterCli] = useState("");
  const [search, setSearch] = useState("");
  const clientes = Array.isArray(leads) ? leads.filter(l=>l&&l.categoria==="cliente_fixo") : [];
  const filtered = demandas.filter(d=>{
    try {
      const matchCli = filterCli==="" || String(d.cliente_id)===filterCli;
      const q = search.toLowerCase();
      const matchQ = !q || (d.titulo||"").toLowerCase().includes(q) || (d.tag||"").toLowerCase().includes(q);
      return matchCli && matchQ;
    } catch { return false; }
  });
  const openEdit = d => { setForm({titulo:d.titulo,descricao:d.descricao||"",prazo:d.prazo||"",valor:String(d.valor||""),status:d.status,cliente_id:String(d.cliente_id||""),tag:d.tag||""}); setEditId(d.id); setModal(true); };
  const openNew = (status="agenda") => { setForm({titulo:"",descricao:"",prazo:"",valor:"",status,cliente_id:"",tag:""}); setEditId(null); setModal(true); };
  const save = () => {
    if (!form.titulo) return;
    const d = { ...form, valor:parseFloat(form.valor)||0, cliente_id:form.cliente_id?Number(form.cliente_id):null, data_criacao:new Date().toISOString().split("T")[0] };
    if (editId) setDemandas(ds=>ds.map(x=>x.id===editId?{...x,...d}:x));
    else setDemandas(ds=>[...ds,{...d,id:Date.now()}]);
    setModal(false);
  };
  const del = id => {
    if (!window.confirm("Excluir demanda?")) return;
    const demanda = demandasRef.current.find(d=>d.id===id);
    setDemandas(ds=>ds.filter(d=>d.id!==id));
    if (demanda?.solicitacao_id) {
      supabase.from("solicitacoes").delete().eq("id", Number(demanda.solicitacao_id));
      const kanbanMap = JSON.parse(localStorage.getItem("dh_solic_kanban")||"{}");
      delete kanbanMap[String(demanda.solicitacao_id)];
      localStorage.setItem("dh_solic_kanban", JSON.stringify(kanbanMap));
    }
  };
  const move = (id, status) => {
    const demanda = demandasRef.current.find(d=>d.id===id);
    setDemandas(ds=>ds.map(d=>d.id===id?{...d,status}:d));
    if (demanda?.solicitacao_id) {
      supabase.from("solicitacoes").update({ status }).eq("id", Number(demanda.solicitacao_id));
    }
  };
  const nomeCliente = (id) => clientes.find(c=>String(c.id)===String(id))?.name||"";
  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed="move"; };
  const handleDrop = (e, col) => { e.preventDefault(); if (dragId) { move(dragId, col); setDragId(null); setDragTarget(null); } };
  const handleDragOver = (e, col) => { e.preventDefault(); setDragTarget(col); };
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 54px)", overflow:"hidden" }}>
      <div style={{ padding:"20px 28px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, margin:0 }}>Kanban · Demandas</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:12 }}>{demandas.filter(d=>d.status!=="finalizado").length} ativas · {demandas.filter(d=>d.status==="finalizado").length} finalizadas</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)" }}><Ico n="search" s={13} c={C.muted}/></div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"8px 12px 8px 32px", color:C.text, fontSize:12, width:170, outline:"none", fontFamily:"inherit" }}/>
          </div>
          <select value={filterCli} onChange={e=>setFilterCli(e.target.value)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"8px 12px", color:filterCli?C.accent:C.muted, fontSize:12, outline:"none", fontFamily:"inherit", cursor:"pointer" }}>
            <option value="">Todos os clientes</option>
            {clientes.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
          <Btn onClick={()=>openNew()} small><Ico n="plus" s={13} c="#fff"/> Nova Demanda</Btn>
        </div>
      </div>
      <div style={{ flex:1, overflowX:"auto", overflowY:"hidden" }}>
        <div style={{ display:"flex", gap:12, padding:"16px 22px", height:"100%", boxSizing:"border-box" }}>
          {KANBAN_COLS.map(col=>{
            const cfg=STATUS_DEMANDA[col];
            const cards=filtered.filter(d=>d.status===col);
            const atrasados=cards.filter(d=>d.prazo&&d.prazo<today).length;
            const totalVal=cards.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
            return (
              <div key={col} style={{ minWidth:238, maxWidth:238, flexShrink:0, display:"flex", flexDirection:"column", height:"100%" }} onDrop={e=>handleDrop(e,col)} onDragOver={e=>handleDragOver(e,col)}>
                <div style={{ marginBottom:10, padding:"0 2px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:15 }}>{cfg.icon}</span>
                      <span style={{ color:C.text, fontWeight:700, fontSize:13 }}>{cfg.label}</span>
                      <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:11, padding:"1px 8px", borderRadius:99, fontWeight:700 }}>{cards.length}</span>
                      {atrasados>0&&<span style={{ background:`${C.red}18`, color:C.red, fontSize:10, padding:"1px 7px", borderRadius:99, fontWeight:700 }}>🔴 {atrasados}</span>}
                    </div>
                  </div>
                  {totalVal>0&&<div style={{ color:C.muted, fontSize:11 }}>R$ {totalVal.toLocaleString("pt-BR")}</div>}
                  <div style={{ height:2, background:`${cfg.color}30`, borderRadius:99, marginTop:6 }}><div style={{ height:"100%", width:`${Math.min(100,cards.length/Math.max(1,filtered.length)*100)}%`, background:cfg.color, borderRadius:99 }}/></div>
                </div>
                <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:9, background:dragTarget===col?`${cfg.color}05`:"transparent", borderRadius:12, padding:"4px", transition:"background 0.2s" }}>
                  {cards.map(card=>{
                    const atrasado=card.prazo&&card.prazo<today&&card.status!=="finalizado";
                    const venceHoje=card.prazo===today;
                    return (
                      <div key={card.id} draggable onDragStart={e=>handleDragStart(e,card.id)} style={{ background:C.card, border:`1px solid ${atrasado?C.red+"40":C.border}`, borderRadius:12, padding:"12px 13px", cursor:"grab", borderLeft:`3px solid ${cfg.color}`, opacity:dragId===card.id?0.5:1 }} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background=C.card}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <span style={{ color:C.text, fontWeight:700, fontSize:12, flex:1, lineHeight:1.4 }}>{card.titulo}</span>
                          <div style={{ display:"flex", gap:4, flexShrink:0, marginLeft:8 }}>
                            <button onClick={()=>openEdit(card)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="edit" s={11}/></button>
                            <button onClick={()=>del(card.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:2 }}><Ico n="trash" s={11}/></button>
                          </div>
                        </div>
                        {card.descricao&&<p style={{ color:C.muted, fontSize:11, margin:"0 0 8px", lineHeight:1.5 }}>{card.descricao}</p>}
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:card.prazo||card.cliente_id?8:0 }}>
                          {card.tag&&<span style={{ background:`${C.teal}15`, color:C.teal, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{card.tag}</span>}
                          {card.valor>0&&<span style={{ background:`${C.green}15`, color:C.green, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:700 }}>R$ {parseFloat(card.valor).toLocaleString("pt-BR")}</span>}
                        </div>
                        {(card.prazo||card.cliente_id)&&(
                          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                            {card.prazo&&<span style={{ fontSize:11, color:atrasado?C.red:venceHoje?C.yellow:C.muted, fontWeight:atrasado||venceHoje?700:400 }}>{atrasado?"🔴":venceHoje?"🟡":"📅"} {new Date(card.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span>}
                            {card.cliente_id&&<span style={{ fontSize:11, color:C.muted }}>👤 {nomeCliente(card.cliente_id)}</span>}
                          </div>
                        )}
                        <div style={{ display:"flex", gap:4, marginTop:8, flexWrap:"wrap" }}>
                          {KANBAN_COLS.filter(c=>c!==col).slice(0,3).map(c=>(
                            <button key={c} onClick={()=>move(card.id,c)} style={{ background:`${STATUS_DEMANDA[c].color}10`, border:`1px solid ${STATUS_DEMANDA[c].color}25`, borderRadius:5, padding:"2px 7px", color:STATUS_DEMANDA[c].color, fontSize:10, cursor:"pointer", fontWeight:600 }}>→ {STATUS_DEMANDA[c].label.split(" ")[0]}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>openNew(col)} style={{ background:`${cfg.color}08`, border:`1px dashed ${cfg.color}35`, borderRadius:9, padding:"8px", color:cfg.color, cursor:"pointer", fontSize:11, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Ico n="plus" s={11} c={cfg.color}/> Add</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Editar Demanda":"Nova Demanda"}>
        <Field label="Título" value={form.titulo} onChange={v=>setForm(f=>({...f,titulo:v}))} placeholder="Ex: Post para Instagram — Janeiro"/>
        <Field label="Descrição" value={form.descricao} onChange={v=>setForm(f=>({...f,descricao:v}))} placeholder="Detalhes..."/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Prazo" value={form.prazo} onChange={v=>setForm(f=>({...f,prazo:v}))} type="date"/>
          <Field label="Valor (R$)" value={form.valor} onChange={v=>setForm(f=>({...f,valor:v}))} type="number"/>
          <Field label="Tag/Tipo" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))} placeholder="Ex: Social, Branding"/>
          <Field label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))} options={KANBAN_COLS.map(c=>({value:c,label:STATUS_DEMANDA[c].label}))}/>
        </div>
        <Field label="Cliente (opcional)" value={form.cliente_id} onChange={v=>setForm(f=>({...f,cliente_id:v}))} options={[{value:"",label:"Nenhum"},...clientes.map(c=>({value:String(c.id),label:c.name}))]}/>
        <Btn onClick={save} full>{editId?"Salvar alterações":"Criar Demanda"}</Btn>
      </Modal>
    </div>
  );
}

function Relatorio({ leads, demandas, timerHistory, tasks, timer }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const fmtH = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); if(h===0)return `${m}min`; return m>0?`${h}h ${m}min`:`${h}h`; };
  const today = new Date().toISOString().split("T")[0];
  const moJobs = demandas.filter(d=>d.status==="finalizado"&&(d.data_criacao||"").startsWith(selMonth));
  const moReceita = moJobs.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const allHistCopy = [...timerHistory];
  const todayIdx = allHistCopy.findIndex(h=>h.date===today);
  if (timer.seconds>0) { if(todayIdx>=0) allHistCopy[todayIdx]={...allHistCopy[todayIdx],seconds:allHistCopy[todayIdx].seconds+timer.seconds}; else allHistCopy.push({date:today,seconds:timer.seconds}); }
  const moHoras = allHistCopy.filter(h=>h.date.startsWith(selMonth)).reduce((a,b)=>a+b.seconds,0);
  const moTasks = tasks.filter(t=>t.date.startsWith(selMonth));
  const faturamentoHora = moHoras>0?moReceita/Math.max(1,moHoras/3600):0;
  const moLeads = leads.filter(l=>l.date?.startsWith(selMonth));
  const [yr, mo] = selMonth.split("-").map(Number);
  const prevDate = new Date(yr,mo-2,1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
  const prevJobs = demandas.filter(d=>d.status==="finalizado"&&(d.data_criacao||"").startsWith(prevMonth));
  const prevReceita = prevJobs.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const diffPct = prevReceita>0?Math.round((moReceita-prevReceita)/prevReceita*100):null;
  const metricas = [
    { label:"Receita no mês", value:`R$ ${moReceita.toLocaleString("pt-BR")}`, sub:diffPct!==null?`${diffPct>=0?"▲":"▼"} ${Math.abs(diffPct)}% vs mês anterior`:`${moJobs.length} jobs finalizados`, accent:C.green },
    { label:"Horas trabalhadas", value:fmtH(moHoras), sub:`${allHistCopy.filter(h=>h.date.startsWith(selMonth)).length} dias ativos`, accent:C.teal },
    { label:"R$/hora faturado", value:`R$ ${faturamentoHora.toFixed(2)}`, sub:"baseado em jobs finalizados", accent:C.accent },
    { label:"Tarefas do mês", value:`${moTasks.filter(t=>t.done).length}/${moTasks.length}`, sub:`${moTasks.filter(t=>!t.done).length} ainda abertas`, accent:C.orange },
  ];
  const jobsMap = {};
  moJobs.forEach(j=>{ const tag=j.tag||"Sem categoria"; if(!jobsMap[tag])jobsMap[tag]={count:0,valor:0}; jobsMap[tag].count++; jobsMap[tag].valor+=parseFloat(j.valor)||0; });
  const jobsTags = Object.entries(jobsMap).sort((a,b)=>b[1].valor-a[1].valor);
  const diasAtivos = allHistCopy.filter(h=>h.date.startsWith(selMonth)&&h.seconds>0);
  const avgHoras = diasAtivos.length>0?fmtH(Math.round(diasAtivos.reduce((a,b)=>a+b.seconds,0)/diasAtivos.length)):"-";
  const diaRec = [...allHistCopy].filter(h=>h.date.startsWith(selMonth)).sort((a,b)=>b.seconds-a.seconds)[0];
  const clientesAtivos = [...new Set(moJobs.map(d=>d.cliente_id).filter(Boolean))];
  return (
    <div style={{ padding:"28px 32px", maxWidth:960 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
        <div><h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>📊 Relatório</h1><p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Resumo de performance mensal</p></div>
        <MonthPicker value={selMonth} onChange={setSelMonth}/>
      </div>
      <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
        {metricas.map(m=>(
          <div key={m.label} style={{ flex:1, minWidth:170, background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${m.accent},transparent)` }}/>
            <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{m.label}</div>
            <div style={{ color:m.accent, fontSize:26, fontWeight:800, fontFamily:"'Syne',sans-serif" }}>{m.value}</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{m.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>📋 Jobs finalizados em {MONTHS[mo-1]}</span>
          {moJobs.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"24px 0" }}>Nenhum job finalizado neste mês.</div>:(
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {moJobs.map(j=>{
                const cli=leads.find(l=>l.id===j.cliente_id);
                return (
                  <div key={j.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.surface, borderRadius:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{j.titulo}</div>
                      <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{cli?`👤 ${cli.name}`:""} {j.prazo?`• 📅 ${new Date(j.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}`:""}</div>
                    </div>
                    <span style={{ color:C.green, fontWeight:700, fontSize:13, flexShrink:0 }}>R$ {parseFloat(j.valor||0).toLocaleString("pt-BR")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>🏷 Receita por serviço</span>
          {jobsTags.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"24px 0" }}>Sem dados ainda.</div>:jobsTags.map(([tag,v],i)=>{
            const colors=[C.accent,C.teal,C.orange,C.pink,C.green,C.yellow], cor=colors[i%colors.length];
            const maxV=jobsTags[0][1].valor||1;
            return (<div key={tag} style={{ marginBottom:14 }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:7,height:7,borderRadius:"50%",background:cor }}/><span style={{ color:C.text,fontSize:13,fontWeight:600 }}>{tag}</span><span style={{ background:`${cor}18`,color:cor,fontSize:10,padding:"1px 7px",borderRadius:99,fontWeight:700 }}>{v.count}x</span></div><span style={{ color:C.text,fontSize:13,fontWeight:700 }}>R$ {v.valor.toLocaleString("pt-BR")}</span></div><div style={{ height:5,background:C.surface,borderRadius:99 }}><div style={{ height:"100%",width:`${Math.round(v.valor/maxV*100)}%`,background:cor,borderRadius:99,opacity:0.85 }}/></div></div>);
          })}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", marginBottom:22 }}>
        <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>⏱ Resumo de horas</span>
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {[{l:"Total no mês",v:fmtH(moHoras),c:C.accent},{l:"Dias ativos",v:`${diasAtivos.length} dias`,c:C.teal},{l:"Média por dia",v:avgHoras,c:C.green},{l:"Melhor dia",v:diaRec?fmtH(diaRec.seconds):"-",c:C.orange},{l:"Clientes atendidos",v:`${clientesAtivos.length}`,c:C.pink}].map(m=>(
            <div key={m.l} style={{ textAlign:"center" }}>
              <div style={{ color:m.c, fontWeight:800, fontSize:22, fontFamily:"'Syne',sans-serif" }}>{m.v}</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>📤 Exportar relatório</span>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={()=>{
            const txt = `RELATÓRIO — ${MONTHS[mo-1].toUpperCase()} ${yr}\n${"=".repeat(40)}\n💰 Receita: R$ ${moReceita.toLocaleString("pt-BR")}\n⏱  Horas: ${fmtH(moHoras)}\n📋 Jobs: ${moJobs.length}\n📅 Dias ativos: ${diasAtivos.length}\n💵 R$/hora: R$ ${faturamentoHora.toFixed(2)}\n\nJOBS FINALIZADOS:\n${moJobs.map(j=>`• ${j.titulo} — R$ ${parseFloat(j.valor||0).toLocaleString("pt-BR")}`).join("\n")}\n`;
            const blob = new Blob([txt], {type:"text/plain"});
            const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`relatorio-${selMonth}.txt`; a.click();
          }} style={{ background:`${C.green}18`, border:`1px solid ${C.green}30`, borderRadius:9, padding:"10px 18px", color:C.green, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>📄 Baixar .txt</button>
          <button onClick={()=>{
            const lines = [`Título,Cliente,Valor,Status,Prazo`,...moJobs.map(j=>{const cli=leads.find(l=>l.id===j.cliente_id);return `"${j.titulo}","${cli?.name||""}","${parseFloat(j.valor||0)}","${j.status}","${j.prazo||""}"`;})];
            const blob = new Blob([lines.join("\n")], {type:"text/csv"});
            const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`relatorio-${selMonth}.csv`; a.click();
          }} style={{ background:`${C.teal}18`, border:`1px solid ${C.teal}30`, borderRadius:9, padding:"10px 18px", color:C.teal, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"inherit" }}>📊 Baixar .csv</button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ open, onClose, theme, setTheme, userName, setUserName, userRole, setUserRole, userAvatar, setUserAvatar }) {
  const [name, setName] = useState(userName);
  const [role, setRole] = useState(userRole);
  const [avatar, setAvatar] = useState(userAvatar||"");
  const save = () => { setUserName(name); setUserRole(role); setUserAvatar(avatar); onClose(); };
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, backdropFilter:"blur(8px)" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:30, width:480, maxWidth:"95vw", boxShadow:"0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <span style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>⚙️ Configurações</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico n="close" s={18}/></button>
        </div>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:22 }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:avatar?`url(${avatar}) center/cover`:`linear-gradient(135deg,${C.accentGlow},${C.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:800, color:"#fff", overflow:"hidden", border:`3px solid ${C.accent}` }}>{!avatar&&name?.charAt(0)?.toUpperCase()}</div>
          </div>
        </div>
        <Field label="URL do Avatar" value={avatar} onChange={setAvatar} placeholder="https://... (opcional)"/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Seu nome" value={name} onChange={setName} placeholder="Ex: Ana Lima"/>
          <Field label="Especialidade / cargo" value={role} onChange={setRole} placeholder="Ex: Designer, Dev..."/>
        </div>
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Tema</label>
          <div style={{ display:"flex", gap:10 }}>
            {[{v:"dark",l:"🌙 Escuro"},{v:"light",l:"☀️ Claro"}].map(t=>(
              <button key={t.v} onClick={()=>setTheme(t.v)} style={{ flex:1, background:theme===t.v?`${C.accent}18`:C.surface, border:`2px solid ${theme===t.v?C.accent:C.border}`, borderRadius:11, padding:"10px", color:theme===t.v?C.accent:C.muted, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>{t.l}</button>
            ))}
          </div>
        </div>
        <Btn onClick={save} full>Salvar</Btn>
      </div>
    </div>
  );
}

function ClientesFixos({ leads, setLeads, demandas, setDemandas }) {
  const clientes = leads.filter(l=>l.categoria==="cliente_fixo");
  const [selId, setSelId] = useState(null);
  const cliente = clientes.find(c=>c.id===selId);
  const jobs = demandas.filter(d=>d.cliente_id!=null && String(d.cliente_id)===String(selId));
  const jobsFinalizados = jobs.filter(d=>d.status==="finalizado");
  const totalFaturado = jobsFinalizados.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const [modalDem, setModalDem] = useState(false);
  const [formDem, setFormDem] = useState({titulo:"",descricao:"",prazo:"",valor:"",status:"agenda",tag:""});
  const [editDemId, setEditDemId] = useState(null);
  const saveDem = () => {
    if (!formDem.titulo) return;
    const d = {...formDem, valor:parseFloat(formDem.valor)||0, cliente_id:Number(selId), data_criacao:new Date().toISOString().split("T")[0]};
    if (editDemId) setDemandas(ds=>ds.map(x=>x.id===editDemId?{...x,...d}:x));
    else setDemandas(ds=>[...ds,{...d,id:Date.now()}]);
    setModalDem(false);
    setFormDem({titulo:"",descricao:"",prazo:"",valor:"",status:"agenda",tag:""});
    setEditDemId(null);
  };
  const delDem = id => {
    if(!window.confirm("Excluir demanda?")) return;
    const dem = demandas.find(d=>d.id===id);
    setDemandas(ds=>ds.filter(d=>d.id!==id));
    if (dem?.solicitacao_id) {
      supabase.from("solicitacoes").delete().eq("id", Number(dem.solicitacao_id));
      const kanbanMap = JSON.parse(localStorage.getItem("dh_solic_kanban")||"{}");
      delete kanbanMap[String(dem.solicitacao_id)];
      localStorage.setItem("dh_solic_kanban", JSON.stringify(kanbanMap));
    }
  };
  const moveDem = (id, status) => {
    const dem = demandas.find(d=>d.id===id);
    setDemandas(ds=>ds.map(d=>d.id===id?{...d,status}:d));
    if (dem?.solicitacao_id) supabase.from("solicitacoes").update({ status }).eq("id", Number(dem.solicitacao_id));
  };
  const openEditDem = d => { setFormDem({titulo:d.titulo,descricao:d.descricao||"",prazo:d.prazo||"",valor:String(d.valor||""),status:d.status,tag:d.tag||""}); setEditDemId(d.id); setModalDem(true); };
  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
        <div><h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>⭐ Clientes Ativos</h1><p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>{clientes.length} clientes com recorrência</p></div>
      </div>
      {clientes.length===0&&<div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:40, textAlign:"center" }}><div style={{ color:C.muted, fontSize:36, marginBottom:14 }}>⭐</div><div style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:8 }}>Nenhum cliente ativo ainda</div><div style={{ color:C.muted, fontSize:13 }}>Converta leads em clientes ativos no CRM.</div></div>}
      {!selId ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
          {clientes.map(c=>{
            const cJobs = demandas.filter(d=>String(d.cliente_id)===String(c.id));
            const cFin = cJobs.filter(d=>d.status==="finalizado");
            const cTotal = cFin.reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
            const emAndamento = cJobs.filter(d=>!["finalizado"].includes(d.status)).length;
            return (
              <div key={c.id} onClick={()=>setSelId(c.id)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 22px", cursor:"pointer", transition:"all 0.15s" }} onMouseEnter={e=>{e.currentTarget.style.background=C.cardHover;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={e=>{e.currentTarget.style.background=C.card;e.currentTarget.style.transform="none";}}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:`linear-gradient(135deg,${C.accentGlow}40,${C.teal}40)`, display:"flex", alignItems:"center", justifyContent:"center", color:C.teal, fontWeight:800, fontSize:20 }}>{c.name.charAt(0)}</div>
                  <div><div style={{ color:C.text, fontWeight:700, fontSize:15 }}>{c.name}</div><div style={{ color:C.muted, fontSize:12 }}>{c.company}</div></div>
                </div>
                {c.briefing_padrao&&<div style={{ background:`${C.teal}10`, border:`1px solid ${C.teal}25`, borderRadius:9, padding:"8px 12px", marginBottom:12 }}><div style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:3 }}>📋 Briefing</div><div style={{ color:C.teal, fontSize:12, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{c.briefing_padrao}</div></div>}
                <div style={{ display:"flex", gap:10 }}>
                  <div style={{ flex:1, textAlign:"center", background:C.surface, borderRadius:9, padding:"8px" }}><div style={{ color:C.green, fontWeight:800, fontSize:15 }}>R$ {cTotal.toLocaleString("pt-BR")}</div><div style={{ color:C.muted, fontSize:10 }}>faturado</div></div>
                  <div style={{ flex:1, textAlign:"center", background:C.surface, borderRadius:9, padding:"8px" }}><div style={{ color:C.accent, fontWeight:800, fontSize:15 }}>{emAndamento}</div><div style={{ color:C.muted, fontSize:10 }}>em andamento</div></div>
                  <div style={{ flex:1, textAlign:"center", background:C.surface, borderRadius:9, padding:"8px" }}><div style={{ color:C.teal, fontWeight:800, fontSize:15 }}>{cFin.length}</div><div style={{ color:C.muted, fontSize:10 }}>finalizados</div></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : cliente ? (
        <div>
          <button onClick={()=>setSelId(null)} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"8px 16px", color:C.muted, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:8, marginBottom:20, fontFamily:"inherit" }}><Ico n="chevL" s={14} c={C.muted}/> Voltar</button>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"22px 26px", marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{ width:54, height:54, borderRadius:15, background:`linear-gradient(135deg,${C.accentGlow}40,${C.teal}40)`, display:"flex", alignItems:"center", justifyContent:"center", color:C.teal, fontWeight:800, fontSize:24 }}>{cliente.name.charAt(0)}</div>
                <div><div style={{ color:C.text, fontWeight:800, fontSize:18 }}>{cliente.name}</div><div style={{ color:C.muted, fontSize:13 }}>{cliente.company} · {cliente.email}</div>{cliente.telefone&&<div style={{ color:C.muted, fontSize:12, marginTop:2 }}>📱 {cliente.telefone}</div>}</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                {[{l:"Jobs",v:jobs.length,c:C.accent},{l:"Finalizados",v:jobsFinalizados.length,c:C.green},{l:"Total",v:`R$ ${totalFaturado.toLocaleString("pt-BR")}`,c:C.teal}].map(m=>(
                  <div key={m.l} style={{ textAlign:"center", background:C.surface, borderRadius:12, padding:"10px 16px" }}>
                    <div style={{ color:m.c, fontWeight:800, fontSize:18, fontFamily:"'Syne',sans-serif" }}>{m.v}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {cliente.briefing_padrao&&(
              <div style={{ background:`${C.teal}10`, border:`1px solid ${C.teal}25`, borderRadius:12, padding:"14px 18px", marginTop:16 }}>
                <div style={{ color:C.teal, fontWeight:700, fontSize:12, marginBottom:6 }}>📋 Briefing da Marca</div>
                <div style={{ color:C.text, fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{cliente.briefing_padrao}</div>
              </div>
            )}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ color:C.text, fontWeight:700, fontSize:16 }}>Demandas de {cliente.name}</span>
            <Btn onClick={()=>{setFormDem({titulo:"",descricao:"",prazo:"",valor:"",status:"agenda",tag:""});setEditDemId(null);setModalDem(true);}} small><Ico n="plus" s={13} c="#fff"/> Nova Demanda</Btn>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {jobs.length===0&&<div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:28, textAlign:"center", color:C.muted }}>Nenhuma demanda ainda.</div>}
            {jobs.map(d=>{
              const cfg=STATUS_DEMANDA[d.status]||STATUS_DEMANDA.agenda;
              const today=new Date().toISOString().split("T")[0];
              const atrasado=d.prazo&&d.prazo<today&&d.status!=="finalizado";
              return (
                <div key={d.id} style={{ background:C.card, border:`1px solid ${atrasado?C.red+"40":C.border}`, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", gap:12, borderLeft:`3px solid ${cfg.color}` }}>
                  <span style={{ fontSize:15 }}>{cfg.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontWeight:700, fontSize:13 }}>{d.titulo}</div>
                    <div style={{ display:"flex", gap:8, marginTop:4, flexWrap:"wrap" }}>
                      <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:700 }}>{cfg.label}</span>
                      {d.tag&&<span style={{ background:`${C.teal}15`, color:C.teal, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{d.tag}</span>}
                      {d.prazo&&<span style={{ color:atrasado?C.red:C.muted, fontSize:11 }}>📅 {new Date(d.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</span>}
                      {d.valor>0&&<span style={{ color:C.green, fontSize:11, fontWeight:700 }}>R$ {parseFloat(d.valor).toLocaleString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {KANBAN_COLS.filter(c=>c!==d.status).slice(0,2).map(c=>(
                      <button key={c} onClick={()=>moveDem(d.id,c)} style={{ background:`${STATUS_DEMANDA[c].color}10`, border:`1px solid ${STATUS_DEMANDA[c].color}25`, borderRadius:6, padding:"3px 8px", color:STATUS_DEMANDA[c].color, fontSize:10, cursor:"pointer", fontWeight:700 }}>→ {STATUS_DEMANDA[c].label.split(" ")[0]}</button>
                    ))}
                    <button onClick={()=>openEditDem(d)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:2 }}><Ico n="edit" s={13}/></button>
                    <button onClick={()=>delDem(d.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.red, padding:2 }}><Ico n="trash" s={13}/></button>
                  </div>
                </div>
              );
            })}
          </div>
          <Modal open={modalDem} onClose={()=>setModalDem(false)} title={editDemId?"Editar Demanda":"Nova Demanda"}>
            <Field label="Título" value={formDem.titulo} onChange={v=>setFormDem(f=>({...f,titulo:v}))} placeholder="Ex: Criação de post para Reels"/>
            <Field label="Descrição" value={formDem.descricao} onChange={v=>setFormDem(f=>({...f,descricao:v}))} placeholder="Detalhes..."/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
              <Field label="Prazo" value={formDem.prazo} onChange={v=>setFormDem(f=>({...f,prazo:v}))} type="date"/>
              <Field label="Valor (R$)" value={formDem.valor} onChange={v=>setFormDem(f=>({...f,valor:v}))} type="number"/>
              <Field label="Tag/Tipo" value={formDem.tag} onChange={v=>setFormDem(f=>({...f,tag:v}))} placeholder="Ex: Social, Branding"/>
              <Field label="Status" value={formDem.status} onChange={v=>setFormDem(f=>({...f,status:v}))} options={KANBAN_COLS.map(c=>({value:c,label:STATUS_DEMANDA[c].label}))}/>
            </div>
            <Btn onClick={saveDem} full>{editDemId?"Salvar":"Criar Demanda"}</Btn>
          </Modal>
        </div>
      ) : null}
    </div>
  );
}

function FormularioPedido({ leads }) {
  const clientes = leads.filter(l=>l.categoria==="cliente_fixo");
  const [selCli, setSelCli] = useState("");
  const [copiado, setCopiado] = useState(null);
  const cliente = clientes.find(c=>String(c.id)===selCli);

  function copiar(txt, key) {
    navigator.clipboard.writeText(txt);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 2000);
  }

  const base = window.location.origin;
  const linkSolicitar = cliente ? `${base}?solicitar=${cliente.id}&nome=${encodeURIComponent(cliente.name)}` : "";
  const linkPortal    = cliente ? `${base}?portal=${cliente.id}&nome=${encodeURIComponent(cliente.name)}` : "";

  // briefing state (mantido para uso interno)
  const [showBriefing, setShowBriefing] = useState(false);
  const [form, setForm] = useState({ tipo:"", descricao:"", prazo:"", referencias:"", observacoes:"" });
  const [briefLink, setBriefLink] = useState("");
  const [enviado, setEnviado] = useState(false);
  const genLink = () => {
    const base64 = btoa(JSON.stringify({clienteId:selCli, clienteNome:cliente?.name||"", ...form, criadoEm:new Date().toISOString()}));
    setBriefLink(`${base}?pedido=${base64}`);
    setEnviado(true);
  };
  const LinkBox = ({ label, desc, icon, url, colorKey }) => {
    const key = label;
    return (
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <span style={{ fontSize:20 }}>{icon}</span>
          <div>
            <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{label}</div>
            <div style={{ color:C.muted, fontSize:12 }}>{desc}</div>
          </div>
        </div>
        {cliente ? (
          <div style={{ marginTop:12 }}>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 13px", fontSize:11, color:C.teal, wordBreak:"break-all", marginBottom:10 }}>{url}</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => copiar(url, key)}
                style={{ background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:8, padding:"7px 16px", color:copiado===key?C.green:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>
                {copiado===key ? "✓ Copiado!" : "📋 Copiar link"}
              </button>
              <button onClick={() => window.open(url, "_blank")}
                style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"7px 14px", color:C.muted, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"inherit" }}>
                👁 Visualizar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color:C.muted, fontSize:12, marginTop:8, fontStyle:"italic" }}>Selecione um cliente para gerar o link</div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding:"28px 32px", maxWidth:720 }}>
      <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:"0 0 6px" }}>🔗 Links do Cliente</h1>
      <p style={{ color:C.muted, fontSize:13, marginBottom:22 }}>Gere links personalizados por cliente para solicitar demandas e acompanhar o andamento.</p>

      <div style={{ marginBottom:22 }}>
        <Field label="Cliente" value={selCli} onChange={v=>{setSelCli(v);setEnviado(false);}} options={[{value:"",label:"Selecionar cliente..."},...clientes.map(c=>({value:String(c.id),label:c.name}))]}/>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:28 }}>
        <LinkBox
          icon="📝"
          label="Link para solicitar demanda"
          desc="O cliente abre este link, preenche o que precisa e envia. Você recebe no portal."
          url={linkSolicitar}
        />
        <LinkBox
          icon="🌐"
          label="Link do portal do cliente"
          desc="O cliente vê o status de todas as solicitações dele e pode enviar novas."
          url={linkPortal}
        />
      </div>

      {/* Ferramenta de briefing (uso interno) */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
        <button onClick={()=>setShowBriefing(b=>!b)}
          style={{ width:"100%", background:"none", border:"none", padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", fontFamily:"inherit" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:18 }}>📋</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>Gerar briefing de aprovação</div>
              <div style={{ color:C.muted, fontSize:12 }}>Você preenche o briefing e envia para o cliente confirmar (uso interno)</div>
            </div>
          </div>
          <span style={{ color:C.muted, fontSize:18 }}>{showBriefing?"▲":"▼"}</span>
        </button>
        {showBriefing && (
          <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${C.border}` }}>
            {!enviado ? (
              <div style={{ paddingTop:18 }}>
                {cliente?.briefing_padrao&&<div style={{ background:`${C.teal}10`, border:`1px solid ${C.teal}25`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}><div style={{ color:C.teal, fontSize:11, fontWeight:700, marginBottom:4 }}>📋 Briefing da marca pré-carregado</div><div style={{ color:C.muted, fontSize:12, lineHeight:1.6 }}>{cliente.briefing_padrao.substring(0,120)}{cliente.briefing_padrao.length>120?"...":""}</div></div>}
                <Field label="Tipo de projeto" value={form.tipo} onChange={v=>setForm(f=>({...f,tipo:v}))} placeholder="Ex: Post Instagram, Identidade Visual..."/>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Descrição do pedido</label>
                  <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="O que precisa ser criado?" rows={3} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
                  <Field label="Prazo desejado" value={form.prazo} onChange={v=>setForm(f=>({...f,prazo:v}))} type="date"/>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Referências</label>
                  <textarea value={form.referencias} onChange={e=>setForm(f=>({...f,referencias:e.target.value}))} placeholder="Links de referência..." rows={2} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Observações</label>
                  <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Qualquer detalhe extra..." rows={2} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 13px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
                </div>
                <Btn onClick={genLink} full disabled={!selCli}>📤 Gerar link de aprovação</Btn>
              </div>
            ) : (
              <div style={{ paddingTop:18, textAlign:"center" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                <div style={{ color:C.green, fontWeight:700, fontSize:16, marginBottom:8 }}>Link de aprovação gerado!</div>
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 14px", fontSize:11, color:C.teal, wordBreak:"break-all", marginBottom:12, textAlign:"left" }}>{briefLink}</div>
                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  <button onClick={()=>navigator.clipboard.writeText(briefLink)} style={{ background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:9, padding:"9px 18px", color:C.accent, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:"inherit" }}>📋 Copiar</button>
                  <button onClick={()=>setEnviado(false)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 16px", color:C.muted, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>← Novo</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AprovarPage() {
  const [aprovado, setAprovado] = useState(false);
  const [obs, setObs] = useState("");
  const params = new URLSearchParams(window.location.search);
  const data = params.get("pedido");
  if (!data) return <div style={{ padding:40, color:C.muted }}>Nenhum pedido encontrado nesta URL.</div>;
  let pedido;
  try { pedido = JSON.parse(atob(data)); } catch(e) { return <div style={{ padding:40, color:C.red }}>Erro ao decodificar pedido.</div>; }
  if (aprovado) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:70, marginBottom:20 }}>✅</div>
        <div style={{ color:C.green, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, marginBottom:8 }}>Pedido aprovado!</div>
        <div style={{ color:C.muted, fontSize:14 }}>Obrigado, {pedido.clienteNome}! Entraremos em contato em breve.</div>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"40px 20px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26 }}>Revisão de Pedido</div>
          <div style={{ color:C.muted, fontSize:14, marginTop:6 }}>Olá, {pedido.clienteNome}! Confirme os detalhes abaixo.</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 28px", marginBottom:20 }}>
          {[["Tipo",pedido.tipo],["Descrição",pedido.descricao],["Prazo",pedido.prazo],["Referências",pedido.referencias],["Observações",pedido.observacoes]].map(([k,v])=>v&&(
            <div key={k} style={{ marginBottom:14 }}>
              <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{k}</div>
              <div style={{ color:C.text, fontSize:13, lineHeight:1.6 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", color:C.muted, fontSize:12, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Alguma observação adicional?</label>
          <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Opcional..." rows={3} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical" }}/>
        </div>
        <button onClick={()=>setAprovado(true)} style={{ width:"100%", background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:12, padding:"16px", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", boxShadow:`0 6px 24px ${C.accentGlow}50` }}>✅ Aprovar pedido</button>
      </div>
    </div>
  );
}

function PortalCliente({ leads, setDemandas }) {
  const clientes = leads.filter(l=>l.categoria==="cliente_fixo");
  const [selCli, setSelCli] = useState("");
  const [solic, setSolic] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [resposta, setResposta] = useState("");
  const [novoStatus, setNovoStatus] = useState("");
  const [kanbanIds, setKanbanIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_solic_kanban") || "{}"); } catch { return {}; }
  });

  // Lê demandas do localStorage e sincroniza status das solicitações vinculadas
  function syncKanbanToSupabase() {
    const demandas = JSON.parse(localStorage.getItem("dh_demandas") || "[]");
    const kanbanMap = JSON.parse(localStorage.getItem("dh_solic_kanban") || "{}");
    let count = 0;
    Object.entries(kanbanMap).forEach(([solicId, demandaId]) => {
      const demanda = demandas.find(d=>String(d.id)===String(demandaId));
      if (demanda) {
        supabase.from("solicitacoes").update({ status: demanda.status }).eq("id", Number(solicId));
        count++;
      }
    });
    alert(`✅ ${count} solicitação(ões) sincronizada(s) com o Kanban.`);
    if (selCli) {
      supabase.from("solicitacoes").select("*").eq("cliente_id", selCli).order("created_at", { ascending:false })
        .then(({ data }) => setSolic(data || []));
    }
  }
  const cliente = clientes.find(c=>String(c.id)===selCli);

  useEffect(() => {
    if (!selCli) return;
    setLoading(true);
    supabase.from("solicitacoes").select("*").eq("cliente_id", selCli).order("created_at", { ascending:false })
      .then(({ data }) => { setSolic(data || []); setLoading(false); });
  }, [selCli]);

  async function salvarResposta(id) {
    await supabase.from("solicitacoes").update({ status:novoStatus, resposta_designer:resposta }).eq("id", id);
    // Se moveu para aprovacao, também reflete no kanban
    if (novoStatus === "aprovacao" && kanbanIds[id]) {
      const demLocal = JSON.parse(localStorage.getItem("dh_demandas") || "[]");
      const updated = demLocal.map(d => d.id === kanbanIds[id] ? {...d, status:"aprovacao"} : d);
      localStorage.setItem("dh_demandas", JSON.stringify(updated));
      setDemandas(updated);
    }
    setSolic(prev => prev.map(s => s.id===id ? {...s, status:novoStatus, resposta_designer:resposta} : s));
    setEditId(null);
  }

  function addToKanban(s) {
    const newId = Date.now();
    const demanda = {
      id: newId,
      titulo: s.tipo || "Solicitação do cliente",
      descricao: [s.descricao, s.referencias && ("Refs: "+s.referencias), s.observacoes && ("Obs: "+s.observacoes)].filter(Boolean).join(" | "),
      prazo: s.prazo || "",
      valor: 0,
      status: "triagem",
      cliente_id: Number(s.cliente_id) || null,
      tag: s.tipo || "Solicitação",
      solicitacao_id: s.id,
      data_criacao: new Date().toISOString().split("T")[0],
    };
    setDemandas(prev => [...prev, demanda]);
    // Registra o vínculo
    const updated = {...kanbanIds, [s.id]: newId};
    setKanbanIds(updated);
    localStorage.setItem("dh_solic_kanban", JSON.stringify(updated));
    // Atualiza status da solicitação
    supabase.from("solicitacoes").update({ status:"triagem" }).eq("id", String(s.id));
    setSolic(prev => prev.map(x => x.id===s.id ? {...x, status:"triagem"} : x));
    alert(`✅ Adicionado ao Kanban em Triagem!`);
  }

  const STATUS_CFG = {
    pendente:     { label:"Aguardando",    color:"#f59e0b", icon:"⏳" },
    triagem:      { label:"Triagem",       color:"#94a3b8", icon:"📥" },
    agenda:       { label:"Agenda",        color:"#818cf8", icon:"📆" },
    em_criacao:   { label:"Em criação",    color:"#a78bfa", icon:"✏️"  },
    revisao:      { label:"Em revisão",    color:"#38bdf8", icon:"🔍" },
    aprovacao:    { label:"Aprovação",     color:"#fb923c", icon:"👀" },
    ajustes:      { label:"Ajustes",       color:"#ef4444", icon:"🔄" },
    finalizado:   { label:"Finalizado",    color:"#10b981", icon:"✅" },
    cancelado:    { label:"Cancelado",     color:"#64748b", icon:"❌" },
  };
  const statusOpts = Object.entries(STATUS_CFG).map(([v,c])=>({value:v, label:`${c.icon} ${c.label}`}));

  return (
    <div style={{ padding:"28px 32px", maxWidth:820 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:"0 0 4px" }}>📬 Solicitações dos Clientes</h1>
          <p style={{ color:C.muted, fontSize:13, margin:0 }}>Receba, gerencie e mande para o Kanban. O status do Kanban aparece no portal do cliente.</p>
        </div>
        <button onClick={syncKanbanToSupabase}
          style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"8px 14px", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", marginTop:4 }}>
          🔄 Sincronizar status com Kanban
        </button>
      </div>
      <div style={{ marginBottom:22 }}/>

      <Field label="Cliente" value={selCli} onChange={setSelCli} options={[{value:"",label:"Selecionar cliente..."},...clientes.map(c=>({value:String(c.id),label:c.name}))]}/>

      {selCli && loading && <div style={{ color:C.muted, fontSize:13, padding:20 }}>Carregando...</div>}

      {selCli && !loading && solic.length === 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:30, textAlign:"center", color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
          <div>Nenhuma solicitação deste cliente ainda.</div>
          <div style={{ fontSize:12, marginTop:6 }}>Compartilhe o link em "Links do Cliente" para que ele possa enviar.</div>
        </div>
      )}

      {solic.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:8 }}>
          {solic.map(s => {
            const cfg = STATUS_CFG[s.status] || STATUS_CFG.pendente;
            const open = editId === s.id;
            const jaNoKanban = !!kanbanIds[s.id];
            return (
              <div key={s.id} style={{ background:C.card, border:`1px solid ${open?C.accent:C.border}`, borderRadius:14, padding:"16px 20px", transition:"border-color .15s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <div>
                    <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{s.tipo || "Solicitação"}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{new Date(s.created_at).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})} · {s.cliente_nome}</div>
                  </div>
                  <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap" }}>{cfg.icon} {cfg.label}</span>
                </div>
                {s.descricao   && <div style={{ color:C.muted, fontSize:13, lineHeight:1.6, marginBottom:4 }}>{s.descricao}</div>}
                {s.prazo       && <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>📅 Prazo: {new Date(s.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}</div>}
                {s.referencias && <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>🔗 {s.referencias}</div>}
                {s.resposta_designer && !open && (
                  <div style={{ background:`${C.accent}0d`, border:`1px solid ${C.accent}25`, borderRadius:9, padding:"8px 12px", marginTop:8, fontSize:12, color:C.accent }}>💬 {s.resposta_designer}</div>
                )}
                {!open && (
                  <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
                    {!jaNoKanban && s.status === "pendente" && (
                      <button onClick={()=>addToKanban(s)}
                        style={{ background:`${C.teal}18`, border:`1px solid ${C.teal}30`, borderRadius:8, padding:"6px 14px", color:C.teal, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        📥 Mandar para Kanban (Triagem)
                      </button>
                    )}
                    {jaNoKanban && <span style={{ color:C.teal, fontSize:12, fontWeight:600 }}>✓ No Kanban</span>}
                    <button onClick={()=>{setEditId(s.id);setResposta(s.resposta_designer||"");setNovoStatus(s.status);}}
                      style={{ background:`${C.accent}18`, border:`1px solid ${C.accent}30`, borderRadius:8, padding:"6px 14px", color:C.accent, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      ✏️ Responder / Status
                    </button>
                  </div>
                )}
                {open && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
                    <Field label="Novo status" value={novoStatus} onChange={setNovoStatus} options={statusOpts}/>
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", color:C.muted, fontSize:11, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.08em" }}>Resposta para o cliente</label>
                      <textarea value={resposta} onChange={e=>setResposta(e.target.value)} placeholder="O cliente verá esta mensagem no portal. Se marcar Aprovação, ele poderá confirmar ou pedir ajustes." rows={3} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"9px 12px", color:C.text, fontSize:13, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}/>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={()=>salvarResposta(s.id)} style={{ background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:8, padding:"8px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💾 Salvar</button>
                      <button onClick={()=>setEditId(null)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 14px", color:C.muted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [user, setUser] = useState(""); const [pwd, setPwd] = useState(""); const [err, setErr] = useState("");
  const tryLogin = () => {
    if ((user.toLowerCase()==="admin"||user.toLowerCase()==="designer")&&pwd==="123456") { onLogin(user); }
    else setErr("Usuário ou senha incorretos.");
  };
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:22, padding:"44px 42px", width:380, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:34 }}>
          <div style={{ width:56, height:56, borderRadius:18, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:`0 6px 20px ${C.accentGlow}50` }}><span style={{ fontSize:26 }}>✦</span></div>
          <div style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24 }}>FluxioHUB</div>
          <div style={{ color:C.muted, fontSize:13, marginTop:5 }}>Acesse sua conta</div>
        </div>
        <Field label="Usuário" value={user} onChange={setUser} placeholder="admin"/>
        <Field label="Senha" value={pwd} onChange={setPwd} type="password" placeholder="••••••"/>
        {err&&<div style={{ color:C.red, fontSize:12, marginBottom:14, textAlign:"center" }}>{err}</div>}
        <button onClick={tryLogin} style={{ width:"100%", background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:11, padding:"14px", color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", letterSpacing:"0.04em", boxShadow:`0 4px 20px ${C.accentGlow}50`, marginBottom:16 }}>Entrar</button>
        <div style={{ textAlign:"center", color:C.muted, fontSize:11, marginBottom:10 }}>Demo: admin / 123456</div>
        <button onClick={()=>{ if(window.confirm("Limpar todos os dados locais e reiniciar? (dados no Supabase ficam intactos)")){localStorage.clear();window.location.reload();}}}
          style={{ width:"100%", background:"none", border:`1px solid ${C.border}`, borderRadius:9, padding:"8px", color:C.muted, fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
          🗑 Limpar cache local (se app travar)
        </button>
      </div>
    </div>
  );
}

// ─── Página pública: cliente solicita demanda ──────────────────────────────
function SolicitarPage() {
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("solicitar");
  const clienteNome = params.get("nome") || "Cliente";
  const [form, setForm] = useState({ tipo:"", descricao:"", prazo:"", referencias:"", observacoes:"" });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const bg = "#080810";

  async function enviar() {
    if (!form.descricao.trim()) return;
    setLoading(true);
    try {
      await supabase.from("solicitacoes").insert([{
        id: Date.now(),
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        ...form,
        status: "pendente",
        created_at: new Date().toISOString(),
      }]);
      setEnviado(true);
    } catch(e) {
      alert("Erro ao enviar. Tente novamente.");
    }
    setLoading(false);
  }

  const inp = { background:"#13131f", border:"1px solid #1e1e35", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; } body { margin:0; background:${bg}; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:"1px solid #1e1e35", padding:"16px 28px", background:"#10101e", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:"linear-gradient(135deg,#6d28d9,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>✦</div>
        <div style={{ color:"#e8e6f0", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16 }}>Nova Solicitação</div>
      </div>

      {enviado ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 65px)", padding:20 }}>
          <div style={{ textAlign:"center", maxWidth:420 }}>
            <div style={{ fontSize:70, marginBottom:20 }}>✅</div>
            <div style={{ color:"#a78bfa", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:26, marginBottom:12 }}>Enviado com sucesso!</div>
            <div style={{ color:"#5a5a7a", fontSize:14, lineHeight:1.8 }}>
              Sua solicitação foi recebida.<br/>Acompanhe o andamento pelo portal do cliente.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:580, margin:"0 auto", padding:"32px 24px" }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ color:"#e8e6f0", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>
              Olá, {clienteNome}!
            </div>
            <div style={{ color:"#5a5a7a", fontSize:13 }}>Preencha os detalhes do que você precisa e envie. Simples assim.</div>
          </div>

          <div style={{ background:"#10101e", border:"1px solid #1e1e35", borderRadius:18, padding:"24px 24px" }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Tipo de projeto</div>
              <input value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} placeholder="Ex: Post Instagram, Logotipo, Banner..." style={inp}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Descrição *</div>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="O que precisa ser criado? Qual o objetivo, público-alvo, cores preferidas..." rows={4} style={{...inp, resize:"vertical", lineHeight:1.6}}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Prazo desejado</div>
              <input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))} style={inp}/>
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Referências</div>
              <textarea value={form.referencias} onChange={e=>setForm(f=>({...f,referencias:e.target.value}))} placeholder="Links, Pinterest, exemplos que você gostou..." rows={2} style={{...inp, resize:"vertical", lineHeight:1.6}}/>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.07em" }}>Observações adicionais</div>
              <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} placeholder="Qualquer detalhe extra..." rows={2} style={{...inp, resize:"vertical", lineHeight:1.6}}/>
            </div>
            <button onClick={enviar} disabled={!form.descricao.trim() || loading}
              style={{ width:"100%", background:(!form.descricao.trim()||loading)?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:11, padding:"14px", color:(!form.descricao.trim()||loading)?"#3a3a5a":"#fff", fontSize:15, fontWeight:800, cursor:(!form.descricao.trim()||loading)?"not-allowed":"pointer", fontFamily:"'Syne',sans-serif", transition:"all .15s" }}>
              {loading ? "Enviando..." : "📤 Enviar solicitação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página pública: portal do cliente ────────────────────────────────────────
function PortalPublicoPage() {
  const params = new URLSearchParams(window.location.search);
  const clienteId = params.get("portal");
  const clienteNome = params.get("nome") || "Cliente";
  const [solic, setSolic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [acao, setAcao] = useState({}); // { [id]: "aprovando"|"ajustando" }
  const [ajusteText, setAjusteText] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("solicitacoes").select("*").eq("cliente_id", clienteId).order("created_at", { ascending:false });
        setSolic(data || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function aprovar(id) {
    await supabase.from("solicitacoes").update({ status:"finalizado", resposta_designer: solic.find(s=>s.id===id)?.resposta_designer || "" }).eq("id", id);
    setSolic(prev => prev.map(s => s.id===id ? {...s, status:"finalizado"} : s));
    setAcao(a => ({...a, [id]:null}));
  }

  async function pedirAjuste(id) {
    const obs = ajusteText[id] || "";
    const msg = `[Ajuste solicitado pelo cliente]: ${obs}`;
    await supabase.from("solicitacoes").update({ status:"ajustes", resposta_designer: msg }).eq("id", id);
    setSolic(prev => prev.map(s => s.id===id ? {...s, status:"ajustes", resposta_designer:msg} : s));
    setAcao(a => ({...a, [id]:null}));
    setAjusteText(t => ({...t, [id]:""}));
  }

  const STATUS_CFG = {
    triagem:      { label:"Em triagem",           color:"#94a3b8", icon:"📥", desc:"Solicitação recebida e em análise inicial." },
    agenda:       { label:"Na agenda",            color:"#818cf8", icon:"📆", desc:"Agendado para produção em breve." },
    em_criacao:   { label:"Em criação",           color:"#a78bfa", icon:"✏️",  desc:"O designer está criando agora." },
    revisao:      { label:"Em revisão",           color:"#38bdf8", icon:"🔍", desc:"Quase pronto — passando por revisão final." },
    aprovacao:    { label:"Aguarda sua aprovação",color:"#fb923c", icon:"👀", desc:"Pronto! Revise e aprove ou solicite ajustes." },
    ajustes:      { label:"Ajustes em andamento", color:"#ef4444", icon:"🔄", desc:"O designer recebeu seu feedback e está ajustando." },
    finalizado:   { label:"Finalizado ✓",         color:"#10b981", icon:"✅", desc:"Projeto concluído e aprovado." },
    pendente:     { label:"Aguardando",           color:"#f59e0b", icon:"⏳", desc:"Sua solicitação foi recebida." },
    cancelado:    { label:"Cancelado",            color:"#64748b", icon:"❌", desc:"" },
  };

  const total = solic.length;
  const finalizados = solic.filter(s=>s.status==="finalizado").length;
  const emAndamento = solic.filter(s=>!["finalizado","cancelado"].includes(s.status)).length;
  const aguardando  = solic.filter(s=>s.status==="aprovacao").length;

  const bg = "#080810";
  const card = "#10101e";
  const border = "#1e1e35";

  return (
    <div style={{ minHeight:"100vh", background:bg, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        body { margin:0; background:${bg}; }
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${bg}; } ::-webkit-scrollbar-thumb { background:#2a2a45; border-radius:3px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:`1px solid ${border}`, padding:"18px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", background:card }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#6d28d9,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>✦</div>
          <div>
            <div style={{ color:"#e8e6f0", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, lineHeight:1 }}>Meu Portal</div>
            <div style={{ color:"#5a5a7a", fontSize:12, marginTop:2 }}>Olá, {clienteNome} 👋</div>
          </div>
        </div>
        <button onClick={()=>setShowForm(f=>!f)}
          style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:10, padding:"9px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 16px #6d28d940" }}>
          + Nova solicitação
        </button>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 24px" }}>

        {/* Stats cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:28 }}>
          {[
            { label:"Total de pedidos", value:total,       color:"#818cf8", icon:"📋" },
            { label:"Em andamento",     value:emAndamento, color:"#06b6d4", icon:"⚙️" },
            { label:"Aguardando você",  value:aguardando,  color:"#fb923c", icon:"👀" },
          ].map(s => (
            <div key={s.label} style={{ background:card, border:`1px solid ${aguardando>0&&s.icon==="👀"?"#fb923c50":border}`, borderRadius:14, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${s.color},transparent)` }}/>
              <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
              <div style={{ color:s.color, fontSize:28, fontWeight:800, fontFamily:"'Syne',sans-serif", lineHeight:1 }}>{s.value}</div>
              <div style={{ color:"#5a5a7a", fontSize:11, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Form nova solicitação */}
        {showForm && (
          <div style={{ background:card, border:"1px solid #6366f130", borderRadius:16, padding:24, marginBottom:24 }}>
            <SolicitarFormInline clienteId={clienteId} clienteNome={clienteNome} onEnviado={()=>{setShowForm(false);window.location.reload();}}/>
          </div>
        )}

        {/* Alerta de aprovação pendente */}
        {aguardando > 0 && (
          <div style={{ background:"#fb923c12", border:"1px solid #fb923c40", borderRadius:14, padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24 }}>👀</span>
            <div>
              <div style={{ color:"#fb923c", fontWeight:700, fontSize:14 }}>{aguardando} projeto{aguardando>1?"s":""} aguardando sua aprovação!</div>
              <div style={{ color:"#fb923c88", fontSize:12 }}>Role a página para revisar e aprovar ou solicitar ajustes.</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:"center", padding:80, color:"#5a5a7a" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando seus projetos...
          </div>
        ) : solic.length === 0 ? (
          <div style={{ textAlign:"center", padding:80, color:"#3a3a5a" }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📭</div>
            <div style={{ fontSize:16, color:"#5a5a7a", marginBottom:6 }}>Nenhuma solicitação ainda</div>
            <div style={{ fontSize:13, color:"#3a3a5a" }}>Clique em "+ Nova solicitação" para começar.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ color:"#5a5a7a", fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Suas solicitações</div>
            {solic.map(s => {
              const cfg = STATUS_CFG[s.status] || STATUS_CFG.pendente;
              const isAprovacao = s.status === "aprovacao";
              const acaoAtual = acao[s.id];

              return (
                <div key={s.id} style={{ background:card, border:`1px solid ${isAprovacao?"#fb923c50":border}`, borderRadius:16, padding:"20px 22px", boxShadow:isAprovacao?"0 0 0 1px #fb923c20":undefined }}>
                  {/* Topo */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div>
                      <div style={{ color:"#e8e6f0", fontWeight:700, fontSize:15 }}>{s.tipo || "Solicitação"}</div>
                      <div style={{ color:"#5a5a7a", fontSize:11, marginTop:3 }}>{new Date(s.created_at).toLocaleDateString("pt-BR",{day:"numeric",month:"long",year:"numeric"})}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, whiteSpace:"nowrap", display:"inline-block" }}>{cfg.icon} {cfg.label}</span>
                      {cfg.desc && <div style={{ color:"#5a5a7a", fontSize:11, marginTop:4, maxWidth:200 }}>{cfg.desc}</div>}
                    </div>
                  </div>

                  {/* Barra de progresso visual */}
                  <div style={{ display:"flex", gap:4, marginBottom:14 }}>
                    {["pendente","em_andamento","aprovacao","finalizado"].map((st,i) => {
                      const steps = ["pendente","em_andamento","aprovacao","ajustes","finalizado"];
                      const curIdx = steps.indexOf(s.status);
                      const thisIdx = ["pendente","em_andamento","aprovacao","finalizado"].indexOf(st);
                      const done = curIdx >= thisIdx || s.status === "finalizado";
                      const colors = { pendente:"#f59e0b", em_andamento:"#06b6d4", aprovacao:"#fb923c", finalizado:"#10b981" };
                      return <div key={st} style={{ flex:1, height:3, borderRadius:2, background:done?colors[st]:"#1e1e35", transition:"background .3s" }}/>;
                    })}
                  </div>

                  {s.descricao && <div style={{ color:"#8a8aaa", fontSize:13, lineHeight:1.7, marginBottom:10 }}>{s.descricao}</div>}
                  {s.prazo && <div style={{ color:"#5a5a7a", fontSize:12, marginBottom:8 }}>📅 Prazo solicitado: {new Date(s.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"long"})}</div>}

                  {s.resposta_designer && !s.resposta_designer.startsWith("[Ajuste") && (
                    <div style={{ background:"#6366f112", border:"1px solid #6366f130", borderRadius:12, padding:"12px 16px", marginTop:8 }}>
                      <div style={{ color:"#818cf8", fontSize:11, fontWeight:700, marginBottom:4 }}>💬 Mensagem do designer:</div>
                      <div style={{ color:"#c4c4e0", fontSize:13, lineHeight:1.7 }}>{s.resposta_designer}</div>
                    </div>
                  )}

                  {/* Botões de aprovação */}
                  {isAprovacao && !acaoAtual && (
                    <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #1e1e35", display:"flex", gap:10, flexWrap:"wrap" }}>
                      <button onClick={()=>aprovar(s.id)}
                        style={{ background:"linear-gradient(135deg,#059669,#10b981)", border:"none", borderRadius:10, padding:"10px 22px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px #10b98140" }}>
                        ✅ Aprovar projeto
                      </button>
                      <button onClick={()=>setAcao(a=>({...a,[s.id]:"ajustando"}))}
                        style={{ background:"#ef444418", border:"1px solid #ef444440", borderRadius:10, padding:"10px 18px", color:"#ef4444", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        🔄 Solicitar ajustes
                      </button>
                    </div>
                  )}

                  {isAprovacao && acaoAtual === "ajustando" && (
                    <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #1e1e35" }}>
                      <div style={{ color:"#e8e6f0", fontSize:13, fontWeight:600, marginBottom:8 }}>O que precisa ser ajustado?</div>
                      <textarea value={ajusteText[s.id]||""} onChange={e=>setAjusteText(t=>({...t,[s.id]:e.target.value}))}
                        placeholder="Descreva o que deseja mudar..." rows={3}
                        style={{ width:"100%", background:"#0f0f1e", border:"1px solid #2a2a45", borderRadius:10, padding:"10px 14px", color:"#e8e6f0", fontSize:13, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.6, marginBottom:10 }}/>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={()=>pedirAjuste(s.id)}
                          style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:9, padding:"9px 20px", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                          Enviar feedback
                        </button>
                        <button onClick={()=>setAcao(a=>({...a,[s.id]:null}))}
                          style={{ background:"none", border:"1px solid #2a2a45", borderRadius:9, padding:"9px 14px", color:"#5a5a7a", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {s.status === "finalizado" && (
                    <div style={{ marginTop:12, display:"flex", alignItems:"center", gap:8, color:"#10b981", fontSize:13, fontWeight:600 }}>
                      <span>✅</span> Projeto aprovado e finalizado!
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Form inline reutilizável para o portal
function SolicitarFormInline({ clienteId, clienteNome, onEnviado }) {
  const [form, setForm] = useState({ tipo:"", descricao:"", prazo:"", referencias:"", observacoes:"" });
  const [loading, setLoading] = useState(false);
  const inp = { background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:9, padding:"9px 12px", color:"#e8e6f0", fontSize:13, width:"100%", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" };

  async function enviar() {
    if (!form.descricao.trim()) return;
    setLoading(true);
    try {
      await supabase.from("solicitacoes").insert([{ id:Date.now(), cliente_id:clienteId, cliente_nome:clienteNome, ...form, status:"pendente", created_at:new Date().toISOString() }]);
      onEnviado();
    } catch { alert("Erro ao enviar."); }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ color:"#e8e6f0", fontWeight:700, fontSize:14, marginBottom:16 }}>Nova solicitação</div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase" }}>Tipo de projeto</div>
        <input value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} placeholder="Ex: Post, Logo, Banner..." style={inp}/>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase" }}>Descrição *</div>
        <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="O que precisa ser criado?" rows={3} style={{...inp, resize:"vertical", lineHeight:1.6}}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase" }}>Prazo</div>
          <input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))} style={inp}/>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ color:"#5a5a7a", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase" }}>Referências</div>
        <input value={form.referencias} onChange={e=>setForm(f=>({...f,referencias:e.target.value}))} placeholder="Links, exemplos..." style={inp}/>
      </div>
      <button onClick={enviar} disabled={!form.descricao.trim()||loading}
        style={{ width:"100%", background:(!form.descricao.trim()||loading)?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:10, padding:"12px", color:(!form.descricao.trim()||loading)?"#3a3a5a":"#fff", fontSize:14, fontWeight:700, cursor:(!form.descricao.trim()||loading)?"not-allowed":"pointer", fontFamily:"inherit" }}>
        {loading ? "Enviando..." : "📤 Enviar"}
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(e) { return { hasError:true, error:e }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", background:"#080810", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"DM Sans,sans-serif", padding:40 }}>
          <div style={{ textAlign:"center", maxWidth:480 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
            <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:20, marginBottom:8 }}>Algo deu errado</div>
            <div style={{ color:"#64748b", fontSize:13, marginBottom:24 }}>{this.state.error?.message || "Erro desconhecido"}</div>
            <button onClick={()=>{ localStorage.clear(); window.location.reload(); }}
              style={{ background:"linear-gradient(135deg,#7c3aed,#a78bfa)", border:"none", borderRadius:10, padding:"12px 24px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              🗑 Limpar cache e reiniciar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("pedido"))    return <AprovarPage/>;
  if (params.get("solicitar")) return <SolicitarPage/>;
  if (params.get("portal"))    return <PortalPublicoPage/>;

  const [loggedIn, setLoggedIn] = useLocalStorage("dh_loggedIn", false);
  const [theme, setTheme] = useLocalStorage("dh_theme", "dark");
  const [userName, setUserName] = useLocalStorage("dh_userName", "Designer");
  const [userRole, setUserRole] = useLocalStorage("dh_userRole", "Designer Freelancer");
  const [userAvatar, setUserAvatar] = useLocalStorage("dh_userAvatar", "");
  const [leads, setLeads] = useLocalStorage("dh_leads", initLeads);
  const [tasks, setTasks] = useLocalStorage("dh_tasks", initTasks);
  const [portfolio, setPortfolio] = useLocalStorage("dh_portfolio", initPortfolio);
  const [timerHistory, setTimerHistory] = useLocalStorage("dh_timer_history", initTimerHistory);
  const [demandas, setDemandas] = useLocalStorage("dh_demandas", initDemandas);
  const [notes, setNotes] = useLocalStorage("dh_notes", []);
  const [despesas, setDespesas] = useLocalStorage("dh_despesas", []);
  const [view, setView] = useState(() => localStorage.getItem("dh_view") || "dashboard");
  const [sideOpen, setSideOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => { C = THEMES[theme]; document.documentElement.style.setProperty("--bg", THEMES[theme].bg); document.body.style.background=THEMES[theme].bg; }, [theme]);
  useEffect(() => { localStorage.setItem("dh_view", view); }, [view]);

  const timer = useTimer((date, secs) => {
    setTimerHistory(h => {
      const idx = h.findIndex(x=>x.date===date);
      if (idx>=0) return h.map((x,i)=>i===idx?{...x,seconds:x.seconds+secs}:x);
      return [...h,{date,seconds:secs}];
    });
  });

  const nav = [
    { id:"dashboard", label:"Dashboard", icon:"dashboard", sec:"principal" },
    { id:"prospeccao", label:"Prospecção 🎯", icon:"leads", sec:"gestao" },
    { id:"leads", label:"CRM · Contatos", icon:"leads", sec:"gestao" },
    { id:"clientes", label:"Clientes Ativos", icon:"star", sec:"gestao" },
    { id:"kanban", label:"Kanban", icon:"kanban", sec:"gestao" },
    { id:"agenda", label:"Agenda", icon:"agenda", sec:"trabalho" },
    { id:"timer", label:"Horas", icon:"timer", sec:"trabalho" },
    { id:"finance", label:"Financeiro", icon:"finance", sec:"trabalho" },
    { id:"portfolio", label:"Portfólio", icon:"portfolio", sec:"criativo" },
    { id:"notes", label:"Notas", icon:"note", sec:"criativo" },
    { id:"relatorio", label:"Relatório", icon:"bar", sec:"criativo" },
    { id:"formulario", label:"Links do Cliente", icon:"note", sec:"ferramentas" },
    { id:"portal", label:"Solicitações", icon:"user", sec:"ferramentas" },
  ];

  const sections = { principal:"", gestao:"GESTÃO", trabalho:"TRABALHO", criativo:"CRIATIVO", ferramentas:"FERRAMENTAS" };

  C = THEMES[theme];

  if (!loggedIn) return <ErrorBoundary><LoginScreen onLogin={u=>{setLoggedIn(true);if(u)setUserName(u.charAt(0).toUpperCase()+u.slice(1));}} /></ErrorBoundary>;
  if (focusMode) return <FocusMode timer={timer} onClose={()=>setFocusMode(false)}/>;

  return (
    <ErrorBoundary>
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg, fontFamily:"'DM Sans',sans-serif", color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#334155; border-radius:99px; }
        input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; }
        @media (max-width:700px) {
          .sidebar-full { transform: ${sideOpen?"translateX(0)":"translateX(-100%)"}; position:fixed!important; z-index:100; }
          .main-content { margin-left:0!important; }
        }
      `}</style>

      <div className="sidebar-full" style={{ width:sideOpen?220:0, minWidth:sideOpen?220:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", transition:"all 0.25s", overflow:"hidden", flexShrink:0 }}>
        <div style={{ padding:"20px 18px 14px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:14 }}>F</span></div>
            <div><div style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15 }}>FluxioHUB</div><div style={{ color:C.muted, fontSize:10 }}>v2.0</div></div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"12px 10px" }}>
          {Object.entries(sections).map(([sec, label])=>{
            const items = nav.filter(n=>n.sec===sec);
            if (!items.length) return null;
            return (
              <div key={sec} style={{ marginBottom:6 }}>
                {label&&<div style={{ color:C.muted, fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.14em", padding:"6px 8px 4px" }}>{label}</div>}
                {items.map(n=>(
                  <button key={n.id} onClick={()=>setView(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, border:"none", cursor:"pointer", background:view===n.id?`${C.accent}18`:"transparent", marginBottom:2, transition:"all 0.13s" }} onMouseEnter={e=>{if(view!==n.id)e.currentTarget.style.background=C.cardHover;}} onMouseLeave={e=>{if(view!==n.id)e.currentTarget.style.background="transparent";}}>
                    <Ico n={n.icon} s={15} c={view===n.id?C.accent:C.muted}/>
                    <span style={{ color:view===n.id?C.accent:C.muted, fontSize:13, fontWeight:view===n.id?700:500, whiteSpace:"nowrap" }}>{n.label}</span>
                    {n.id==="agenda"&&tasks.filter(t=>t.date===new Date().toISOString().split("T")[0]&&!t.done).length>0&&(
                      <div style={{ marginLeft:"auto", width:18, height:18, borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff" }}>{tasks.filter(t=>t.date===new Date().toISOString().split("T")[0]&&!t.done).length}</div>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"12px 10px", borderTop:`1px solid ${C.border}` }}>
          <div onClick={()=>setSettingsOpen(true)} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:10, cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background=C.cardHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <div style={{ width:32, height:32, borderRadius:9, background:userAvatar?`url(${userAvatar}) center/cover`:`linear-gradient(135deg,${C.accentGlow}50,${C.teal}50)`, display:"flex", alignItems:"center", justifyContent:"center", color:C.teal, fontWeight:800, fontSize:14, overflow:"hidden", flexShrink:0 }}>{!userAvatar&&userName.charAt(0).toUpperCase()}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:C.text, fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{userName}</div>
              <div style={{ color:C.muted, fontSize:10 }}>{userRole}</div>
            </div>
          </div>
          <button onClick={()=>setLoggedIn(false)} style={{ width:"100%", marginTop:6, background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"7px", color:C.muted, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>Sair</button>
        </div>
      </div>

      <div className="main-content" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <div style={{ height:54, display:"flex", alignItems:"center", padding:"0 24px", borderBottom:`1px solid ${C.border}`, gap:14, flexShrink:0 }}>
          <button onClick={()=>setSideOpen(s=>!s)} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, padding:4 }}><Ico n="menu" s={20}/></button>
          <span style={{ color:C.muted, fontSize:13 }}>{nav.find(n=>n.id===view)?.label||""}</span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={timer.toggle} style={{ display:"flex", alignItems:"center", gap:7, background:timer.running?`${C.teal}18`:C.card, border:`1px solid ${timer.running?C.teal:C.border}`, borderRadius:9, padding:"6px 13px", cursor:"pointer" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:timer.running?C.teal:C.muted, boxShadow:timer.running?`0 0 6px ${C.teal}`:""}}/>
              <span style={{ color:timer.running?C.teal:C.muted, fontFamily:"monospace", fontSize:12, fontWeight:700 }}>{timer.fmt(timer.seconds)}</span>
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto" }}>
          {view==="dashboard"   && <Dashboard leads={leads} tasks={tasks} timer={timer} timerHistory={timerHistory} setView={setView} demandas={demandas} setFocusMode={setFocusMode}/>}
          {view==="prospeccao"  && <Prospeccao/>}
          {view==="leads"       && <Leads leads={leads} setLeads={setLeads} demandas={demandas} setDemandas={setDemandas}/>}
          {view==="clientes"    && <ClientesFixos leads={leads} setLeads={setLeads} demandas={demandas} setDemandas={setDemandas}/>}
          {view==="kanban"      && <Kanban demandas={demandas} setDemandas={setDemandas} leads={leads}/>}
          {view==="agenda"      && <Agenda tasks={tasks} setTasks={setTasks} demandas={demandas} setDemandas={setDemandas}/>}
          {view==="timer"       && <TimerHistoryView timerHistory={timerHistory} timer={timer}/>}
          {view==="finance"     && <Finance leads={leads} demandas={demandas} timerHistory={timerHistory} despesas={despesas} setDespesas={setDespesas}/>}
          {view==="portfolio"   && <Portfolio portfolio={portfolio} setPortfolio={setPortfolio}/>}
          {view==="notes"       && <Notes notes={notes} setNotes={setNotes}/>}
          {view==="relatorio"   && <Relatorio leads={leads} demandas={demandas} timerHistory={timerHistory} tasks={tasks} timer={timer}/>}
          {view==="formulario"  && <FormularioPedido leads={leads}/>}
          {view==="portal"      && <PortalCliente leads={leads} setDemandas={setDemandas}/>}
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} theme={theme} setTheme={setTheme} userName={userName} setUserName={setUserName} userRole={userRole} setUserRole={setUserRole} userAvatar={userAvatar} setUserAvatar={setUserAvatar}/>
    </div>
    </ErrorBoundary>
  );
}
