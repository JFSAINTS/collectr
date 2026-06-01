# Collectr

> Tu coleccion digital. Siempre contigo.

**Collectr** es una Progressive Web App (PWA) para catalogar colecciones de videojuegos, peliculas, libros, comics, DVDs, Blu-rays, musica y mas. Usa inteligencia artificial (Google Cloud Vision) para identificar productos mediante escaneo de codigos de barras o imagenes de portadas.

Demo en vivo: **https://jfsaints.github.io/collectr/**

---

## Descargas

| Plataforma | Archivo | Descripcion |
|------------|---------|-------------|
| Windows x64 | [Collectr-1.0.3-setup.exe](https://github.com/JFSAINTS/collectr/releases/download/v1.0.3/Collectr-1.0.3-setup.exe) | Instalador (acceso directo automatico) |
| Windows x64 | [Collectr-1.0.3-portable.exe](https://github.com/JFSAINTS/collectr/releases/download/v1.0.3/Collectr-1.0.3-portable.exe) | Portable, sin instalacion |
| Android | [Collectr-android.apk](https://github.com/JFSAINTS/collectr/releases/download/v1.0.3/Collectr-android.apk) | APK directo (activa "fuentes desconocidas") |
| Navegador / PWA | [jfsaints.github.io/collectr](https://jfsaints.github.io/collectr/) | Instala desde el navegador |

---

## Novedades en v1.0.3

### Aviso de duplicado al escanear
Si escaneas un codigo de barras que ya esta en tu coleccion, la app lo detecta al instante (sin gastar ninguna consulta de red) y muestra un aviso en amarillo con la opcion de añadir otra copia de todas formas.

### Mas fuentes de busqueda sin coste
- **MusicBrainz + Cover Art Archive** — lookup directo por codigo de barras para CDs, vinilos y cassettes, con portada automatica
- **Wikidata SPARQL** — base de conocimiento libre con cobertura muy amplia: figuras, juguetes, ediciones especiales y productos que ninguna otra base de datos tiene
- **TVmaze** — series de television, gratuito y sin clave
- **Open Library por titulo** — suplementa Google Books para busquedas de libros y manga por titulo

---

## Novedades en v1.0.2 — Base de datos comunitaria

Collectr ahora incluye una base de datos colaborativa y anonima donde los usuarios comparten informacion de productos entre si.

### Como funciona

**Al escanear un codigo de barras**, la app consulta primero la base de datos comunitaria (una sola lectura instantanea). Si el producto ya fue registrado por otro usuario, los datos aparecen al momento con el badge verde "Base comunitaria". Si no existe, la app busca en las APIs externas de siempre.

**Al guardar un item nuevo con codigo de barras**, la app envia automaticamente una copia anonima de los datos (nombre, categoria, plataforma, etc.) a la base de datos comunitaria en segundo plano. Sin imagenes, sin datos personales, solo texto y URL de portada. El proximo usuario que escanee ese mismo codigo lo tendra disponible de inmediato.

### Privacidad y seguridad

- Completamente anonimo: no se almacena ninguna informacion del usuario
- Solo texto y URLs: ningun archivo binario ni imagen se sube al servidor
- Inmutable: los datos subidos no pueden ser modificados ni borrados desde la app
- Validacion estricta en servidor: Firebase rechaza cualquier dato que no cumpla el esquema
- Throttle de 30 segundos entre contribuciones para evitar abuso automatizado

---

## Caracteristicas

- **Base de datos comunitaria** — productos escaneados por otros usuarios disponibles al instante
- **Escaneo por camara** — apunta a un codigo de barras o portada y la app lo identifica automaticamente
- **Analisis de imagenes** — sube fotos de portadas y la IA extrae toda la informacion
- **Busqueda visual de portadas** — muestra opciones de portada similares via Google Images para elegir la correcta
- **Edicion manual** — añade o edita cualquier campo a mano
- **Modo local** — funciona sin cuenta ni conexion, datos guardados en el dispositivo
- **Backup automatico** — copia de seguridad al cerrar la app, restauracion automatica al arrancar
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

### Backup y restauracion

- La app hace backup automatico al cerrar la ventana o cambiar de pestana
- Si la coleccion aparece vacia al arrancar, la app la restaura automaticamente desde el ultimo backup
- Boton "Backup manual" en el menu lateral para descargar el archivo JSON en cualquier momento

### Instalar como app (PWA)

Al visitar la web aparece un banner para instalar Collectr. Tambien puedes ir al menu del navegador > "Instalar aplicacion" o "Añadir a pantalla de inicio".

---

## Estructura del proyecto

```
collectr/
├── index.html          — App principal
├── app.js              — Logica de la aplicacion
├── styles.css          — Estilos
├── firebase-config.js  — Configuracion Firebase (Firestore para BD comunitaria)
├── api-config.js       — API keys (no incluido en el repo)
├── manifest.json       — Manifiesto PWA
├── sw.js               — Service Worker (offline)
├── firestore.rules     — Reglas de seguridad Firestore
├── electron-main.js    — Proceso principal Electron (Windows)
├── package.json        — Configuracion electron-builder
├── build-android.js    — Script de compilacion Android (TWA)
└── icons/              — Iconos PWA en todos los tamanios
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
# Genera dist/Collectr-1.0.2-portable.exe y dist/Collectr Setup 1.0.2.exe
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
| Firebase Firestore | Base de datos comunitaria de productos |
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
- [Firebase](https://firebase.google.com) — base de datos comunitaria
- [Tabler Icons](https://tabler.io/icons) — iconografia
- [Google Fonts](https://fonts.google.com) — tipografia (Space Grotesk)
- [ZXing](https://github.com/zxing-js/library) — lectura de codigos de barras
