import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase, dbReady } from './lib/supabase.js';
import { Prospeccao } from './Prospeccao';

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

// ─── Storage sincronizado com Supabase (cross-device) ─────────────────────────
function useSyncedStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored);
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed;
    } catch {
      try { localStorage.removeItem(key); } catch {}
      return initialValue;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  const saveTimerRef = useRef(null);
  const saveToSupabase = (val) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await supabase.from("designer_data").upsert(
          { key, value: val, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      } catch {}
    }, 1500);
  };
  const setValueSynced = (newVal) => {
    setValue(prev => {
      const resolved = typeof newVal === "function" ? newVal(prev) : newVal;
      saveToSupabase(resolved);
      return resolved;
    });
  };
  return [value, setValueSynced];
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

const _now = new Date();
const NOW_MONTH = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}`;
const NOW_YEAR  = _now.getFullYear();
const NOW_MO    = _now.getMonth();

// ─── Constants & Getters (CORREÇÃO 3) ──────────────────────────────────────────
const CATEGORIA = {
  get lead()         { return { label:"Lead",          color:C.yellow, icon:"⚡" }; },
  get cliente_fixo() { return { label:"Cliente Ativo", color:C.teal,   icon:"⭐" }; },
};

const STATUS_DEMANDA = {
  get triagem()    { return { label:"Triagem",      color:"#94a3b8", icon:"📥" }; },
  get em_criacao() { return { label:"Em Criação",   color:C.accent,  icon:"✏️"  }; },
  get revisao()    { return { label:"Revisão",      color:"#38bdf8", icon:"🔍" }; },
  get aprovacao()  { return { label:"Aprovação",    color:C.orange,  icon:"👀" }; },
  get finalizado() { return { label:"Finalizado",   color:C.green,   icon:"✅" }; },
};

const KANBAN_COLS = ["triagem","em_criacao","revisao","aprovacao","finalizado"];

const initLeads = [];
const initTasks = [];
const initPortfolio = [
  { id:1, title:"Identidade Visual — Pixel Studio", url:"https://behance.net", tag:"Branding", year:"2025", month:"2025-11", value:4500,  cover:"🎨", description:"Rebranding completo com sistema de identidade visual." },
  { id:2, title:"UI Kit — Tech Venture App",        url:"https://figma.com",   tag:"UI/UX",    year:"2025", month:"2025-09", value:8500,  cover:"📱", description:"Design system com mais de 200 componentes." },
  { id:3, title:"Website — Brand Co",               url:"https://dribbble.com",tag:"Web",      year:"2024", month:"2024-06", value:6000,  cover:"🌐", description:"Landing page institucional e campanha digital." },
];
const initTimerHistory = [];
const initDemandas = [];

const STATUS = {
  get novo()       { return { label:"Novo",       color:C.teal   }; },
  get negociando() { return { label:"Negociando", color:C.yellow }; },
  get proposta()   { return { label:"Proposta",   color:C.accent }; },
  get fechado()    { return { label:"Fechado",    color:C.green  }; },
  get perdido()    { return { label:"Perdido",    color:C.red    }; },
};

const PRIORITY = { 
  get alta()  { return { dot:C.red }; }, 
  get media() { return { dot:C.yellow }; }, 
  get baixa() { return { dot:C.teal }; } 
};
const TYPE = { reuniao:{icon:"🤝",label:"Reunião"}, entrega:{icon:"📦",label:"Entrega"}, tarefa:{icon:"✅",label:"Tarefa"} };

// ─── Icons ─────────────────────────────────────────────────────────────────────
function PortalIco({ n, s=20, c="currentColor" }) {
  const icons = {
    check:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    inbox:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
    tool:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
    eye:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    search:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    refresh:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    calendar: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    plus:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    send:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    message:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    alert:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    close:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    link:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    thumbsup: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>,
    edit:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  };
  return icons[n] || null;
}

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
  const secondsRef = useRef(0);

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
// DASHBOARD & RELATORIOS
// ══════════════════════════════════════════════════════════════════════════════
function SolicDashCard({ setView, colors }) {
  const C = colors;
  const [solic, setSolic] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("solicitacoes")
      .select("id,tipo,cliente_nome,status,created_at")
      .in("status", ["pendente","triagem","ajustes"])
      .order("created_at", { ascending:false })
      .limit(5)
      .then(({ data }) => { setSolic(data||[]); setLoading(false); });
  }, []);

  if (loading || solic.length === 0) return null;

  const STATUS_CORES = {
    pendente: { color:"#f59e0b", icon:"⏳", label:"Aguardando" },
    triagem:  { color:"#94a3b8", icon:"📥", label:"Triagem" },
    ajustes:  { color:"#ef4444", icon:"🔄", label:"Ajustes" },
  };

  return (
    <div style={{ background:`${C.accent}08`, border:`1px solid ${C.accent}25`, borderRadius:16, padding:"18px 22px", marginBottom:22 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>📬</span>
          <span style={{ color:C.text, fontWeight:800, fontSize:15, fontFamily:"'Syne',sans-serif" }}>Solicitações pendentes</span>
          <span style={{ background:`${C.accent}20`, color:C.accent, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:20 }}>{solic.length}</span>
        </div>
        <button onClick={()=>setView("portal")} style={{ background:"none", border:"none", color:C.accent, fontSize:12, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Ver todas →</button>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {solic.map(s => {
          const cfg = STATUS_CORES[s.status] || STATUS_CORES.pendente;
          return (
            <div key={s.id} onClick={()=>setView("portal")} style={{ display:"flex", alignItems:"center", gap:10, background:C.card, borderRadius:10, padding:"9px 14px", border:`1px solid ${C.border}`, cursor:"pointer" }}>
              <span style={{ fontSize:14 }}>{cfg.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:C.text, fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.tipo||"Solicitação"}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{s.cliente_nome}</div>
              </div>
              <span style={{ background:`${cfg.color}18`, color:cfg.color, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, whiteSpace:"nowrap" }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FocusMode({ timer, onClose }) {
  const pct = timer.goal > 0 ? Math.min(100, Math.round(timer.seconds / timer.goal * 100)) : 0;
  useEffect(() => { const i = setInterval(()=>{},1000); return ()=>clearInterval(i); },[]);
  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');`}</style>
      <button onClick={onClose} style={{ position:"absolute", top:24, right:24, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 16px", color:C.muted, cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>✕ Sair do foco</button>
      <div style={{ textAlign:"center" }}>
        <div style={{ color:C.muted, fontSize:13, textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:16 }}>{timer.running ? "🎯 em foco" : "⏸ pausado"}</div>
        <div style={{ color:timer.running?C.teal:C.text, fontFamily:"'Syne',sans-serif", fontSize:"clamp(64px,15vw,120px)", fontWeight:800, letterSpacing:"0.04em", lineHeight:1, marginBottom:28, transition:"color 0.5s" }}>{timer.fmt(timer.seconds)}</div>
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
          <button onClick={timer.toggle} style={{ background:timer.running?`${C.accent}20`:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:`1px solid ${timer.running?C.accent:C.accent}`, borderRadius:16, padding:"16px 40px", color:timer.running?C.accent:"#fff", fontSize:18, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>{timer.running?"⏸ Pausar":"▶ Iniciar"}</button>
          <button onClick={timer.reset} style={{ background:`${C.red}15`, border:`1px solid ${C.red}30`, borderRadius:16, padding:"16px 28px", color:C.red, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>💾 Salvar dia</button>
        </div>
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
  try { pedido = JSON.parse(atob(decodeURIComponent(data))); } catch(e) { return <div style={{ padding:40, color:C.red }}>Erro ao decodificar pedido.</div>; }
  if (aprovado) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:70, marginBottom:20 }}>✅</div>
        <div style={{ color:C.green, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, marginBottom:8 }}>Pedido aprovado!</div>
        <div style={{ color:C.muted, fontSize:14 }}>Obrigado, {pedido.clienteNome}!</div>
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
        <button onClick={()=>setAprovado(true)} style={{ width:"100%", background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:12, padding:"16px", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>✅ Aprovar pedido</button>
      </div>
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
  const [yr, mo] = selMonth.split("-").map(Number);
  const prevDate = new Date(yr,mo-2,1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
  const prevReceita = demandas.filter(d=>d.status==="finalizado"&&(d.data_criacao||"").startsWith(prevMonth)).reduce((a,b)=>a+(parseFloat(b.valor)||0),0);
  const diffPct = prevReceita>0?Math.round((moReceita-prevReceita)/prevReceita*100):null;
  const metricas = [
    { label:"Receita no mês", value:`R$ ${moReceita.toLocaleString("pt-BR")}`, sub:diffPct!==null?`${diffPct>=0?"▲":"▼"} ${Math.abs(diffPct)}% vs mês anterior`:`${moJobs.length} jobs finalizados`, accent:C.green },
    { label:"Horas trabalhadas", value:fmtH(moHoras), sub:`${allHistCopy.filter(h=>h.date.startsWith(selMonth)).length} dias ativos`, accent:C.teal },
    { label:"R$/hora faturado", value:`R$ ${faturamentoHora.toFixed(2)}`, sub:"baseado em jobs finalizados", accent:C.accent },
    { label:"Tarefas do mês", value:`${moTasks.filter(t=>t.done).length}/${moTasks.length}`, sub:`${moTasks.filter(t=>!t.done).length} ainda abertas`, accent:C.orange },
  ];
  const diasAtivos = allHistCopy.filter(h=>h.date.startsWith(selMonth)&&h.seconds>0);
  const avgHoras = diasAtivos.length>0?fmtH(Math.round(diasAtivos.reduce((a,b)=>a+b.seconds,0)/diasAtivos.length)):"-";
  const diaRec = [...allHistCopy].filter(h=>h.date.startsWith(selMonth)).sort((a,b)=>b.seconds-a.seconds)[0];
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
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", marginBottom:22 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14 }}>📋 Jobs finalizados em {MONTHS[mo-1]}</span>
        </div>
        {moJobs.length===0?<div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"24px 0" }}>Nenhum job finalizado neste mês.</div>:(
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {moJobs.map(j=>{
              const cli=leads.find(l=>l.id===j.cliente_id);
              return (
                <div key={j.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:C.surface, borderRadius:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ color:C.text, fontSize:13, fontWeight:600 }}>{j.titulo}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{cli?`👤 ${cli.name}`:""}{j.prazo?` · 📅 ${new Date(j.prazo+"T12:00:00").toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}`:""}</div>
                  </div>
                  <span style={{ color:C.green, fontWeight:700, fontSize:13 }}>R$ {parseFloat(j.valor||0).toLocaleString("pt-BR")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px", marginBottom:22 }}>
        <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>⏱ Resumo de horas</span>
        <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
          {[{l:"Total no mês",v:fmtH(moHoras),c:C.accent},{l:"Dias ativos",v:`${diasAtivos.length} dias`,c:C.teal},{l:"Média por dia",v:avgHoras,c:C.green},{l:"Melhor dia",v:diaRec?fmtH(diaRec.seconds):"-",c:C.orange}].map(m=>(
            <div key={m.l} style={{ textAlign:"center" }}>
              <div style={{ color:m.c, fontWeight:800, fontSize:22, fontFamily:"'Syne',sans-serif" }}>{m.v}</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{m.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
        <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:14 }}>📤 Exportar relatório</span>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>{
            const txt = `RELATÓRIO — ${MONTHS[mo-1].toUpperCase()} ${yr}\n${"=".repeat(40)}\n💰 Receita: R$ ${moReceita.toLocaleString("pt-BR")}\n⏱  Horas: ${fmtH(moHoras)}\n📋 Jobs: ${moJobs.length}\n\nJOBS FINALIZADOS:\n${moJobs.map(j=>`• ${j.titulo} — R$ ${parseFloat(j.valor||0).toLocaleString("pt-BR")}`).join("\n")}\n`;
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
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:30, width:480, maxWidth:"95vw" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <span style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18 }}>⚙️ Configurações</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted }}><Ico n="close" s={18}/></button>
        </div>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:22 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:avatar?`url(${avatar}) center/cover`:`linear-gradient(135deg,${C.accentGlow},${C.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:800, color:"#fff", overflow:"hidden", border:`3px solid ${C.accent}` }}>{!avatar&&name?.charAt(0)?.toUpperCase()}</div>
        </div>
        <Field label="URL do Avatar (opcional)" value={avatar} onChange={setAvatar} placeholder="https://..."/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Seu nome" value={name} onChange={setName} placeholder="Ex: Ana Lima"/>
          <Field label="Especialidade" value={role} onChange={setRole} placeholder="Ex: Designer..."/>
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


function Dashboard({ leads, tasks, timer, timerHistory, setView, demandas=[] }) {
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
    <div style={{ padding:"28px 32px", maxWidth:1100 }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:26, fontWeight:800, margin:0, letterSpacing:"-0.02em" }}>Bom dia! ☀️</h1>
        <p style={{ color:C.muted, margin:"5px 0 0", fontSize:13 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>

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
// CRM (BriefingEditor & Leads)
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
            return (
              <button key={cat} onClick={()=>setFc(cat)} style={{ background:fc===cat?`${cfg.color}18`:C.card, border:`1px solid ${fc===cat?cfg.color:C.border}`, borderRadius:8, padding:"7px 13px", color:fc===cat?cfg.color:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>{cfg.icon} {cfg.label}</button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["todos",...Object.keys(STATUS)].map(s=>(
            <button key={s} onClick={()=>setFs(s)} style={{ background:fs===s?`${C.accent}18`:C.card, border:`1px solid ${fs===s?C.accent:C.border}`, borderRadius:8, padding:"7px 12px", color:fs===s?C.accent:C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>{s==="todos"?"Status":STATUS[s].label}</button>
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
                      <span style={{ background:`${cat.color}15`, color:cat.color, fontSize:11, padding:"3px 10px", borderRadius:99, fontWeight:700 }}>{cat.icon} {cat.label}</span>
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
function Agenda({ tasks, setTasks, demandas, setDemandas }) {
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
// FINANCEIRO — REFATORADO + GAMIFICAÇÃO + CORREÇÃO FINDLAST
// ══════════════════════════════════════════════════════════════════════════════
function Finance({ leads, demandas, timerHistory, despesas=[], setDespesas }) {
  const [selMonth, setSelMonth] = useState(NOW_MONTH);
  const [meta, setMeta] = useLocalStorage("dh_meta_mensal", 5000);
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(String(meta));

  const today = new Date().toISOString().split("T")[0];

  const receitaMes = (monthKey) =>
    demandas.filter(d => d.status === "finalizado" && d.data_criacao?.startsWith(monthKey))
            .reduce((a,b) => a + (parseFloat(b.valor)||0), 0);

  const moReceita   = receitaMes(selMonth);
  const moJobs      = demandas.filter(d => d.status==="finalizado" && d.data_criacao?.startsWith(selMonth));
  const moEmAndamento = demandas.filter(d => d.status !== "finalizado" && d.data_criacao?.startsWith(selMonth));

  const [yr, mo] = selMonth.split("-").map(Number);
  const prevDate  = new Date(yr, mo-2, 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,"0")}`;
  const prevReceita = receitaMes(prevMonth);
  const diffPct = prevReceita > 0 ? Math.round((moReceita - prevReceita) / prevReceita * 100) : null;

  const chartMonths = Array.from({length:8},(_,i)=>{
    const d = new Date(NOW_YEAR, NOW_MO - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const val = receitaMes(key);
    const jobs = demandas.filter(d2 => d2.status==="finalizado" && d2.data_criacao?.startsWith(key)).length;
    return { key, label:MONTHS_SHORT[d.getMonth()], val, jobs };
  }).reverse();
  const maxChart = Math.max(...chartMonths.map(m=>m.val), meta, 1);

  const clientes = leads.filter(l => l.categoria === "cliente_fixo");
  const rankClientes = clientes.map(c => ({
    ...c,
    total: demandas.filter(d => d.cliente_id===c.id && d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0),
    jobs:  demandas.filter(d => d.cliente_id===c.id && d.status==="finalizado").length,
  })).sort((a,b) => b.total - a.total);

  const tagMap = {};
  demandas.filter(d=>d.status==="finalizado").forEach(d=>{
    const tag = d.tag || "Sem tag";
    if (!tagMap[tag]) tagMap[tag] = { total:0, count:0 };
    tagMap[tag].total += parseFloat(d.valor)||0;
    tagMap[tag].count++;
  });
  const rankTags = Object.entries(tagMap).map(([tag,v])=>({tag,...v})).sort((a,b)=>b.total-a.total);

  const metaPct = meta > 0 ? Math.min(100, Math.round(moReceita / meta * 100)) : 0;
  const metaBatida = moReceita >= meta;

  const totalJobs = demandas.filter(d=>d.status==="finalizado").length;
  const totalReceita = demandas.filter(d=>d.status==="finalizado").reduce((a,b)=>a+(parseFloat(b.valor)||0),0);

  const xp = Math.floor(totalReceita / 100) + (totalJobs * 50);
  const niveis = [
    { nome:"Iniciante",     min:0,     max:500,   icon:"🌱", cor:C.muted   },
    { nome:"Freelancer",    min:500,   max:2000,  icon:"⚡", cor:C.yellow  },
    { nome:"Profissional",  min:2000,  max:5000,  icon:"🚀", cor:C.accent  },
    { nome:"Expert",        min:5000,  max:15000, icon:"💎", cor:C.teal    },
    { nome:"Lenda",         min:15000, max:99999, icon:"🏆", cor:C.orange  },
  ];
  
  // CORREÇÃO 2: Resolvendo o problema do findLast compatibility
  const nivel = [...niveis].reverse().find(n => xp >= n.min) || niveis[0];
  const nextNivel = niveis[niveis.indexOf(nivel)+1];
  const xpPct = nextNivel ? Math.round((xp - nivel.min) / (nextNivel.min - nivel.min) * 100) : 100;

  let streak = 0;
  const d = new Date(); d.setDate(d.getDate()-1);
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (timerHistory.find(h=>h.date===key&&h.seconds>3600)) { streak++; d.setDate(d.getDate()-1); }
    else break;
    if (streak > 365) break;
  }

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

  const allMonthsRank = [...new Set(demandas.filter(d=>d.status==="finalizado").map(d=>d.data_criacao?.slice(0,7)).filter(Boolean))]
    .map(key => ({ key, label:`${MONTHS_SHORT[parseInt(key.split("-")[1])-1]}/${key.split("-")[0]}`, val: receitaMes(key) }))
    .sort((a,b) => b.val - a.val).slice(0,5);

  return (
    <div style={{ padding:"28px 32px", height:"calc(100vh - 54px)", overflowY:"auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>💰 Financeiro</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>Receita real das demandas finalizadas</p>
        </div>
        <MonthPicker value={selMonth} onChange={setSelMonth} label="Mês:"/>
      </div>

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
        {moEmAndamento.length > 0 && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.border}`, color:C.muted, fontSize:12 }}>
            🔄 {moEmAndamento.length} demanda{moEmAndamento.length>1?"s":""} em andamento · R$ {moEmAndamento.reduce((a,b)=>a+(parseFloat(b.valor)||0),0).toLocaleString("pt-BR")} potencial
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"20px 22px" }}>
          <span style={{ color:C.text, fontWeight:700, fontSize:14, display:"block", marginBottom:16 }}>📊 Receita — últimos 8 meses</span>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:130, position:"relative" }}>
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
// PORTFÓLIO
// ══════════════════════════════════════════════════════════════════════════════
function Portfolio({ items, setItems, portfolio: _p, setPortfolio: _sp }) {
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
// CLIENTES FIXOS
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

          {sel && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, display:"flex", flexDirection:"column", overflow:"hidden" }}>
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

              <div style={{ flex:1, overflowY:"auto", padding:"22px 24px" }}>
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

                {tab==="notas" && (
                  <NotesSave clienteId={sel.id} value={sel.notas_internas||""}/>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={editId?"Editar Cliente":"Novo Cliente Ativo"} w={560}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <Field label="Nome" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Field label="Empresa" value={form.company||""} onChange={v=>setForm(f=>({...f,company:v}))}/>
          <Field label="Email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
          <Field label="Telefone / WhatsApp" value={form.telefone||""} onChange={v=>setForm(f=>({...f,telefone:v}))} placeholder="(11) 99999-9999"/>
          <Field label="Tag / Serviço" value={form.tag} onChange={v=>setForm(f=>({...f,tag:v}))}/>
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
  const hash = window.location.hash;
  const match = hash.match(/#pedido\/[^/]+\/(\d+)/);
  const clienteId = match ? parseInt(match[1]) : null;

  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ titulo:"", descricao:"", prazo:"" });
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState(false);

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
          setCliente(data || null);
        } else {
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
    if (dbReady) {
      try { await supabase.from("demandas").insert([{ ...nova, id: undefined }]); } catch(e) {}
    }
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
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:60, height:60, borderRadius:16, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26, fontWeight:800, color:"#fff", fontFamily:"'Syne',sans-serif" }}>
            {cliente.name.charAt(0)}
          </div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, margin:"0 0 6px" }}>Fazer um pedido</h1>
          <p style={{ color:C.muted, fontSize:14, margin:0 }}>Olá, {cliente.name.split(" ")[0]}! Preencha os dados do seu pedido.</p>
        </div>

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
  const [modalCard, setModalCard] = useState(null);
  const [filterCli, setFilterCli] = useState("todos");
  const [notaEdit,  setNotaEdit]  = useState("");
  const [notaSaved, setNotaSaved] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const clientes = leads.filter(l => l.categoria === "cliente_fixo");

  const demandasFiltradas = filterCli === "todos"
    ? demandas
    : demandas.filter(d => String(d.cliente_id) === String(filterCli));

  const mover = (id, novoStatus) => {
    setDemandas(ds => ds.map(d => d.id === id ? { ...d, status: novoStatus } : d));
  };

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
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexShrink:0 }}>
        <div>
          <h1 style={{ color:C.text, fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, margin:0 }}>🗂 Kanban</h1>
          <p style={{ color:C.muted, margin:"4px 0 0", fontSize:13 }}>
            {demandas.length} demanda{demandas.length!==1?"s":""} · {demandas.filter(d=>isAtrasado(d)).length} atrasada{demandas.filter(d=>isAtrasado(d)).length!==1?"s":""}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ color:C.muted, fontSize:12 }}>Cliente:</span>
          <select value={filterCli} onChange={e=>setFilterCli(e.target.value)}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:"7px 12px", color:C.text, fontSize:13, outline:"none", cursor:"pointer", fontFamily:"inherit" }}>
            <option value="todos">Todos</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

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

              <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <span style={{ fontSize:16 }}>{cfg.icon}</span>
                    <span style={{ color:cfg.color, fontWeight:700, fontSize:13 }}>{cfg.label}</span>
                  </div>
                  <span style={{ background:`${cfg.color}20`, color:cfg.color, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99 }}>{cards.length}</span>
                </div>
                <div style={{ marginTop:8, height:2, background:C.border, borderRadius:99 }}>
                  <div style={{ height:2, background:cfg.color, borderRadius:99, width:demandas.length>0?`${Math.round((cards.length/Math.max(demandas.length,1))*100)}%`:"0%", transition:"width 0.3s" }}/>
                </div>
              </div>

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
                      onClick={() => { setModalCard(d); setNotaEdit(d.nota_designer||""); setNotaSaved(false); }}
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

                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6, gap:6 }}>
                        <span style={{ color:C.text, fontWeight:700, fontSize:13, lineHeight:1.4 }}>{d.titulo}</span>
                        {atrasado && (
                          <span style={{ background:`${C.red}20`, color:C.red, fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:99, whiteSpace:"nowrap", flexShrink:0 }}>ATRASADO</span>
                        )}
                      </div>

                      {cliente && (
                        <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:7 }}>
                          <div style={{ width:18, height:18, borderRadius:5, background:`linear-gradient(135deg,${C.teal}50,${C.accentGlow}50)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:C.teal, flexShrink:0 }}>
                            {cliente.name.charAt(0)}
                          </div>
                          <span style={{ color:C.teal, fontSize:12, fontWeight:600 }}>{cliente.name}</span>
                        </div>
                      )}

                      {d.tag && (
                        <div style={{ marginBottom:7 }}>
                          <span style={{ background:`${C.accent}15`, color:C.accent, fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{d.tag}</span>
                        </div>
                      )}

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

                      <div style={{ display:"flex", gap:4, marginTop:9, paddingTop:8, borderTop:`1px solid ${C.border}`, flexWrap:"wrap" }}>
                        {KANBAN_COLS.filter(k => k !== col).map(k => {
                          const v = STATUS_DEMANDA[k];
                          const idx = KANBAN_COLS.indexOf(k);
                          const cur = KANBAN_COLS.indexOf(col);
                          const isNext = idx === cur + 1;
                          if (!isNext && idx !== cur - 1) return null;
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

      {modalCard && (() => {
        const d = demandas.find(x => x.id === modalCard.id) || modalCard;
        const cliente = getCliente(d.cliente_id);
        const st = STATUS_DEMANDA[d.status] || STATUS_DEMANDA.triagem;
        const atrasado = isAtrasado(d);
        return (
          <div onClick={()=>setModalCard(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div onClick={e=>e.stopPropagation()} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:"100%", maxWidth:480 }}>
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
                {d.nota_designer && (
                  <div style={{ background:`${C.accent}08`, border:`1px solid ${C.accent}25`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ color:C.accent, fontSize:11, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:700 }}>📝 Nota / Cobrança</div>
                    <div style={{ color:C.text, fontSize:12, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{d.nota_designer}</div>
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

              <div style={{ marginBottom:16 }}>
                <div style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6 }}>
                  📝 Nota / Detalhamento de cobrança
                </div>
                <div style={{ background:`${C.accent}08`, border:`1px solid ${C.accent}20`, borderRadius:9, padding:"8px 12px", marginBottom:7, fontSize:11, color:C.muted, lineHeight:1.5 }}>
                  💡 Anote o detalhamento do serviço, valores cobrados, links. <strong style={{ color:C.accent }}>Visível ao cliente no portal.</strong>
                </div>
                <textarea
                  value={notaEdit}
                  onChange={e => { setNotaEdit(e.target.value); setNotaSaved(false); }}
                  placeholder={`Ex:\nMATERIAL: https://drive.google.com/...\nDETALHAMENTO:\n• Banner principal – R$ 70\nTOTAL: R$ 70`}
                  rows={5}
                  style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:"10px 12px", color:C.text, fontSize:12, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", resize:"vertical", lineHeight:1.6 }}
                />
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:7 }}>
                  <span style={{ color:notaSaved?C.green:C.muted, fontSize:11 }}>{notaSaved?"✓ Nota salva":"Edite e salve"}</span>
                  <button onClick={async () => {
                    setDemandas(ds => ds.map(x => x.id===d.id ? {...x, nota_designer:notaEdit} : x));
                    if (d.solicitacao_id) {
                      await supabase.from("solicitacoes").update({ resposta_designer: notaEdit }).eq("id", Number(d.solicitacao_id));
                      window.dispatchEvent(new CustomEvent("solic_changed"));
                    }
                    setNotaSaved(true);
                    setTimeout(() => setNotaSaved(false), 3000);
                  }} style={{ background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, border:"none", borderRadius:8, padding:"6px 16px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    💾 Salvar nota
                  </button>
                </div>
              </div>

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

// ══════════════════════════════════════════════════════════════════════════════
// PORTAL PÚBLICO — DESIGN CLARO E MODERNO
// ══════════════════════════════════════════════════════════════════════════════
function SolicitarPage() {
  const params = new URLSearchParams(window.location.search);
  const clienteId   = params.get("solicitar");
  const clienteNome = params.get("nome") || "Cliente";
  const [form, setForm]   = useState({ tipo:"", descricao:"", prazo:"", referencias:"", observacoes:"" });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

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
    } catch { alert("Erro ao enviar. Tente novamente."); }
    setLoading(false);
  }

  const S = {
    page:  { minHeight:"100vh", background:"#f7f8fc", fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif" },
    card:  { background:"#fff", borderRadius:20, padding:"32px 30px", boxShadow:"0 4px 32px rgba(100,80,200,0.08), 0 1px 4px rgba(0,0,0,0.04)" },
    label: { display:"block", color:"#6b7280", fontSize:11, fontWeight:700, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.1em" },
    inp:   (f) => ({ background:focused===f?"#fff":"#fafafa", border:`1.5px solid ${focused===f?"#7c3aed":"#e5e7eb"}`, borderRadius:10, padding:"11px 14px", color:"#111827", fontSize:14, width:"100%", outline:"none", fontFamily:"inherit", boxSizing:"border-box", transition:"all 0.2s", lineHeight:1.6 }),
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:#f7f8fc; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.6); }
      `}</style>

      <div style={{ background:"#fff", borderBottom:"1px solid #f0f0f6", padding:"16px 28px", display:"flex", alignItems:"center", gap:11 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#6d28d9,#a78bfa)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:"#fff", fontWeight:900, fontSize:15 }}>F</span>
        </div>
        <div>
          <div style={{ color:"#111827", fontWeight:800, fontSize:15 }}>FluxioHUB</div>
          <div style={{ color:"#9ca3af", fontSize:11 }}>Portal do Cliente</div>
        </div>
      </div>

      {enviado ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"calc(100vh - 65px)", padding:20 }}>
          <div style={{ textAlign:"center", animation:"fadeUp 0.5s ease" }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#059669,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", boxShadow:"0 8px 32px #10b98130" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ color:"#111827", fontWeight:800, fontSize:24, marginBottom:10 }}>Solicitação enviada!</div>
            <div style={{ color:"#6b7280", fontSize:14, lineHeight:1.8 }}>Recebemos seu pedido com sucesso.<br/>Acompanhe o andamento pelo portal.</div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth:560, margin:"0 auto", padding:"36px 20px", animation:"fadeUp 0.4s ease" }}>
          <div style={{ marginBottom:28 }}>
            <div style={{ color:"#9ca3af", fontSize:13, marginBottom:4 }}>Nova solicitação</div>
            <div style={{ color:"#111827", fontWeight:800, fontSize:26, lineHeight:1.1 }}>{clienteNome}</div>
          </div>
          <div style={S.card}>
            <div style={{ marginBottom:18 }}>
              <label style={S.label}>Tipo de projeto</label>
              <input value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}
                onFocus={()=>setFocused("tipo")} onBlur={()=>setFocused(null)}
                placeholder="Ex: Post Instagram, Logo, Banner, Landing page..."
                style={S.inp("tipo")}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ ...S.label, display:"flex", alignItems:"center", gap:6 }}>
                Descrição do projeto
                <span style={{ background:"#f3eeff", color:"#7c3aed", fontSize:10, padding:"1px 8px", borderRadius:20, textTransform:"none", letterSpacing:0, fontWeight:600 }}>obrigatório</span>
              </label>
              <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
                onFocus={()=>setFocused("desc")} onBlur={()=>setFocused(null)}
                placeholder="O que precisa ser criado? Objetivo, público-alvo, cores preferidas, textos..."
                rows={5} style={{...S.inp("desc"), resize:"vertical"}}/>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={S.label}>Prazo desejado</label>
              <div style={{ position:"relative" }}>
                <svg style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <input type="date" value={form.prazo} onChange={e=>setForm(f=>({...f,prazo:e.target.value}))}
                  onFocus={()=>setFocused("prazo")} onBlur={()=>setFocused(null)}
                  style={{...S.inp("prazo"), paddingLeft:38}}/>
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={S.label}>Referências</label>
              <textarea value={form.referencias} onChange={e=>setForm(f=>({...f,referencias:e.target.value}))}
                onFocus={()=>setFocused("ref")} onBlur={()=>setFocused(null)}
                placeholder="Links de referência, Pinterest, exemplos que você gostou..."
                rows={2} style={{...S.inp("ref"), resize:"vertical"}}/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={S.label}>Observações (opcional)</label>
              <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}
                onFocus={()=>setFocused("obs")} onBlur={()=>setFocused(null)}
                placeholder="Mais algum detalhe importante?"
                rows={2} style={{...S.inp("obs"), resize:"vertical"}}/>
            </div>
            
            <button onClick={enviar} disabled={loading}
              style={{ width:"100%", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", border:"none", borderRadius:10, padding:"15px", color:"#fff", fontSize:14, fontWeight:700, cursor:loading?"wait":"pointer", transition:"all 0.2s", boxShadow:"0 4px 16px rgba(124, 58, 237, 0.3)", opacity:loading?0.7:1 }}>
              {loading ? "Enviando..." : "Enviar solicitação"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE APP PRINCIPAL (CORREÇÃO 1)
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [theme, setTheme] = useLocalStorage("dh_theme", "dark");
  const [view, setView] = useState("dashboard");
  const [leads, setLeads] = useSyncedStorage("dh_leads", initLeads);
  const [tasks, setTasks] = useSyncedStorage("dh_tasks", initTasks);
  const [portfolio, setPortfolio] = useSyncedStorage("dh_portfolio", initPortfolio);
  const [demandas, setDemandas] = useSyncedStorage("dh_demandas", initDemandas);
  const [timerHistory, setTimerHistory] = useSyncedStorage("dh_timer_history", initTimerHistory);
  const [notes, setNotes] = useSyncedStorage("dh_notes", INIT_NOTES);
  const [despesas, setDespesas] = useSyncedStorage("dh_despesas", []);
  
  const [userName, setUserName] = useLocalStorage("dh_user_name", "");
  const [userRole, setUserRole] = useLocalStorage("dh_user_role", "Designer");
  const [userAvatar, setUserAvatar] = useLocalStorage("dh_user_avatar", "");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const timer = useTimer((date, secs) => {
    setTimerHistory(h => {
      const idx = h.findIndex(x => x.date === date);
      if (idx >= 0) {
        const copy = [...h];
        copy[idx] = { ...copy[idx], seconds: copy[idx].seconds + secs };
        return copy;
      }
      return [...h, { date, seconds: secs }];
    });
  });
  
  C = THEMES[theme] || THEMES.dark; // Atualiza a cor global baseado no tema

  // Rotas públicas via hash ou search params
  const isFormPedido = window.location.hash.startsWith("#pedido/");
  if (isFormPedido) return <FormularioPedido setDemandas={setDemandas} setTasks={setTasks} />;

  const params = new URLSearchParams(window.location.search);
  if (params.has("solicitar")) return <SolicitarPage />;
  if (params.has("pedido")) return <AprovarPage />;

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        *::-webkit-scrollbar { width:6px; height:6px; }
        *::-webkit-scrollbar-track { background:transparent; }
        *::-webkit-scrollbar-thumb { background:${C.border}; border-radius:10px; }
        *::-webkit-scrollbar-thumb:hover { background:${C.muted}; }
        input[type=date]::-webkit-calendar-picker-indicator, input[type=time]::-webkit-calendar-picker-indicator, input[type=month]::-webkit-calendar-picker-indicator { filter:${theme==="dark"?"invert(1)":"invert(0)"}; opacity:0.5; cursor:pointer; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      `}</style>
      
      {/* Sidebar */}
      <div style={{ width:80, background:C.surface, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 0", zIndex:100 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.accentGlow},${C.accent})`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:32, boxShadow:`0 8px 24px ${C.accentGlow}50` }}>
          <span style={{ color:"#fff", fontWeight:900, fontSize:20, fontFamily:"'Syne',sans-serif" }}>F</span>
        </div>
        
        <div style={{ display:"flex", flexDirection:"column", gap:16, flex:1 }}>
          {[
            { id:"dashboard", icon:"dashboard", label:"Dashboard" },
            { id:"clientes", icon:"star", label:"Clientes Ativos" },
            { id:"kanban", icon:"kanban", label:"Demandas" },
            { id:"leads", icon:"leads", label:"CRM (Leads)" },
            { id:"prospeccao", icon:"send", label:"Prospecção" },
            { id:"agenda", icon:"agenda", label:"Agenda" },
            { id:"finance", icon:"finance", label:"Financeiro" },
            { id:"portfolio", icon:"portfolio", label:"Portfólio" },
            { id:"notes", icon:"note", label:"Notas" }
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)} title={item.label}
              style={{ width:44, height:44, borderRadius:12, border:"none", background:view===item.id?`${C.accent}20`:"transparent", color:view===item.id?C.accent:C.muted, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}
              onMouseEnter={e => { if(view!==item.id) e.currentTarget.style.background=C.cardHover; }}
              onMouseLeave={e => { if(view!==item.id) e.currentTarget.style.background="transparent"; }}>
              <Ico n={item.icon} s={20}/>
            </button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16, marginTop:"auto" }}>
          <button onClick={() => setSettingsOpen(true)} style={{ width:40, height:40, borderRadius:"50%", border:`2px solid ${C.border}`, background:userAvatar?`url(${userAvatar}) center/cover`:`linear-gradient(135deg,${C.accentGlow},${C.teal})`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, overflow:"hidden" }}>
            {!userAvatar && (userName?.charAt(0)?.toUpperCase() || "U")}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex:1, overflowY:"auto", background:C.bg }}>
        {view === "dashboard" && <Dashboard leads={leads} tasks={tasks} timer={timer} timerHistory={timerHistory} setView={setView} demandas={demandas}/>}
        {view === "leads" && <Leads leads={leads} setLeads={setLeads} demandas={demandas} setDemandas={setDemandas}/>}
        {/* CORREÇÃO 1: props portfolio, tasks, setTasks repassadas abaixo! */}
        {view === "clientes" && <ClientesFixos leads={leads} setLeads={setLeads} demandas={demandas} setDemandas={setDemandas} portfolio
