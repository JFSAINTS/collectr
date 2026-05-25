// =============================================
// COLLECTR — Main Application
// =============================================

import {
  auth, db, isFirebaseConfigured,
  GoogleAuthProvider, FacebookAuthProvider,
  signInWithPopup, fbSignOut, onAuthStateChanged,
  doc, setDoc, getDoc, onSnapshot, serverTimestamp
} from './firebase-config.js';

// ===== STATE =====
let DB = [];
let currentUser = null;
let currentView = 'grid';
let currentPage = 'collection';
let cameraStream = null;
let cameraDevices = [];
let currentCameraIndex = 0;
let pendingImageData = null;
let editingId = null;
let scanTab = 'camera';
let deferredInstallPrompt = null;
let unsubscribeFirestore = null;
let syncTimeout = null;
let isGuest = false;

// ===== CATEGORY CONFIG =====
const CAT_INFO = {
  game:   { label: 'Videojuego', icon: 'ti-device-gamepad-2', badgeClass: 'badge-game',   emoji: '🎮' },
  movie:  { label: 'Película',   icon: 'ti-movie',            badgeClass: 'badge-movie',  emoji: '🎬' },
  dvd:    { label: 'DVD',        icon: 'ti-disc',             badgeClass: 'badge-dvd',    emoji: '💿' },
  bluray: { label: 'Blu-ray',    icon: 'ti-disc',             badgeClass: 'badge-bluray', emoji: '💎' },
  book:   { label: 'Libro',      icon: 'ti-book',             badgeClass: 'badge-book',   emoji: '📚' },
  comic:  { label: 'Cómic',      icon: 'ti-books',            badgeClass: 'badge-comic',  emoji: '🦸' },
  music:  { label: 'Música',     icon: 'ti-music',            badgeClass: 'badge-music',  emoji: '🎵' },
  other:  { label: 'Otro',       icon: 'ti-package',          badgeClass: 'badge-other',  emoji: '📦' }
};

// ===== AUTH =====
window.signInWithGoogle = async () => {
  if (!isFirebaseConfigured) { toast('Firebase no configurado. Usando modo local.', 'info'); signInAsGuest(); return; }
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    toast('Error al iniciar sesión con Google: ' + e.message, 'error');
  }
};

window.signInWithFacebook = async () => {
  if (!isFirebaseConfigured) { toast('Firebase no configurado. Usando modo local.', 'info'); signInAsGuest(); return; }
  try {
    const provider = new FacebookAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e) {
    toast('Error al iniciar sesión con Facebook: ' + e.message, 'error');
  }
};

window.signInAsGuest = () => {
  isGuest = true;
  currentUser = { uid: 'guest', displayName: 'Invitado', email: '', photoURL: '' };
  loadLocalDB();
  showApp();
};

window.signOut = async () => {
  if (confirm('¿Cerrar sesión? Los datos locales se conservarán.')) {
    stopCamera();
    if (unsubscribeFirestore) unsubscribeFirestore();
    if (!isGuest && isFirebaseConfigured) {
      try { await fbSignOut(auth); } catch(e) {}
    }
    currentUser = null; isGuest = false; DB = [];
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  }
};

// Auth state listener
if (isFirebaseConfigured) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      isGuest = false;
      subscribeToFirestore();
      showApp();
    } else {
      if (!isGuest) {
        document.getElementById('app').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
      }
    }
  });
} else {
  // No Firebase: show auth screen normally
  document.getElementById('auth-screen').style.display = 'flex';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = '';
  updateUserUI();
  if (isGuest || !isFirebaseConfigured) {
    loadLocalDB();
    setSyncStatus('offline', 'Modo local');
  }
}

function updateUserUI() {
  if (!currentUser) return;
  const name = currentUser.displayName || 'Coleccionista';
  const email = currentUser.email || 'Sin cuenta';
  document.getElementById('user-display-name').textContent = name;
  document.getElementById('user-email').textContent = email;
  document.getElementById('sidebar-username').textContent = name;
  const letter = (name[0] || 'C').toUpperCase();
  const avatarEl = document.getElementById('user-avatar');
  if (currentUser.photoURL) {
    avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="${letter}">`;
  } else {
    avatarEl.textContent = letter;
  }
}

// ===== FIRESTORE SYNC =====
function subscribeToFirestore() {
  if (!db || !currentUser) return;
  setSyncStatus('syncing', 'Sincronizando...');
  const userDoc = doc(db, 'users', currentUser.uid, 'collection', 'items');
  unsubscribeFirestore = onSnapshot(userDoc,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        DB = data.items || [];
      } else {
        // First time: try to load from local and push
        const local = loadLocalRaw();
        if (local.length) { DB = local; scheduleSave(); }
      }
      renderAll();
      setSyncStatus('synced', 'Sincronizado');
    },
    (err) => {
      console.warn('[Collectr] Firestore error:', err);
      loadLocalDB();
      setSyncStatus('offline', 'Sin conexión — modo local');
    }
  );
}

function scheduleSave() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(saveDB, 1000);
}

async function saveDB() {
  saveLocalDB();
  if (!isGuest && isFirebaseConfigured && db && currentUser) {
    try {
      setSyncStatus('syncing', 'Guardando...');
      const userDoc = doc(db, 'users', currentUser.uid, 'collection', 'items');
      await setDoc(userDoc, { items: DB, updatedAt: serverTimestamp() });
      setSyncStatus('synced', 'Sincronizado');
    } catch(e) {
      setSyncStatus('offline', 'Error al sincronizar');
      console.warn('[Collectr] Save error:', e);
    }
  }
}

function setSyncStatus(state, msg) {
  const el = document.getElementById('sync-status');
  el.className = 'sidebar-sync ' + (state === 'synced' ? 'online' : state);
  el.innerHTML = `<span class="sync-dot"></span><span>${msg}</span>`;
}

window.toggleExtraFields = () => {
  const panel = document.getElementById('extra-fields-panel');
  const icon = document.getElementById('extra-toggle-icon');
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  if (icon) icon.style.transform = isOpen ? '' : 'rotate(180deg)';
};

// ===== LOCAL STORAGE =====
const LS_KEY = 'collectr_db_v2';

function loadLocalRaw() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch(e) { return []; }
}

function loadLocalDB() {
  DB = loadLocalRaw();
  if (!DB.length) seedDemo();
  renderAll();
}

function saveLocalDB() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); } catch(e) {}
}

function seedDemo() {
  DB = [
    { id: gid(), name: 'The Last of Us Part II', category: 'game', platform: 'PlayStation 4', publisher: 'Naughty Dog', year: '2020', genre: 'Acción / Aventura', desc: 'Una historia épica de supervivencia y redención.', cover: '', barcode: '', rating: 5, wishlist: false, added: new Date(2024,0,15).toISOString() },
    { id: gid(), name: 'Dune: Parte Dos', category: 'bluray', platform: '4K Blu-ray', publisher: 'Warner Bros', year: '2024', genre: 'Ciencia Ficción', desc: 'La épica continuación en Arrakis.', cover: '', barcode: '', rating: 5, wishlist: false, added: new Date(2024,3,2).toISOString() },
    { id: gid(), name: 'Elden Ring', category: 'game', platform: 'PlayStation 5', publisher: 'FromSoftware', year: '2022', genre: 'RPG / Acción', desc: 'RPG de mundo abierto de From Software y George R.R. Martin.', cover: '', barcode: '', rating: 5, wishlist: false, added: new Date(2024,1,20).toISOString() },
    { id: gid(), name: 'Dune (Frank Herbert)', category: 'book', platform: 'Tapa dura', publisher: 'Debolsillo', year: '1965', genre: 'Ciencia Ficción', desc: 'La novela seminal de ciencia ficción.', cover: '', barcode: '', rating: 5, wishlist: false, added: new Date(2024,2,8).toISOString() },
    { id: gid(), name: 'Oppenheimer', category: 'bluray', platform: 'Blu-ray', publisher: 'Universal', year: '2023', genre: 'Drama / Historia', desc: 'La historia del padre de la bomba atómica.', cover: '', barcode: '', rating: 4, wishlist: false, added: new Date(2024,4,1).toISOString() },
    { id: gid(), name: 'Ghost of Tsushima', category: 'game', platform: 'PlayStation 5', publisher: 'Sucker Punch', year: '2020', genre: 'Acción / Aventura', desc: '', cover: '', barcode: '', rating: 0, wishlist: true, added: new Date(2024,5,10).toISOString() }
  ];
  saveLocalDB();
}

function gid() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }

// ===== RENDER =====
function renderAll() {
  updateStats();
  filterItems();
  renderCategories();
  renderWishlist();
  renderStatsPage();
  updateBadges();
}

function updateBadges() {
  const owned = DB.filter(x => !x.wishlist);
  const wished = DB.filter(x => x.wishlist);
  document.getElementById('total-badge').textContent = owned.length;
  const wb = document.getElementById('wish-badge');
  if (wished.length) { wb.textContent = wished.length; wb.style.display = ''; }
  else wb.style.display = 'none';
  document.getElementById('export-count').textContent = DB.length;
}

function updateStats() {
  const owned = DB.filter(x => !x.wishlist);
  document.getElementById('st-total').textContent = owned.length;
  document.getElementById('st-games').textContent = owned.filter(x => x.category === 'game').length;
  document.getElementById('st-movies').textContent = owned.filter(x => ['movie','dvd','bluray'].includes(x.category)).length;
  document.getElementById('st-books').textContent = owned.filter(x => ['book','comic'].includes(x.category)).length;
  document.getElementById('items-count-sub') && (document.getElementById('items-count-sub').textContent = DB.length + ' ítems');
}

function getFiltered() {
  const q = (document.getElementById('search-input').value || '').toLowerCase();
  const cat = document.getElementById('cat-filter').value;
  const sort = document.getElementById('sort-select').value;
  let items = DB.filter(x => !x.wishlist);
  if (cat) items = items.filter(x => x.category === cat);
  if (q) items = items.filter(x => [x.name,x.platform,x.publisher,x.genre,x.barcode].join(' ').toLowerCase().includes(q));
  items.sort((a,b) => {
    if (sort === 'date-desc') return new Date(b.added) - new Date(a.added);
    if (sort === 'date-asc') return new Date(a.added) - new Date(b.added);
    if (sort === 'name-asc') return a.name.localeCompare(b.name,'es');
    if (sort === 'name-desc') return b.name.localeCompare(a.name,'es');
    if (sort === 'rating-desc') return (b.rating||0) - (a.rating||0);
    return 0;
  });
  return items;
}

window.filterItems = () => {
  const items = getFiltered();
  const sc = document.getElementById('search-input').value;
  document.getElementById('search-clear').style.display = sc ? '' : 'none';
  document.getElementById('showing-count').textContent = items.length + ' ítem' + (items.length !== 1 ? 's' : '');
  const container = document.getElementById('items-container');
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="ti ti-mood-empty" aria-hidden="true"></i>
      <h3>No hay ítems</h3>
      <p>Añade el primero escaneando un código de barras<br>o subiendo una imagen de la portada</p>
      <button class="btn btn-primary" onclick="openScannerModal()"><i class="ti ti-plus"></i> Añadir ítem</button>
    </div>`;
    return;
  }
  if (currentView === 'grid') renderGrid(items, container);
  else renderList(items, container);
};

function renderGrid(items, container) {
  container.className = 'items-grid';
  container.innerHTML = items.map(item => {
    const ci = CAT_INFO[item.category] || CAT_INFO.other;
    const stars = item.rating ? '★'.repeat(item.rating) : '';
    return `<div class="item-card" onclick="openDetail('${item.id}')" role="article" aria-label="${esc(item.name)}">
      <div class="item-cover">
        ${item.cover ? `<img src="${esc(item.cover)}" alt="${esc(item.name)}" loading="lazy" onerror="this.remove()">` : ''}
        <span style="position:absolute">${ci.emoji}</span>
        <span class="item-badge ${ci.badgeClass}">${ci.label}</span>
      </div>
      <div class="item-info">
        <div class="item-name">${esc(item.name)}</div>
        ${item.platform ? `<div class="item-meta"><span class="platform-chip">${esc(item.platform)}</span></div>` : ''}
        ${stars ? `<div class="rating-mini">${stars}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function renderList(items, container) {
  container.className = 'items-list';
  container.innerHTML = items.map(item => {
    const ci = CAT_INFO[item.category] || CAT_INFO.other;
    const stars = item.rating ? '★'.repeat(item.rating) : '';
    return `<div class="item-row" onclick="openDetail('${item.id}')" role="article">
      <div class="item-row-thumb">
        ${item.cover ? `<img src="${esc(item.cover)}" alt="" onerror="this.remove()">` : ci.emoji}
      </div>
      <div class="item-row-body">
        <div class="item-row-name">${esc(item.name)}</div>
        <div class="item-row-meta">${[item.platform, item.publisher, item.year].filter(Boolean).join(' · ')}</div>
        ${stars ? `<div style="color:var(--gold);font-size:0.7rem">${stars}</div>` : ''}
      </div>
      <span class="item-badge ${ci.badgeClass}" style="position:static">${ci.label}</span>
      <div class="item-row-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="openEditForItem('${item.id}')" aria-label="Editar"><i class="ti ti-edit"></i></button>
        <button class="btn-icon" onclick="deleteItem('${item.id}')" aria-label="Eliminar" style="color:var(--danger)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function renderCategories() {
  const cats = ['game','movie','dvd','bluray','book','comic','music','other'];
  document.getElementById('cat-grid').innerHTML = cats.map(cat => {
    const ci = CAT_INFO[cat];
    const count = DB.filter(x => x.category === cat && !x.wishlist).length;
    return `<div class="cat-card" onclick="filterByCategory('${cat}')">
      <div class="cat-icon"><i class="ti ${ci.icon}" aria-hidden="true"></i></div>
      <div class="cat-name">${ci.label}</div>
      <div class="cat-count">${count} ítem${count !== 1 ? 's' : ''}</div>
    </div>`;
  }).join('');
}

function renderWishlist() {
  const items = DB.filter(x => x.wishlist);
  const container = document.getElementById('wishlist-container');
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">
      <i class="ti ti-heart" aria-hidden="true"></i>
      <h3>Tu lista de deseos está vacía</h3>
      <p>Añade ítems marcando "Lo quiero" al escanear</p>
    </div>`; return;
  }
  container.className = 'items-list';
  container.innerHTML = items.map(item => {
    const ci = CAT_INFO[item.category] || CAT_INFO.other;
    return `<div class="item-row" onclick="openDetail('${item.id}')">
      <div class="item-row-thumb">${item.cover ? `<img src="${esc(item.cover)}" alt="" onerror="this.remove()">` : ci.emoji}</div>
      <div class="item-row-body">
        <div class="item-row-name">${esc(item.name)}</div>
        <div class="item-row-meta">${[item.platform, item.year].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="item-row-actions" onclick="event.stopPropagation()">
        <button class="btn btn-success btn-sm" onclick="markOwned('${item.id}')"><i class="ti ti-check"></i> ¡Ya lo tengo!</button>
        <button class="btn-icon" onclick="deleteItem('${item.id}')" style="color:var(--danger)"><i class="ti ti-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

function renderStatsPage() {
  const owned = DB.filter(x => !x.wishlist);
  const total = owned.length || 1;
  const byCat = {};
  owned.forEach(x => { byCat[x.category] = (byCat[x.category] || 0) + 1; });
  const byPlatform = {};
  owned.filter(x => x.platform).forEach(x => { byPlatform[x.platform] = (byPlatform[x.platform] || 0) + 1; });
  const byYear = {};
  owned.filter(x => x.year).forEach(x => { byYear[x.year] = (byYear[x.year] || 0) + 1; });
  const topPlatforms = Object.entries(byPlatform).sort((a,b) => b[1]-a[1]).slice(0,8);
  const topYears = Object.entries(byYear).sort((a,b) => a[0]-b[0]).slice(-10);

  const catColors = { game:'#7c6af7', movie:'#f5c842', dvd:'#3b82f6', bluray:'#0ea5e9', book:'#22c55e', comic:'#ef4444', music:'#ec4899', other:'#94a3b8' };
  const catRows = Object.entries(byCat).sort((a,b) => b[1]-a[1]).map(([cat, count]) => {
    const ci = CAT_INFO[cat] || CAT_INFO.other;
    const pct = Math.round(count/total*100);
    const color = catColors[cat] || 'var(--accent)';
    return `<div class="stat-row">
      <span class="stat-row-label">${ci.label}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%;background:${color}"></div></div>
      <span class="stat-row-val">${count}</span>
    </div>`;
  }).join('');

  const platRows = topPlatforms.map(([plat, count]) => {
    const pct = Math.round(count/total*100);
    return `<div class="stat-row">
      <span class="stat-row-label" style="font-size:0.73rem">${esc(plat)}</span>
      <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%;background:var(--accent2)"></div></div>
      <span class="stat-row-val">${count}</span>
    </div>`;
  }).join('') || '<div style="color:var(--text3);font-size:0.8rem">Sin datos</div>';

  const rated = owned.filter(x => x.rating > 0);
  const avgRating = rated.length ? (rated.reduce((s,x) => s+x.rating, 0)/rated.length).toFixed(1) : '—';

  document.getElementById('stats-container').innerHTML = `
    <div class="stats-grid" style="margin-bottom:1.25rem">
      <div class="stat-card"><div class="stat-val">${owned.length}</div><div class="stat-label">Total en colección</div></div>
      <div class="stat-card"><div class="stat-val">${DB.filter(x=>x.wishlist).length}</div><div class="stat-label">En wishlist</div></div>
      <div class="stat-card"><div class="stat-val">${avgRating}</div><div class="stat-label">Valoración media</div></div>
      <div class="stat-card"><div class="stat-val">${Object.keys(byPlatform).length}</div><div class="stat-label">Plataformas</div></div>
    </div>
    <div class="stats-page-grid">
      <div class="stats-section"><h3>Por categoría</h3>${catRows || '<div style="color:var(--text3);font-size:0.8rem">Sin datos</div>'}</div>
      <div class="stats-section"><h3>Por plataforma</h3>${platRows}</div>
    </div>`;
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== NAVIGATION =====
window.showPage = (page, el) => {
  currentPage = page;
  ['collection','categories','wishlist','stats'].forEach(p => {
    document.getElementById('page-'+p).style.display = p === page ? '' : 'none';
  });
  document.querySelectorAll('.nav-item[data-page]').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  const titles = { collection: 'Mi Colección', categories: 'Categorías', wishlist: 'Lista de deseos', stats: 'Estadísticas' };
  document.getElementById('page-title').textContent = titles[page] || '';
  if (window.innerWidth < 768) closeSidebarMobile();
};

window.filterByCategory = (cat) => {
  showPage('collection', document.querySelector('[data-page="collection"]'));
  document.getElementById('cat-filter').value = cat;
  filterItems();
};

window.setView = (v) => {
  currentView = v;
  document.getElementById('btn-grid').classList.toggle('active', v === 'grid');
  document.getElementById('btn-list').classList.toggle('active', v === 'list');
  filterItems();
};

window.clearSearch = () => {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').style.display = 'none';
  filterItems();
};

window.toggleSidebar = () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
};

function closeSidebarMobile() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// ===== SCANNER MODAL =====
window.openScannerModal = () => {
  editingId = null;
  resetScannerForm();
  document.getElementById('scanner-modal').style.display = 'flex';
  if (scanTab === 'camera') setTimeout(startCamera, 400);
};

window.closeScannerModal = () => {
  stopCamera();
  document.getElementById('scanner-modal').style.display = 'none';
  pendingImageData = null;
};

window.closeScannerOnOverlay = (e) => { if (e.target.id === 'scanner-modal') closeScannerModal(); };

function resetScannerForm() {
  document.getElementById('scan-result').style.display = 'none';
  document.getElementById('camera-status').innerHTML = '';
  document.getElementById('image-status').innerHTML = '';
  ['r-name','r-year','r-platform','r-publisher','r-genre','r-desc','r-cover','r-barcode',
   'm-name','m-year','m-platform','m-publisher','m-genre','m-notes','m-cover','m-barcode'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const rcp = document.getElementById('r-cover-preview'); if(rcp) rcp.style.display = 'none';
  const mcp = document.getElementById('m-cover-preview'); if(mcp) mcp.style.display = 'none';
  document.getElementById('image-preview').style.display = 'none';
  const ep = document.getElementById('extra-fields-panel');
  const ei = document.getElementById('extra-toggle-icon');
  if (ep) { ep.classList.remove('open'); }
  if (ei) ei.style.transform = '';
  pendingImageData = null;
  switchScanTab('camera', false);
}

window.switchScanTab = (tab, activateCam = true) => {
  scanTab = tab;
  ['camera','image','manual'].forEach(t => {
    document.getElementById('tab-'+t).classList.toggle('active', t === tab);
    document.getElementById('scan-panel-'+t).style.display = t === tab ? '' : 'none';
  });
  if (tab !== 'camera') stopCamera();
  if (tab === 'camera' && activateCam) setTimeout(startCamera, 400);
};

// ===== CAMERA =====
window.startCamera = async () => {
  if (cameraStream) return;
  try {
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 }, height: { ideal: 720 }
      }
    };
    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('camera-video');
    video.srcObject = cameraStream;
    video.style.display = 'block';
    document.getElementById('cam-placeholder').style.display = 'none';
    document.getElementById('scan-overlay').style.display = 'flex';
    document.getElementById('start-cam-btn').style.display = 'none';
    document.getElementById('stop-cam-btn').style.display = '';
    document.getElementById('capture-btn').style.display = '';
    setStatus('camera-status', 'info', 'Apunta al código de barras o portada y pulsa Capturar');
    enumerateCameras();
  } catch(e) {
    setStatus('camera-status', 'error', 'Cámara no disponible. Usa la pestaña "Imagen" para subir una foto.');
  }
};

async function enumerateCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices = devices.filter(d => d.kind === 'videoinput');
    const sel = document.getElementById('camera-select');
    if (cameraDevices.length > 1) {
      sel.innerHTML = cameraDevices.map((d,i) => `<option value="${i}">${d.label || 'Cámara '+(i+1)}</option>`).join('');
      sel.style.display = '';
    }
  } catch(e) {}
}

window.switchCamera = async () => {
  const idx = parseInt(document.getElementById('camera-select').value);
  currentCameraIndex = idx;
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const device = cameraDevices[idx];
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: device.deviceId } } });
    document.getElementById('camera-video').srcObject = cameraStream;
  } catch(e) {}
};

window.stopCamera = () => {
  if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); cameraStream = null; }
  const video = document.getElementById('camera-video');
  if (video) { video.style.display = 'none'; video.srcObject = null; }
  const ph = document.getElementById('cam-placeholder'); if(ph) ph.style.display = '';
  const so = document.getElementById('scan-overlay'); if(so) so.style.display = 'none';
  const scb = document.getElementById('start-cam-btn'); if(scb) scb.style.display = '';
  const stb = document.getElementById('stop-cam-btn'); if(stb) stb.style.display = 'none';
  const cb = document.getElementById('capture-btn'); if(cb) cb.style.display = 'none';
};

window.captureFrame = () => {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  if (!video.videoWidth) { setStatus('camera-status','error','La cámara aún no está lista'); return; }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  pendingImageData = dataUrl.split(',')[1];
  stopCamera();
  document.getElementById('image-preview').src = dataUrl;
  document.getElementById('image-preview').style.display = 'block';
  analyzeWithClaude(pendingImageData, 'camera-status');
};

// ===== IMAGE UPLOAD =====
window.dragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
window.dragLeave = (e) => { e.currentTarget.classList.remove('drag-over'); };
window.dropFile = (e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if(f) processImageFile(f); };
window.dropImport = (e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if(f) processImportFile(f); };
window.handleFileSelect = (e) => { if(e.target.files[0]) processImageFile(e.target.files[0]); };
window.handleImport = (e) => { if(e.target.files[0]) processImportFile(e.target.files[0]); };

function processImageFile(file) {
  if (!file.type.startsWith('image/')) { setStatus('image-status','error','Por favor selecciona una imagen'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const dataUrl = ev.target.result;
    document.getElementById('image-preview').src = dataUrl;
    document.getElementById('image-preview').style.display = 'block';
    pendingImageData = dataUrl.split(',')[1];
    analyzeWithClaude(pendingImageData, 'image-status');
  };
  reader.readAsDataURL(file);
}

// ===== CLAUDE AI ANALYSIS =====
async function analyzeWithClaude(base64, statusId) {
  setStatus(statusId, 'loading', 'Analizando con inteligencia artificial...');

  const prompt = `Analiza esta imagen. Puede ser la portada o código de barras de un videojuego, película, DVD, Blu-ray, libro, cómic, música u otro producto coleccionable.

Extrae toda la información visible y devuelve ÚNICAMENTE un objeto JSON válido sin texto adicional ni markdown:
{
  "name": "título completo del producto",
  "category": "game|movie|dvd|bluray|book|comic|music|other",
  "year": "año de lanzamiento o edición",
  "platform": "plataforma o soporte físico (PS5, Xbox Series X, Nintendo Switch, PC, DVD, Blu-ray, 4K UHD, etc)",
  "publisher": "editor, distribuidora, desarrolladora o estudio",
  "genre": "género o géneros separados por comas",
  "desc": "descripción breve del producto (máximo 2 frases)",
  "barcode": "código de barras EAN/ISBN si es visible como número",
  "confidence": "high|medium|low",
  "notes": "información extra: edición especial, número de colección, clasificación por edad, etc"
}

Si es un código de barras sin imagen de portada, identifica el producto por el número si lo reconoces.
Si no puedes identificar el producto, devuelve: {"error": "No identificado"}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch(e2) { const m = clean.match(/\{[\s\S]*\}/); if(m) parsed = JSON.parse(m[0]); else throw new Error('Respuesta inválida'); }

    if (parsed.error) {
      setStatus(statusId, 'error', 'No se pudo identificar el producto. Puedes añadirlo manualmente.');
      document.getElementById('scan-result').style.display = 'block';
      return;
    }

    fillResultForm(parsed);
    setStatus(statusId, 'success', `Detectado: "${parsed.name}" · Confianza: ${parsed.confidence || 'alta'}`);
  } catch(e) {
    setStatus(statusId, 'error', 'Error de análisis. Puedes editar los campos manualmente a continuación.');
    document.getElementById('scan-result').style.display = 'block';
  }
}

function fillResultForm(data) {
  const fields = { 'r-name': data.name, 'r-year': data.year, 'r-platform': data.platform, 'r-publisher': data.publisher, 'r-genre': data.genre, 'r-desc': data.desc || data.notes, 'r-barcode': data.barcode };
  Object.entries(fields).forEach(([id, val]) => { const el = document.getElementById(id); if(el) el.value = val || ''; });
  const catSel = document.getElementById('r-cat');
  if (data.category && catSel.querySelector(`option[value="${data.category}"]`)) catSel.value = data.category;
  document.getElementById('scan-result').style.display = 'block';
}

window.previewResultCover = () => {
  const url = document.getElementById('r-cover').value;
  const img = document.getElementById('r-cover-preview');
  img.src = url; img.style.display = url ? 'block' : 'none';
};

window.previewManualCover = () => {
  const url = document.getElementById('m-cover').value;
  const img = document.getElementById('m-cover-preview');
  img.src = url; img.style.display = url ? 'block' : 'none';
};

// ===== ADD / EDIT ITEM =====
window.addItemFromModal = () => {
  const isResult = document.getElementById('scan-result').style.display !== 'none';
  const isManual = scanTab === 'manual';
  let item;

  if (isManual && !isResult) {
    const name = document.getElementById('m-name').value.trim();
    if (!name) { toast('Escribe un nombre para el ítem', 'error'); return; }
    item = buildItem({
      name, category: document.getElementById('m-cat').value,
      year: document.getElementById('m-year').value,
      platform: document.getElementById('m-platform').value,
      publisher: document.getElementById('m-publisher').value,
      genre: document.getElementById('m-genre').value,
      desc: document.getElementById('m-notes').value,
      cover: document.getElementById('m-cover').value,
      barcode: document.getElementById('m-barcode').value,
      wishlist: document.getElementById('m-wishlist').value === 'yes'
    });
  } else if (isResult) {
    const name = document.getElementById('r-name').value.trim();
    if (!name) { toast('El ítem necesita un nombre', 'error'); return; }
    item = buildItem({
      name, category: document.getElementById('r-cat').value,
      year: document.getElementById('r-year').value,
      platform: document.getElementById('r-platform').value,
      publisher: document.getElementById('r-publisher').value,
      genre: document.getElementById('r-genre').value,
      desc: document.getElementById('r-desc').value,
      cover: document.getElementById('r-cover').value,
      barcode: document.getElementById('r-barcode').value,
      wishlist: document.getElementById('r-wishlist').value === 'yes'
    });
  } else {
    toast('Captura o sube una imagen, o usa la pestaña Manual', 'info');
    return;
  }

  if (editingId) {
    const idx = DB.findIndex(x => x.id === editingId);
    if (idx >= 0) { item.added = DB[idx].added; item.rating = DB[idx].rating; DB[idx] = item; }
    toast('Ítem actualizado', 'success');
  } else {
    DB.unshift(item);
    toast(`"${item.name}" añadido a tu colección`, 'success');
  }
  scheduleSave();
  renderAll();
  closeScannerModal();
};

function buildItem(data) {
  return {
    id: editingId || gid(),
    name: data.name || '',
    category: data.category || 'other',
    year: data.year || '',
    platform: data.platform || '',
    publisher: data.publisher || '',
    genre: data.genre || '',
    desc: data.desc || '',
    cover: data.cover || '',
    barcode: data.barcode || '',
    rating: 0,
    wishlist: data.wishlist || false,
    added: new Date().toISOString()
  };
}

// ===== DETAIL MODAL =====
window.openDetail = (id) => {
  const item = DB.find(x => x.id === id);
  if (!item) return;
  const ci = CAT_INFO[item.category] || CAT_INFO.other;
  const stars = [1,2,3,4,5].map(n =>
    `<span onclick="setRating('${id}',${n})" style="color:${n<=(item.rating||0)?'var(--gold)':'var(--text3)'}" title="${n} estrella${n>1?'s':''}">★</span>`
  ).join('');
  const added = new Date(item.added).toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});

  document.getElementById('detail-title').textContent = item.name;
  document.getElementById('detail-content').innerHTML = `
    <div style="padding:0 1.5rem 1.5rem">
      <div class="detail-layout">
        <div class="detail-cover">
          ${item.cover ? `<img src="${esc(item.cover)}" alt="${esc(item.name)}" onerror="this.style.display='none'">` : ci.emoji}
        </div>
        <div class="detail-body">
          <div class="detail-title">${esc(item.name)}</div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:0.5rem">
            <span class="item-badge ${ci.badgeClass}" style="position:static;display:inline-block">${ci.label}</span>
            ${item.wishlist ? '<span style="font-size:0.75rem;color:var(--warn)"><i class="ti ti-heart" aria-hidden="true"></i> Wishlist</span>' : ''}
          </div>
          <div class="detail-actions" style="margin-top:0;margin-bottom:0.75rem">
            <button class="btn btn-ghost btn-sm" onclick="openEditForItem('${id}');closeDetailModal()"><i class="ti ti-edit"></i> Editar</button>
            ${item.wishlist ? `<button class="btn btn-success btn-sm" onclick="markOwned('${id}');closeDetailModal()"><i class="ti ti-check"></i> ¡Ya lo tengo!</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="deleteItem('${id}');closeDetailModal()"><i class="ti ti-trash"></i> Eliminar</button>
          </div>
          <div class="rating-stars" aria-label="Valoración">${stars}</div>
          ${mf('Plataforma', item.platform)}
          ${mf('Editor', item.publisher)}
          ${mf('Año', item.year)}
          ${mf('Género', item.genre)}
          ${mf('Código', item.barcode)}
          ${mf('Añadido', added)}
          ${item.desc ? `<div class="detail-desc">${esc(item.desc)}</div>` : ''}
        </div>
      </div>
    </div>`;
  document.getElementById('detail-modal').style.display = 'flex';
};

function mf(label, val) {
  if (!val) return '';
  return `<div class="detail-field"><span class="detail-field-label">${label}</span><span class="detail-field-value">${esc(val)}</span></div>`;
}

window.closeDetailModal = () => { document.getElementById('detail-modal').style.display = 'none'; };
window.closeDetailOnOverlay = (e) => { if(e.target.id === 'detail-modal') closeDetailModal(); };

window.setRating = (id, rating) => {
  const item = DB.find(x => x.id === id);
  if (!item) return;
  item.rating = item.rating === rating ? 0 : rating;
  scheduleSave();
  openDetail(id);
  renderAll();
  toast(item.rating ? `Valoración guardada: ${item.rating} ★` : 'Valoración eliminada', 'success');
};

// ===== EDIT =====
window.openEditForItem = (id) => {
  const item = DB.find(x => x.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('scanner-modal').style.display = 'flex';
  switchScanTab('manual', false);
  setTimeout(() => {
    document.getElementById('m-name').value = item.name;
    document.getElementById('m-cat').value = item.category;
    document.getElementById('m-year').value = item.year || '';
    document.getElementById('m-platform').value = item.platform || '';
    document.getElementById('m-publisher').value = item.publisher || '';
    document.getElementById('m-genre').value = item.genre || '';
    document.getElementById('m-notes').value = item.desc || '';
    document.getElementById('m-cover').value = item.cover || '';
    document.getElementById('m-barcode').value = item.barcode || '';
    document.getElementById('m-wishlist').value = item.wishlist ? 'yes' : 'no';
    if (item.cover) { const img = document.getElementById('m-cover-preview'); img.src = item.cover; img.style.display = 'block'; }
    const hasExtra = item.year || item.platform || item.publisher || item.genre || item.desc || item.cover || item.barcode;
    if (hasExtra) {
      const panel = document.getElementById('extra-fields-panel');
      const icon = document.getElementById('extra-toggle-icon');
      panel.classList.add('open');
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  }, 50);
};

// ===== DELETE / MARK OWNED =====
window.deleteItem = (id) => {
  const item = DB.find(x => x.id === id);
  if (!item) return;
  if (!confirm(`¿Eliminar "${item.name}" de tu colección?`)) return;
  DB = DB.filter(x => x.id !== id);
  scheduleSave(); renderAll();
  toast('Ítem eliminado', 'info');
};

window.markOwned = (id) => {
  const item = DB.find(x => x.id === id);
  if (!item) return;
  item.wishlist = false;
  scheduleSave(); renderAll();
  toast(`"${item.name}" añadido a tu colección`, 'success');
};

// ===== EXPORT =====
window.openExportModal = () => { document.getElementById('export-modal').style.display = 'flex'; };
window.closeExportModal = () => { document.getElementById('export-modal').style.display = 'none'; };

window.exportJSON = () => {
  const data = { app: 'Collectr', version: '2.0', exported: new Date().toISOString(), user: currentUser?.displayName || 'Invitado', total: DB.length, items: DB };
  dl('collectr_' + td() + '.json', JSON.stringify(data, null, 2), 'application/json');
  toast('Exportado como JSON', 'success');
};

window.exportCSV = () => {
  const headers = ['ID','Nombre','Categoría','Plataforma','Editor','Año','Género','Descripción','Código de barras','Valoración','Wishlist','Fecha añadido','URL portada'];
  const rows = DB.map(x => [x.id, x.name, CAT_INFO[x.category]?.label||x.category, x.platform, x.publisher, x.year, x.genre, x.desc, x.barcode, x.rating||0, x.wishlist?'Sí':'No', x.added, x.cover].map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
  dl('collectr_' + td() + '.csv', '\uFEFF' + [headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
  toast('Exportado como CSV', 'success');
};

window.exportHTML = () => {
  const owned = DB.filter(x => !x.wishlist);
  const cards = owned.map(x => {
    const ci = CAT_INFO[x.category] || CAT_INFO.other;
    const stars = x.rating ? '★'.repeat(x.rating) : '';
    return `<div style="background:#1e1e28;border:1px solid #3a3a5c;border-radius:12px;overflow:hidden">
      <div style="height:200px;background:#16161d;display:flex;align-items:center;justify-content:center;font-size:3rem;position:relative">
        ${x.cover ? `<img src="${x.cover}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0" alt="">` : ci.emoji}
      </div>
      <div style="padding:0.75rem">
        <div style="font-size:0.65rem;color:#9898b0;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px">${ci.label}</div>
        <div style="font-size:0.85rem;font-weight:600;color:#e8e8f0;margin-bottom:3px">${x.name}</div>
        ${x.platform ? `<div style="font-size:0.7rem;color:#7c6af7">${x.platform}</div>` : ''}
        ${x.year ? `<div style="font-size:0.68rem;color:#5a5a78">${x.year}</div>` : ''}
        ${stars ? `<div style="color:#f5c842;font-size:0.75rem;margin-top:4px">${stars}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi Colección — Collectr</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0e0e12;color:#e8e8f0;font-family:system-ui,sans-serif;padding:2rem}h1{font-size:2rem;color:#a78bfa;margin-bottom:0.25rem}h1 span{font-size:1rem;font-weight:400}p{color:#9898b0;font-size:0.85rem;margin-bottom:1.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1rem}</style>
</head><body>
<h1>Mi Colección <span>— Collectr</span></h1>
<p>Exportado el ${new Date().toLocaleString('es-ES')} · ${owned.length} ítems · Usuario: ${currentUser?.displayName || 'Invitado'}</p>
<div class="grid">${cards}</div>
</body></html>`;
  dl('collectr_' + td() + '.html', html, 'text/html;charset=utf-8');
  toast('Exportado como HTML visual', 'success');
};

function dl(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 100);
}

function td() { return new Date().toISOString().slice(0,10); }

// ===== IMPORT =====
window.openImportModal = () => { document.getElementById('import-modal').style.display = 'flex'; };
window.closeImportModal = () => { document.getElementById('import-modal').style.display = 'none'; };

function processImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      let imported = [];
      if (ext === 'json') {
        const data = JSON.parse(ev.target.result);
        imported = Array.isArray(data) ? data : (data.items || []);
      } else if (ext === 'csv') {
        imported = parseCSV(ev.target.result);
      } else {
        setStatus('import-status','error','Formato no soportado. Usa JSON o CSV.');
        return;
      }
      if (!imported.length) { setStatus('import-status','error','El archivo está vacío o no tiene datos válidos.'); return; }
      let added = 0, skipped = 0;
      imported.forEach(item => {
        if (!item.name) { skipped++; return; }
        const exists = DB.some(x => x.id === item.id || (x.name === item.name && x.category === item.category));
        if (exists) { skipped++; return; }
        DB.unshift({ id: item.id || gid(), name: item.name, category: item.category || 'other', year: item.year||'', platform: item.platform||'', publisher: item.publisher||'', genre: item.genre||'', desc: item.desc||'', cover: item.cover||'', barcode: item.barcode||'', rating: item.rating||0, wishlist: item.wishlist||false, added: item.added || new Date().toISOString() });
        added++;
      });
      scheduleSave(); renderAll();
      setStatus('import-status','success',`Importados: ${added} ítems nuevos · Omitidos (duplicados): ${skipped}`);
      setTimeout(() => { closeImportModal(); toast(`${added} ítems importados`, 'success'); }, 2000);
    } catch(e) {
      setStatus('import-status','error','Error al leer el archivo: ' + e.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/,'').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').toLowerCase().trim());
  return lines.slice(1).map(line => {
    const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g).map(v => v.replace(/^"|"$/g,'').replace(/""/g,'"').trim());
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] || ''; });
    return { id: obj.id, name: obj.nombre || obj.name, category: obj['categoría'] || obj.category, platform: obj.plataforma || obj.platform, publisher: obj.editor || obj.publisher, year: obj.año || obj.year, genre: obj['género'] || obj.genre, desc: obj['descripción'] || obj.desc, barcode: obj['código de barras'] || obj.barcode, rating: parseInt(obj.valoración || obj.rating) || 0, wishlist: (obj['lista deseos'] || obj.wishlist) === 'Sí', cover: obj['url portada'] || obj.cover, added: obj['fecha añadido'] || obj.added };
  });
}

// ===== MODAL HELPERS =====
window.closeModalOnOverlay = (e, id) => { if(e.target.id === id) document.getElementById(id).style.display = 'none'; };
window.closeImportModal = () => { document.getElementById('import-modal').style.display = 'none'; };

// ===== STATUS =====
function setStatus(containerId, type, msg) {
  const icons = { loading: '<div class="spinner"></div>', success: '<i class="ti ti-check-circle" aria-hidden="true"></i>', error: '<i class="ti ti-alert-circle" aria-hidden="true"></i>', info: '<i class="ti ti-info-circle" aria-hidden="true"></i>' };
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="status-box status-${type}">${icons[type]||''} ${msg}</div>`;
}

// ===== TOAST =====
window.toast = (msg, type = 'info') => {
  const icons = { success: 'ti-check-circle', error: 'ti-alert-circle', info: 'ti-info-circle', warn: 'ti-alert-triangle' };
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="ti ${icons[type]||'ti-info-circle'}" aria-hidden="true"></i><span>${msg}</span>`;
  tc.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 350); }, 3500);
};

// ===== PWA / INSTALL =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-banner').style.display = 'flex';
});

window.installApp = async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result.outcome === 'accepted') { toast('¡Collectr instalada en tu dispositivo!', 'success'); document.getElementById('install-banner').style.display = 'none'; }
  deferredInstallPrompt = null;
};

window.dismissInstall = () => { document.getElementById('install-banner').style.display = 'none'; };

window.addEventListener('appinstalled', () => { toast('Collectr instalada correctamente', 'success'); });

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['scanner-modal','detail-modal','export-modal','import-modal'].forEach(id => {
      document.getElementById(id).style.display = 'none';
    });
    stopCamera();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
});

// ===== ONLINE/OFFLINE =====
window.addEventListener('online', () => {
  if (!isGuest && isFirebaseConfigured) {
    setSyncStatus('syncing', 'Reconectando...');
    saveDB();
  }
});
window.addEventListener('offline', () => { setSyncStatus('offline', 'Sin conexión'); });
