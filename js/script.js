const EVENT_CONFIG = {
  title: "Acara Perpisahan & Wisuda Kelulusan",
  dateIso: "2027-01-01T07:00:00+07:00",
  endIso: "2027-01-01T15:00:00+07:00",
  dateLabel: "Jumat, 1 Januari 2027",
  timeLabel: "07.00 – 15.00 WIB",
  location: "Aula & Lapangan Utama, Jl. Raya Victor, Setu, Kota Tangerang Selatan",
  panitiaWa: "6281234567890",
  rekeningInfo: "1234567890 a.n. Panitia Kelulusan (BCA)"
};

// Konfigurasi Supabase (Ganti dengan URL & Anon Key project Supabase milikmu)
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

// --- 1. INISIALISASI SUPABASE ---
function initSupabaseClient() {
  const isConfigured =
    typeof window.supabase !== "undefined" &&
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_ID") &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE_ANON_KEY");

  if (!isConfigured) return null;
  supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  return supabaseClient;
}

async function saveRsvpToSupabase(record) {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return { ok: false, reason: "not_configured" };

  const { data, error } = await client
    .from(SUPABASE_CONFIG.rsvpTable)
    .insert([record])
    .select();

  if (error) {
    console.error("Supabase Insert Error:", error.message);
    return { ok: false, reason: error.message };
  }
  return { ok: true, data };
}

async function fetchRsvpFromSupabase() {
  const client = supabaseClient || initSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from(SUPABASE_CONFIG.rsvpTable)
    .select("*")
    .order("id", { ascending: false });

  if (error || !Array.isArray(data)) {
    console.error("Supabase Fetch Error:", error?.message);
    return null;
  }
  return data;
}

// --- 2. KONTROL AUDIO BACKSOUND ---
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
    osc.frequency.value = notes[step % notes.length];
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.46);
    step += 1;
  }, 480);
}

function setMusicState(play) {
  const audioEl = document.getElementById("bgMusic");
  const btnEl = document.getElementById("musicToggleBtn");
  const labelEl = document.getElementById("musicStatusText");
  isMusicPlaying = play;

  if (play) {
    if (audioEl) {
      audioEl.play().catch(() => {
        playGraduationSynthLoop();
      });
    } else {
      playGraduationSynthLoop();
    }
    if (btnEl) btnEl.classList.add("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: On";
  } else {
    if (audioEl && !audioEl.paused) audioEl.pause();
    clearInterval(synthTimer);
    if (btnEl) btnEl.classList.remove("is-playing");
    if (labelEl) labelEl.textContent = "Backsound: Off";
  }
}

// --- 3. DATA TAMU URL & COVER UNDANGAN ---
function getGuestFromUrlAndStorage() {
  const params = new URLSearchParams(window.location.search);
  const rawName = params.get("to") || params.get("nama") || "";
  const rawInstansi = params.get("instansi") || "";
  const rawKategori = params.get("kategori") || "Undangan";

  let storedGuests = [];
  try {
    storedGuests = JSON.parse(localStorage.getItem(GUEST_CSV_STORAGE_KEY) || "[]");
  } catch (_) {
    storedGuests = [];
  }

  const matched = rawName
    ? storedGuests.find((g) => String(g.nama_tamu || "").trim().toLowerCase() === rawName.trim().toLowerCase())
    : null;

  return {
    nama: (matched && matched.nama_tamu) || rawName || "Tamu Undangan",
    instansi: (matched && matched.instansi) || rawInstansi || "Keluarga Besar & Alumni",
    kategori: (matched && matched.kategori) || rawKategori
  };
}

function initCoverAndMusic() {
  const guest = getGuestFromUrlAndStorage();
  const coverNameEl = document.getElementById("coverGuestName");
  const coverInstansiEl = document.getElementById("coverGuestInstansi");
  const openBtn = document.getElementById("openInvitationBtn");
  const coverEl = document.getElementById("invitationCover");
  const mainEl = document.getElementById("mainInvitation");
  const toggleBtn = document.getElementById("musicToggleBtn");

  if (coverNameEl) coverNameEl.textContent = guest.nama;
  if (coverInstansiEl) coverInstansiEl.textContent = guest.instansi;

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (coverEl) coverEl.classList.add("is-opened");
      if (mainEl) mainEl.classList.remove("invitation-hidden");
      setMusicState(true);
      initScrollAnimations();
    });
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setMusicState(!isMusicPlaying);
    });
  }
}

// --- 4. GALERI, COUNTDOWN, KALENDER & CLIPBOARD ---
function initGalleryFallback() {
  const captions = [
    "Wisuda & Kelulusan",
    "Sahabat Seangkatan",
    "Bersama Guru",
    "Perayaan Kelulusan"
  ];
  const imgs = document.querySelectorAll("#graduationGallery img");
  imgs.forEach((img, idx) => {
    img.addEventListener("error", () => {
      const text = encodeURIComponent(captions[idx] || "Momen Kelulusan");
      img.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='260'><rect width='100%25' height='100%25' fill='%23E0F2FE'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%230284C7' font-family='sans-serif' font-size='20' font-weight='bold'>${text}</text></svg>`;
    });
  });
}

function startCountdown() {
  const targetTime = new Date(EVENT_CONFIG.dateIso).getTime();
  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  function updateTimer() {
    const now = Date.now();
    const diff = targetTime - now;
    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minutesEl.textContent = "00";
      secondsEl.textContent = "00";
      return;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const s = Math.floor((diff / 1000) % 60);

    daysEl.textContent = String(d).padStart(2, "0");
    hoursEl.textContent = String(h).padStart(2, "0");
    minutesEl.textContent = String(m).padStart(2, "0");
    secondsEl.textContent = String(s).padStart(2, "0");
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

function initCalendarActions() {
  const gcalLink = document.getElementById("googleCalendarLink");
  const icsBtn = document.getElementById("downloadIcsBtn");

  // Format UTC untuk 1 Januari 2027, 07:00 - 15:00 WIB (UTC+7 -> 00:00Z - 08:00Z)
  const startCompact = "20270101T000000Z";
  const endCompact = "20270101T080000Z";

  if (gcalLink) {
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT_CONFIG.title)}&dates=${startCompact}/${endCompact}&details=${encodeURIComponent("Acara Perpisahan & Kelulusan pukul 07.00 - 15.00 WIB")}&location=${encodeURIComponent(EVENT_CONFIG.location)}`;
    gcalLink.href = url;
  }

  if (icsBtn) {
    icsBtn.addEventListener("click", () => {
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Undangan Kelulusan//ID",
        "BEGIN:VEVENT",
        `DTSTART:${startCompact}`,
        `DTEND:${endCompact}`,
        `SUMMARY:${EVENT_CONFIG.title}`,
        `DESCRIPTION:Acara Perpisahan & Kelulusan (${EVENT_CONFIG.timeLabel})`,
        `LOCATION:${EVENT_CONFIG.location}`,
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "perpisahan-kelulusan-07-15.ics";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
}

function initCopyFeature() {
  const copyBtn = document.getElementById("copyRekeningBtn");
  const rekeningEl = document.getElementById("rekeningText");
  const toastEl = document.getElementById("copyToast");
  if (!copyBtn || !rekeningEl) return;

  copyBtn.addEventListener("click", async () => {
    const textToCopy = rekeningEl.textContent.trim();
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (_) {
      const tempInput = document.createElement("input");
      tempInput.value = textToCopy;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
    }

    if (toastEl) {
      toastEl.textContent = `✓ Tersalin: ${textToCopy}`;
      toastEl.classList.add("show");
      setTimeout(() => toastEl.classList.remove("show"), 2500);
    }
  });
}

function initScrollAnimations() {
  const items = document.querySelectorAll(".reveal-on-scroll");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  items.forEach((el) => observer.observe(el));
}

// --- 5. FORMULIR RSVP & BUKU TAMU (SUPABASE + LOCALSTORAGE) ---
function getSavedRsvpList() {
  try {
    return JSON.parse(localStorage.getItem(RSVP_STORAGE_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

function renderGuestbook() {
  const listEl = document.getElementById("guestbookList");
  if (!listEl) return;
  const entries = getSavedRsvpList();

  if (!entries.length) {
    listEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">Belum ada ucapan yang tersimpan. Jadilah yang pertama mengirimkan ucapan!</p>`;
    return;
  }

  listEl.innerHTML = entries
    .map(
      (item) => `
      <div class="guestbook-item">
        <div class="guestbook-meta">
          <strong>${escapeHtml(item.nama)} <span style="font-weight: 500; color: var(--text-muted);">(${escapeHtml(item.instansi)})</span></strong>
          <span class="guestbook-badge">${escapeHtml(item.status)} • ${escapeHtml(item.jumlah)} orang</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-main);">${escapeHtml(item.pesan || "Selamat atas kelulusannya, semoga sukses ke depannya!")}</p>
      </div>`
    )
    .join("");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initRsvpForm() {
  const guest = getGuestFromUrlAndStorage();
  const headerName = document.getElementById("inviteHeaderName");
  const headerInstansi = document.getElementById("inviteInstansiName");
  const namaInput = document.getElementById("rsvpNama");
  const instansiInput = document.getElementById("rsvpInstansi");
  const kategoriInput = document.getElementById("rsvpKategori");
  const form = document.getElementById("rsvpForm");
  const alertEl = document.getElementById("rsvpAlert");

  if (headerName) headerName.textContent = guest.nama;
  if (headerInstansi) headerInstansi.textContent = guest.instansi;
  if (namaInput && guest.nama !== "Tamu Undangan") namaInput.value = guest.nama;
  if (instansiInput && guest.instansi !== "Keluarga Besar & Alumni") instansiInput.value = guest.instansi;
  if (kategoriInput) kategoriInput.value = guest.kategori;

  renderGuestbook();

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const record = {
      nama: namaInput.value.trim(),
      instansi: instansiInput.value.trim(),
      kategori: kategoriInput.value.trim() || "Undangan",
      wa: document.getElementById("rsvpWa").value.trim(),
      status: document.getElementById("rsvpStatus").value,
      jumlah: document.getElementById("rsvpJumlah").value,
      pesan: document.getElementById("rsvpPesan").value.trim(),
      waktu: new Date().toISOString()
    };

    // 1. Simpan ke localStorage langsung agar responsif
    const current = getSavedRsvpList();
    current.unshift(record);
    localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(current));
    renderGuestbook();

    if (alertEl) {
      alertEl.className = "alert alert-success show";
      alertEl.textContent = "⏳ Menyimpan konfirmasi & ucapan Anda...";
    }

    // 2. Kirim ke database Supabase
    const supaRes = await saveRsvpToSupabase(record);
    if (alertEl) {
      alertEl.className = "alert alert-success show";
      alertEl.textContent = supaRes.ok
        ? "✓ Terima kasih! Konfirmasi & ucapan tersimpan di database Supabase!"
        : "✓ Terima kasih! Konfirmasi & ucapan tersimpan di buku tamu.";
    }

    // 3. Arahkan konfirmasi ke WhatsApp Panitia
    const waText = `Halo Panitia Perpisahan & Kelulusan (07.00-15.00 WIB), saya *${record.nama}* (${record.instansi}) mengonfirmasi status: *${record.status}* (${record.jumlah} orang). Pesan: ${record.pesan || "-"}`;
    window.open(`https://wa.me/${EVENT_CONFIG.panitiaWa}?text=${encodeURIComponent(waText)}`, "_blank", "noopener,noreferrer");
    form.reset();
  });
}

// --- 6. PANEL ADMIN & WHATSAPP BLAST ---
function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  else if (cleaned.startsWith("8")) cleaned = "62" + cleaned;
  return cleaned;
}

function showAdminAlert(msg, type = "success") {
  const el = document.getElementById("adminAlert");
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function renderAdminTable(rows) {
  const tbody = document.getElementById("adminTableBody");
  const totalEl = document.getElementById("totalTamu");
  if (!tbody) return;

  localStorage.setItem(GUEST_CSV_STORAGE_KEY, JSON.stringify(rows));
  if (totalEl) totalEl.textContent = String(rows.length);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px;">Belum ada data tamu yang diunggah.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row, i) => {
      const nama = row.nama_tamu || row.nama || `Tamu ${i + 1}`;
      const instansi = row.instansi || "-";
      const kategori = row.kategori || "Undangan";
      const waRaw = row.nomor_wa || row.wa || "";
      const waClean = normalizePhone(waRaw);

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(nama)}</td>
          <td>${escapeHtml(instansi)}</td>
          <td>${escapeHtml(kategori)}</td>
          <td>${escapeHtml(waRaw || "-")}</td>
          <td>
            <button type="button" class="btn btn-primary" style="width:auto;padding:7px 14px;font-size:0.84rem;"
              onclick="window.sendWhatsAppBlast('${encodeURIComponent(nama)}','${encodeURIComponent(instansi)}','${encodeURIComponent(kategori)}','${waClean}',this)">
              Kirim WA
            </button>
          </td>
        </tr>`;
    })
    .join("");
}

window.sendWhatsAppBlast = function (encodedNama, encodedInstansi, encodedKategori, waNumber, btnEl) {
  const nama = decodeURIComponent(encodedNama);
  const instansi = decodeURIComponent(encodedInstansi);
  const kategori = decodeURIComponent(encodedKategori);
  const baseUrl = window.location.origin + window.location.pathname.replace("admin.html", "index.html");
  const personalLink = `${baseUrl}?to=${encodeURIComponent(nama)}&instansi=${encodeURIComponent(instansi)}&kategori=${encodeURIComponent(kategori)}`;

  const message = `Yth. *${nama}* (${instansi})\nKami mengundang Anda untuk hadir pada *${EVENT_CONFIG.title}*.\n📅 Tanggal: ${EVENT_CONFIG.dateLabel}\n⏰ Waktu: ${EVENT_CONFIG.timeLabel}\n📍 Lokasi: ${EVENT_CONFIG.location}\n\nBuka undangan personal Anda di:\n${personalLink}`;

  const waUrl = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank", "noopener,noreferrer");

  if (btnEl) {
    btnEl.textContent = "✓ Terkirim";
    btnEl.style.backgroundColor = "#059669";
  }
};

function initAdminPanel() {
  const fileInput = document.getElementById("excelUpload");
  const uploadZone = document.getElementById("uploadZone");
  const templateBtn = document.getElementById("downloadTemplateBtn");
  if (!fileInput) return;

  function parseFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        renderAdminTable(json);
        showAdminAlert(`Berhasil memuat ${json.length} data tamu dari ${file.name}.`, "success");
      } catch (_) {
        showAdminAlert("Gagal membaca file CSV/Excel. Pastikan struktur kolom sesuai.", "error");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  fileInput.addEventListener("change", (e) => parseFile(e.target.files[0]));

  if (uploadZone) {
    ["dragenter", "dragover"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "#0284C7";
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      uploadZone.addEventListener(evt, (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = "#0EA5E9";
      });
    });
    uploadZone.addEventListener("drop", (e) => {
      const droppedFile = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (droppedFile) parseFile(droppedFile);
    });
  }

  if (templateBtn) {
    templateBtn.addEventListener("click", () => {
      const csvSample = "nama_tamu,instansi,kategori,nomor_wa\nRenza Putra,XII RPL,Alumni,081234567890\nDina Maharani,Wali Murid,Keluarga,081398765432";
      const blob = new Blob([csvSample], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "template-tamu.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  try {
    const savedGuests = JSON.parse(localStorage.getItem(GUEST_CSV_STORAGE_KEY) || "[]");
    if (savedGuests.length) renderAdminTable(savedGuests);
  } catch (_) {}
}

// --- 7. EKSEKUSI SAAT HALAMAN SIAP ---
document.addEventListener("DOMContentLoaded", () => {
  initSupabaseClient();
  initCoverAndMusic();
  initGalleryFallback();
  startCountdown();
  initCalendarActions();
  initCopyFeature();
  initRsvpForm();
  initAdminPanel();

  // Sinkronkan buku tamu dari Supabase jika tersedia
  fetchRsvpFromSupabase().then((remoteRows) => {
    if (remoteRows && remoteRows.length) {
      localStorage.setItem(RSVP_STORAGE_KEY, JSON.stringify(remoteRows));
      renderGuestbook();
    }
  });
});