const form = document.getElementById('profileForm');
const profilesDiv = document.getElementById('profiles');
const loadBtn = document.getElementById('loadBtn');
const newBtn = document.getElementById('newBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

let editingId = null;
const LOCAL_KEY = 'profiles_local_v1';

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
    if (res.ok) return true;
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
    const id = p._id || p.id || genId();
    html.push(`<li class="profile-item" data-id="${id}">`);
    html.push(`<div class="profile-main"><b>${escapeHtml(p.name || '')}</b> — ${escapeHtml(p.genre || '')}</div>`);
    html.push('<div class="profile-actions">');
    html.push(`<button class="action-btn edit-btn" data-id="${id}" data-name="${escapeAttr(p.name || '')}" data-genre="${escapeAttr(p.genre || '')}">Edit</button>`);
    html.push(`<button class="action-btn delete-btn" data-id="${id}">Delete</button>`);
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
    saveBtn.textContent = 'Update Profile';
    document.getElementById('name').focus();
  }));

  profilesDiv.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this profile?')) return;
    await deleteProfileLocalOrApi(id);
    await loadProfiles();
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const genre = document.getElementById('genre').value;
  if (!name || !genre) return alert('Please enter name and genre');

  const profile = { name, genre };
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

loadBtn.addEventListener('click', () => loadProfiles());
newBtn.addEventListener('click', () => { editingId = null; form.reset(); saveBtn.textContent = 'Save Profile'; document.getElementById('name').focus(); });
clearBtn.addEventListener('click', () => { if (confirm('Clear local saved profiles?')) { localStorage.removeItem(LOCAL_KEY); loadProfiles(); } });

// auto-load on script start
loadProfiles();