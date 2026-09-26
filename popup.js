const API = "https://www.couponlab.com";
const FETCH_MS = 2500;
const SHOPS = [
  { slug: "walmart", name: "Walmart" },
  { slug: "amazon", name: "Amazon" },
  { slug: "target", name: "Target" },
  { slug: "homedepot", name: "Home Depot" },
  { slug: "bestbuy", name: "Best Buy" },
  { slug: "macys", name: "Macy's" },
  { slug: "sephora", name: "Sephora" },
  { slug: "kohls", name: "Kohl's" },
  { slug: "oldnavy", name: "Old Navy" },
  { slug: "walgreens", name: "Walgreens" },
  { slug: "doordash", name: "DoorDash" },
  { slug: "ubereats", name: "Uber Eats" },
  { slug: "nike", name: "Nike" },
  { slug: "us-shein", name: "SHEIN" },
];

let stores = SHOPS.map((s) => ({ ...s, website: "" }));
let bundledOffers = {};

function $(id) {
  return document.getElementById(id);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function matchStore(tabUrl, list) {
  const host = hostOf(tabUrl);
  if (!host || !Array.isArray(list)) return null;
  const compact = host.replace(/[^a-z0-9]/g, "");
  const first = host.split(".")[0];
  return (
    list.find((s) => {
      const w = hostOf(s.website || "");
      return w && (host === w || host.endsWith("." + w) || w.endsWith("." + host));
    }) ||
    list.find((s) => {
      const slug = String(s.slug || "").replace(/-/g, "");
      return slug && slug.length >= 4 && (first === slug || compact === slug || compact.startsWith(slug));
    }) ||
    list.find((s) => {
      const slug = String(s.slug || "").replace(/-/g, "");
      return slug && slug.length >= 5 && compact.includes(slug);
    }) ||
    null
  );
}

function liveOnly(coupons) {
  const now = Date.now();
  return (coupons || []).filter((c) => {
    const t = Date.parse(c.expiresAt || "");
    return !Number.isFinite(t) || t >= now;
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(label || "timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function json(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const body = await res.json();
    return body.data ?? body;
  } finally {
    clearTimeout(t);
  }
}

async function pack(path) {
  const res = await withTimeout(fetch(path), 1500, "pack");
  return res.json();
}

async function copy(text, btn) {
  const prev = btn.textContent;
  const ok = () => {
    btn.textContent = "Copied";
    setTimeout(() => {
      btn.textContent = prev;
    }, 1600);
  };
  try {
    await navigator.clipboard.writeText(text);
    ok();
    return;
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-80px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    ok();
  } catch {
    btn.textContent = "Copy failed";
  }
}

function card(c) {
  const el = document.createElement("article");
  el.className = "card" + (c.code ? "" : " is-deal");
  const when = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
  el.innerHTML = `
    <div class="stub">${escapeHtml(c.valueLabel || (c.code ? "Code" : "Deal"))}</div>
    <div class="meta">
      <div class="title">${escapeHtml(c.title || "Offer")}</div>
      <div class="exp">${c.code ? escapeHtml(c.code) : "No code"} · ${when}</div>
    </div>
  `;
  const btn = document.createElement("button");
  if (c.code) {
    btn.textContent = "Copy";
    btn.addEventListener("click", () => void copy(c.code, btn));
  } else {
    btn.textContent = "Open";
    btn.className = "deal";
    btn.addEventListener("click", () => {
      const href = c.affiliateUrl || c.url || `${API}/stores/${c.storeSlug}`;
      chrome.tabs.create({ url: href });
    });
  }
  el.appendChild(btn);
  return el;
}

function shopBySlug(slug) {
  return stores.find((s) => s.slug === slug) || SHOPS.find((s) => s.slug === slug) || { slug, name: slug };
}

function paint(store) {
  const status = $("status");
  const list = $("list");
  const hub = $("hub");
  status.textContent = store.name;
  hub.href = `${API}/stores/${store.slug}`;
  hub.textContent = "Hub";
  const live = liveOnly(bundledOffers[store.slug] || []);
  list.innerHTML = "";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "shop back";
  back.textContent = "All shops";
  back.addEventListener("click", paintChooser);
  list.appendChild(back);
  if (!live.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = `No packed tickets for ${store.name}. Open the hub.`;
    list.appendChild(empty);
    return;
  }
  live.slice(0, 12).forEach((c) => list.appendChild(card(c)));
}

function paintChooser() {
  const status = $("status");
  const list = $("list");
  const hub = $("hub");
  status.textContent = "Pick a shop";
  hub.href = `${API}/stores`;
  hub.textContent = "Stores";
  list.innerHTML = "";
  const note = document.createElement("p");
  note.className = "empty";
  note.textContent = "Tap a shop to copy a code. Works even if this tab is not a store.";
  list.appendChild(note);
  const row = document.createElement("div");
  row.className = "shops";
  for (const shop of SHOPS) {
    const btn = document.createElement("button");
    btn.className = "shop";
    btn.type = "button";
    btn.dataset.slug = shop.slug;
    btn.textContent = shopBySlug(shop.slug).name;
    btn.addEventListener("click", () => openShop(shop.slug));
    row.appendChild(btn);
  }
  list.appendChild(row);
}

function openShop(slug) {
  const store = shopBySlug(slug);
  paint(store);
  void json(`${API}/api/coupons?store=${encodeURIComponent(slug)}`)
    .then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      bundledOffers[slug] = rows;
      if ($("status").textContent === store.name) paint(store);
    })
    .catch(() => {});
}

function bindStaticShops() {
  document.querySelectorAll("#shops .shop").forEach((btn) => {
    btn.addEventListener("click", () => openShop(btn.dataset.slug));
  });
}

async function currentTabUrl() {
  if (!globalThis.chrome?.tabs?.query) return "";
  const tryQuery = async (q) => {
    try {
      const tabs = await withTimeout(chrome.tabs.query(q), 400, "tab");
      const tab = (tabs || []).find((t) => t.url && /^https?:/i.test(t.url));
      return tab?.url || "";
    } catch {
      return "";
    }
  };
  return (
    (await tryQuery({ active: true, lastFocusedWindow: true })) ||
    (await tryQuery({ active: true, currentWindow: true })) ||
    (await tryQuery({ active: true }))
  );
}

async function loadPacked() {
  try {
    const [s, o] = await Promise.all([pack("data/stores.json"), pack("data/offers.json")]);
    if (Array.isArray(s) && s.length) stores = s;
    if (o && typeof o === "object") bundledOffers = o;
  } catch {
    /* HTML shop list is enough */
  }
}

async function maybeMatchTab() {
  const url = await currentTabUrl();
  if (!url) return;
  const store = matchStore(url, stores);
  if (store) openShop(store.slug);
}

function main() {
  bindStaticShops();
  void loadPacked()
    .then(() => maybeMatchTab())
    .catch(() => {});
}

main();
