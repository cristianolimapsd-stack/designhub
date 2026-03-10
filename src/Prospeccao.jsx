// ══════════════════════════════════════════════════════════════════════════════
// PROSPECÇÃO — Módulo FluxioHUB  (templates locais, zero API)
// ══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";
import { supabase, dbReady } from './lib/supabase.js';

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
  { id:"roast",       icon:"🔥", nome:"Roast Gentil",          desc:"Aponta algo fraco com bom humor. Eles gargalham e contratam." },
  { id:"diagnostico", icon:"🎁", nome:"Diagnóstico Grátis",    desc:"Oferece valor antes de pedir qualquer coisa. Sem pitch." },
  { id:"gancho",      icon:"🪝", nome:"Gancho de Curiosidade", desc:"Começa sem revelar que é designer. Desperta curiosidade." },
  { id:"conselho",    icon:"🤔", nome:"Pedido de Conselho",    desc:"Você pede a opinião deles. Psicologia reversa — adoram isso." },
  { id:"historia",    icon:"📖", nome:"Mini-história",         desc:"Uma história rápida de como transformou alguém do mesmo segmento." },
  { id:"direto",      icon:"⚡", nome:"Direto e Real",         desc:"Zero enrolação, zero corporativês. Só você sendo humano." },
  { id:"provocacao",  icon:"😏", nome:"Provocação",            desc:"Um desafio leve. Funciona com empreendedores confiantes." },
  { id:"reativacao",  icon:"🔄", nome:"Reativação",            desc:"Para contatos frios. Retoma sem ser chato." },
];

// ─── Engine de templates sem API ─────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Extrai dor do prospect (da análise ou notas)
function getDor(p) {
  if (p.notas_dor) return p.notas_dor.split(".")[0].toLowerCase();
  if (p.dor_ia)    return p.dor_ia.split("\n")[0].replace(/^1\.\s*/,"").toLowerCase();
  const nicho = NICHOS.find(n => p.segment?.toLowerCase().includes(n.nome.toLowerCase().split(" ")[0]));
  return nicho?.dor.toLowerCase() || "visual que não transmite o valor do negócio";
}

function getNome(p) {
  // Pega só o primeiro nome se tiver nome completo
  return p.name.split(/[\s—\-]/)[0].replace("Prospect","").trim() || p.segment || "você";
}

function getSegmento(p) {
  return p.segment || "seu negócio";
}

function gerarMensagem(p, abordagemId) {
  const nome     = getNome(p);
  const seg      = getSegmento(p);
  const dor      = getDor(p);
  const referral = p.referral ? `${p.referral} me falou de você` : null;

  const templates = {
    roast: [
      `${nome}, fui dar uma olhada no perfil de vocês antes de mandar essa mensagem.\n\nSão ${seg}, serviço que claramente tem valor — mas o visual tá pedindo socorro. ${dor.charAt(0).toUpperCase() + dor.slice(1)}.\n\nIsso custa cliente toda semana. Se quiser conversar, é só falar.`,

      `Vou ser honesto porque respeito demais: o ${seg} de vocês tem tudo pra ser referência, mas o visual ainda parece que tá em 2018.\n\n${dor.charAt(0).toUpperCase() + dor.slice(1)}. Já vi isso custar muito pra quem não resolve.\n\nSou designer, e tenho algumas ideias. Topa ouvir?`,

      `Passei pelo perfil de vocês hoje. Produto bom, sem dúvida. Mas tem uma coisa que me chamou atenção:\n\n${dor.charAt(0).toUpperCase() + dor.slice(1)}.\n\nUm detalhe que parece pequeno, mas que o cliente nota antes de decidir contratar. Posso mostrar como resolver em 15 minutos?`,

      `${nome} — não me lembro a última vez que vi um ${seg} com tanta qualidade de serviço mas visual tão aquém do que merece.\n\n${dor.charAt(0).toUpperCase() + dor.slice(1)}. Isso tá acontecendo.\n\nSe curiosidade bateu, estou por aqui.`,
    ],

    diagnostico: [
      `${referral ? referral + " e fui ver o perfil de vocês. " : ""}Trabalho com identidade visual para ${seg} e faço um diagnóstico gratuito de 15 minutos quando vejo potencial real.\n\nVi o perfil de vocês e faz sentido conversar. Sem pitch, sem pressão — só quero mostrar o que enxergo de fora.\n\nTem interesse?`,

      `Tenho feito diagnósticos visuais gratuitos pra ${seg} essa semana. Analiso o que está fraco, o que está funcionando, e o que está custando cliente sem que percebam.\n\n${nome}, vocês apareceram na minha pesquisa e faz sentido conversar. 15 minutos, zero compromisso.\n\nFaz sentido pra você?`,

      `Antes de qualquer coisa: não estou aqui pra te vender nada.\n\nFaço diagnósticos gratuitos do visual de ${seg} — é como eu prospecto, porque prefiro mostrar valor antes de cobrar qualquer coisa.\n\nSe quiser saber o que está travando o crescimento visual do negócio, me chama.`,

      `${nome}, notei algo no perfil de vocês que vale uma conversa rápida.\n\nFaço diagnóstico gratuito de 15 min pra negócios do segmento de ${seg}. Aponto o que vejo de fora, você decide se faz sentido resolver. Nada de papo de vendedor.\n\nTopa?`,
    ],

    gancho: [
      `Uma dúvida genuína: como ${seg} de vocês capta novos clientes hoje?\n\nPergunto porque estou pesquisando como esse mercado funciona aqui na cidade — sou designer e estou entendendo onde as pessoas tomam decisão de contratar.\n\nMe conta?`,

      `Você já parou pra pensar em quantos clientes passaram pelo perfil de vocês, viram o serviço, e foram embora sem contratar — não pelo serviço, mas pela apresentação?\n\nPergunto porque é a principal coisa que vejo em ${seg}. Sou designer, mas primeiro queria entender como vocês enxergam isso.`,

      `${nome}, qual é a maior dificuldade de ${seg} quando o assunto é atrair cliente novo?\n\nPergunto porque estou mapeando isso no mercado — depois explico por quê. Mas primeiro quero ouvir quem está no dia a dia.`,

      `Vi o perfil de vocês e fiquei com uma curiosidade: o que o cliente de ${seg} valoriza mais antes de contratar — o serviço ou a forma como ele é apresentado?\n\nSou designer, então obviamente tenho uma opinião. Mas queria ouvir quem vive isso.`,
    ],

    conselho: [
      `${nome}, você que está no mercado de ${seg} — quando um cliente chega no seu perfil pela primeira vez, o que ele vê primeiro que te diferencia?\n\nPergunto porque estou ajudando negócios do segmento e quero entender o que funciona de verdade antes de dar qualquer sugestão.\n\nSou designer, mas aqui sou só ouvido mesmo.`,

      `Preciso de uma opinião de quem está na área: o visual importa pra quem contrata ${seg}, ou é mais sobre indicação e boca a boca mesmo?\n\nPerguntar pra quem vive isso faz mais sentido que qualquer pesquisa. Sou designer e estou entendendo esse mercado.\n\nMe conta como você vê?`,

      `${nome}, você toparia me dar uma opinião rápida?\n\nEstou trabalhando com ${seg} e quero entender: quando um negócio desse segmento ainda não investiu em identidade visual, o que você acha que está perdendo?\n\nSou designer, mas a perspectiva de quem está dentro vale mais que a minha agora.`,
    ],

    historia: [
      `Mês passado trabalhei com um ${seg} que tinha o mesmo problema que vejo muito por aí: serviço excelente, mas ninguém conseguia transmitir isso visualmente.\n\nReformulamos o perfil, a identidade, a forma de apresentar o serviço. Em 3 semanas o volume de mensagens dobrou.\n\n${nome}, vi o perfil de vocês e lembrei desse caso. Faz sentido conversar?`,

      `Trabalhei com um ${seg} que me disse: "designer é custo, não investimento." Tudo bem, respeitei.\n\nTrês meses depois ele voltou porque o concorrente novo, com metade do tempo de mercado e visual profissional, estava tomando os clientes dele.\n\nNão conto isso pra assustar — conto porque ${nome}, vi o perfil de vocês e não quero que aconteça o mesmo.`,

      `Tem um caso que fico lembrando quando vejo ${seg} com muito potencial:\n\nUma cliente minha demorou 2 anos pra investir em visual. Quando fez, disse que o único arrependimento era não ter feito antes — os clientes novos chegavam diferentes, mais sérios, dispostos a pagar mais.\n\n${nome}, o perfil de vocês tem esse potencial. Topa uma conversa rápida?`,

      `Semana passada entrei numa discussão com um ${seg} que dizia que design é "frescura de grande empresa".\n\nMostrei os números de um cliente do mesmo segmento antes e depois. Ele ficou quieto.\n\n${nome}, não preciso te convencer agora. Só queria mostrar o que enxergo no perfil de vocês se você topar ouvir.`,
    ],

    direto: [
      `${nome}, sou designer e fui ver o perfil de vocês.\n\nTem coisa boa aí. Mas o visual não tá representando o que o negócio vale. ${dor.charAt(0).toUpperCase() + dor.slice(1)}.\n\nSe quiser resolver, me chama. Se não, tudo bem também.`,

      `Não vou enrolar: sou designer, vi o perfil de vocês, e tenho ideias pra ${seg} que podem fazer diferença de verdade.\n\nSe tiver um momento pra conversar, me fala. Se não for o momento, sem problema.`,

      `${nome} — vi o perfil, gostei do que vocês fazem, mas o visual tá travando o crescimento de vocês. Isso é um fato.\n\nSou designer. Posso ajudar. Mas só se fizer sentido pra você agora.\n\nTopa uma conversa rápida?`,

      `Direto ao ponto: sou designer e vi uma oportunidade clara no perfil de vocês.\n\n${dor.charAt(0).toUpperCase() + dor.slice(1)}. Isso tá acontecendo e tem solução.\n\n${nome}, se quiser entender o que enxergo, me chama.`,
    ],

    provocacao: [
      `${nome}, aposto que a última vez que alguém do segmento de ${seg} perdeu cliente por causa do visual, ninguém percebeu que foi isso.\n\nÉ o tipo de coisa que some silenciosamente. O cliente simplesmente vai embora sem falar o motivo.\n\nSou designer. Quando quiser descobrir o quanto isso está custando, me fala.`,

      `Sabe o que é engraçado? A maioria dos ${seg} acredita que cliente escolhe por qualidade de serviço.\n\nMas o cliente decide antes disso — na primeira impressão visual. E quando não gosta, nem chega a ver a qualidade.\n\n${nome}, o perfil de vocês tá ganhando ou perdendo essa batalha silenciosa?`,

      `${nome} — uma pergunta que incomoda:\n\nSe um concorrente novo entrasse no mercado amanhã com o mesmo serviço de vocês, mas com visual impecável, quanto tempo levaria pra ele tomar a clientela de vocês?\n\nSou designer. Pergunto porque a resposta costuma ser menor do que as pessoas imaginam.`,

      `Tenho curiosidade: ${nome}, o ${seg} de vocês já perdeu cliente pra alguém com serviço claramente pior, mas apresentação melhor?\n\nPorque quando isso acontece, a causa raramente é percebida. Sou designer e isso é exatamente o que resolvo.\n\nSe quiser conversar, estou por aqui.`,
    ],

    reativacao: [
      `${nome} — estava revisando alguns perfis essa semana e o de vocês apareceu de novo.\n\nPercebo que tem movimento novo acontecendo no ${seg}. Fiquei curioso se vocês ainda estão pensando em fortalecer o visual ou se tomaram outro caminho.\n\nSó curiosidade mesmo — me fala como estão as coisas por aí.`,

      `Sabe quando algo fica na cabeça sem motivo claro? O perfil de vocês ficou.\n\nNão sei se é o momento certo pra conversar sobre visual, mas quis mandar mesmo assim. Como está o ${seg} de vocês hoje?\n\nSe fizer sentido retomar a conversa, estou por aqui.`,

      `${nome}, uma coisa que surgiu essa semana me fez lembrar de vocês.\n\nEstou trabalhando com um ${seg} com um desafio parecido com o que vi no perfil de vocês — e o resultado tá sendo bem interessante.\n\nSe quiser ouvir o que está dando certo, me fala.`,

      `Passaram uns dias desde que olhei o perfil de vocês pela última vez.\n\nVi que vocês publicaram algumas coisas novas — tem alguns pontos que mudaram pra melhor, mas o núcleo ainda tem espaço pra crescer.\n\n${nome}, se o timing for melhor agora, topo conversar.`,
    ],
  };

  const lista = templates[abordagemId] || templates.direto;
  return pick(lista);
}

// Gera análise de dor local (sem API)
function gerarDorLocal(p) {
  const seg = p.segment || "esse negócio";
  const nicho = NICHOS.find(n => seg.toLowerCase().includes(n.nome.toLowerCase().split(" ")[0]));

  const fraquezas = nicho ? [nicho.dor] : [
    "Visual sem identidade clara, parece feito no Canva sem critério",
    "Inconsistência entre o que o negócio entrega e como se apresenta visualmente",
    "Feed/site sem hierarquia visual — o olho do cliente não sabe onde parar",
    "Ausência de elementos visuais que transmitam autoridade e confiança",
    "Identidade genérica, poderia ser qualquer concorrente do mesmo segmento",
  ];

  const dores = [
    "Isso faz o cliente hesitar antes mesmo de ler o serviço — a primeira impressão não convence.",
    "Clientes com poder de compra maior passam direto, porque o visual não transmite o valor real.",
    "Perda silenciosa: o cliente visita, não contrata, e você nunca sabe o motivo real.",
    "O concorrente com serviço igual mas visual melhor está levando os clientes que deveriam ser seus.",
  ];

  const ganchos = [
    `Abordagem ideal: comece apontando especificamente o que está fraco no visual — seja o logo, o feed ou o site. Use bom humor. Quem tem orgulho do trabalho mas sabe que o visual tá aquém responde bem a isso.`,
    `Abordagem ideal: ofereça um diagnóstico gratuito de 15 minutos. Nesse segmento, mostrar valor antes de cobrar é o que diferencia.`,
    `Abordagem ideal: conte uma história de transformação de um negócio parecido. Resultado concreto antes de qualquer pitch.`,
  ];

  return `1. Fraqueza provável: ${pick(fraquezas)}\n\n2. Dor real: ${pick(dores)}\n\n3. ${pick(ganchos)}`;
}

// Gera sequência de 3 mensagens sem API
function gerarSequencia(p) {
  const nome = getNome(p);
  const seg  = getSegmento(p);

  const dia1Options = [
    {
      dia: "Dia 1 — Abertura de valor",
      tom: "curiosidade / sem pitch",
      msg: gerarMensagem(p, pick(["gancho","roast","diagnostico"])),
    },
  ];

  const dia2Options = [
    {
      dia: "Dia 3-4 — Follow-up com prova",
      tom: "social proof / resultado",
      msg: pick([
        `${nome}, mandei uma mensagem há alguns dias e não quis ser chato.\n\nMas essa semana fechei um trabalho com um ${seg} bem parecido com o de vocês — e os primeiros resultados já apareceram.\n\nSe quiser ouvir o que foi feito, me fala.`,
        `Lembrei de vocês porque terminei um projeto pra um ${seg} ontem.\n\nA diferença que um visual bem feito faz na percepção do cliente é difícil de explicar sem mostrar — mas quando mostra, fica evidente.\n\n${nome}, se quiser ver, é só falar.`,
        `${nome} — só um follow-up rápido.\n\nEstive olhando referências de ${seg} com identidade visual forte essa semana. Tem coisas que poderiam se aplicar direto ao perfil de vocês.\n\nMando se quiser dar uma olhada?`,
      ]),
    },
  ];

  const dia3Options = [
    {
      dia: "Dia 7-10 — Encerramento com porta aberta",
      tom: "leve / sem pressão",
      msg: pick([
        `${nome}, última mensagem — prometo.\n\nSe não for o momento certo pra falar sobre visual agora, tudo bem. Guarda o contato.\n\nQuando chegar a hora, me chama.`,
        `Vou deixar a porta aberta: se em algum momento o visual de vocês virar prioridade, pode me chamar.\n\n${nome}, sem pressão nenhuma. Só queria que soubesse que a opção está aqui.`,
        `${nome} — não vou mais insistir depois disso.\n\nSó queria que ficasse claro: se um dia o visual do ${seg} de vocês virar prioridade, me lembra. Tenho bastante referência desse segmento e o trabalho seria cirúrgico.\n\nAté mais.`,
      ]),
    },
  ];

  return [pick(dia1Options), pick(dia2Options), pick(dia3Options)];
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
  const [editNota,  setEditNota] = useState({});
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

  function analisarDor(p) {
    const txt = gerarDorLocal(p);
    setProspects(prev => prev.map(x => x.id === p.id ? { ...x, dor_ia: txt } : x));
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

                  {/* Mover estágio */}
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

                  {/* Análise de Dor */}
                  <div style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <span style={{ color:"#818cf8", fontWeight:700, fontSize:12 }}>🧠 Análise de Dor</span>
                      <button
                        onClick={() => analisarDor(p)}
                        style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:7, padding:"5px 12px", color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                        {p.dor_ia ? "🔄 Reanalisar" : "⚡ Analisar agora"}
                      </button>
                    </div>
                    {p.dor_ia ? (
                      <div style={{ color:"#c4c4e0", fontSize:12, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{p.dor_ia}</div>
                    ) : (
                      <div style={{ color:"#3a3a5a", fontSize:12, fontStyle:"italic" }}>
                        Clique em "Analisar agora" para mapear as dores e oportunidades desse prospect.
                      </div>
                    )}
                  </div>

                  {/* Suas observações */}
                  <div style={{ background:"#0f0f1a", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <span style={{ color:"#f59e0b", fontWeight:700, fontSize:12 }}>✍️ Minhas observações</span>
                      {editNota[p.id] !== undefined && (
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
                      placeholder="O que você percebeu sobre esse prospect? Comportamento nas redes, objeções prováveis, timing, algo que a análise não captou..."
                      rows={3}
                      style={{ width:"100%", background:"#13131f", border:"1px solid #2a2a45", borderRadius:8, padding:"9px 12px", color:"#e8e6f0", fontSize:12, outline:"none", fontFamily:"inherit", resize:"vertical", lineHeight:1.7, boxSizing:"border-box" }}
                    />
                    {p.notas_dor && editNota[p.id] === undefined && (
                      <div style={{ color:"#5a5a7a", fontSize:10, marginTop:4 }}>✓ Salvo — clique no campo para editar</div>
                    )}
                  </div>

                  {/* Ações */}
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
  const [diagUrl, setDiagUrl] = useState("");
  const [diagRes, setDiagRes] = useState("");

  function diagnosticar() {
    if (!diagUrl) return;
    const segmentoDetectado = NICHOS.find(n =>
      diagUrl.toLowerCase().includes(n.nome.toLowerCase().split(" ")[0])
    );
    const p = {
      name: diagUrl,
      segment: segmentoDetectado?.nome || "",
      notes: "",
      notas_dor: "",
      dor_ia: "",
    };
    setDiagRes(gerarDorLocal(p));
  }

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#6d28d915,#13131f)", border:"1px solid #6366f130", borderRadius:16, padding:"20px 22px", marginBottom:24 }}>
        <div style={{ fontWeight:700, fontSize:15, color:"#e8e6f0", marginBottom:6 }}>🔍 Diagnóstico de Perfil</div>
        <div style={{ fontSize:13, color:"#6a6a8a", marginBottom:14 }}>Cole o nome do negócio ou segmento. Veja as principais dores e o melhor ângulo de abordagem.</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={diagUrl} onChange={e => setDiagUrl(e.target.value)}
            placeholder="Ex: clínica de estética · dentista · personal trainer"
            style={{ flex:1, background:"#1a1a2e", border:"1px solid #2a2a45", borderRadius:9, padding:"10px 13px", color:"#e8e6f0", fontSize:13, outline:"none", fontFamily:"inherit" }}/>
          <button onClick={diagnosticar} disabled={!diagUrl}
            style={{ background:"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"none", borderRadius:9, padding:"10px 18px", color:"#fff", fontSize:13, fontWeight:700, cursor:!diagUrl?"not-allowed":"pointer", fontFamily:"inherit", opacity:!diagUrl?0.5:1, whiteSpace:"nowrap" }}>
            Analisar 🎯
          </button>
        </div>
        {diagRes && (
          <div style={{ marginTop:16, background:"#13131f", border:"1px solid #2a2a45", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ color:"#818cf8", fontWeight:700, fontSize:12, marginBottom:8 }}>Análise de oportunidade:</div>
            <div style={{ color:"#c4c4e0", fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{diagRes}</div>
            <div style={{ marginTop:12 }}>
              <button
                onClick={() => { onAdd(diagUrl); setDiagRes(""); setDiagUrl(""); }}
                style={{ background:"#6366f120", border:"1px solid #6366f140", borderRadius:8, padding:"7px 14px", color:"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                + Adicionar ao pipeline
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom:10 }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#e8e6f0", marginBottom:12 }}>🎯 Nichos com alta oportunidade</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))", gap:10 }}>
          {NICHOS.map(n => (
            <div key={n.nome}
              style={{ background:"#13131f", border:"1px solid #1e1e30", borderRadius:12, padding:"13px 15px" }}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR MENSAGEM
// ─────────────────────────────────────────────────────────────────────────────
function CriarMensagem({ selectedProspect, prospects }) {
  const [selId,     setSelId]     = useState(selectedProspect?.id ? String(selectedProspect.id) : "");
  const [abordagem, setAbordagem] = useState("roast");
  const [mensagem,  setMensagem]  = useState("");
  const [copiado,   setCopiado]   = useState(false);

  const prospect = prospects.find(p => String(p.id) === String(selId));
  const ab = ABORDAGENS.find(a => a.id === abordagem);

  function gerar() {
    if (!prospect) return;
    setMensagem(gerarMensagem(prospect, abordagem));
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
          {prospect.dor_ia    && <div style={{ color:"#8a8aaa", fontSize:12, lineHeight:1.6, marginBottom:prospect.notas_dor?8:0 }}>{prospect.dor_ia.substring(0,200)}{prospect.dor_ia.length>200?"...":""}</div>}
          {prospect.notas_dor && <div style={{ color:"#f59e0b88", fontSize:12, lineHeight:1.6, fontStyle:"italic" }}>✍️ {prospect.notas_dor}</div>}
        </div>
      )}

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:"#5a5a7a", fontWeight:600, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.07em" }}>Abordagem</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:8 }}>
          {ABORDAGENS.map(a => (
            <button key={a.id} onClick={() => { setAbordagem(a.id); setMensagem(""); }}
              style={{ background:abordagem===a.id?"#6366f130":"#13131f", border:`1px solid ${abordagem===a.id?"#6366f1":"#1e1e30"}`, borderRadius:10, padding:"11px 13px", textAlign:"left", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ fontSize:16, marginBottom:4 }}>{a.icon}</div>
              <div style={{ color:abordagem===a.id?"#a78bfa":"#c4c4e0", fontWeight:700, fontSize:12 }}>{a.nome}</div>
              <div style={{ color:"#5a5a7a", fontSize:11, marginTop:3, lineHeight:1.4 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button onClick={gerar} disabled={!prospect}
        style={{ background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"1px solid #6366f140", borderRadius:10, padding:"12px 24px", color:!prospect?"#5a5a7a":"#fff", fontSize:14, fontWeight:700, cursor:!prospect?"not-allowed":"pointer", fontFamily:"inherit", width:"100%", marginBottom:16 }}>
        ✨ Gerar mensagem
      </button>

      {mensagem && (
        <div style={{ background:"#13131f", border:"1px solid #2a2a45", borderRadius:14, padding:"18px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:"#818cf8", fontWeight:700, fontSize:13 }}>{ab?.icon} {ab?.nome}</span>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={gerar}
                style={{ background:"none", border:"1px solid #2a2a45", borderRadius:8, padding:"5px 12px", color:"#5a5a7a", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                🔄 Outra versão
              </button>
              <button onClick={copiar}
                style={{ background:copiado?"#10b98120":"#6366f120", border:`1px solid ${copiado?"#10b98140":"#6366f140"}`, borderRadius:8, padding:"5px 14px", color:copiado?"#10b981":"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {copiado ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            </div>
          </div>
          <div style={{ color:"#e8e6f0", fontSize:14, lineHeight:1.9, whiteSpace:"pre-wrap" }}>{mensagem}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUÊNCIA DE 3
// ─────────────────────────────────────────────────────────────────────────────
function Sequencia({ prospects }) {
  const [selId,   setSelId]   = useState("");
  const [msgs,    setMsgs]    = useState([]);
  const [copiado, setCopiado] = useState(null);

  const prospect = prospects.find(p => String(p.id) === String(selId));

  function gerar() {
    if (!prospect) return;
    setMsgs(gerarSequencia(prospect));
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
        <div style={{ color:"#5a5a7a", fontSize:12 }}>Dia 1 → Dia 3-4 → Dia 7-10. Tom diferente em cada uma. Se não responder após a 3ª, deixa quieto por 30 dias e retoma.</div>
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
          <div style={{ color:"#818cf8", fontWeight:700, fontSize:11, marginBottom:4 }}>🧠 Contexto que será usado na sequência:</div>
          {prospect.dor_ia    && <div style={{ color:"#8a8aaa", fontSize:12, lineHeight:1.5 }}>{prospect.dor_ia.substring(0,150)}...</div>}
          {prospect.notas_dor && <div style={{ color:"#f59e0b88", fontSize:12, marginTop:4, fontStyle:"italic" }}>✍️ {prospect.notas_dor}</div>}
        </div>
      )}

      <button onClick={gerar} disabled={!prospect}
        style={{ background:!prospect?"#1a1a2e":"linear-gradient(135deg,#6d28d9,#a78bfa)", border:"1px solid #6366f140", borderRadius:10, padding:"12px 24px", color:!prospect?"#5a5a7a":"#fff", fontSize:14, fontWeight:700, cursor:!prospect?"not-allowed":"pointer", fontFamily:"inherit", width:"100%", marginBottom:20 }}>
        📅 Gerar sequência de 3
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
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={gerar}
              style={{ flex:1, background:"none", border:"1px solid #2a2a45", borderRadius:10, padding:"10px", color:"#5a5a7a", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
              🔄 Gerar outra sequência
            </button>
          </div>
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
      {tab==="mensagem"  && <CriarMensagem selectedProspect={msgProspect} prospects={prospects}/>}
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
