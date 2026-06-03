/* GET /api/votes → lista pública de predicciones + la tuya (según tu dispositivo) */
const { getAll, ensureDevice, voterKey, publicVotes, send } = require('./_lib');

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
    return send(res, kv ? 503 : 500, {
      ok:false,
      errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudieron cargar las predicciones.' ],
    });
  }
};
