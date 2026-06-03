/* POST /api/vote → registra o actualiza el voto de este dispositivo.
   Reglas: 1 voto por dispositivo (cookie) y nombre único entre dispositivos. */
const { getAll, setVote, ensureDevice, voterKey, getIP, hash, validVote, publicVotes } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST'){ res.status(405).json({ ok:false, errors:['Método no permitido'] }); return; }

  const device = ensureDevice(req, res);

  // El body puede venir ya parseado (Vercel) o como string.
  let body = req.body;
  if (typeof body === 'string'){ try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  const { errors, vote } = validVote(body);
  if (errors.length){ res.status(400).json({ ok:false, errors }); return; }

  try {
    const store = await getAll();
    const key = voterKey(device);

    // Nombre único: ese nombre no puede estar usado por OTRO dispositivo.
    const wanted = vote.name.toLowerCase();
    const taken = Object.entries(store)
      .some(([k, v]) => k !== key && v.name.toLowerCase() === wanted);
    if (taken){
      res.status(409).json({ ok:false, errors:['Ese nombre ya tiene una predicción. Prueba con otro (p. ej. añade tu apellido o «Tía/Tío»).'] });
      return;
    }

    const existed = Boolean(store[key]);
    const rec = { ...vote, ipHash: hash('ip:' + getIP(req)), updatedAt: new Date().toISOString() };
    await setVote(key, rec);
    store[key] = rec;

    res.status(200).json({ ok:true, updated:existed, you:vote, votes:publicVotes(store) });
  } catch (e) {
    const kv = e && e.code === 'KV_NOT_CONFIGURED';
    res.status(kv ? 503 : 500).json({
      ok:false,
      errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudo guardar tu predicción.' ],
    });
  }
};
