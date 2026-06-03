/* ===========================================================
   Quiniela de Nacimiento · Eliot José 🧸
   Servidor mínimo en Node.js (sin dependencias externas).
   - Sirve el front-end estático (index.html, css, js, /images)
   - API de votación con límite de 1 voto por IP (re-votar = actualizar)
   - Las IPs NO se guardan en texto plano: se almacenan hasheadas.
   =========================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'votes.json');

// Sal para el hash de IPs (cámbiala con la variable de entorno IP_SALT si quieres).
const IP_SALT = process.env.IP_SALT || 'eliot-jose-baby-shower';

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
  '.webp':'image/webp', '.gif':'image/gif',
};

// --- Almacenamiento -------------------------------------------------------
function ensureData(){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive:true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
}
function readVotes(){
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}'); }
  catch { return {}; }
}
function writeVotes(v){
  fs.writeFileSync(DATA_FILE, JSON.stringify(v, null, 2));
}

// --- Identificación del votante (cookie de dispositivo + IP) --------------
// La votación es sin login: cada navegador recibe un token aleatorio en una
// cookie. Ese token es la clave del voto, así varias personas en la MISMA red
// Wi-Fi (misma IP) pueden votar cada una. La IP se guarda hasheada solo como
// dato de referencia, nunca en texto plano.
const COOKIE = 'eliot_device';

function getIP(req){
  const xff = req.headers['x-forwarded-for'];           // detrás de proxy/hosting
  let ip = xff ? String(xff).split(',')[0].trim()
              : (req.socket.remoteAddress || '');
  ip = ip.replace(/^::ffff:/, '');                      // IPv4 mapeada en IPv6
  if (ip === '::1') ip = '127.0.0.1';
  return ip || 'unknown';
}
function hash(str){
  return crypto.createHash('sha256').update(IP_SALT + ':' + str).digest('hex').slice(0, 16);
}
function parseCookies(req){
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
// Devuelve el token de dispositivo; si no existe, lo crea y prepara la cookie.
function ensureDevice(req, res){
  let token = parseCookies(req)[COOKIE];
  if (!token || !/^[a-f0-9]{32}$/.test(token)){
    token = crypto.randomBytes(16).toString('hex');
    const secure = String(req.headers['x-forwarded-proto'] || '').includes('https') ? '; Secure' : '';
    res.setHeader('Set-Cookie',
      `${COOKIE}=${token}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`);
  }
  return token;
}
function voterKey(token){ return hash('dev:' + token); }

// --- Validación / limpieza ------------------------------------------------
function clean(str, max){
  return String(str == null ? '' : str).replace(/\s+/g, ' ').trim().slice(0, max);
}
function validVote(b){
  const errors = [];
  const name = clean(b.name, 40);
  const date = clean(b.date, 10);
  if (!name) errors.push('El nombre es obligatorio.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('La fecha no es válida.');
  const time = /^\d{2}:\d{2}$/.test(b.time || '') ? b.time : '';
  let weight = '';
  if (b.weight !== '' && b.weight != null){
    const w = Number(b.weight);
    if (!Number.isNaN(w) && w >= 1 && w <= 6) weight = String(w);
  }
  const message = clean(b.message, 160);
  return { errors, vote:{ name, date, time, weight, message } };
}

// --- Salida pública (sin IPs ni claves) -----------------------------------
function publicVotes(store){
  return Object.values(store)
    .map(v => ({ name:v.name, date:v.date, time:v.time, weight:v.weight, message:v.message, updatedAt:v.updatedAt }))
    .sort((a,b) => a.date.localeCompare(b.date));
}

// --- Helpers HTTP ---------------------------------------------------------
function sendJSON(res, code, obj){
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8' });
  res.end(body);
}
function readBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e5) { reject(new Error('payload demasiado grande')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
function serveStatic(req, res){
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  // Evitar path traversal
  const filePath = path.join(ROOT, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); return res.end('No encontrado'); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// --- Servidor -------------------------------------------------------------
ensureData();

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const device = ensureDevice(req, res);                 // asigna cookie si hace falta

  // GET /api/votes  → lista pública + tu voto actual (según tu dispositivo)
  if (req.method === 'GET' && url === '/api/votes'){
    const store = readVotes();
    const mine = store[voterKey(device)] || null;
    return sendJSON(res, 200, {
      votes: publicVotes(store),
      you: mine ? { name:mine.name, date:mine.date, time:mine.time, weight:mine.weight, message:mine.message } : null,
    });
  }

  // POST /api/vote → registra o actualiza el voto de este dispositivo
  if (req.method === 'POST' && url === '/api/vote'){
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      const { errors, vote } = validVote(body);
      if (errors.length) return sendJSON(res, 400, { ok:false, errors });

      const store = readVotes();
      const key = voterKey(device);
      const existed = Boolean(store[key]);
      store[key] = { ...vote, ipHash: hash('ip:' + getIP(req)), updatedAt: new Date().toISOString() };
      writeVotes(store);

      return sendJSON(res, 200, {
        ok: true,
        updated: existed,
        you: vote,
        votes: publicVotes(store),
      });
    } catch (e) {
      return sendJSON(res, 400, { ok:false, errors:['No se pudo procesar la solicitud.'] });
    }
  }

  // Archivos estáticos
  if (req.method === 'GET') return serveStatic(req, res);

  res.writeHead(405); res.end('Método no permitido');
});

server.listen(PORT, () => {
  console.log(`🧸 Quiniela de Eliot José corriendo en http://localhost:${PORT}`);
});
