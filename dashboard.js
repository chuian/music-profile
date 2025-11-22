// dashboard.js — reads selected profile from sessionStorage or tries to fetch by id
function qs(name) { const m = location.search.match(new RegExp('[?&]'+name+'=([^&]+)')); return m ? decodeURIComponent(m[1]) : null; }

const backBtn = document.getElementById('backBtn');
const eventBtn = document.getElementById('eventBtn');
const drinksBtn = document.getElementById('drinksBtn');
const foodBtn = document.getElementById('foodBtn');
const activityBtn = document.getElementById('activityBtn');
const suggestionsDiv = document.getElementById('suggestions');

async function loadProfile() {
  let profile = null;
  const id = qs('id');
  // try server endpoint first if we have an id
  if (id) {
    try {
      const res = await fetch(`/api/${encodeURIComponent(id)}`);
      if (res.ok) {
        profile = await res.json();
      }
    } catch (e) {
      // ignore and fall back
    }
  }

  // fallback to sessionStorage if server fetch failed or no id provided
  if (!profile) {
    try { profile = JSON.parse(sessionStorage.getItem('current_profile') || 'null'); } catch (e) { profile = null; }
  }

  // last resort: fetch list and find
  if (!profile && id) {
    try {
      const res = await fetch('/api');
      if (res.ok) {
        const list = await res.json();
        profile = list.find(p => String(p._id) === String(id) || String(p.id) === String(id));
      }
    } catch (e) {}
  }

  if (!profile) {
    document.getElementById('p-name').textContent = 'No profile selected';
    document.getElementById('p-details').innerHTML = '<p>Select a profile from the main page first.</p>';
    return;
  }
  document.getElementById('p-name').textContent = profile.name || 'Profile';
  const details = [
    `<strong>Genre:</strong> ${profile.genre || ''}`,
    `<strong>Vibes:</strong> ${profile.vibes || ''}`,
    `<strong>Crowd:</strong> ${profile.crowd || ''}`,
    `<strong>Experience:</strong> ${profile.experience || ''}`,
    `<strong>ID:</strong> ${profile._id || profile.id || ''}`
  ];
  document.getElementById('p-details').innerHTML = details.map(d=>`<div>${d}</div>`).join('');
  // store current profile for reloads
  try { sessionStorage.setItem('current_profile', JSON.stringify(profile)); } catch (e) {}
}

function showEventInfo() {
  suggestionsDiv.innerHTML = `<h4>Event Info</h4>
    <p><strong>Venue:</strong> The Grand Hall</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>Doors:</strong> 7:00 PM</p>`;
}

function showDrinks() {
  const drinks = ['Classic Mojito', 'Local IPA', 'Non-alcoholic Spritz', 'Red Wine — Malbec', 'Whiskey Sour'];
  suggestionsDiv.innerHTML = `<h4>Drink Suggestions</h4><ul>${drinks.map(d=>`<li>${d}</li>`).join('')}</ul>`;
}

function showFood() {
  const food = ['Gourmet Sliders', 'Vegan Tacos', 'Charcuterie Board', 'Loaded Fries', 'Grilled Halloumi'];
  suggestionsDiv.innerHTML = `<h4>Food Suggestions</h4><ul>${food.map(d=>`<li>${d}</li>`).join('')}</ul>`;
}

function showActivities() {
  const acts = ['Dance Floor Maps', 'Meet & Greet', 'Open Mic Signup', 'Merch Booth', 'Photo Wall'];
  suggestionsDiv.innerHTML = `<h4>Activity Suggestions</h4><ul>${acts.map(d=>`<li>${d}</li>`).join('')}</ul>`;
}

backBtn.addEventListener('click', () => { sessionStorage.removeItem('current_profile'); window.location.href = 'index.html'; });
eventBtn.addEventListener('click', showEventInfo);
drinksBtn.addEventListener('click', showDrinks);
foodBtn.addEventListener('click', showFood);
activityBtn.addEventListener('click', showActivities);

loadProfile();
