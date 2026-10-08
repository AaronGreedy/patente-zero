/* Patente B — Zero Errori
   Archivio ufficiale (listato A/B Portale dell'Automobilista) + ripetizione mirata. */

'use strict';

const FAST = 4000;        // una risposta "immediata"
const FAST_STREAK = 3;    // immediate di fila -> la domanda esce dal giro
const HESIT = 15000;      // oltre questo, giusta ma esitata
const SIM_N = 30;
const SIM_MS = 20 * 60 * 1000;
const KEY = 'patente-zero:v1';

let BANK = null;
let EXPL = null;
let run = null;
let tick = null;

/* ---------- stato salvato ---------- */
function vuoto() { return { q: {}, sims: [] }; }
let S = vuoto();

function carica() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return vuoto();
    const o = JSON.parse(raw);
    return (o && o.q) ? o : vuoto();
  } catch (e) { return vuoto(); }
}
function salva() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* quota o modalità privata */ }
}
function scheda(id) {
  if (!S.q[id]) S.q[id] = { a: 0, c: 0, w: 0, f: 0, o: null, h: false, t: 0, s: false, r: false, d: 0 };
  return S.q[id];
}

/* ---------- classificazione ---------- */
function stato(id) {
  const r = S.q[id];
  if (!r || !r.a) return 'nuova';
  if (r.s) return 'tolta';
  if (r.r || r.o === 0) return 'debole';
  if (r.h) return 'instabile';
  if (r.f >= FAST_STREAK) return 'sicura';
  if (r.c >= 3 && r.w === 0) return 'sicura';
  return 'instabile';
}
function conteggi() {
  const n = { nuova: 0, sicura: 0, instabile: 0, debole: 0, tolta: 0 };
  for (const q of BANK.questions) n[stato(q.id)]++;
  return n;
}

/* priorità per l'allenamento: più basso = prima */
function priorita(id) {
  const st = stato(id);
  if (st === 'tolta' || st === 'sicura') return null;
  if (st === 'debole') return 0;
  if (st === 'instabile') return 1;
  return 2; // nuova
}

function mescola(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pescaAllenamento(n, soloDaRipassare) {
  const secchi = [[], [], []];
  for (const q of BANK.questions) {
    const p = priorita(q.id);
    if (p === null) continue;
    if (soloDaRipassare && p === 2) continue;
    secchi[p].push(q);
  }
  secchi.forEach(mescola);
  const out = [];
  for (const s of secchi) { for (const q of s) { if (out.length >= n) break; out.push(q); } }
  return out;
}

function pescaSimulazione() {
  // una simulazione deve restare un esame onesto: pesca a caso da tutto
  // l'archivio, togliendo solo quelle che hai messo da parte con la stellina.
  const pool = BANK.questions.filter(q => !(S.q[q.id] && S.q[q.id].s));
  return mescola(pool.slice()).slice(0, SIM_N);
}

/* ---------- registrazione risposta ---------- */
function registra(id, giusto, ms) {
  const r = scheda(id);
  const prima = stato(id);
  r.a++; r.t = ms; r.d = Date.now();
  if (giusto) {
    r.c++; r.o = 1;
    r.h = ms > HESIT;
    r.f = (ms < FAST && !r.h) ? r.f + 1 : 0;
    if (r.r && !r.h) r.r = false;   // "riproponimela" si consuma quando la sai
  } else {
    r.w++; r.o = 0; r.h = false; r.f = 0;
  }
  const dopo = stato(id);
  return { prima, dopo, autoTolta: dopo === 'sicura' && prima !== 'sicura' && r.f >= FAST_STREAK };
}

/* ---------- utilità ---------- */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function mmss(ms) {
  if (ms < 0) ms = 0;
  const t = Math.round(ms / 1000);
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
}
function secs(ms) { return Math.round(ms / 1000) + 's'; }
function mila(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

/* sottolinea nel testo le parole che il "focus" indica come trabocchetto */
function evidenzia(testo, focus) {
  let html = esc(testo);
  if (!focus) return html;
  const cand = [];
  const re = /['"«]([^'"«»]{3,40})['"»]/g;
  let m;
  while ((m = re.exec(focus)) !== null) cand.push(m[1].trim());
  const visti = new Set();
  for (const c of cand) {
    if (!c || visti.has(c.toLowerCase())) continue;
    visti.add(c.toLowerCase());
    const needle = esc(c);
    const i = html.toLowerCase().indexOf(needle.toLowerCase());
    if (i < 0) continue;
    if (html.slice(0, i).includes('<span class="trap">')) {
      // evita di annidare: salta se già dentro un marcatore aperto
      const aperti = (html.slice(0, i).match(/<span class="trap">/g) || []).length;
      const chiusi = (html.slice(0, i).match(/<\/span>/g) || []).length;
      if (aperti > chiusi) continue;
    }
    html = html.slice(0, i) + '<span class="trap">' + html.slice(i, i + needle.length) + '</span>' + html.slice(i + needle.length);
  }
  return html;
}

async function spiegazioni() {
  if (EXPL) return EXPL;
  const r = await fetch('data/explanations.json');
  EXPL = await r.json();
  return EXPL;
}

/* ---------- icone ---------- */
const I_STELLA = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><polygon points="12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76 12 2.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></polygon></svg>';
const I_ROTA = '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><polyline points="22 4 22 9.6 16.4 9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline><path d="M19.6 14.5A8.4 8.4 0 1 1 17.6 5.7L22 9.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
const I_X = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="#A62A1B" stroke-width="3.2" stroke-linecap="round" fill="none"></path></svg>';
const I_V = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><polyline points="4 12.5 9.5 18.5 20 6" stroke="#16794F" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></polyline></svg>';
const I_GIU = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><polyline points="6 9.5 12 15.5 18 9.5" stroke="#16171A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"></polyline></svg>';

/* ---------- navigazione ---------- */
const VIEWS = ['home', 'quiz', 'risultato', 'correzione', 'progresso'];
function show(name) {
  for (const v of VIEWS) document.getElementById('v-' + v).hidden = (v !== name);
  window.scrollTo(0, 0);
}
function el(id) { return document.getElementById(id); }

/* ---------- HOME ---------- */
function renderHome() {
  if (tick) { clearInterval(tick); tick = null; }
  run = null;
  const n = conteggi();
  const viste = n.sicura + n.instabile + n.debole;
  const tot = BANK.questions.length;
  const daRipassare = n.debole + n.instabile;
  const serie = serieZero();

  const titolo = n.debole === 0 && viste > 0 ? 'Niente di debole' : (viste === 0 ? 'Si comincia' : 'Quasi pronto');
  const sotto = viste === 0
    ? mila(tot) + ' domande ufficiali, mai toccate. Parti da una simulazione per capire dove sei.'
    : (n.debole === 0
      ? 'Nessuna domanda debole in questo momento. Tieni la serie con una simulazione.'
      : mila(n.debole) + ' domande sono ancora deboli. Finché restano lì, lo zero non è sicuro.');

  el('v-home').innerHTML = `
    <div class="stack gap36" style="flex:1 1 auto">
      <div class="stack gap10">
        <div class="lbl">STATO DI PREPARAZIONE</div>
        <h1 class="h1">${esc(titolo)}</h1>
        <p class="sub">${esc(sotto)}</p>
      </div>

      <div class="stack gap20">
        <div class="bar" role="img" aria-label="${n.sicura} sicure, ${n.instabile} instabili, ${n.debole} deboli, ${n.nuova} mai viste">
          ${n.sicura ? `<i class="seg-ok" style="flex:${n.sicura}"></i>` : ''}
          ${n.instabile ? `<i class="seg-mid" style="flex:${n.instabile}"></i>` : ''}
          ${n.debole ? `<i class="seg-low" style="flex:${n.debole}"></i>` : ''}
          ${n.nuova ? `<i class="seg-new" style="flex:${n.nuova}"></i>` : ''}
        </div>
        <div class="stats">
          <div class="stack gap7"><div class="num">${n.sicura}</div><div class="k"><span class="dot" style="background:var(--ink)"></span>Sicure</div></div>
          <div class="stack gap7"><div class="num">${n.instabile}</div><div class="k"><span class="dot" style="background:var(--grey)"></span>Instabili</div></div>
          <div class="stack gap7"><div class="num">${n.debole}</div><div class="k"><span class="dot" style="background:var(--bg);border:1.5px solid var(--hair)"></span>Deboli</div></div>
        </div>
        <p class="note">${mila(n.nuova)} mai viste${n.tolta ? ' · ' + n.tolta + ' messe da parte' : ''} · archivio di ${mila(tot)}</p>
      </div>

      <div class="grow"></div>

      <div class="stack gap14">
        <button class="btn big" id="b-allena" type="button">
          <span>Allenati</span><small>${daRipassare ? mila(daRipassare) + ' da ripassare' : 'parti dalle nuove'}</small>
        </button>
        <div class="stack gap10">
          <button class="btn-o" id="b-sim" type="button">Simulazione 30</button>
          <div class="meta tnum">30 domande · 20 minuti · massimo 3 errori</div>
        </div>
        <div class="stack gap10">
          <button class="btn-o" id="b-inf" type="button">Infinity</button>
          <div class="meta">Senza timer, correzione subito · le messe da parte restano fuori</div>
        </div>
      </div>

      <button class="bar-top" id="b-prog" type="button" style="background:none;border:0;border-top:1px solid var(--rule);padding:18px 0 0;cursor:pointer;width:100%">
        <span style="font-size:13.5px;font-weight:500;color:var(--mute)">Simulazioni a zero errori di fila</span>
        <span style="display:flex;align-items:center;gap:7px">
          ${[0, 1, 2].map(i => `<span class="dot" style="${i < serie ? 'background:var(--ok)' : 'background:var(--bg);border:1.5px solid var(--hair)'}"></span>`).join('')}
          <span class="tnum" style="font-size:13.5px;font-weight:600;padding-left:3px">${serie} / 3</span>
        </span>
      </button>
    </div>`;

  el('b-allena').onclick = () => avvia('allena');
  el('b-sim').onclick = () => avvia('sim');
  el('b-inf').onclick = () => avvia('infinity');
  el('b-prog').onclick = renderProgresso;
  show('home');
}

function serieZero() {
  let k = 0;
  for (let i = S.sims.length - 1; i >= 0; i--) { if (S.sims[i].e === 0) k++; else break; }
  return Math.min(k, 3);
}

/* ---------- avvio sessione ---------- */
function avvia(modo) {
  let lista;
  if (modo === 'sim') lista = pescaSimulazione();
  else if (modo === 'allena') lista = pescaAllenamento(20, true).concat(pescaAllenamento(20, false)).slice(0, 20);
  else lista = pescaAllenamento(40, false);

  if (!lista.length) {
    lista = mescola(BANK.questions.filter(q => !(S.q[q.id] && S.q[q.id].s)).slice()).slice(0, 20);
  }
  run = {
    modo, lista, i: 0, risposte: [], tolteAuto: 0,
    inizio: Date.now(), scadenza: modo === 'sim' ? Date.now() + SIM_MS : 0,
    mostrata: Date.now(), risposto: null
  };
  if (modo === 'sim') {
    tick = setInterval(() => {
      if (!run || run.modo !== 'sim') return;
      const r = el('q-timer');
      if (r) r.textContent = mmss(run.scadenza - Date.now());
      if (Date.now() >= run.scadenza) chiudiSim();
    }, 500);
  }
  renderQuiz();
}

/* ---------- QUIZ ---------- */
function renderQuiz() {
  const q = run.lista[run.i];
  run.mostrata = Date.now();
  run.risposto = null;
  const sim = run.modo === 'sim';

  const testa = sim
    ? `<div class="bar-top">
         <span class="tnum" style="font-size:13px;font-weight:600;color:var(--mute)">${run.i + 1} / ${run.lista.length}</span>
         <span class="tnum" id="q-timer" style="font-size:13px;font-weight:500;color:var(--grey)">${mmss(run.scadenza - Date.now())}</span>
       </div>
       <div class="prog"><i style="width:${(run.i / run.lista.length) * 100}%"></i></div>`
    : `<div class="bar-top">
         <div class="stack gap6">
           <span class="lbl">${run.modo === 'infinity' ? 'INFINITY' : 'ALLENAMENTO'}</span>
           <span class="tnum" style="font-size:13px;color:var(--mute)">${run.i + 1} di ${run.lista.length} · nessun timer</span>
         </div>
         <button class="linkish" id="q-esci" type="button">Esci</button>
       </div>`;

  el('v-quiz').innerHTML = `
    <div class="stack gap28" style="flex:1 1 auto">
      ${testa}
      ${q.image ? `<div class="figura"><img src="${esc(q.image)}" alt="Figura della domanda" loading="eager"></div>` : ''}
      <p class="qtext">${esc(q.text)}</p>
      <div class="grow"></div>
      <div class="stack gap14">
        <div class="vfrow">
          <button class="vf" type="button" data-v="1">VERO</button>
          <button class="vf" type="button" data-v="0">FALSO</button>
        </div>
        <p class="note center">${sim ? 'Nessuna correzione adesso: le risposte le vedi tutte alla fine.' : 'Rispondi e ti dico subito com&rsquo;è andata, con la spiegazione.'}</p>
      </div>
    </div>`;

  el('v-quiz').querySelectorAll('.vf').forEach(b => {
    b.onclick = () => rispondi(b.dataset.v === '1');
  });
  const ex = el('q-esci');
  if (ex) ex.onclick = renderHome;
  show('quiz');
}

function rispondi(val) {
  const q = run.lista[run.i];
  const ms = Date.now() - run.mostrata;
  const giusto = (val === q.answer);
  const esito = registra(q.id, giusto, ms);
  if (esito.autoTolta) run.tolteAuto++;
  run.risposte.push({ id: q.id, data: val, giusto, ms });
  salva();

  if (run.modo === 'sim') { avanti(); return; }
  renderEsito(q, giusto, ms);
}

async function renderEsito(q, giusto, ms) {
  const E = await spiegazioni().catch(() => ({}));
  const sp = E[q.id] || {};
  const r = scheda(q.id);

  const corpo = `
    ${sp.focus ? `<span class="chip">Trabocchetto · ${esc(sintesiFocus(sp.focus))}</span>` : ''}
    ${sp.text ? `<p class="exp">${esc(sp.text)}</p>` : '<p class="exp">Per questa domanda non c&rsquo;è una spiegazione nell&rsquo;archivio.</p>'}
    ${sp.rule ? `<p class="rule">${esc(sp.rule)}</p>` : ''}`;

  el('v-quiz').innerHTML = `
    <div class="stack gap22 scroll" style="flex:1 1 auto">
      <div class="lbl">${run.modo === 'infinity' ? 'INFINITY' : 'ALLENAMENTO'}</div>
      <div class="stack gap6">
        <div class="verdict">${giusto ? I_V : I_X}<span class="num ${giusto ? 'v-ok' : 'v-no'}">${giusto ? 'Giusto' : 'Sbagliato'}</span></div>
        <div style="font-size:17px;color:var(--mute)">
          ${giusto
            ? `Hai detto <strong style="font-weight:600;color:var(--ink)">${q.answer ? 'VERO' : 'FALSO'}</strong>, in ${secs(ms)}.`
            : `Hai detto ${q.answer ? 'FALSO' : 'VERO'}. La risposta giusta era <strong style="font-weight:600;color:var(--ink)">${q.answer ? 'VERO' : 'FALSO'}</strong>.`}
        </div>
      </div>
      ${q.image ? `<div class="figura" style="min-height:0"><img src="${esc(q.image)}" alt="Figura della domanda" style="max-height:150px"></div>` : ''}
      <p class="qtext sm">${evidenzia(q.text, sp.focus)}</p>

      ${giusto
        ? `<details class="spiega"><summary>Spiegazione ${I_GIU}</summary><div class="spiega-body">${corpo}</div></details>`
        : `<div class="stack gap14">${corpo}</div>`}

      <div class="grow"></div>

      <div class="tgs">
        <button class="tg" id="t-star" type="button" aria-pressed="${r.s ? 'true' : 'false'}">
          ${I_STELLA}<b>Troppo facile</b><i>toglila dal giro</i>
        </button>
        <button class="tg" id="t-again" type="button" aria-pressed="${r.r ? 'true' : 'false'}">
          ${I_ROTA}<b>Falla tornare</b><i>${giusto ? 'ho tirato a indovinare' : 'presto e spesso'}</i>
        </button>
      </div>
      <button class="btn" id="b-next" type="button">Avanti</button>
    </div>`;

  el('t-star').onclick = e => { const b = e.currentTarget; r.s = !r.s; b.setAttribute('aria-pressed', r.s ? 'true' : 'false'); salva(); };
  el('t-again').onclick = e => { const b = e.currentTarget; r.r = !r.r; b.setAttribute('aria-pressed', r.r ? 'true' : 'false'); salva(); };
  el('b-next').onclick = avanti;
}

/* accorcia il focus in una riga da pastiglia */
function sintesiFocus(f) {
  const m = f.match(/['"«]([^'"«»]{2,40})['"»]/g);
  if (m && m.length) {
    const parole = m.map(x => x.replace(/^['"«]|['"»]$/g, '')).slice(0, 2);
    return parole.join(' / ');
  }
  return f.length > 46 ? f.slice(0, 44).trim() + '…' : f;
}

function avanti() {
  run.i++;
  if (run.i >= run.lista.length) {
    if (run.modo === 'sim') { chiudiSim(); return; }
    // allenamento/infinity: ripesca e si continua
    const altre = run.modo === 'infinity' ? pescaAllenamento(40, false) : pescaAllenamento(20, true);
    if (!altre.length) { renderHome(); return; }
    run.lista = altre; run.i = 0;
  }
  renderQuiz();
}

/* ---------- fine simulazione ---------- */
function chiudiSim() {
  if (tick) { clearInterval(tick); tick = null; }
  const durata = Math.min(Date.now() - run.inizio, SIM_MS);
  const errori = run.risposte.filter(r => !r.giusto).length;
  const nonDate = run.lista.length - run.risposte.length;
  S.sims.push({ at: Date.now(), e: errori + nonDate, ms: durata, n: run.lista.length });
  if (S.sims.length > 60) S.sims = S.sims.slice(-60);
  salva();
  run.errori = errori + nonDate;
  run.durata = durata;
  renderRisultato();
}

function daRipassare() {
  return run.risposte
    .map(r => {
      const q = BANK.questions.find(x => x.id === r.id);
      let motivo = null;
      if (!r.giusto) motivo = { t: 'SBAGLIATA', bad: true };
      else if (r.ms > HESIT) motivo = { t: 'ESITATA · ' + secs(r.ms), bad: false };
      else if (S.q[r.id] && S.q[r.id].r) motivo = { t: 'SEGNATA DA TE', bad: false };
      return motivo ? { q, r, motivo } : null;
    })
    .filter(Boolean);
}

function renderRisultato() {
  const lista = daRipassare();
  const lento = run.risposte.reduce((m, r) => Math.max(m, r.ms), 0);
  const ok = run.errori <= 3;

  el('v-risultato').innerHTML = `
    <div class="stack gap26" style="flex:1 1 auto">
      <div class="stack gap6">
        <div class="lbl">SIMULAZIONE ${S.sims.length}</div>
        <h1 class="h1">${run.errori} ${run.errori === 1 ? 'errore' : 'errori'}</h1>
        <p class="sub">${run.errori === 0
          ? 'Zero. Questa è la serie che conta: te ne mancano ' + (3 - serieZero()) + ' su 3.'
          : (ok ? 'Superata: il limite d&rsquo;esame è 3. Ma non è ancora zero.' : 'Non superata: il limite d&rsquo;esame è 3 errori.')}</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:16px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)">
        <div class="stack" style="gap:4px"><div class="num tnum" style="font-size:32px">${mmss(run.durata)}</div><div style="font-size:12.5px;color:var(--mute)">Tempo · limite 20:00</div></div>
        <div class="stack" style="gap:4px"><div class="num tnum" style="font-size:32px">${secs(lento)}</div><div style="font-size:12.5px;color:var(--mute)">Risposta più lenta</div></div>
      </div>

      <div class="stack scroll" style="flex:1 1 auto;min-height:0">
        <div class="bar-top" style="padding-bottom:12px">
          <span class="lbl">ENTRANO NEL RIPASSO</span>
          <span class="num tnum" style="font-size:22px">${lista.length}</span>
        </div>
        ${lista.length ? lista.slice(0, 8).map(x => `
          <div class="row">
            <span class="tag ${x.motivo.bad ? 'bad' : ''}">${esc(x.motivo.t)}</span>
            <span class="q">${esc(x.q.text)}</span>
          </div>`).join('') + (lista.length > 8 ? `<p class="note" style="padding-top:12px">e altre ${lista.length - 8}</p>` : '')
        : '<p class="sub">Niente da ripassare: tutte giuste e senza esitazioni.</p>'}
      </div>

      <button class="btn" id="b-corr" type="button">${lista.length ? 'Rivedi le ' + run.lista.length + ' domande' : 'Vedi tutte le risposte'}</button>
    </div>`;
  el('b-corr').onclick = renderCorrezione;
  show('risultato');
}

/* ---------- CORREZIONE ---------- */
function renderCorrezione() {
  const righe = run.risposte.map(r => {
    const q = BANK.questions.find(x => x.id === r.id);
    const sc = scheda(q.id);
    let tag, bad = false;
    if (!r.giusto) { tag = 'SBAGLIATA'; bad = true; }
    else if (r.ms > HESIT) tag = 'GIUSTA IN ' + secs(r.ms);
    else if (r.ms < FAST) tag = 'GIUSTA IN ' + secs(r.ms) + (sc.f >= FAST_STREAK ? ' · ' + sc.f + 'ª DI FILA' : '');
    else tag = 'GIUSTA IN ' + secs(r.ms);
    return { q, sc, tag, bad };
  });

  el('v-correzione').innerHTML = `
    <div class="stack gap20" style="flex:1 1 auto">
      <div class="stack gap7">
        <h1 class="h2">Com&rsquo;è andata</h1>
        <p class="sub">Ecco le risposte, tutte insieme. Togli quelle che sai davvero, rimetti in gioco quelle indovinate.</p>
      </div>
      ${run.tolteAuto ? `<div style="background:var(--paper);border-radius:14px;padding:14px 16px">
        <p class="note">Ne ho tolte <strong style="font-weight:600;color:var(--ink)">${run.tolteAuto}</strong> da solo: giuste sotto i 4 secondi, ${FAST_STREAK} volte di fila. Quello che segni qui vale anche in Infinity.</p>
      </div>` : `<p class="note">Quello che segni qui vale anche in Infinity, e viceversa.</p>`}

      <div class="stack scroll" style="flex:1 1 auto;min-height:0" id="corr-list">
        ${righe.map((x, k) => `
          <div class="rowx">
            <div class="body">
              <span class="tag ${x.bad ? 'bad' : ''}" style="font-size:10.5px;font-weight:600;letter-spacing:.1em;color:${x.bad ? 'var(--no)' : 'var(--mute)'}">${esc(x.tag)}</span>
              <span style="font-size:13.5px;line-height:1.34">${esc(x.q.text)}</span>
            </div>
            <div class="acts">
              <button class="tg-s" type="button" data-k="${k}" data-f="s" aria-pressed="${x.sc.s ? 'true' : 'false'}" aria-label="Troppo facile: toglila dal giro">${I_STELLA}</button>
              <button class="tg-s" type="button" data-k="${k}" data-f="r" aria-pressed="${x.sc.r ? 'true' : 'false'}" aria-label="Riproponimela">${I_ROTA}</button>
            </div>
          </div>`).join('')}
      </div>

      <button class="btn" id="b-fine" type="button">Fine</button>
    </div>`;

  el('corr-list').onclick = e => {
    const b = e.target.closest('.tg-s');
    if (!b) return;
    const x = righe[+b.dataset.k];
    const campo = b.dataset.f;
    x.sc[campo] = !x.sc[campo];
    b.setAttribute('aria-pressed', x.sc[campo] ? 'true' : 'false');
    salva();
  };
  el('b-fine').onclick = renderProgresso;
  show('correzione');
}

/* ---------- PROGRESSO ---------- */
function renderProgresso() {
  const serie = serieZero();
  const ultime = S.sims.slice(-12);
  const maxE = Math.max(6, ...ultime.map(s => s.e));
  const H = 140;
  const ultime5 = S.sims.slice(-5);
  const media = ultime5.length ? (ultime5.reduce((a, s) => a + s.e, 0) / ultime5.length) : 0;
  const tmed = ultime5.length ? (ultime5.reduce((a, s) => a + s.ms, 0) / ultime5.length) : 0;
  const base = S.sims.length - ultime.length;

  el('v-progresso').innerHTML = `
    <div class="stack gap22 scroll" style="flex:1 1 auto">
      <div class="stack gap7">
        <div class="lbl">OBIETTIVO</div>
        <h1 class="h2">Tre simulazioni di fila a zero errori</h1>
      </div>

      <div class="slots">
        ${[0, 1, 2].map(i => {
          const fatta = i < serie;
          const s = fatta ? S.sims[S.sims.length - serie + i] : null;
          return `<div class="stack gap7" style="align-items:center">
            <div class="slot ${fatta ? 'done' : ''}"><span class="num">${fatta ? '0' : '—'}</span></div>
            <span class="tnum" style="font-size:11.5px;color:var(--mute)">${fatta ? 'sim. ' + (S.sims.indexOf(s) + 1) : 'la prossima'}</span>
          </div>`;
        }).join('')}
      </div>

      ${ultime.length ? `
      <div class="stack gap12" style="padding-top:20px;border-top:1px solid var(--rule)">
        <div class="lbl">ERRORI PER SIMULAZIONE</div>
        <div class="chart">
          <div class="yax tnum">
            <span style="top:-6px">${maxE}</span>
            <span style="top:${H - (3 / maxE) * H - 6}px">3</span>
            <span style="top:${H - 7}px">0</span>
          </div>
          <div class="plot">
            <div class="limit" style="bottom:${(3 / maxE) * H}px"></div>
            <div class="limit-l" style="bottom:${(3 / maxE) * H + 4}px">limite d&rsquo;esame</div>
            <div class="bars">
              ${ultime.map(s => s.e === 0
                ? `<i class="zero" style="height:5px" title="0 errori"></i>`
                : `<i style="height:${Math.max(6, (s.e / maxE) * H)}px" title="${s.e} errori"></i>`).join('')}
            </div>
          </div>
          <div class="tnum" style="display:flex;justify-content:space-between;padding-top:7px;font-size:10.5px;color:var(--grey)">
            <span>sim. ${base + 1}</span><span>sim. ${S.sims.length}</span>
          </div>
        </div>
        <p class="note">In verde le simulazioni chiuse a zero. La riga tratteggiata è il limite d&rsquo;esame: tre errori.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding-top:18px;border-top:1px solid var(--rule)">
        <div class="stack" style="gap:4px"><div class="num tnum" style="font-size:32px">${media.toFixed(1).replace('.', ',')}</div><div style="font-size:12.5px;color:var(--mute)">Errori medi · ultime ${ultime5.length}</div></div>
        <div class="stack" style="gap:4px"><div class="num tnum" style="font-size:32px">${mmss(tmed)}</div><div style="font-size:12.5px;color:var(--mute)">Tempo medio</div></div>
      </div>` : '<p class="sub">Non hai ancora chiuso una simulazione. Falla: è l&rsquo;unico modo di sapere dove sei.</p>'}

      <div class="grow"></div>
      <div class="stack gap10">
        <button class="btn" id="b-home" type="button">Torna alla home</button>
        <button class="linkish center" id="b-reset" type="button" style="align-self:center;color:var(--mute);border-color:var(--hair);font-weight:500">Azzera i progressi</button>
      </div>
    </div>`;

  el('b-home').onclick = renderHome;
  el('b-reset').onclick = () => {
    if (!window.confirm('Azzero tutti i progressi, le stelline e lo storico delle simulazioni. Sicuro?')) return;
    S = vuoto(); salva(); renderHome();
  };
  show('progresso');
}

/* ---------- avvio ---------- */
(async function boot() {
  try {
    const r = await fetch('data/bank.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    BANK = await r.json();
  } catch (e) {
    el('boot').innerHTML = '<p class="sub">Non riesco a caricare l&rsquo;archivio delle domande. Controlla la connessione e ricarica la pagina.</p>';
    return;
  }
  S = carica();
  el('boot').hidden = true;
  el('app').hidden = false;
  renderHome();
})();
