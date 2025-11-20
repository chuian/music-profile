const form = document.getElementById('profileForm');
const profilesDiv = document.getElementById('profiles');
const loadBtn = document.getElementById('loadBtn');
const newBtn = document.getElementById('newBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const hideBtn = document.getElementById('hideBtn');

// search panel elements
const searchForm = document.getElementById('searchForm');
const searchName = document.getElementById('searchName');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

let editingId = null;
const LOCAL_KEY = 'profiles_local_v1';
const HIDDEN_KEY = 'profiles_hidden_v1';

// Search settings
const SEARCH_KEY = 'profiles_search_last';

function genId() {
  return 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

async function fetchFromApi() {
  try {
    const res = await fetch('/api');
    if (!res.ok) throw new Error('API GET not OK');
    return await res.json();
  } catch (e) {
    return null;
  }
}

function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveToLocal(profiles) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(profiles));
}

async function createProfileLocalOrApi(profile) {
  try {
    const res = await fetch('/api', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile)
    });
    if (res.ok) {
      try {
        const body = await res.json();
        // if server returned insertedId, attach it so UI can use it
        if (body && body.insertedId) profile._id = String(body.insertedId);
      } catch (e) {}
      return true;
    }
    throw new Error('API POST failed');
  } catch (e) {
    const local = loadFromLocal();
    profile._id = genId();
    local.unshift(profile);
    saveToLocal(local);
    return false;
  }
}

async function updateProfileLocalOrApi(id, update) {
  try {
    const res = await fetch('/api', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...update })
    });
    if (res.ok) return true;
    throw new Error('API PUT failed');
  } catch (e) {
    const local = loadFromLocal();
    const idx = local.findIndex(p => p._id === id);
    if (idx !== -1) { local[idx] = { ...local[idx], ...update }; saveToLocal(local); }
    return false;
  }
}

async function deleteProfileLocalOrApi(id) {
  try {
    const res = await fetch('/api', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) return true;
    throw new Error('API DELETE failed');
  } catch (e) {
    const local = loadFromLocal().filter(p => p._id !== id);
    saveToLocal(local);
    return false;
  }
}

function renderProfiles(list) {
  if (!list || list.length === 0) { profilesDiv.innerHTML = '<h3>No profiles</h3>'; return; }
  const html = ['<h3>Saved Profiles</h3>'];
  html.push('<ul class="profiles-list">');
  list.forEach(p => {
    const rawId = p._id || p.id || genId();
    const id = String(rawId);
    html.push(`<li class="profile-item" data-id="${id}">`);
    html.push(`<div class="profile-main"><b>${escapeHtml(p.name || '')}</b> — ${escapeHtml(p.genre || '')}` +
      `<div class="profile-meta">${escapeHtml(p.vibes || '')} ${escapeHtml(p.crowd || '')} ${escapeHtml(p.experience || '')}</div></div>`);
    html.push('<div class="profile-actions">');
    html.push(`<button class="action-btn edit-btn" data-id="${id}" data-name="${escapeAttr(p.name || '')}" data-genre="${escapeAttr(p.genre || '')}">Edit</button>`);
    html.push(`<button class="action-btn delete-btn" data-id="${id}">Delete</button>`);
    html.push(`<button class="action-btn select-btn" data-id="${id}" data-profile='${escapeAttr(JSON.stringify(p))}'>Select</button>`);
    html.push('</div>');
    html.push('</li>');
  });
  html.push('</ul>');
  profilesDiv.innerHTML = html.join('');

  // wire up action buttons
  profilesDiv.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    const genre = e.currentTarget.dataset.genre;
    editingId = id;
    document.getElementById('name').value = name;
    document.getElementById('genre').value = genre;
    // populate new fields if available
    try {
      const p = JSON.parse(e.currentTarget.closest('.profile-item')?.querySelector('.select-btn')?.dataset.profile || '{}');
      if (p) {
        document.getElementById('vibes').value = p.vibes || '';
        document.getElementById('crowd').value = p.crowd || '';
        document.getElementById('experience').value = p.experience || '';
      }
    } catch (err) {}
    saveBtn.textContent = 'Update Profile';
    // open the form for editing
    openFormForEdit();
  }));

  profilesDiv.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this profile?')) return;
    await deleteProfileLocalOrApi(id);
    await loadProfiles();
  }));

  profilesDiv.querySelectorAll('.select-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const profileData = e.currentTarget.dataset.profile;
    let profile = {};
    try { profile = JSON.parse(profileData || '{}'); } catch (err) {}
    // store current profile in sessionStorage and navigate to dashboard
    try { sessionStorage.setItem('current_profile', JSON.stringify(profile)); } catch (err) {}
    // navigate to dashboard
    window.location.href = `dashboard.html?id=${encodeURIComponent(e.currentTarget.dataset.id)}`;
  }));
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

async function loadProfiles() {
  const api = await fetchFromApi();
  if (api && Array.isArray(api)) { renderProfiles(api); return api; }
  const local = loadFromLocal();
  renderProfiles(local);
  return local;
}

// Hide/show handling
function applyHideState(hidden) {
  if (hidden) {
    profilesDiv.classList.add('hidden');
    hideBtn.textContent = 'Show Profiles';
    hideBtn.classList.add('active');
  } else {
    profilesDiv.classList.remove('hidden');
    hideBtn.textContent = 'Hide Profiles';
    hideBtn.classList.remove('active');
  }
  try { localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '0'); } catch (e) {}
}

// initialize hide state from storage
try {
  const saved = localStorage.getItem(HIDDEN_KEY);
  applyHideState(saved === '1');
} catch (e) { /* ignore */ }

hideBtn.addEventListener('click', () => {
  const isHidden = profilesDiv.classList.contains('hidden');
  applyHideState(!isHidden);
});

// --- New-profile toggle handling ---
const formEl = document.getElementById('profileForm');
function setNewActive(on) {
  if (on) {
    newBtn.classList.add('active');
    formEl.classList.remove('collapsed');
    // focus first field
    try { document.getElementById('name').focus(); } catch (e) {}
  } else {
    newBtn.classList.remove('active');
    formEl.classList.add('collapsed');
    // reset editing state when hiding
    editingId = null;
    try { form.reset(); saveBtn.textContent = 'Save Profile'; } catch (e) {}
  }
}

// start with form hidden until New Profile is toggled
setNewActive(false);

newBtn.addEventListener('click', () => {
  const isActive = newBtn.classList.contains('active');
  setNewActive(!isActive);
});

// ensure edit action opens the form and highlights New
function openFormForEdit() {
  setNewActive(true);
  newBtn.classList.add('active');
}

// Search logic: look on server (GET /api) and local storage, combine and filter by name
async function searchProfilesByName(name) {
  const results = [];
  const term = String(name || '').trim().toLowerCase();
  if (!term) return results;

  // local matches
  try {
    const local = loadFromLocal();
    local.forEach(p => {
      if ((p.name || '').toLowerCase().includes(term)) results.push({ source: 'local', profile: p });
    });
  } catch (e) {}

  // server matches (fetch list and filter)
  try {
    const api = await fetchFromApi();
    if (api && Array.isArray(api)) {
      api.forEach(p => {
        if ((p.name || '').toLowerCase().includes(term)) results.push({ source: 'server', profile: p });
      });
    }
  } catch (e) {}

  return results;
}

function renderSearchResults(list) {
  if (!searchResults) return;
  if (!list || list.length === 0) { searchResults.innerHTML = '<div class="result"><em>No matches</em></div>'; return; }
  const html = [];
  list.forEach(item => {
    const p = item.profile;
    const id = String(p._id || p.id || '');
    html.push(`<div class="result"><div><b>${escapeHtml(p.name||'')}</b> — ${escapeHtml(p.genre||'')}</div>`);
    html.push(`<div class="actions"><button class="small-btn select-result" data-id="${id}" data-profile='${escapeAttr(JSON.stringify(p))}'>Open</button><button class="small-btn copy-name" data-name="${escapeAttr(p.name||'')}">Fill</button></div>`);
    html.push('</div>');
  });
  searchResults.innerHTML = html.join('');

  // wire buttons
  searchResults.querySelectorAll('.select-result').forEach(btn => btn.addEventListener('click', (e) => {
    const profileData = e.currentTarget.dataset.profile;
    let profile = {};
    try { profile = JSON.parse(profileData || '{}'); } catch (err) {}
    try { sessionStorage.setItem('current_profile', JSON.stringify(profile)); } catch (err) {}
    const id = e.currentTarget.dataset.id || '';
    window.location.href = `dashboard.html?id=${encodeURIComponent(id)}`;
  }));

  searchResults.querySelectorAll('.copy-name').forEach(btn => btn.addEventListener('click', (e) => {
    const name = e.currentTarget.dataset.name || '';
    document.getElementById('name').value = name;
    document.getElementById('name').focus();
  }));
}

searchForm && searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = searchName.value.trim();
  try { localStorage.setItem(SEARCH_KEY, q); } catch (err) {}
  const results = await searchProfilesByName(q);
  renderSearchResults(results);
});

// restore last search
try { const last = localStorage.getItem(SEARCH_KEY); if (last) { searchName.value = last; } } catch (e) {}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const genre = document.getElementById('genre').value;
  const vibes = document.getElementById('vibes').value;
  const crowd = document.getElementById('crowd').value;
  const experience = document.getElementById('experience').value;
  if (!name || !genre) return alert('Please enter name and genre');

  const profile = { name, genre, vibes, crowd, experience };
  if (!editingId) {
    await createProfileLocalOrApi(profile);
    form.reset();
    saveBtn.textContent = 'Save Profile';
  } else {
    await updateProfileLocalOrApi(editingId, profile);
    editingId = null;
    form.reset();
    saveBtn.textContent = 'Save Profile';
  }
  await loadProfiles();
});

if (loadBtn) loadBtn.addEventListener('click', () => loadProfiles());

// Clear button becomes a confirm-toggle: first click arms, second click clears
const clearDefaultText = clearBtn ? clearBtn.textContent : 'Clear All (local)';
let clearTimeoutId = null;
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    const armed = clearBtn.classList.contains('active');
    if (!armed) {
      clearBtn.classList.add('active');
      clearBtn.textContent = 'Confirm Clear';
      // auto-cancel after 6s
      clearTimeoutId = setTimeout(() => {
        clearBtn.classList.remove('active');
        clearBtn.textContent = clearDefaultText;
      }, 6000);
      return;
    }
    // armed -> perform clear
    clearBtn.classList.remove('active');
    clearBtn.textContent = clearDefaultText;
    if (clearTimeoutId) { clearTimeout(clearTimeoutId); clearTimeoutId = null; }
    localStorage.removeItem(LOCAL_KEY);
    loadProfiles();
  });
}

// auto-load on script start
loadProfiles();