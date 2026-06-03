/* POST /api/vote → registra o actualiza el voto de este dispositivo.
   Reglas: 1 voto por dispositivo (cookie) y nombre único entre dispositivos. */
const { getAll, setVote, ensureDevice, voterKey, getIP, hash, validVote, publicVotes, send, readJsonBody } = require('./_lib');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { ok:false, errors:['Método no permitido'] });

    const device = ensureDevice(req, res);
    const body = await readJsonBody(req);

    const { errors, vote } = validVote(body);
    if (errors.length) return send(res, 400, { ok:false, errors });

    const store = await getAll();
    const key = voterKey(device);

    // Nombre único: ese nombre no puede estar usado por OTRO dispositivo.
    const wanted = vote.name.toLowerCase();
    const taken = Object.entries(store)
      .some(([k, v]) => k !== key && v.name.toLowerCase() === wanted);
    if (taken){
      return send(res, 409, { ok:false, errors:['Ese nombre ya tiene una predicción. Prueba con otro (p. ej. añade tu apellido o «Tía/Tío»).'] });
    }

    const existed = Boolean(store[key]);
    const rec = { ...vote, ipHash: hash('ip:' + getIP(req)), updatedAt: new Date().toISOString() };
    await setVote(key, rec);
    store[key] = rec;

    return send(res, 200, { ok:true, updated:existed, you:vote, votes:publicVotes(store) });
  } catch (e) {
    const kv = e && e.code === 'KV_NOT_CONFIGURED';
    return send(res, kv ? 503 : 500, {
      ok:false,
      errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudo guardar tu predicción.' ],
    });
  }
};
