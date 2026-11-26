// const SUPABASE_URL = "https://hwrdgavamumylqkscyeh.supabase.co";
// const SUPABASE_ANON_KEY = "sb_publishable_XNpEha2eDhgpVdMoXIZ04w_3xWwzsk_";
// const db = (typeof supabase !== "undefined" && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("jakshduahuhsdjhcxuus"))
//   ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
//   : null;

const EVENT_CONFIG = {
  title: "Acara Perpisahan & Wisuda Kelulusan",
  dateIso: "2027-01-01T07:00:00+07:00",
  dateLabel: "Jumat, 1 Januari 2027",
  timeLabel: "07.00 \u2013 15.00 WIB",
  location: "Aula & Lapangan Utama, Jl. Raya Victor, Setu, Kota Tangerang Selatan",
  panitiaWa: "6282114589280",
  publicUrl: "https://renza7003-create.github.io/kelulusanweb/blast/index.html"
};

const SUPABASE_CONFIG = {
  url: "https://hwrdgavamumylqkscyeh.supabase.co",
  anonKey: "sb_publishable_XNpEha2eDhgpVdMoXIZ04w_3xWwzsk_",
  rsvpTable: "rsvp_kelulusan"
};

let supabaseClient = null;
let sessionGuests = [];
let sessionRsvp = [];
let isMusicPlaying = false;
let synthTimer = null;
let audioCtx = null;

function initSupabaseClient() {
  const ready =
    typeof window.supabase !== "undefined" &&
    !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_ID") &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE_ANON_KEY");
  if (ready) supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return supabaseClient;
}

async function saveRsvpToSupabase(record) {
  const client = supabaseClient || initSupabaseClient();
  if (client) await client.from(SUPABASE_CONFIG.rsvpTable).insert([record]);
}

async function fetchRsvpFromSupabase() {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from(SUPABASE_CONFIG.rsvpTable).select("*").order("id", { ascending: false });
  return !error && Array.isArray(data) ? data : null;
}

function playGraduationSynthLoop() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  if (!audioCtx) audioCtx = new AudioCtx();
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
    gain.gain.setValueAtTime(0.035, audioCtx.currentTime);
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
    btnEl?.classList.add("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: On";
  } else {
    if (audioEl && !audioEl.paused) audioEl.pause();
    clearInterval(synthTimer);
    btnEl?.classList.remove("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: Off";
  }
}

function getGuestData() {
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("to") || params.get("nama") || "";
  const rawInstansi = params.get("instansi") || "";
  const rawKategori = params.get("kategori") || "Undangan";

  const matched = rawName
    ? sessionGuests.find((g) => String(g.nama_tamu || "").trim().toLowerCase() === rawName.trim().toLowerCase())
    : null;

  return {
    nama: matched?.nama_tamu || rawName || "Tamu Undangan",
    instansi: matched?.instansi || rawInstansi || "Keluarga Besar & Alumni",
    kategori: matched?.kategori || rawKategori
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

  openBtn?.addEventListener("click", () => {
    coverEl?.classList.add("is-opened");
    mainEl?.classList.remove("invitation-hidden");
    setMusicState(true);
    initScrollAnimations();
  });

  toggleBtn?.addEventListener("click", () => setMusicState(!isMusicPlaying));
}

function applySvgPlaceholder(img, text) {
  img.onerror = null;
  img.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260'><rect width='100%25' height='100%25' fill='%23262019'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23F3D06B' font-family='sans-serif' font-size='20' font-weight='bold'>${encodeURIComponent(text)}</text></svg>`;
}

function initGalleryFallback() {
  const labels = ["Prosesi Wisuda", "Kebersamaan Angkatan"];
  document.querySelectorAll("#graduationGallery img").forEach((img, i) => {
    const label = labels[i] || "Momen Kelulusan";
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
    const vals = [
      Math.floor(diff / 86400000),
      Math.floor((diff / 3600000) % 24),
      Math.floor((diff / 60000) % 60),
      Math.floor((diff / 1000) % 60)
    ];
    ids.forEach((el, i) => (el.textContent = String(vals[i]).padStart(2, "0")));
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

  icsBtn?.addEventListener("click", () => {
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
      `DTSTART:${startUtc}`, `DTEND:${endUtc}`,
      `SUMMARY:${EVENT_CONFIG.title}`, `DESCRIPTION:${EVENT_CONFIG.timeLabel}`,
      `LOCATION:${EVENT_CONFIG.location}`, "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    a.download = "perpisahan-kelulusan-2027.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  });
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
      toast.textContent = `\u2713 Tersalin: ${text}`;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2500);
    }
  });
}

function initScrollAnimations() {
  const items = document.querySelectorAll(".reveal-on-scroll");
  if (!("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("is-visible"));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((el) => obs.observe(el));
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderGuestbook(entries = sessionRsvp) {
  const listEl = document.getElementById("guestbookList");
  if (!listEl) return;
  if (!entries.length) {
    listEl.innerHTML = `<p class="muted-sm">Belum ada ucapan pada sesi ini. Jadilah yang pertama mengirim ucapan!</p>`;
    return;
  }
  listEl.innerHTML = entries.map((item) => `
    <div class="guestbook-item">
      <div class="guestbook-meta">
        <strong>${escapeHtml(item.nama)} <span class="muted-sm" style="display:inline;">(${escapeHtml(item.instansi)})</span></strong>
        <span class="guestbook-badge">${escapeHtml(item.status)} \u2022 ${escapeHtml(item.jumlah)} orang</span>
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
    if (rows?.length) {
      sessionRsvp = rows;
      renderGuestbook(sessionRsvp);
    }
  });

  form?.addEventListener("submit", async (e) => {
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

    sessionRsvp.unshift(record);
    renderGuestbook(sessionRsvp);
    await saveRsvpToSupabase(record);

    if (alertEl) {
      alertEl.className = "alert alert-success show";
      alertEl.textContent = "\u2713 Terima kasih! Konfirmasi & ucapan Anda telah dikirim.";
    }

    const waText = `Halo Panitia Perpisahan & Kelulusan (${EVENT_CONFIG.timeLabel}), saya *${record.nama}* (${record.instansi}) konfirmasi: *${record.status}* (${record.jumlah} orang). Pesan: ${record.pesan || "-"}`;
    window.open(`https://wa.me/${EVENT_CONFIG.panitiaWa}?text=${encodeURIComponent(waText)}`, "_blank", "noopener,noreferrer");
    form.reset();
  });
}

function normalizePhone(phone) {
  let clean = String(phone || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  else if (clean.startsWith("8")) clean = "62" + clean;
  return clean;
}

function renderAdminTable() {
  const tbody = document.getElementById("adminTableBody");
  const totalEl = document.getElementById("totalTamu");
  if (!tbody) return;

  if (totalEl) totalEl.textContent = String(sessionGuests.length);

  if (!sessionGuests.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Belum ada data tamu yang diunggah.</td></tr>`;
    return;
  }

  tbody.innerHTML = sessionGuests.map((row, i) => {
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
          <div class="btn-group justify-center">
            <button type="button" class="btn btn-primary btn-auto btn-sm"
              onclick="window.sendWhatsAppBlast('${encodeURIComponent(nama)}','${encodeURIComponent(instansi)}','${encodeURIComponent(kategori)}','${waClean}',this)">
              Kirim WA
            </button>
            <button type="button" class="btn btn-secondary btn-auto btn-sm" onclick="window.deleteGuestRow(${i})">
              Hapus
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

window.deleteGuestRow = function (index) {
  sessionGuests.splice(index, 1);
  renderAdminTable();
};

window.sendWhatsAppBlast = function (eNama, eInstansi, eKategori, waNumber, btn) {
  const nama = decodeURIComponent(eNama);
  const instansi = decodeURIComponent(eInstansi);
  const kategori = decodeURIComponent(eKategori);

  const baseUrl = EVENT_CONFIG.publicUrl
    ? EVENT_CONFIG.publicUrl
    : window.location.origin + window.location.pathname.replace("admin.html", "index.html");

  const link = `${baseUrl}?to=${encodeURIComponent(nama)}&instansi=${encodeURIComponent(instansi)}&kategori=${encodeURIComponent(kategori)}`;
  const msg = `Yth. *${nama}* (${instansi})\nKami mengundang Anda pada *${EVENT_CONFIG.title}*.\n\uD83D\uDCC5 ${EVENT_CONFIG.dateLabel}\n\u23F0 ${EVENT_CONFIG.timeLabel}\n\uD83D\uDCCD ${EVENT_CONFIG.location}\n\nBuka undangan personal Anda:\n${link}`;

  window.open(
    waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer"
  );

  if (btn) {
    btn.textContent = "\u2713 Terkirim";
    btn.style.background = "#A67C1E";
    btn.style.color = "#FAF5EB";
  }
};

function initAdminPanel() {
  const fileInput = document.getElementById("excelUpload");
  const uploadZone = document.getElementById("uploadZone");
  const templateBtn = document.getElementById("downloadTemplateBtn");
  const clearAllBtn = document.getElementById("clearAllGuestsBtn");
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
        sessionGuests = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        renderAdminTable();
        showAlert(`Berhasil memuat ${sessionGuests.length} data tamu (tidak disimpan permanen).`, "success");
      } catch (_) {
        showAlert("Gagal membaca file CSV/Excel. Pastikan format kolom benar.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  fileInput.addEventListener("change", (e) => parseFile(e.target.files[0]));
  if (uploadZone) {
    ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => uploadZone.addEventListener(evt, (e) => e.preventDefault()));
    uploadZone.addEventListener("drop", (e) => parseFile(e.dataTransfer?.files?.[0]));
  }

  clearAllBtn?.addEventListener("click", () => {
    sessionGuests = [];
    if (fileInput) fileInput.value = "";
    renderAdminTable();
    showAlert("Semua data tamu pada sesi ini telah dihapus.", "success");
  });

  templateBtn?.addEventListener("click", () => {
    const csv = "nama_tamu,instansi,kategori,nomor_wa\nRenza Putra,XII RPL,Alumni,081234567890\nDina Maharani,Wali Murid,Keluarga,081398765432";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "template-tamu.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });
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
