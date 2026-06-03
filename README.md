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

Como necesita servidor (para leer la IP), **GitHub Pages no sirve** aquí. Opciones
gratuitas fáciles donde subir este repo y que arranque con `node server.js`:

- **Render.com** · **Railway.app** · **Fly.io** · **Glitch.com**

En esos servicios, configura el comando de inicio como `node server.js`
(o `npm start`). El puerto se toma de la variable `PORT` automáticamente.

## 📅 Datos del cálculo

- Mamá estaba de **34 semanas** el **3 de junio de 2026**.
- **Fecha probable de parto (40 semanas): 15 de julio de 2026.**
- El selector permite elegir desde hoy hasta ~5 semanas después de la FPP.

> Para ajustar la fecha, edita la constante `EDD` en `script.js` **y** en `server.js`
> no es necesaria (el servidor no la usa); basta con `script.js`.

## 📂 Estructura

```
server.js      → servidor + API de votación (sin dependencias)
index.html     → página
styles.css     → estilos
script.js      → lógica (fechas, votación contra /api)
package.json   → scripts de arranque
data/          → votos guardados (data/votes.json, ignorado por git)
images/        → fotos de la decoración (ver images/README.md)
```

## 🔌 API (referencia)

| Método | Ruta         | Descripción                                            |
|--------|--------------|--------------------------------------------------------|
| `GET`  | `/api/votes` | Lista todas las predicciones + la tuya (según tu IP).  |
| `POST` | `/api/vote`  | Registra/actualiza tu predicción. Body JSON: `name`, `date` (obligatorios), `time`, `weight`, `message`. |
