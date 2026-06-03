# 🧸 Quiniela de Nacimiento · Eliot José

Landing page para que amigos y familia adivinen **qué día nacerá Eliot José**.
Gana quien se acerque más a la fecha real. 💙

La votación es **por IP, sin login**: cada persona escribe su nombre y su
pronóstico. Se permite **una predicción por conexión (IP)**; si vuelven a votar
desde la misma red, se **actualiza** su predicción en lugar de duplicarla.

## ✨ Qué incluye

- **Osito protagonista** (ilustración SVG con moño azul, a juego con la decoración).
- **Contador**: semanas de embarazo y días para la fecha probable de parto (FPP),
  calculados automáticamente.
- **Formulario de predicción**: nombre, fecha, y opcionalmente hora, peso y mensaje.
- **Tablero compartido** con todas las predicciones (ordenadas por fecha); la tuya
  aparece marcada con la etiqueta **«tú»**.
- **Galería** para las fotos de la decoración (carpeta `/images`).

## 🗳️ Cómo funciona la votación

- Backend mínimo en **Node.js sin dependencias** (`server.js`).
- Cada voto se asocia a la IP del visitante. **Las IPs no se guardan en texto
  plano**: se almacenan *hasheadas* (SHA-256 + sal) por privacidad.
- Los votos se guardan en `data/votes.json` (ignorado por git, son datos reales).

> ⚠️ **Importante sobre el límite por IP:** las personas conectadas a la **misma
> red Wi-Fi comparten una sola IP pública**. Si muchos votan desde el mismo lugar
> (por ejemplo, en el salón del baby shower), contará como un solo voto y se irán
> pisando. **Recomendación:** que cada quien vote desde sus **datos móviles** o
> desde casa antes del evento. Si prefieres otra forma de limitar (por dispositivo,
> con un código, etc.), se puede ajustar.

## 🚀 Cómo ejecutarla

Necesita Node.js (v16+). No hay que instalar nada.

```bash
node server.js
# luego abre http://localhost:3000
```

(También funciona `npm start`.)

### Publicarla para tus amigos

Como necesita servidor (para guardar los votos), **GitHub Pages no sirve** aquí.

#### Opción A — Vercel (recomendado, ya configurado) ✅

El repo incluye funciones serverless en `/api` (`api/votes.js`, `api/vote.js`)
que Vercel detecta automáticamente. Para que **guarden** los votos necesitan un
almacén **Vercel KV** (Upstash Redis), gratis:

1. En el panel de **Vercel** → pestaña **Storage** → **Create Database** → **KV**
   (Upstash Redis) y **conéctalo a este proyecto**.
   Esto añade solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
2. (Opcional) En **Settings → Environment Variables** añade `IP_SALT` con
   cualquier texto secreto.
3. Haz un **Redeploy** del proyecto.

No hace falta configurar comando de build: las páginas estáticas se sirven solas
y los archivos de `/api` se vuelven funciones.

> Mientras KV no esté conectado, la página carga pero los votos no se guardan
> (la API responde 503 «Falta configurar el almacén KV»).

#### Opción B — Render / Railway / Fly.io / Glitch

Usan `server.js` (almacenamiento en archivo). Configura el comando de inicio
como `node server.js` (o `npm start`); el puerto se toma de `PORT`.

> Nota: hay **dos backends equivalentes**. `server.js` (archivo local) para
> ejecución local u hosts tipo Render; y `/api/*.js` (Vercel KV) para Vercel.
> El front-end (`script.js`) usa las mismas rutas `/api/votes` y `/api/vote` en
> ambos casos.

## 📅 Datos del cálculo

- Mamá de **35 semanas** el **3 de junio de 2026**.
- **Fecha probable de parto (40 semanas): 8 de julio de 2026.**
- El selector permite elegir desde hoy hasta ~5 semanas después de la FPP.

> Para ajustar la fecha, edita la constante `EDD` en `script.js` **y** en `server.js`
> no es necesaria (el servidor no la usa); basta con `script.js`.

## 📂 Estructura

```
index.html     → página
styles.css     → estilos
script.js      → lógica del front (fechas, votación contra /api)
server.js      → backend para local / Render (API + almacenamiento en archivo)
api/           → backend para Vercel (funciones serverless + Vercel KV)
  _lib.js      → helpers compartidos (KV, cookie, validación)
  votes.js     → GET  /api/votes
  vote.js      → POST /api/vote
package.json   → scripts y engines
data/          → votos en local (data/votes.json, ignorado por git)
images/        → fotos de la decoración (ver images/README.md)
```

## 🔌 API (referencia)

| Método | Ruta         | Descripción                                            |
|--------|--------------|--------------------------------------------------------|
| `GET`  | `/api/votes` | Lista todas las predicciones + la tuya (según tu IP).  |
| `POST` | `/api/vote`  | Registra/actualiza tu predicción. Body JSON: `name`, `date` (obligatorios), `time`, `weight`, `message`. |
