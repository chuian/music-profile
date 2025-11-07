document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");
  const showBtn = document.getElementById("showProfiles");
  const list = document.getElementById("profilesList");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const genre = form.genre.value;

    if (!name || !genre) return alert("Please fill all fields");

    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, genre }),
    });

    if (res.ok) {
      alert("Profile added!");
      form.reset();
    } else {
      alert("Failed to add profile");
    }
  });

  showBtn.addEventListener("click", async () => {
    const res = await fetch("/api/profiles");
    const data = await res.json();
    list.innerHTML = "";
    data.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = `${p.name} — ${p.genre}`;
      list.appendChild(li);
    });
  });
});
