// Tiny helper used by every page. No build step, no framework.

function getFbUserId() {
  return localStorage.getItem("fbUserId") || "";
}

function setFbUserId(id) {
  localStorage.setItem("fbUserId", id);
}

function clearSession() {
  localStorage.removeItem("fbUserId");
}

async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

async function apiPostJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

async function apiPostForm(path, formData) {
  const res = await fetch(path, { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

// Redirect to login if no session, used at the top of protected pages.
function requireSession() {
  const id = getFbUserId();
  if (!id) {
    window.location.href = "/index.html";
    return null;
  }
  return id;
}

function renderNav(active) {
  const items = [
    { href: "/dashboard.html", label: "Dashboard", key: "dashboard" },
    { href: "/pages.html", label: "Pages", key: "pages" },
    { href: "/upload.html", label: "Upload", key: "upload" },
  ];
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = items
    .map(
      (i) =>
        `<a href="${i.href}" class="${i.key === active ? "active" : ""}">${i.label}</a>`
    )
    .join("");
}
