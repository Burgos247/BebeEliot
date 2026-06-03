/* POST /api/vote → registra o actualiza el voto de este dispositivo.
   Reglas: 1 voto por dispositivo (cookie) y nombre único entre dispositivos.
   Función autocontenida (sin imports locales) para máxima compatibilidad con Vercel. */
const crypto = require('crypto');

const IP_SALT = process.env.IP_SALT || 'eliot-jose-baby-shower';
const COOKIE  = 'eliot_device';
const KEY     = 'eliot:votes';
const KV_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL   || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

function send(res, code, obj){
  if (!res.headersSent){
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(obj));
}
async function readJsonBody(req){
  if (req.body !== undefined){
    if (typeof req.body === 'string'){ try { return JSON.parse(req.body || '{}'); } catch { return {}; } }
    if (req.body && typeof req.body === 'object') return req.body;
  }
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch { return {}; }
}
async function redis(command){
  if (!KV_URL || !KV_TOKEN){ const e = new Error('KV_NOT_CONFIGURED'); e.code = 'KV_NOT_CONFIGURED'; throw e; }
  if (typeof fetch !== 'function') throw new Error('fetch no disponible (Node < 18)');
  const r = await fetch(KV_URL, {
    method:'POST',
    headers:{ Authorization:`Bearer ${KV_TOKEN}`, 'Content-Type':'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error('KV error ' + r.status);
  return (await r.json()).result;
}
async function getAll(){
  const res = await redis(['HGETALL', KEY]);
  const obj = {};
  if (Array.isArray(res)){
    for (let i = 0; i < res.length; i += 2){
      try { obj[res[i]] = JSON.parse(res[i + 1]); } catch {}
    }
  }
  return obj;
}
async function setVote(field, valueObj){ await redis(['HSET', KEY, field, JSON.stringify(valueObj)]); }
function parseCookies(header){
  const out = {};
  (header || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > -1) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); });
  return out;
}
function getIP(req){
  const xff = req.headers['x-forwarded-for'];
  let ip = xff ? String(xff).split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || '';
  ip = ip.replace(/^::ffff:/, '');
  if (ip === '::1') ip = '127.0.0.1';
  return ip || 'unknown';
}
function hash(str){ return crypto.createHash('sha256').update(IP_SALT + ':' + str).digest('hex').slice(0, 16); }
function ensureDevice(req, res){
  let token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || !/^[a-f0-9]{32}$/.test(token)){
    token = crypto.randomBytes(16).toString('hex');
    const secure = String(req.headers['x-forwarded-proto'] || 'https').includes('https') ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`);
  }
  return token;
}
function voterKey(token){ return hash('dev:' + token); }
function clean(str, max){ return String(str == null ? '' : str).replace(/\s+/g, ' ').trim().slice(0, max); }
function validVote(b){
  const errors = [];
  const name = clean(b.name, 40);
  const date = clean(b.date, 10);
  if (!name) errors.push('El nombre es obligatorio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('La fecha no es válida.');
  const time = /^\d{2}:\d{2}$/.test(b.time || '') ? b.time : '';
  let weight = '';
  if (b.weight !== '' && b.weight != null){ const w = Number(b.weight); if (!Number.isNaN(w) && w >= 1 && w <= 6) weight = String(w); }
  const message = clean(b.message, 160);
  return { errors, vote: { name, date, time, weight, message } };
}
function publicVotes(store){
  return Object.values(store)
    .map(v => ({ name:v.name, date:v.date, time:v.time, weight:v.weight, message:v.message, updatedAt:v.updatedAt }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { ok:false, errors:['Método no permitido'] });
    const device = ensureDevice(req, res);
    const body = await readJsonBody(req);

    const { errors, vote } = validVote(body);
    if (errors.length) return send(res, 400, { ok:false, errors });

    const store = await getAll();
    const key = voterKey(device);

    const wanted = vote.name.toLowerCase();
    const taken = Object.entries(store).some(([k, v]) => k !== key && v.name.toLowerCase() === wanted);
    if (taken) return send(res, 409, { ok:false, errors:['Ese nombre ya tiene una predicción. Prueba con otro (p. ej. añade tu apellido o «Tía/Tío»).'] });

    const existed = Boolean(store[key]);
    const rec = { ...vote, ipHash: hash('ip:' + getIP(req)), updatedAt: new Date().toISOString() };
    await setVote(key, rec);
    store[key] = rec;

    return send(res, 200, { ok:true, updated:existed, you:vote, votes:publicVotes(store) });
  } catch (e) {
    const kv = e && e.code === 'KV_NOT_CONFIGURED';
    return send(res, kv ? 503 : 500, { ok:false, errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudo guardar tu predicción.' ] });
  }
};
