const form = document.getElementById('profileForm');
const profilesDiv = document.getElementById('profiles');
const loadBtn = document.getElementById('loadBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const genre = document.getElementById('genre').value;

  const res = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, genre })
  });

  if (res.ok) alert('Profile saved!');
  else alert('Failed to save.');
});

loadBtn.addEventListener('click', async () => {
  const res = await fetch('/api');
  const data = await res.json();
  profilesDiv.innerHTML = '<h3>Saved Profiles</h3>' +
    data.map(p => `<p><b>${p.name}</b> — ${p.genre}</p>`).join('');
});