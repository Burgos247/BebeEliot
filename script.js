/* ===========================================================
   Quiniela de Nacimiento · Eliot José 🧸
   Front-end: cálculo de fechas + votación contra la API (/api)
   Una predicción por IP (sin login). Re-votar actualiza la tuya.
   =========================================================== */

// --- Configuración base ---------------------------------------------------
// Mamá estaba de 34 semanas el 2026-06-03 → Fecha Probable de Parto (40 sem)
const EDD = new Date(2026, 6, 15);            // 15 de julio de 2026 (mes 6 = julio)

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio',
                     'agosto','septiembre','octubre','noviembre','diciembre'];

let myVote = null;   // predicción asociada a esta IP (si existe)

// --- Utilidades -----------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function toISO(d){ return d.toISOString().slice(0,10); }
function fromISO(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function daysBetween(a,b){ return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// --- Cálculo de semanas y días --------------------------------------------
function updateCountdown(){
  const today = startOfDay(new Date());
  const daysToEDD = daysBetween(EDD, today);
  const weeksRemaining = daysToEDD / 7;
  const currentWeeks = Math.max(0, Math.min(42, Math.floor(40 - weeksRemaining)));

  $('#currentWeeks').textContent = currentWeeks;
  $('#edd').textContent = `${EDD.getDate()} ${MESES[EDD.getMonth()]}`;
  $('#eddLong').textContent = `${EDD.getDate()} de ${MESES_LARGO[EDD.getMonth()]} de ${EDD.getFullYear()}`;

  const daysLeftEl = $('#daysLeft');
  if (daysToEDD > 0)        daysLeftEl.textContent = daysToEDD;
  else if (daysToEDD === 0) daysLeftEl.textContent = '¡Hoy!';
  else                      daysLeftEl.textContent = '¡Ya viene!';
}

// --- Configurar el selector de fecha --------------------------------------
function setupDateInput(){
  const input = $('#date');
  const today = startOfDay(new Date());
  const max = new Date(EDD); max.setDate(max.getDate() + 35); // hasta ~5 sem después de la FPP

  input.min = toISO(today);
  input.max = toISO(max);
  if (!input.value) input.value = toISO(EDD);          // sugerencia: la FPP

  $('#dateHint').textContent =
    `Puedes elegir entre el ${today.getDate()} de ${MESES_LARGO[today.getMonth()]} y el ${max.getDate()} de ${MESES_LARGO[max.getMonth()]}.`;
}

// --- API ------------------------------------------------------------------
async function loadVotes(){
  try {
    const res = await fetch('/api/votes', { headers:{ 'Accept':'application/json' } });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json();
    myVote = data.you || null;
    renderPredictions(data.votes || []);
    reflectMyVote();
  } catch {
    showServerWarning();
  }
}

async function submitVote(payload){
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Accept':'application/json' },
    body: JSON.stringify(payload),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; } // respuesta no-JSON (p. ej. error del host)
  return { status: res.status, data };
}

// --- Render del tablero ----------------------------------------------------
function renderPredictions(list){
  const ul = $('#predictionList');
  const empty = $('#boardEmpty');
  const actions = $('#boardActions');
  $('#count').textContent = list.length;

  ul.innerHTML = '';
  empty.hidden = list.length > 0;
  actions.hidden = list.length === 0;

  list.forEach((p) => {
    const d = fromISO(p.date);
    const li = document.createElement('li');
    li.className = 'pred-item';

    const meta = [];
    if (p.time)   meta.push(`🕐 ${p.time}`);
    if (p.weight) meta.push(`⚖️ ${p.weight} kg`);

    const isMine = myVote && myVote.name === p.name && myVote.date === p.date;

    li.innerHTML = `
      <div class="pred-date">
        <span class="d">${d.getDate()}</span>
        <span class="m">${MESES[d.getMonth()]}</span>
      </div>
      <div class="pred-main">
        <div class="pred-name">${escapeHtml(p.name)} ${isMine ? '<span class="you-tag">tú</span>' : ''}</div>
        ${meta.length ? `<div class="pred-meta">${meta.join(' · ')}</div>` : ''}
        ${p.message ? `<div class="pred-msg">“${escapeHtml(p.message)}”</div>` : ''}
      </div>
    `;
    ul.appendChild(li);
  });
}

// --- Reflejar el voto propio en el formulario -----------------------------
function reflectMyVote(){
  const note = $('#myVoteNote');
  const btn = $('#submitBtn');
  if (myVote){
    $('#name').value    = myVote.name || '';
    $('#date').value    = myVote.date || $('#date').value;
    $('#time').value    = myVote.time || '';
    $('#weight').value  = myVote.weight || '';
    $('#message').value = myVote.message || '';
    btn.textContent = 'Actualizar mi predicción 🧸';
    note.hidden = false;
    note.textContent = 'Ya registraste tu predicción desde este dispositivo. Puedes editarla y volver a guardar.';
  } else {
    btn.textContent = 'Guardar mi predicción 🧸';
    note.hidden = true;
  }
}

function showServerWarning(){
  const empty = $('#boardEmpty');
  empty.hidden = false;
  empty.innerHTML = '⚠️ No se pudieron cargar las predicciones en este momento. Vuelve a intentarlo en unos segundos.';
}

// --- Toast -----------------------------------------------------------------
let toastTimer;
function toast(msg){
  let el = $('.toast');
  if (!el){ el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// --- Eventos ---------------------------------------------------------------
function setupForm(){
  $('#predictionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#submitBtn');
    const payload = {
      name:    $('#name').value.trim(),
      date:    $('#date').value,
      time:    $('#time').value || '',
      weight:  $('#weight').value || '',
      message: $('#message').value.trim(),
    };
    if (!payload.name || !payload.date) return;

    btn.disabled = true;
    try {
      const { status, data } = await submitVote(payload);

      if (data && data.ok){
        myVote = data.you;
        renderPredictions(data.votes || []);
        reflectMyVote();
        toast(data.updated ? '¡Predicción actualizada! ✨' : '¡Predicción guardada! 🎈');
        $('.board').scrollIntoView({ behavior:'smooth' });
        return;
      }

      // El servidor respondió, pero con error
      if (data && data.errors && data.errors[0]) toast(data.errors[0]);
      else toast(`No se pudo guardar (error ${status || '?'})`);
    } catch {
      // Falló la conexión de red (fetch no llegó al servidor)
      toast('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
    } finally {
      btn.disabled = false;
    }
  });

  // Copiar quiniela
  $('#copyAll').addEventListener('click', async () => {
    const items = [...document.querySelectorAll('#predictionList .pred-item')];
    const lines = ['🧸 Quiniela de nacimiento · Bebé Eliot',
                   `Fecha probable de parto: ${$('#eddLong').textContent}`, ''];
    items.forEach(li => {
      const name = li.querySelector('.pred-name').textContent.replace('tú','').trim();
      const d = li.querySelector('.pred-date .d').textContent;
      const m = li.querySelector('.pred-date .m').textContent;
      lines.push(`• ${name}: ${d} ${m}`);
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast('Quiniela copiada 📋');
    } catch {
      toast('No se pudo copiar automáticamente');
    }
  });
}

// --- Init ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateCountdown();
  setupDateInput();
  setupForm();
  loadVotes();
});
