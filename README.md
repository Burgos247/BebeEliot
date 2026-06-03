# 🧸 Quiniela de Nacimiento · Eliot José

Landing page para que amigos y familia adivinen **qué día nacerá Eliot José**.
Gana quien se acerque más a la fecha real. 💙

## ✨ Qué incluye

- **Osito protagonista** (ilustración SVG con moño azul, a juego con la decoración).
- **Contador**: muestra las semanas de embarazo y los días que faltan para la
  fecha probable de parto (FPP), calculados automáticamente.
- **Formulario de predicción**: nombre, fecha, y opcionalmente hora, peso y un
  mensaje para el bebé.
- **Tablero de predicciones**: lista ordenada por fecha, guardada en el navegador
  (`localStorage`). Se pueden eliminar y copiar todas al portapapeles.
- **Galería** para las fotos de la decoración (carpeta `/images`).

## 📅 Datos del cálculo

- Mamá estaba de **34 semanas** el **3 de junio de 2026**.
- **Fecha probable de parto (40 semanas): 15 de julio de 2026.**
- El selector de fecha permite elegir desde hoy hasta ~5 semanas después de la FPP.

> Para ajustar la fecha, edita la constante `EDD` al inicio de `script.js`.

## 🚀 Cómo verla

Es una página estática (HTML + CSS + JS, sin dependencias). Opciones:

```bash
# Opción 1: abrir el archivo directamente
open index.html      # macOS
xdg-open index.html  # Linux

# Opción 2: servidor local
python3 -m http.server 8000
# luego visita http://localhost:8000
```

También se puede publicar gratis en **GitHub Pages** (Settings → Pages → rama del proyecto).

## 📂 Estructura

```
index.html     → página
styles.css     → estilos
script.js      → lógica (fechas, predicciones)
images/        → fotos de la decoración (ver images/README.md)
```
