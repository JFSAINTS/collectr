# CLAUDE.md — Collectr / Cataloga

Contexto del proyecto para Claude Code. Este archivo resume todo lo importante para trabajar en este proyecto sin perder contexto.

---

## ¿Qué es este proyecto?

**Collectr** es una PWA (Progressive Web App) de vanilla JS/HTML/CSS para catalogar colecciones personales: videojuegos, películas, libros, cómics, música, DVDs, Blu-rays y más.

- Sin frameworks. Solo HTML + CSS + JavaScript ES modules.
- Funciona offline con Service Worker (`sw.js`).
- Datos en `localStorage` para modo local (invitado).
- Sincronización opcional con Firebase Firestore.
- Reconocimiento de portadas y códigos de barras con Claude AI + ZXing.

---

## Estructura de archivos

```
D:\CATALOGA\
├── index.html          ← App principal (412 líneas, CSS externo)
├── app.js              ← Toda la lógica JS (~1100 líneas)
├── styles.css          ← Estilos (~560 líneas)
├── firebase-config.js  ← Credenciales Firebase + init
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (cache offline)
├── firestore.rules     ← Reglas de seguridad Firestore
├── deploy.yml          ← GitHub Actions deploy config
├── mockup.html         ← Maqueta visual interactiva (referencia de diseño)
├── README.md           ← Documentación pública
├── CLAUDE.md           ← Este archivo
└── .claude/
    └── launch.json     ← Servidor local: Python http.server puerto 3456
```

> **IMPORTANTE:** Los archivos de backup están en `files/` (ignorado por git). Si algo se rompe, los originales correctos están ahí.

---

## Servidor de desarrollo

```json
// .claude/launch.json
{
  "name": "mockup",
  "runtimeExecutable": "C:\\Users\\jfsai\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
  "runtimeArgs": ["-m", "http.server", "3456"],
  "port": 3456
}
```

URL local: `http://localhost:3456/index.html`
Mockup de referencia: `http://localhost:3456/mockup.html`

---

## Firebase

**Proyecto:** `collectr-4ecb9`
**Auth domain:** `collectr-4ecb9.firebaseapp.com`

```js
const firebaseConfig = {
  apiKey: "AIzaSyBGz85M4pcshA4_ooJX9sCK4Kf9KfBHjXQ",
  authDomain: "collectr-4ecb9.firebaseapp.com",
  projectId: "collectr-4ecb9",
  storageBucket: "collectr-4ecb9.firebasestorage.app",
  messagingSenderId: "606660325614",
  appId: "1:606660325614:web:944f0384d6251f88b703ff"
};
```

**Estado actual:** Firebase inicializado y activo. Authentication (Google + Facebook) requiere habilitación manual en la consola de Firebase.

**Flujo de auth:**
- **Invitado** → `signInAsGuest()` → datos solo en `localStorage`
- **Google/Facebook** → `signInWithPopup` → datos en Firestore (`users/{uid}/collection/items`)
- Si Firebase no está configurado o falla → cae a modo local automáticamente

---

## GitHub

- **Repo:** https://github.com/JFSAINTS/collectr
- **Branch principal:** `main`
- **Usuario git:** JFSAINTS / jfsaints@gmail.com
- **gh CLI:** NO instalado. Usar `git` directo con token HTTPS.

---

## Arquitectura de datos

```js
// Estructura de un ítem en DB[]
{
  id: "abc123",              // generado con gid()
  name: "The Last of Us",
  category: "game",          // game|movie|dvd|bluray|book|comic|music|other
  platform: "PlayStation 5",
  publisher: "Naughty Dog",
  year: "2020",
  genre: "Acción / Aventura",
  desc: "Descripción...",
  cover: "https://...",      // URL de portada
  barcode: "1234567890",
  rating: 5,                 // 0-5, 0 = sin valorar
  wishlist: false,           // true = en lista de deseos, no en colección
  added: "2024-01-15T..."    // ISO string
}
```

**LocalStorage key:** `collectr_db_v2`

**Categorías soportadas:**
| key | label | emoji |
|-----|-------|-------|
| game | Videojuego | 🎮 |
| movie | Película | 🎬 |
| dvd | DVD | 💿 |
| bluray | Blu-ray | 💎 |
| book | Libro | 📚 |
| comic | Cómic | 🦸 |
| music | Música | 🎵 |
| other | Otro | 📦 |

---

## Motor de escaneo (flujo completo)

1. **Autoscan** — cámara activa escanea cada 1.5s con ZXing
2. **ZXing** (`decodeBarcodeFromImage`) — decodifica EAN-13, EAN-8, UPC-A, UPC-E, CODE-128, CODE-39, QR
   - Si detecta código → Open Library (libros) + UPC Item DB (otros)
3. **Google Cloud Vision API** (`WEB_DETECTION`) — si no hay código de barras a los ~7.5s, captura automática y reconoce la portada por coincidencia visual (igual que Google Lens)
   - Extrae: nombre del producto, categoría, plataforma, editorial, año
   - Para libros/cómics → enriquece con Open Library por título
4. **Vibración** — `navigator.vibrate([100])` al detectar código de barras

Si ninguna fuente encuentra resultado → el usuario completa manualmente.

**Google Vision API key:** `AIzaSyDoKpVJfgsBcC_5DyJve0M3LUnoqTXb8r8` (key dedicada para Vision API)
- ✅ Cloud Vision API habilitada y con billing activo en proyecto `collectr-4ecb9`
- Restricciones de referrer: `https://jfsaints.github.io/*` y `http://localhost:3456/*`
- Free tier: 1.000 imágenes/mes gratis

---

## Diseño / UX — Decisiones tomadas

### Login
- El botón **"Continuar sin cuenta"** es el CTA principal (degradado púrpura, grande).
- Google y Facebook son secundarios, más pequeños, separados por divisor "o inicia sesión con".
- Razón: la mayoría de usuarios usarán modo local. No forzar cuenta.

### Sidebar
- **Sync dot** de color en lugar de ícono de nube:
  - 🟢 Verde pulsante = online/sincronizado
  - 🟡 Amarillo parpadeante = sincronizando
  - 🔴 Rojo = offline/sin conexión
  - ⚫ Gris = modo local (invitado)
- **Botón "Cerrar sesión"** con texto completo + ícono (antes era solo ícono invisible).

### Tarjetas de colección
- Los **badges de categoría** van como píldora centrada en la parte inferior de la imagen de portada (posición `absolute` dentro de `.item-cover`).
- Fuente de título más grande: `0.875rem` (antes `0.78rem`).

### Modal de detalle
- **Editar / Eliminar arriba** (justo bajo el badge de categoría), no al fondo.
- Rating con estrellas → toast de confirmación "Valoración guardada: N ★".

### Formulario manual
- Solo 3 campos obligatorios visibles al abrir: **Nombre**, **Categoría**, **Estado**.
- El resto (plataforma, año, editorial, notas, portada, ISBN) se despliega con toggle "Más detalles".
- Al editar un ítem existente → el toggle se abre automáticamente si el ítem tiene datos en esos campos.

### Estadísticas
- Barras por categoría con **colores propios** (no todos el mismo morado).
- Barras más gruesas: `10px` (antes `6px`).

### Wishlist
- Botón "**¡Ya lo tengo!**" en lugar del frío "Lo tengo".

---

## Variables CSS del tema

```css
:root {
  --bg: #0e0e12;          /* fondo principal */
  --bg2: #16161d;         /* cards, sidebar */
  --bg3: #1e1e28;         /* inputs, hover */
  --bg4: #26263a;         /* elementos inactivos */
  --accent: #7c6af7;      /* púrpura principal */
  --accent2: #a78bfa;     /* púrpura claro */
  --accent3: #c4b5fd;     /* púrpura muy claro */
  --gold: #f5c842;        /* estrellas de valoración */
  --text: #e8e8f0;        /* texto principal */
  --text2: #9898b0;       /* texto secundario */
  --text3: #5a5a78;       /* texto terciario/placeholders */
  --border: rgba(124,106,247,0.15);
  --border2: rgba(124,106,247,0.35);
  --success: #22c55e;
  --danger: #ef4444;
  --warn: #f59e0b;
  --sidebar-w: 220px;
  --radius: 12px;
  --radius-sm: 8px;
}
```

---

## Problema histórico resuelto: triple mojibake

Los archivos originales tenían los caracteres españoles **triple-codificados** (UTF-8 leído como Latin-1, tres veces). La `ó` (2 bytes) se almacenaba como 16 bytes.

- **Solución:** Se restauraron los archivos desde `files/` (backups con UTF-8 correcto).
- **NO intentar** corregir algorítmicamente: los scripts de Python con `encode('latin-1').decode('utf-8')` fallaron.
- Los archivos en `files/` tienen `ó` como U+00F3 (correcto).

---

## Comandos útiles

```powershell
# Arrancar servidor local
cd D:\CATALOGA
python -m http.server 3456

# Ver estado git
git -C D:\CATALOGA status
git -C D:\CATALOGA log --oneline

# Push a GitHub (requiere token en remote URL)
git -C D:\CATALOGA push origin main
```

---

## Pendiente / Próximas mejoras sugeridas

- [x] **Motor de reconocimiento de portadas** — Google Cloud Vision WEB_DETECTION (como Google Lens). Requiere activar la API en Google Cloud Console.
- [ ] **Activar Cloud Vision API** — ir a https://console.cloud.google.com/apis/library/vision.googleapis.com?project=collectr-4ecb9
- [ ] **Habilitar Google Auth** en Firebase Console → Authentication → Sign-in methods.
- [ ] **Habilitar Facebook Auth** → requiere app en Meta Developers + configurar OAuth.
- [ ] **Firestore Security Rules** — revisar `firestore.rules` antes de ir a producción.
- [x] **Iconos PWA** — creados `icons/icon-16/32/48/128/192/256/512.png` + `icons/icon.ico` (multi-size para Electron) con diseño de estantería de libros sobre fondo gris redondeado (imagen proporcionada por el usuario).
- [x] **Auto-backup** — backup automático al cerrar/minimizar ventana, `beforeunload`, `visibilitychange`, + cada 5 min. Restauración automática al arrancar si la colección está vacía. Botón "Backup manual" en sidebar.
- [ ] **CORS en Claude API** — las llamadas directas desde el browser fallarán en producción sin un proxy backend.

---

## Cambios sesión 2026-05-29 (v1.0.2)

### Base de datos comunitaria crowdsourced
- **Colección Firestore:** `productos_globales` — barcode como ID de documento.
- **`checkGlobalDB(barcode)`**: consulta antes de cualquier API externa. 1 lectura Firestore. Devuelve objeto con `fromGlobalDB:true`.
- **`contributeToGlobalDB(item)`**: al guardar ítem nuevo con barcode, envía en background si no existe ya. Throttle `CONTRIB_MIN_MS=30000ms` vía `CONTRIB_TS_KEY` en localStorage. Silencioso (nunca bloquea al usuario).
- **`identifyByBarcode()`**: prepend de la consulta comunitaria antes del flujo de APIs.
- **`addItemFromModal()`**: llama a `contributeToGlobalDB()` para ítems nuevos con barcode.
- **Badge visual**: `detection-banner--community` + `.community-badge` (verde) cuando el resultado viene de la BD comunitaria.
- **`firestore.rules`**: nueva regla para `productos_globales` — `allow read:true`, `allow create` con validación de esquema + `contributed_at == request.time` (serverTimestamp anti-replay), `allow update/delete:false`.
- **`firebase-config.js`**: `getDoc` ya exportado, añadido al import de `app.js`.
- Script v7.

## Cambios sesión 2026-05-27

- **Nuevo icono**: diseño de estantería de libros generado con Pillow desde imagen de referencia del usuario. 7 tamaños PNG + ICO multi-size. `package.json` usa `icons/icon.ico` para Electron.
- **Auto-backup**: `AUTO_BACKUP_KEY = 'collectr_auto_bk'`, `BACKUP_META_KEY = 'collectr_auto_bk_meta'`. Triggers: `beforeunload`, `visibilitychange:hidden`, `setInterval(5min)`. `loadLocalDB()` restaura desde backup si la colección está vacía. `window.downloadBackupNow()` descarga JSON manual. `window.restoreAutoBackup()` restaura con confirm. Sidebar muestra fecha/hora y cantidad del último backup. CSS: `.backup-status-bar`.
- **index.html**: favicons actualizados (icon-32.png, icon-16.png), backup UI en sidebar, versión `?v=6`.
- **package.json**: versión `1.0.1`, icono Windows `icons/icon.ico`.
- **Release v1.0.1**: Windows x64 (portable + NSIS) + Android APK publicados en GitHub.

## Bugs corregidos (sesión 2026-05-26)

- **sw.js rutas incorrectas**: tenía `/src/styles.css`, `/src/app.js`, etc. — no existe la carpeta `/src/`. Corregido a `/styles.css`, `/app.js`, etc.
- **sw.js `cache.addAll` bloqueante**: si una URL daba 404 toda la instalación del SW fallaba silenciosamente. Cambiado a `Promise.allSettled` + `.catch` individual.
- **manifest.json mojibake**: todos los textos españoles estaban triple-codificados. Reescrito con UTF-8 correcto.
- **manifest.json screenshots**: referenciaba `screenshots/desktop.png` y `screenshots/mobile.png` que no existen. Eliminados.
- **index.html script duplicado**: tenía `<script type="module" src="firebase-config.js">` además de `app.js`. El módulo ES ya es importado por `app.js`. Tag redundante eliminado.
- **app.js doble spinner**: `analyzeWithClaude` pasaba `<div class="spinner"></div>` dentro del mensaje a `setStatus`, que ya añade su propio spinner. Eliminados los spinners redundantes del mensaje.
