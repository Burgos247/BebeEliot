/* GET /api/votes → lista pública de predicciones + la tuya (según tu dispositivo)
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
function parseCookies(header){
  const out = {};
  (header || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > -1) out[p.slice(0,i).trim()] = decodeURIComponent(p.slice(i+1).trim()); });
  return out;
}
function ensureDevice(req, res){
  let token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || !/^[a-f0-9]{32}$/.test(token)){
    token = crypto.randomBytes(16).toString('hex');
    const secure = String(req.headers['x-forwarded-proto'] || 'https').includes('https') ? '; Secure' : '';
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`);
  }
  return token;
}
function voterKey(token){ return crypto.createHash('sha256').update(IP_SALT + ':dev:' + token).digest('hex').slice(0, 16); }
function publicVotes(store){
  return Object.values(store)
    .map(v => ({ name:v.name, date:v.date, time:v.time, weight:v.weight, message:v.message, updatedAt:v.updatedAt }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return send(res, 405, { ok:false, errors:['Método no permitido'] });
    const device = ensureDevice(req, res);
    const store = await getAll();
    const mine = store[voterKey(device)] || null;
    return send(res, 200, {
      votes: publicVotes(store),
      you: mine ? { name:mine.name, date:mine.date, time:mine.time, weight:mine.weight, message:mine.message } : null,
    });
  } catch (e) {
    const kv = e && e.code === 'KV_NOT_CONFIGURED';
    return send(res, kv ? 503 : 500, { ok:false, errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudieron cargar las predicciones.' ] });
  }
};
