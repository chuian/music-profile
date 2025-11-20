// Client-side CRUD + simple recommendation logic

const form = document.getElementById('profileForm');
const profilesDiv = document.getElementById('profiles');
const loadAllBtn = document.getElementById('loadAllBtn');
const showPublicBtn = document.getElementById('showPublicBtn');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const saveBtn = document.getElementById('saveBtn');
const updateBtn = document.getElementById('updateBtn');
const clearBtn = document.getElementById('clearBtn');

const intensity = document.getElementById('intensity');
const intensityVal = document.getElementById('intensityVal');
const crowdLevel = document.getElementById('crowdLevel');
const crowdVal = document.getElementById('crowdVal');

const recommendDialog = document.getElementById('recommendDialog');
const recommendationContent = document.getElementById('recommendationContent');
const closeRec = document.getElementById('closeRec');

let currentProfiles = [];

// sliders display
intensity.addEventListener('input', () => intensityVal.textContent = intensity.value);
crowdLevel.addEventListener('input', () => crowdVal.textContent = crowdLevel.value);

// utility to collect form data
function getFormData() {
  return {
    name: document.getElementById('name').value.trim(),
    eventName: document.getElementById('eventName').value.trim(),
    musicPalette: document.getElementById('musicPalette').value.trim(),
    vibesWanted: document.getElementById('vibesWanted').value.trim(),
    intensity: Number(document.getElementById('intensity').value),
    crowdLevel: Number(document.getElementById('crowdLevel').value),
    mood: document.getElementById('mood').value.trim(),
    suggestedShows: document.getElementById('suggestedShows').value.trim(),
    suggestedAreas: document.getElementById('suggestedAreas').value.trim(),
    suggestedDrinks: document.getElementById('suggestedDrinks').value.trim(),
    suggestedFoods: document.getElementById('suggestedFoods').value.trim(),
    public: true // default to public profile (toggle could be added)
  };
}

function fillForm(data) {
  document.getElementById('profileId').value = data._id || data.id || '';
  document.getElementById('name').value = data.name || '';
  document.getElementById('eventName').value = data.eventName || '';
  document.getElementById('musicPalette').value = data.musicPalette || '';
  document.getElementById('vibesWanted').value = data.vibesWanted || '';
  document.getElementById('intensity').value = data.intensity || 5;
  document.getElementById('crowdLevel').value = data.crowdLevel || 5;
  document.getElementById('mood').value = data.mood || '';
  document.getElementById('suggestedShows').value = data.suggestedShows || '';
  document.getElementById('suggestedAreas').value = data.suggestedAreas || '';
  document.getElementById('suggestedDrinks').value = data.suggestedDrinks || '';
  document.getElementById('suggestedFoods').value = data.suggestedFoods || '';
  intensityVal.textContent = document.getElementById('intensity').value;
  crowdVal.textContent = document.getElementById('crowdLevel').value;
}

function clearForm() {
  document.getElementById('profileId').value = '';
  form.reset();
  intensityVal.textContent = intensity.value;
  crowdVal.textContent = crowdLevel.value;
  saveBtn.style.display = '';
  updateBtn.style.display = 'none';
}

// Create
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = getFormData();
  try {
    const res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save');
    const json = await res.json();
    alert('Profile saved!');
    clearForm();
    loadProfiles();
  } catch (err) {
    alert('Save error: ' + err.message);
  }
});

// Update
updateBtn.addEventListener('click', async () => {
  const id = document.getElementById('profileId').value;
  if (!id) return alert('No profile selected to update');
  const data = getFormData();
  try {
    const res = await fetch('/api?id=' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Update failed');
    alert('Updated!');
    clearForm();
    loadProfiles();
  } catch (err) {
    alert('Update error: ' + err.message);
  }
});

// Load Profiles (public)
async function loadProfiles(opts = {}) {
  // opts: { search }
  let url = '/api';
  if (opts.id) url += '?id=' + encodeURIComponent(opts.id);
  else if (opts.search) url += '?search=' + encodeURIComponent(opts.search);

  const res = await fetch(url);
  if (!res.ok) { profilesDiv.innerHTML = '<p>Error loading profiles</p>'; return; }
  const data = await res.json();
  currentProfiles = Array.isArray(data) ? data : [data];
  renderProfiles(currentProfiles);
}

function renderProfiles(list) {
  if (!list || list.length === 0) {
    profilesDiv.innerHTML = '<p>No profiles yet.</p>';
    return;
  }
  profilesDiv.innerHTML = '<h3>Profiles</h3>' + list.map(p => {
    const id = p._id || p.id || '';
    return `
      <div class="profileCard" data-id="${id}">
        <div class="profileTitle"><strong>${escapeHtml(p.name || '(no name)')}</strong> — ${escapeHtml(p.eventName || '')}</div>
        <div class="mini">${escapeHtml((p.musicPalette || '') + ' • ' + (p.vibesWanted || ''))}</div>
        <div class="cardActions">
          <button data-action="view" data-id="${id}">View</button>
          <button data-action="edit" data-id="${id}">Edit</button>
          <button data-action="delete" data-id="${id}">Delete</button>
          <button data-action="recommend" data-id="${id}">Recommend</button>
        </div>
      </div>
    `;
  }).join('');
}

// Delegated actions
profilesDiv.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'view') {
    const p = currentProfiles.find(x => (x._id||x.id)=='${'+'id'+'}');
    // always fetch by id for latest
    const res = await fetch('/api?id=' + encodeURIComponent(id));
    const data = await res.json();
    showProfileDialog(data);
  } else if (action === 'edit') {
    const res = await fetch('/api?id=' + encodeURIComponent(id));
    const data = await res.json();
    fillForm(data);
    saveBtn.style.display = 'none';
    updateBtn.style.display = '';
  } else if (action === 'delete') {
    if (!confirm('Delete this profile?')) return;
    const res = await fetch('/api?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (res.ok) { alert('Deleted'); loadProfiles(); }
    else alert('Delete failed');
  } else if (action === 'recommend') {
    const res = await fetch('/api?id=' + encodeURIComponent(id));
    const data = await res.json();
    showRecommendation(data);
  }
});

// helpers
function showProfileDialog(p) {
  const html = `
    <h4>${escapeHtml(p.name)}</h4>
    <p><b>Event:</b> ${escapeHtml(p.eventName)}</p>
    <p><b>Music:</b> ${escapeHtml(p.musicPalette)}</p>
    <p><b>Vibes:</b> ${escapeHtml(p.vibesWanted)}</p>
    <p><b>Intensity:</b> ${escapeHtml(String(p.intensity))} · <b>Crowd:</b> ${escapeHtml(String(p.crowdLevel))}</p>
    <p><b>Mood:</b> ${escapeHtml(p.mood)}</p>
    <p><b>Shows:</b> ${escapeHtml(p.suggestedShows)}</p>
    <p><b>Areas:</b> ${escapeHtml(p.suggestedAreas)}</p>
    <p><b>Drinks:</b> ${escapeHtml(p.suggestedDrinks)}</p>
    <p><b>Foods:</b> ${escapeHtml(p.suggestedFoods)}</p>
  `;
  recommendationContent.innerHTML = html;
  if (typeof recommendDialog.showModal === 'function') recommendDialog.showModal();
  else alert('Profile:\n' + stripTags(html));
}

function showRecommendation(p) {
  // simple rules-based recommendations
  const recs = [];
  if (p.musicPalette && /indie|synth|electro|pop/i.test(p.musicPalette)) recs.push('Try the Sunset Stage for indie/electro vibes');
  if (p.vibesWanted && /chill|relax/i.test(p.vibesWanted)) recs.push('Bring a picnic blanket — Chill Zone is recommended');
  if ((p.intensity||0) >= 7) recs.push('High intensity — front of main stage for best energy');
  if ((p.crowdLevel||0) <= 3) recs.push('Low crowd pref — visit quiet lounge and VIP garden');
  if (p.mood && /romant|dream|nostalg/i.test(p.mood)) recs.push('Look for acoustic sets and mellow DJs in Zone B');
  // include user-suggested items as confirmation
  if (p.suggestedShows) recs.push('You listed shows: ' + p.suggestedShows);
  if (p.suggestedDrinks) recs.push('Try: ' + p.suggestedDrinks);
  if (p.suggestedFoods) recs.push('Food idea: ' + p.suggestedFoods);

  const html = `<h4>Recommendations for ${escapeHtml(p.name)}</h4>` +
    `<ul>` + recs.map(r => `<li>${escapeHtml(r)}</li>`).join('') + `</ul>`;
  recommendationContent.innerHTML = html;
  if (typeof recommendDialog.showModal === 'function') recommendDialog.showModal();
  else alert('Recommendations:\n' + stripTags(html));
}

closeRec.addEventListener('click', () => { if (recommendDialog.open) recommendDialog.close(); });

// Search and controls
searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q) return loadProfiles();
  loadProfiles({ search: q });
});

loadAllBtn.addEventListener('click', () => loadProfiles());
showPublicBtn.addEventListener('click', () => loadProfiles({ search: 'public:true' })); // example

clearBtn.addEventListener('click', clearForm);

// initial load
loadProfiles();

// small helpers for safety
function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[s]);
}

function stripTags(html) { return html.replace(/<[^>]*>?/gm, ''); }
