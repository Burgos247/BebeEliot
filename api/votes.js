/* GET /api/votes → lista pública de predicciones + la tuya (según tu dispositivo) */
const { getAll, ensureDevice, voterKey, publicVotes } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'GET'){ res.status(405).json({ ok:false, errors:['Método no permitido'] }); return; }

  const device = ensureDevice(req, res);
  try {
    const store = await getAll();
    const mine = store[voterKey(device)] || null;
    res.status(200).json({
      votes: publicVotes(store),
      you: mine ? { name:mine.name, date:mine.date, time:mine.time, weight:mine.weight, message:mine.message } : null,
    });
  } catch (e) {
    const kv = e && e.code === 'KV_NOT_CONFIGURED';
    res.status(kv ? 503 : 500).json({
      ok:false,
      errors:[ kv ? 'Falta configurar el almacén KV en Vercel.' : 'No se pudieron cargar las predicciones.' ],
    });
  }
};
