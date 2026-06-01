const { app, BrowserWindow, session, dialog, shell } = require('electron');
const https = require('https');
const path  = require('path');

const REPO = 'JFSAINTS/collectr';

// ── Comparador semver simple (a > b) ─────────────────────────────────────────
function semverGt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// ── Comprobación de actualizaciones via GitHub Releases API ──────────────────
function checkForUpdates(win) {
  const current = app.getVersion();
  const req = https.get(
    {
      hostname: 'api.github.com',
      path:     `/repos/${REPO}/releases/latest`,
      headers:  { 'User-Agent': `Collectr/${current}` },
    },
    (res) => {
      let body = '';
      res.on('data', c  => { body += c; });
      res.on('end',  () => {
        try {
          const rel    = JSON.parse(body);
          const latest = (rel.tag_name || '').replace(/^v/, '');
          if (!latest || !semverGt(latest, current)) return;

          // Buscar el installer (.exe de setup) entre los assets
          const setup = rel.assets?.find(a => /setup.*\.exe$/i.test(a.name));
          const url   = setup?.browser_download_url || rel.html_url;

          dialog.showMessageBox(win, {
            type:      'info',
            title:     'Actualización disponible',
            message:   `Nueva versión de Collectr: v${latest}`,
            detail:    `Tienes instalada la v${current}.\n\n` +
                       `¿Descargar e instalar la nueva versión ahora?\n` +
                       `El instalador se abrirá en tu navegador.`,
            buttons:   ['Descargar ahora', 'Después'],
            defaultId: 0,
            cancelId:  1,
          }).then(({ response }) => {
            if (response === 0) shell.openExternal(url);
          });
        } catch (e) {}
      });
    }
  );
  req.on('error',   () => {});
  req.setTimeout(8000, () => req.destroy());
}

// ── Ventana principal ─────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:           420,
    height:          820,
    minWidth:        360,
    minHeight:       600,
    title:           'Collectr',
    icon:            path.join(__dirname, 'icons', 'icon-512.png'),
    backgroundColor: '#0e0e12',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  });

  win.loadFile(path.join(__dirname, 'index.html'));

  // Permisos de cámara
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(['camera', 'media', 'mediaKeySystem'].includes(permission));
  });

  // Comprobar actualizaciones 4 s después de que cargue la UI
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => checkForUpdates(win), 4000);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
