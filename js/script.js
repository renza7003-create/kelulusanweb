const EVENT_CONFIG = {
  title: "Acara Perpisahan & Wisuda Kelulusan",
  dateIso: "2027-01-01T07:00:00+07:00",
  dateLabel: "Jumat, 1 Januari 2027",
  timeLabel: "07.00 – 15.00 WIB",
  location: "Aula & Lapangan Utama, Jl. Raya Victor, Setu, Kota Tangerang Selatan",
  panitiaWa: "6281234567890"
};

const SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  rsvpTable: "rsvp_kelulusan"
};

const RSVP_STORAGE_KEY = "undangan_kelulusan_rsvp_v1";
const GUEST_CSV_STORAGE_KEY = "undangan_kelulusan_guests_v1";

let supabaseClient = null;
let isMusicPlaying = false;
let synthTimer = null;
let audioCtx = null;

// --- 1. SUPABASE ---
function initSupabaseClient() {
  const ready =
    typeof window.supabase !== "undefined" &&
    !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_ID") &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE_ANON_KEY");
  if (ready) {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  }
  return supabaseClient;
}

async function saveRsvpToSupabase(record) {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return;
  await client.from(SUPABASE_CONFIG.rsvpTable).insert([record]);
}

async function fetchRsvpFromSupabase() {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from(SUPABASE_CONFIG.rsvpTable).select("*").order("id", { ascending: false });
  return !error && Array.isArray(data) ? data : null;
}

// --- 2. BACKSOUND & FLOATING AUDIO ---
function playGraduationSynthLoop() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") audioCtx.resume();

  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];
  let step = 0;
  clearInterval(synthTimer);
  synthTimer = setInterval(() => {
    if (!isMusicPlaying) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = notes[step++ % notes.length];
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.46);
  }, 480);
}

function setMusicState(play) {
  const audioEl = document.getElementById("bgMusic");
  const btnEl = document.getElementById("musicToggleBtn");
  const labelEl = document.getElementById("musicStatusText");
  isMusicPlaying = play;

  if (play) {
    if (audioEl) audioEl.play().catch(playGraduationSynthLoop);
    else playGraduationSynthLoop();
    if (btnEl) btnEl.classList.add("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: On";
  } else {
    if (audioEl && !audioEl.paused) audioEl.pause();
    clearInterval(synthTimer);
    if (btnEl) btnEl.classList.remove("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: Off";
  }
}

// --- 3. DATA TAMU & COVER ---
function getGuestData() {
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("to") || params.get("nama") || "";
  const rawInstansi = params.get("instansi") || "";
  const rawKategori = params.get("kategori") || "Undangan";

  let stored = [];
  try { stored = JSON.parse(localStorage.getItem(GUEST_CSV_STORAGE_KEY) || "[]"); } catch (_) {}

  const matched = rawName
    ? stored.find((g) => String(g.nama_tamu || "").trim().toLowerCase() === rawName.trim().toLowerCase())
    : null;

  return {
    nama: (matched && matched.nama_tamu) || rawName || "Tamu Undangan",
    instansi: (matched && matched.instansi) || rawInstansi || "Keluarga Besar & Alumni",
    kategori: (matched && matched.kategori) || rawKategori
  };
}

function initCoverAndMusic() {
  const guest = getGuestData();
  const coverName = document.getElementById("coverGuestName");
  const coverInstansi = document.getElementById("coverGuestInstansi");
  const openBtn = document.getElementById("openInvitationBtn");
  const coverEl = document.getElementById("invitationCover");
  const mainEl = document.getElementById("mainInvitation");
  const toggleBtn = document.getElementById("musicToggleBtn");

  if (coverName) coverName.textContent = guest.nama;
  if (coverInstansi) coverInstansi.textContent = guest.instansi;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (coverEl) coverEl.classList.add("is-opened");
      if (mainEl) mainEl.classList.remove("invitation-hidden");
      setMusicState(true);
      initScrollAnimations();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => setMusicState(!isMusicPlaying));
  }
}

// --- 4. GALERI (2 FOTO), COUNTDOWN, KALENDER & SALIN ---
function applySvgPlaceholder(img, text) {
  img.onerror = null;
  img.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260'><rect width='100%25' height='100%25' fill='%23111827'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23D4AF37' font-family='sans-serif' font-size='20' font-weight='bold'>${encodeURIComponent(text)}</text></svg>`;
}

function initGalleryFallback() {
  const labels = ["Prosesi Wisuda", "Kebersamaan Angkatan"];
  document.querySelectorAll("#graduationGallery img").forEach((img, idx) => {
    const label = labels[idx] || "Momen Kelulusan";
    img.onerror = () => applySvgPlaceholder(img, label);
    if (img.complete && img.naturalWidth === 0) applySvgPlaceholder(img, label);
  });
}

function startCountdown() {
  const target = new Date(EVENT_CONFIG.dateIso).getTime();
  const ids = ["days", "hours", "minutes", "seconds"].map((id) => document.getElementById(id));
  if (ids.some((el) => !el)) return;

  const tick = () => {
    const diff = Math.max(0, target - Date.now());
    const values = [
      Math.floor(diff / 86400000),
      Math.floor((diff / 3600000) % 24),
      Math.floor((diff / 60000) % 60),
      Math.floor((diff / 1000) % 60)
    ];
    ids.forEach((el, i) => (el.textContent = String(values[i]).padStart(2, "0")));
  };

  tick();
  setInterval(tick, 1000);
}

function initCalendarActions() {
  const gcalLink = document.getElementById("googleCalendarLink");
  const icsBtn = document.getElementById("downloadIcsBtn");
  const startUtc = "20270101T000000Z";
  const endUtc = "20270101T080000Z";

  if (gcalLink) {
    gcalLink.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT_CONFIG.title)}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(EVENT_CONFIG.timeLabel)}&location=${encodeURIComponent(EVENT_CONFIG.location)}`;
  }

  if (icsBtn) {
    icsBtn.addEventListener("click", () => {
      const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        `SUMMARY:${EVENT_CONFIG.title}`,
        `DESCRIPTION:${EVENT_CONFIG.timeLabel}`,
        `LOCATION:${EVENT_CONFIG.location}`,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      a.download = "perpisahan-kelulusan-2027.ics";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}

function initCopyFeature() {
  const btn = document.getElementById("copyRekeningBtn");
  const textEl = document.getElementById("rekeningText");
  const toast = document.getElementById("copyToast");
  if (!btn || !textEl) return;

  btn.addEventListener("click", async () => {
    const text = textEl.textContent.trim();
    try { await navigator.clipboard.writeText(text); } catch (_) {}
    if (toast) {
      toast.textContent = `✓ Tersalin: ${text}`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2500);
    }
  });
}

function initScrollAnimations() {
  const items = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => obs.observe(el));
}

// --- 5. RSVP & BUKU TAMU ---
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getSavedRsvp() {
  try { return JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || "[]"); } catch (_) { return []; }
}

function renderGuestbook(listOverride = null) {
  const listEl = document.getElementById("guestbookList");
  if (!listEl) return;
  const entries = Array.isArray(listOverride) ? listOverride : getSavedRsvp();

  if (!entries.length) {
    listEl.innerHTML = `<p class="muted-sm">Belum ada ucapan. Jadilah yang pertama mengirim ucapan!</p>`;
    return;
  }

  listEl.innerHTML = entries.map((item) => `
    <div class="guestbook-item">
      <div class="guestbook-meta">
        <strong>${escapeHtml(item.nama)} <span class="muted-sm" style="display:inline;">(${escapeHtml(item.instansi)})</span></strong>
        <span class="guestbook-badge">${escapeHtml(item.status)} • ${escapeHtml(item.jumlah)} orang</span>
      </div>
      <p style="font-size:0.9rem;">${escapeHtml(item.pesan || "Selamat atas kelulusannya!")}</p>
    </div>
  `).join("");
}

function initRsvpForm() {
  const guest = getGuestData();
  const hName = document.getElementById("inviteHeaderName");
  const hInstansi = document.getElementById("inviteInstansiName");
  const iNama = document.getElementById("rsvpNama");
  const iInstansi = document.getElementById("rsvpInstansi");
  const iKategori = document.getElementById("rsvpKategori");
  const form = document.getElementById("rsvpForm");
  const alertEl = document.getElementById("rsvpAlert");

  if (hName) hName.textContent = guest.nama;
  if (hInstansi) hInstansi.textContent = guest.instansi;
  if (iNama && guest.nama !== "Tamu Undangan") iNama.value = guest.nama;
  if (iInstansi && guest.instansi !== "Keluarga Besar & Alumni") iInstansi.value = guest.instansi;
  if (iKategori) iKategori.value = guest.kategori;

  renderGuestbook();
  fetchRsvpFromSupabase().then((rows) => {
    if (rows && rows.length) {
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(rows));
      renderGuestbook(rows);
    }
  });

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const record = {
      nama: iNama.value.trim(),
      instansi: iInstansi.value.trim(),
      kategori: iKategori.value.trim() || "Undangan",
      wa: document.getElementById("rsvpWa").value.trim(),
      status: document.getElementById("rsvpStatus").value,
      jumlah: Number(document.getElementById("rsvpJumlah").value) || 1,
      pesan: document.getElementById("rsvpPesan").value.trim()
    };

    const current = getSavedRsvp();
    current.unshift(record);
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(current));
    renderGuestbook(current);
    await saveRsvpToSupabase(record);

    if (alertEl) {
      alertEl.className = "alert alert-success show";
      alertEl.textContent = "✓ Terima kasih! Konfirmasi & ucapan Anda telah tersimpan.";
    }

    const waText = `Halo Panitia Perpisahan & Kelulusan (${EVENT_CONFIG.timeLabel}), saya *${record.nama}* (${record.instansi}) konfirmasi: *${record.status}* (${record.jumlah} orang). Pesan: ${record.pesan || "-"}`;
    window.open(`https://wa.me/${EVENT_CONFIG.panitiaWa}?text=${encodeURIComponent(waText)}`, "_blank", "noopener,noreferrer");
    form.reset();
  });
}

// --- 6. ADMIN PANEL & WA BLAST ---
function normalizePhone(phone) {
  let clean = String(phone || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  else if (clean.startsWith("8")) clean = "62" + clean;
  return clean;
}

function renderAdminTable(rows) {
  const tbody = document.getElementById("adminTableBody");
  const totalEl = document.getElementById("totalTamu");
  if (!tbody) return;

  localStorage.setItem(GUEST_CSV_STORAGE_KEY, JSON.stringify(rows));
  if (totalEl) totalEl.textContent = String(rows.length);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Belum ada data tamu yang diunggah.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const nama = row.nama_tamu || row.nama || `Tamu ${i + 1}`;
    const instansi = row.instansi || "-";
    const kategori = row.kategori || "Undangan";
    const waRaw = row.nomor_wa || row.wa || "";
    const waClean = normalizePhone(waRaw);

    return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(nama)}</strong></td>
        <td>${escapeHtml(instansi)}</td>
        <td>${escapeHtml(kategori)}</td>
        <td>${escapeHtml(waRaw || "-")}</td>
        <td>
          <button type="button" class="btn btn-primary btn-auto" style="padding:7px 14px;font-size:0.84rem;"
            onclick="window.sendWhatsAppBlast('${encodeURIComponent(nama)}','${encodeURIComponent(instansi)}','${encodeURIComponent(kategori)}','${waClean}',this)">
            Kirim WA
          </button>
        </td>
      </tr>`;
  }).join("");
}

window.sendWhatsAppBlast = function (eNama, eInstansi, eKategori, waNumber, btn) {
  const nama = decodeURIComponent(eNama);
  const instansi = decodeURIComponent(eInstansi);
  const kategori = decodeURIComponent(eKategori);
  const baseUrl = window.location.origin + window.location.pathname.replace("admin.html", "index.html");
  const link = `${baseUrl}?to=${encodeURIComponent(nama)}&instansi=${encodeURIComponent(instansi)}&kategori=${encodeURIComponent(kategori)}`;
  const msg = `Yth. *${nama}* (${instansi})\nKami mengundang Anda pada *${EVENT_CONFIG.title}*.\n📅 ${EVENT_CONFIG.dateLabel}\n⏰ ${EVENT_CONFIG.timeLabel}\n📍 ${EVENT_CONFIG.location}\n\nBuka undangan personal Anda:\n${link}`;

  window.open(waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");

  if (btn) {
    btn.textContent = "✓ Terkirim";
    btn.style.backgroundColor = "#38BDF8";
    btn.style.color = "#08101E";
  }
};

function initAdminPanel() {
  const fileInput = document.getElementById("excelUpload");
  const uploadZone = document.getElementById("uploadZone");
  const templateBtn = document.getElementById("downloadTemplateBtn");
  const alertEl = document.getElementById("adminAlert");
  if (!fileInput) return;

  const showAlert = (msg, type) => {
    if (!alertEl) return;
    alertEl.className = `alert alert-${type} show`;
    alertEl.textContent = msg;
  };

  const parseFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        renderAdminTable(json);
        showAlert(`Berhasil memuat ${json.length} data tamu dari ${file.name}.`, "success");
      } catch (_) {
        showAlert("Gagal membaca file CSV/Excel. Pastikan format kolom benar.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  fileInput.addEventListener("change", (e) => parseFile(e.target.files[0]));

  if (uploadZone) {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => e.preventDefault());
    });
    uploadZone.addEventListener("drop", (e) => parseFile(e.dataTransfer?.files?.[0]));
  }

  if (templateBtn) {
    templateBtn.addEventListener("click", () => {
      const csv = "nama_tamu,instansi,kategori,nomor_wa\nRenza Putra,XII RPL,Alumni,081234567890\nDina Maharani,Wali Murid,Keluarga,081398765432";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      a.download = "template-tamu.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_CSV_STORAGE_KEY) || "[]");
    if (saved.length) renderAdminTable(saved);
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  initSupabaseClient();
  initCoverAndMusic();
  initGalleryFallback();
  startCountdown();
  initCalendarActions();
  initCopyFeature();
  initRsvpForm();
  initAdminPanel();
});