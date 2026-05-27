# Collectr

> Tu coleccion digital. Siempre contigo.

**Collectr** es una Progressive Web App (PWA) para catalogar colecciones de videojuegos, peliculas, libros, comics, DVDs, Blu-rays, musica y mas. Usa inteligencia artificial (Google Cloud Vision) para identificar productos mediante escaneo de codigos de barras o imagenes de portadas.

Demo en vivo: **https://jfsaints.github.io/collectr/**

---

## Descargas

| Plataforma | Archivo | Descripcion |
|------------|---------|-------------|
| Windows x64 | [Collectr-1.0.0-setup.exe](https://github.com/JFSAINTS/collectr/releases/download/v1.0.0/Collectr-1.0.0-setup.exe) | Instalador (acceso directo automatico) |
| Windows x64 | [Collectr-1.0.0-portable.exe](https://github.com/JFSAINTS/collectr/releases/download/v1.0.0/Collectr-1.0.0-portable.exe) | Portable, sin instalacion |
| Android | [Collectr-android.apk](https://github.com/JFSAINTS/collectr/releases/download/v1.0.0/Collectr-android.apk) | APK directo (activa "fuentes desconocidas") |
| Navegador / PWA | [jfsaints.github.io/collectr](https://jfsaints.github.io/collectr/) | Instala desde el navegador |

---

## Caracteristicas

- **Escaneo por camara** — apunta a un codigo de barras o portada y la app lo identifica automaticamente
- **Analisis de imagenes** — sube fotos de portadas y la IA extrae toda la informacion
- **Busqueda visual de portadas** — muestra opciones de portada similares via Google Images para elegir la correcta
- **Edicion manual** — añade o edita cualquier campo a mano
- **Modo local** — funciona sin cuenta ni conexion, datos guardados en el dispositivo
- **PWA instalable** — instalala en movil o escritorio como app nativa
- **Vista cuadricula y lista** — visualiza tu coleccion como quieras
- **Lista de deseos** — marca lo que quieres conseguir
- **Estadisticas** — graficos de tu coleccion por categoria
- **Exportacion** — descarga en JSON, CSV o HTML visual con portadas
- **Importacion** — importa colecciones desde JSON o CSV
- **Valoraciones** — puntua tus items del 1 al 5

---

## Categorias soportadas

| Categoria | Plataformas detectadas |
|-----------|------------------------|
| Videojuegos | PS5, PS4, Xbox, Switch, PC, Game Boy, etc. |
| Peliculas | Blu-ray, 4K UHD, DVD, Digital |
| DVD | Todas las ediciones |
| Blu-ray | BD, 4K UHD, BD-3D |
| Libros | Tapa dura, tapa blanda, bolsillo |
| Comics / Manga | Marvel, DC, Manga, Europeo |
| Musica | CD, Vinilo, Cassette |
| Juegos de mesa | Cualquier juego de tablero |
| Figuras | Figuras coleccionables |
| Otros | Cualquier producto coleccionable |

---

## Uso rapido

### Añadir un item

1. **Camara**: pulsa "Añadir" > pestana "Camara" > apunta al codigo de barras o portada > "Capturar"
2. **Imagen**: pulsa "Añadir" > pestana "Imagen" > sube una foto de la portada
3. **Manual**: pulsa "Añadir" > pestana "Manual" > rellena los campos

### Exportar tu coleccion

1. Pulsa "Exportar" en el menu lateral
2. Elige formato: JSON (importable), CSV (Excel) o HTML visual
3. El archivo se descarga automaticamente

### Instalar como app (PWA)

Al visitar la web aparece un banner para instalar Collectr. Tambien puedes ir al menu del navegador > "Instalar aplicacion" o "Añadir a pantalla de inicio".

---

## Estructura del proyecto

```
collectr/
├── index.html          — App principal
├── app.js              — Logica de la aplicacion
├── styles.css          — Estilos
├── firebase-config.js  — Configuracion Firebase (solo Firestore, sin auth)
├── api-config.js       — API keys (no incluido en el repo)
├── manifest.json       — Manifiesto PWA
├── sw.js               — Service Worker (offline)
├── electron-main.js    — Proceso principal Electron (Windows)
├── package.json        — Configuracion electron-builder
├── build-android.js    — Script de compilacion Android (TWA)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## Compilar localmente

### Requisitos

- Node.js 18+
- Para Android: JDK 21 + Android SDK

### Instalar dependencias

```bash
npm install
```

### Windows x64

```bash
npm run build:win
# Genera dist/Collectr-1.0.0-portable.exe y dist/Collectr Setup 1.0.0.exe
```

### Android APK

```bash
node build-android.js
# Genera dist/Collectr-android.apk
```

### Servidor de desarrollo local

```bash
python -m http.server 3456
# Abre http://localhost:3456/index.html
```

---

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| HTML / CSS / JS | App vanilla sin frameworks |
| Google Cloud Vision API | Reconocimiento de portadas y codigos |
| Firebase Firestore | Base de datos (opcional, modo local por defecto) |
| ZXing | Lectura de codigos de barras desde camara |
| Service Worker | Funcionamiento offline |
| Electron | App de escritorio Windows |
| Bubblewrap / TWA | App Android |

---

## Compatibilidad

| Plataforma | Soporte |
|------------|---------|
| Chrome / Edge (desktop) | Completo |
| Chrome (Android) | Completo |
| Safari (iOS 16.4+) | PWA + camara |
| Firefox | Sin install prompt |
| Samsung Internet | Completo |
| Windows x64 | App Electron |
| Android 5.0+ | APK TWA |

---

## Licencia

MIT — usala, modificala y compartela libremente.

---

## Creditos

- [Google Cloud Vision](https://cloud.google.com/vision) — reconocimiento de imagenes e IA
- [Firebase](https://firebase.google.com) — base de datos opcional
- [Tabler Icons](https://tabler.io/icons) — iconografia
- [Google Fonts](https://fonts.google.com) — tipografia (Space Grotesk)
- [ZXing](https://github.com/zxing-js/library) — lectura de codigos de barras
