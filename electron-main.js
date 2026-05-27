const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    title: 'Collectr',
    icon: path.join(__dirname, 'icons', 'icon-512.png'),
    backgroundColor: '#0e0e12',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Permite acceso a cámara y micrófono
      webSecurity: true,
    }
  });

  // Cargar la app local
  win.loadFile(path.join(__dirname, 'index.html'));

  // Conceder permisos de cámara automáticamente
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['camera', 'media', 'mediaKeySystem'];
    callback(allowed.includes(permission));
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
