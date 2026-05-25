# Collectr ð¦

> Tu colecciÃ³n digital. Siempre contigo.

**Collectr** es una Progressive Web App (PWA) para catalogar colecciones de videojuegos, pelÃ­culas, libros, cÃ³mics, DVDs, Blu-rays, mÃºsica y mÃ¡s. Usa inteligencia artificial (Claude de Anthropic) para identificar productos mediante escaneo de cÃ³digos de barras o imÃ¡genes de portadas.

![Collectr Screenshot](screenshots/desktop.png)

---

## â¨ CaracterÃ­sticas

- ð· **Escaneo por cÃ¡mara** â apunta a un cÃ³digo de barras o portada y la IA lo identifica automÃ¡ticamente
- ð¼ï¸ **AnÃ¡lisis de imÃ¡genes** â sube fotos de portadas y Claude extrae toda la informaciÃ³n
- âï¸ **EdiciÃ³n manual** â aÃ±ade o edita cualquier campo manualmente
- ð **Login con Google o Facebook** â sincronizaciÃ³n automÃ¡tica en la nube con Firebase
- ð **Modo offline** â funciona sin conexiÃ³n, sincroniza al reconectarse
- ð± **PWA instalable** â instÃ¡lala en tu mÃ³vil o escritorio como app nativa
- ðï¸ **Vista cuadrÃ­cula y lista** â visualiza tu colecciÃ³n como quieras
- â¤ï¸ **Lista de deseos** â marca lo que quieres conseguir
- ð **EstadÃ­sticas** â grÃ¡ficos de tu colecciÃ³n por categorÃ­a y plataforma
- ð¤ **ExportaciÃ³n** â descarga en JSON, CSV o HTML visual con portadas
- ð¥ **ImportaciÃ³n** â importa colecciones desde JSON o CSV
- â­ **Valoraciones** â puntÃºa tus Ã­tems del 1 al 5

## ðï¸ CategorÃ­as soportadas

| CategorÃ­a | Plataformas detectadas |
|-----------|----------------------|
| ð® Videojuegos | PS5, PS4, Xbox, Switch, PC, Game Boy, etc. |
| ð¬ PelÃ­culas | Blu-ray, 4K UHD, DVD, Digital |
| ð¿ DVD | Todas las ediciones |
| ð Blu-ray | BD, 4K UHD, BD-3D |
| ð Libros | Tapa dura, tapa blanda, bolsillo |
| ð¦¸ CÃ³mics | Marvel, DC, Manga, Europeo |
| ðµ MÃºsica | CD, Vinilo, Cassette |
| ð¦ Otros | Cualquier producto coleccionable |

---

## ð ConfiguraciÃ³n e instalaciÃ³n

### Requisitos previos

1. Una cuenta en [Firebase](https://console.firebase.google.com) (gratuita)
2. Una API key de [Anthropic](https://console.anthropic.com) para el reconocimiento de imÃ¡genes

### Paso 1 â Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Activa **Authentication** â Habilita Google y Facebook como proveedores
4. Activa **Cloud Firestore** â Crea una base de datos en modo producciÃ³n
5. Ve a **ConfiguraciÃ³n del proyecto** â **Tus apps** â AÃ±ade una app web
6. Copia las credenciales

### Paso 2 â Configurar la app

Edita `src/firebase-config.js` y reemplaza las credenciales:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### Paso 3 â Configurar Anthropic API

La API key de Anthropic se gestiona en el backend de Claude.ai cuando usas el widget. Si despliegas la app de forma independiente, aÃ±ade tu API key en `src/app.js`:

```javascript
headers: {
  'Content-Type': 'application/json',
  'x-api-key': 'TU_ANTHROPIC_API_KEY',  // aÃ±ade esta lÃ­nea
  'anthropic-version': '2023-06-01'
}
```

### Paso 4 â Reglas de seguridad de Firestore

Despliega las reglas del archivo `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

O cÃ³pialas manualmente en Firebase Console â Firestore â Reglas.

### Paso 5 â Despliegue

#### Con Firebase Hosting (recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

#### Con GitHub Pages

1. Ve a tu repositorio en GitHub
2. Settings â Pages â Source: Deploy from a branch â `main` / `root`
3. Tu app estarÃ¡ en `https://tuusuario.github.io/collectr`

#### Local (desarrollo)

```bash
# Con Python
python3 -m http.server 8080

# Con Node.js
npx serve .

# Con Live Server (VS Code extension)
# Abre index.html y haz clic en "Go Live"
```

---

## ð Estructura del proyecto

```
collectr/
âââ index.html              # Entrada principal de la app
âââ manifest.json           # Manifiesto PWA
âââ sw.js                   # Service Worker (offline)
âââ firestore.rules         # Reglas de seguridad Firebase
âââ src/
â   âââ app.js              # LÃ³gica principal de la aplicaciÃ³n
â   âââ firebase-config.js  # ConfiguraciÃ³n Firebase + Auth
â   âââ styles.css          # Estilos completos
âââ icons/
â   âââ icon-192.png        # Icono PWA 192x192
â   âââ icon-512.png        # Icono PWA 512x512
âââ README.md
```

---

## ð§ Uso

### AÃ±adir un Ã­tem

1. **CÃ¡mara**: Toca "AÃ±adir" â pestaÃ±a "CÃ¡mara" â apunta al cÃ³digo de barras o portada â "Capturar"
2. **Imagen**: Toca "AÃ±adir" â pestaÃ±a "Imagen" â sube una foto de la portada
3. **Manual**: Toca "AÃ±adir" â pestaÃ±a "Manual" â rellena los campos

### Exportar tu colecciÃ³n

1. Toca "Exportar" en el menÃº lateral
2. Elige el formato: JSON (importable), CSV (Excel) o HTML visual
3. El archivo se descarga automÃ¡ticamente con fecha y hora

### Importar una colecciÃ³n

1. Toca "Importar" en el menÃº lateral
2. Arrastra o selecciona tu archivo JSON o CSV
3. Los nuevos Ã­tems se fusionan con tu colecciÃ³n existente

### Instalar como app

Cuando visites la web, verÃ¡s un banner para instalar Collectr en tu dispositivo. TambiÃ©n puedes hacerlo desde el menÃº del navegador â "Instalar aplicaciÃ³n" o "AÃ±adir a pantalla de inicio".

---

## ð ï¸ TecnologÃ­as

| TecnologÃ­a | Uso |
|-----------|-----|
| **HTML/CSS/JS** | App sin frameworks, vanilla |
| **Firebase Auth** | AutenticaciÃ³n Google + Facebook |
| **Cloud Firestore** | Base de datos en tiempo real |
| **Claude AI (Anthropic)** | Reconocimiento de imÃ¡genes y cÃ³digos |
| **Service Worker** | Funcionamiento offline |
| **Web Manifest** | InstalaciÃ³n como PWA |
| **MediaDevices API** | Acceso a cÃ¡mara |
| **LocalStorage** | Persistencia local offline |

---

## ð± Compatibilidad

| Plataforma | Soporte |
|-----------|---------|
| Chrome / Edge (desktop) | â Completo |
| Safari (iOS 16.4+) | â PWA + cÃ¡mara |
| Chrome (Android) | â Completo |
| Firefox | â Sin install prompt |
| Samsung Internet | â Completo |

---

## ð¤ Contribuir

1. Fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Add: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## ð Licencia

MIT License â Ãºsala, modifÃ­cala y compÃ¡rtela libremente.

---

## ð CrÃ©ditos

- [Anthropic Claude](https://anthropic.com) â reconocimiento de imÃ¡genes con IA
- [Firebase](https://firebase.google.com) â autenticaciÃ³n y base de datos
- [Tabler Icons](https://tabler.io/icons) â iconografÃ­a
- [Google Fonts](https://fonts.google.com) â tipografÃ­a (Space Grotesk + DM Serif Display)
