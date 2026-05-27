/**
 * build-android.js
 * Construye el APK de Collectr usando @bubblewrap/core directamente.
 */
const path        = require('path');
const fs          = require('fs');
const { execSync } = require('child_process');

// ── Rutas del entorno ──────────────────────────────────────────────────────
const JAVA_HOME    = 'C:\\Program Files\\Microsoft\\jdk-21.0.11.10-hotspot';
const ANDROID_HOME = process.env.LOCALAPPDATA + '\\Android\\Sdk';
const OUT_DIR      = path.join(__dirname, 'android-twa');
const KEYSTORE     = path.join(OUT_DIR, 'android.keystore');
const STORE_PASS   = 'collectr2024';
const KEY_ALIAS    = 'android';

async function main() {
  const { Config }          = require('@bubblewrap/core/dist/lib/Config');
  const { TwaManifest }     = require('@bubblewrap/core/dist/lib/TwaManifest');
  const { TwaGenerator }    = require('@bubblewrap/core/dist/lib/TwaGenerator');
  const { JdkHelper }       = require('@bubblewrap/core/dist/lib/jdk/JdkHelper');
  const { KeyTool }         = require('@bubblewrap/core/dist/lib/jdk/KeyTool');
  const { ConsoleLog }      = require('@bubblewrap/core/dist/lib/Log');

  console.log('⚙️  Configurando entorno…');
  const log    = new ConsoleLog('collectr-build');
  const config = new Config(JAVA_HOME, ANDROID_HOME);
  const jdk    = new JdkHelper(process, config);

  console.log('🌐 Descargando manifiesto web…');
  const twaManifest = await TwaManifest.fromWebManifest('https://jfsaints.github.io/collectr/manifest.json');

  // Ajustar campos para esta app
  twaManifest.packageId      = 'io.github.jfsaints.collectr';
  twaManifest.host           = 'jfsaints.github.io';
  twaManifest.startUrl       = '/collectr/';
  twaManifest.name           = 'Collectr';
  twaManifest.launcherName   = 'Collectr';
  twaManifest.appVersionName = '1.0.0';
  twaManifest.appVersionCode = 1;
  twaManifest.signingKey     = { path: KEYSTORE, alias: KEY_ALIAS };

  // Generar proyecto Android
  console.log('📁 Generando proyecto Android TWA…');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generator = new TwaGenerator();
  await generator.createTwaProject(OUT_DIR, twaManifest, log);

  // Generar keystore si no existe
  if (!fs.existsSync(KEYSTORE)) {
    console.log('🔑 Generando keystore de firma…');
    const keyTool = new KeyTool(jdk, log);
    await keyTool.createSigningKey({
      path:               KEYSTORE,
      alias:              KEY_ALIAS,
      fullName:           'Collectr',
      organizationalUnit: 'Collectr',
      organization:       'Collectr',
      country:            'ES',
      password:           STORE_PASS,
      keypassword:        STORE_PASS,
    });
  }

  // Añadir configuración de firma a app/build.gradle
  console.log('📝 Configurando firma en app/build.gradle…');
  const buildGradlePath = path.join(OUT_DIR, 'app', 'build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  if (!buildGradle.includes('signingConfigs')) {
    // Ruta relativa al keystore desde app/build.gradle
    const relKeystore = '../android.keystore';
    const signingBlock = `
    signingConfigs {
        release {
            storeFile file('${relKeystore}')
            storePassword '${STORE_PASS}'
            keyAlias '${KEY_ALIAS}'
            keyPassword '${STORE_PASS}'
        }
    }`;

    buildGradle = buildGradle
      .replace('    buildTypes {', signingBlock + '\n    buildTypes {')
      .replace(
        'release {\n            minifyEnabled true\n        }',
        'release {\n            minifyEnabled true\n            signingConfig signingConfigs.release\n        }'
      );
    fs.writeFileSync(buildGradlePath, buildGradle);
  }

  // Compilar APK con Gradle directamente (GradleWrapper tiene problemas con cwd en Windows)
  console.log('🔨 Compilando APK con Gradle…');
  const gradleEnv = Object.assign({}, process.env, {
    JAVA_HOME,
    ANDROID_HOME,
  });
  execSync('gradlew.bat assembleRelease --stacktrace', {
    cwd:   OUT_DIR,
    env:   gradleEnv,
    stdio: 'inherit',
    shell: true,
  });

  // Copiar APK al directorio de salida
  const apkSrc = path.join(OUT_DIR, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const apkDst = path.join(__dirname, 'dist', 'Collectr-android.apk');
  fs.mkdirSync(path.dirname(apkDst), { recursive: true });
  fs.copyFileSync(apkSrc, apkDst);

  console.log(`\n✅ APK listo: ${apkDst}`);
}

main().catch(err => {
  console.error('❌ Error al construir APK:', err.message || err);
  process.exit(1);
});
