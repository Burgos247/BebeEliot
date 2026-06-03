/* ===========================================================
   Quiniela de Nacimiento · Eliot José 🧸
   Lógica de fechas + registro de predicciones (localStorage)
   =========================================================== */

// --- Configuración base ---------------------------------------------------
// Mamá estaba de 34 semanas el 2026-06-03 → Fecha Probable de Parto (40 sem)
const EDD = new Date(2026, 6, 15);            // 15 de julio de 2026 (mes 6 = julio)
const STORAGE_KEY = 'quiniela_eliot_jose';

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio',
                     'agosto','septiembre','octubre','noviembre','diciembre'];

// --- Utilidades -----------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

function startOfDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function toISO(d){ return d.toISOString().slice(0,10); }
function fromISO(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function daysBetween(a,b){ return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }

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
  if (daysToEDD > 0)      daysLeftEl.textContent = daysToEDD;
  else if (daysToEDD === 0) daysLeftEl.textContent = '¡Hoy!';
  else                    daysLeftEl.textContent = '¡Ya viene!';
}

// --- Configurar el selector de fecha --------------------------------------
function setupDateInput(){
  const input = $('#date');
  const today = startOfDay(new Date());
  const min = today;                                   // desde hoy
  const max = new Date(EDD); max.setDate(max.getDate() + 35); // hasta ~5 sem después de la FPP

  input.min = toISO(min);
  input.max = toISO(max);
  input.value = toISO(EDD);                            // sugerencia: la FPP

  $('#dateHint').textContent =
    `Puedes elegir entre el ${min.getDate()} de ${MESES_LARGO[min.getMonth()]} y el ${max.getDate()} de ${MESES_LARGO[max.getMonth()]}.`;
}

// --- Almacenamiento -------------------------------------------------------
function loadPredictions(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function savePredictions(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// --- Render del tablero ----------------------------------------------------
function renderPredictions(){
  const list = loadPredictions()
    .slice()
    .sort((a,b) => a.date.localeCompare(b.date));

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

    li.innerHTML = `
      <div class="pred-date">
        <span class="d">${d.getDate()}</span>
        <span class="m">${MESES[d.getMonth()]}</span>
      </div>
      <div class="pred-main">
        <div class="pred-name">${escapeHtml(p.name)}</div>
        ${meta.length ? `<div class="pred-meta">${meta.join(' · ')}</div>` : ''}
        ${p.message ? `<div class="pred-msg">“${escapeHtml(p.message)}”</div>` : ''}
      </div>
      <button class="pred-del" title="Eliminar" data-id="${p.id}">✕</button>
    `;
    ul.appendChild(li);
  });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// --- Toast -----------------------------------------------------------------
let toastTimer;
function toast(msg){
  let el = $('.toast');
  if (!el){
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// --- Eventos ---------------------------------------------------------------
function setupForm(){
  $('#predictionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#name').value.trim();
    const date = $('#date').value;
    if (!name || !date) return;

    const list = loadPredictions();

    // Evitar duplicado exacto (mismo nombre + misma fecha)
    if (list.some(p => p.name.toLowerCase() === name.toLowerCase() && p.date === date)){
      toast('Ya existe esa predicción 🧸');
      return;
    }

    list.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
      name,
      date,
      time: $('#time').value || '',
      weight: $('#weight').value || '',
      message: $('#message').value.trim(),
    });
    savePredictions(list);
    renderPredictions();

    e.target.reset();
    setupDateInput();
    toast('¡Predicción guardada! 🎈');
    $('.board').scrollIntoView({ behavior:'smooth' });
  });

  // Eliminar
  $('#predictionList').addEventListener('click', (e) => {
    const btn = e.target.closest('.pred-del');
    if (!btn) return;
    if (!confirm('¿Eliminar esta predicción?')) return;
    savePredictions(loadPredictions().filter(p => p.id !== btn.dataset.id));
    renderPredictions();
    toast('Predicción eliminada');
  });

  // Copiar quiniela
  $('#copyAll').addEventListener('click', async () => {
    const list = loadPredictions().slice().sort((a,b)=>a.date.localeCompare(b.date));
    const lines = ['🧸 Quiniela de nacimiento · Eliot José', `Fecha probable de parto: ${$('#eddLong').textContent}`, ''];
    list.forEach(p => {
      const d = fromISO(p.date);
      let line = `• ${p.name}: ${d.getDate()} de ${MESES_LARGO[d.getMonth()]}`;
      if (p.time) line += ` a las ${p.time}`;
      if (p.weight) line += ` (${p.weight} kg)`;
      lines.push(line);
    });
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Quiniela copiada 📋');
    } catch {
      toast('No se pudo copiar automáticamente');
    }
  });
}

// --- Galería: mostrar nota si no hay fotos --------------------------------
function checkGallery(){
  // Damos tiempo a que las imágenes carguen o fallen
  setTimeout(() => {
    const grid = $('#galleryGrid');
    if (grid && grid.children.length === 0){
      grid.hidden = true;
      $('#galleryNote').hidden = false;
    }
  }, 1500);
}

// --- Init ------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  updateCountdown();
  setupDateInput();
  setupForm();
  renderPredictions();
  checkGallery();
});
