/* Phần phụ: banner dịp lễ, "cập nhật lần cuối", đếm ngược khung giờ săn mã, vé bay nền hero. */
(function () {
  "use strict";
  var settings = typeof SITE_SETTINGS === "object" && SITE_SETTINGS ? SITE_SETTINGS : {};

  function safeUrl(raw) {
    if (typeof raw !== "string" || !raw.trim()) return null;
    try {
      var u = new URL(raw.trim());
      return u.protocol === "https:" || u.protocol === "http:" ? raw.trim() : null;
    } catch (e) { return null; }
  }

  /* ---- Banner theo dịp (sửa trong trang admin) ---- */
  var promo = document.getElementById("promo");
  var b = settings.banner;
  if (promo && b && b.enabled === true && typeof b.text === "string" && b.text.trim()) {
    var link = safeUrl(b.link);
    var node;
    if (link) {
      node = document.createElement("a");
      node.href = link;
      node.target = "_blank";
      node.rel = "sponsored noopener noreferrer";
    } else {
      node = document.createElement("span");
    }
    node.textContent = b.text.trim().slice(0, 140);
    promo.textContent = "";
    promo.appendChild(node);
    promo.hidden = false;
  }

  /* ---- Cập nhật lần cuối ---- */
  var upd = document.getElementById("updatedAt");
  if (upd && typeof settings.updated === "string") {
    var d = new Date(settings.updated);
    if (!isNaN(d.getTime()) && d.getTime() <= Date.now() + 3600e3) {
      upd.textContent = "Cập nhật lần cuối: " + d.toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit",
        day: "2-digit", month: "2-digit", year: "numeric"
      });
      upd.hidden = false;
    }
  }

  /* ---- Đếm ngược khung giờ săn mã (giờ Việt Nam, UTC+7) ---- */
  var SLOTS = [0, 9, 12, 15, 18, 21];
  var GOLDEN_SECONDS = 30 * 60; // "giờ vàng" kéo dài 30 phút kể từ đầu mỗi khung
  var pill = document.getElementById("goldenPill");
  var mini = document.getElementById("miniClock");
  var bar = document.getElementById("slotBar");
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick() {
    var vn = new Date(Date.now() + 7 * 3600e3);
    var sec = vn.getUTCHours() * 3600 + vn.getUTCMinutes() * 60 + vn.getUTCSeconds();
    var since = -1, next = 24 * 3600;
    var slotStart = 0;
    SLOTS.forEach(function (h) {
      var s = h * 3600;
      if (s <= sec) { since = sec - s; slotStart = h; }
      else if (s < next) next = s;
    });
    var golden = since >= 0 && since < GOLDEN_SECONDS;
    document.documentElement.classList.toggle("golden", golden);
    if (pill) pill.hidden = !golden;
    if (mini) {
      mini.classList.toggle("gold", golden);
      var left0 = next - sec;
      mini.querySelector(".mc-time").textContent = golden
        ? "Giờ vàng " + pad(slotStart) + ":00"
        : pad(Math.floor(left0 / 3600)) + ":" + pad(Math.floor(left0 / 60) % 60) + ":" + pad(left0 % 60);
      mini.querySelector(".mc-label").textContent = golden ? "vào săn ngay" : "tới " + pad(Math.floor(next / 3600) % 24) + ":00";
    }
    bar.textContent = "";
    var icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "⏰ ";
    bar.appendChild(icon);
    if (golden) {
      bar.appendChild(document.createTextNode("Khung giờ săn mã thường gặp từ " + pad(slotStart) + ":00 vừa bắt đầu. Vào kiểm tra ngay nhé!"));
    } else {
      var left = next - sec;
      bar.appendChild(document.createTextNode("Khung giờ săn mã thường gặp tiếp theo: "));
      var t = document.createElement("b");
      t.textContent = pad(Math.floor(next / 3600) % 24) + ":00";
      bar.appendChild(t);
      bar.appendChild(document.createTextNode(" (còn "));
      var c = document.createElement("b");
      c.textContent = pad(Math.floor(left / 3600)) + ":" + pad(Math.floor(left / 60) % 60) + ":" + pad(left % 60);
      bar.appendChild(c);
      bar.appendChild(document.createTextNode(")"));
    }
    bar.hidden = false;
  }
  if (bar) { tick(); setInterval(tick, 1000); }

  /* Đồng hồ thu nhỏ: nổi ở góc màn hình khi thanh đếm ngược chính đã cuộn khuất */
  if (mini && bar) {
    var MKEY = "dealnest_miniclock";
    function setCollapsed(c) {
      mini.classList.toggle("collapsed", c);
      mini.setAttribute("aria-expanded", String(!c));
      try { localStorage.setItem(MKEY, c ? "1" : "0"); } catch (e) {}
    }
    try { if (localStorage.getItem(MKEY) === "1") setCollapsed(true); } catch (e) {}
    mini.addEventListener("click", function () { setCollapsed(!mini.classList.contains("collapsed")); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        mini.hidden = entries[entries.length - 1].isIntersecting;
      }).observe(bar);
    } else {
      mini.hidden = false;
    }
  }

  /* ---- Mục Liên hệ (link sửa trong trang admin) ---- */
  var contact = settings.contact && typeof settings.contact === "object" ? settings.contact : {};
  var row = document.getElementById("contactRow");
  var sec = document.getElementById("contact");
  if (row && sec) {
    [["tiktok", "TikTok", "Nhắn tin & theo dõi trên TikTok"], ["threads", "Threads", "Theo dõi & trò chuyện trên Threads"]].forEach(function (c) {
      var url = safeUrl(contact[c[0]]);
      if (!url) return;
      var a = document.createElement("a");
      a.className = "contact-btn " + c[0];
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      var t = document.createElement("b");
      t.textContent = c[1];
      var d = document.createElement("span");
      d.textContent = c[2];
      a.appendChild(t);
      a.appendChild(d);
      row.appendChild(a);
    });
    sec.hidden = row.children.length === 0;
  }

  /* ---- Thống kê ẩn danh (GoatCounter, không cookie) - chỉ bật khi bạn điền mã trong admin ---- */
  var gc = settings.analytics && typeof settings.analytics.goatcounter === "string" ? settings.analytics.goatcounter : "";
  if (/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(gc)) {
    var gs = document.createElement("script");
    gs.async = true;
    gs.src = "https://gc.zgo.at/count.js";
    gs.setAttribute("data-goatcounter", "https://" + gc + ".goatcounter.com/count");
    document.head.appendChild(gs);
    var note = document.getElementById("analyticsNote");
    if (note) note.hidden = false;
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a[data-track]") : null;
      if (a && window.goatcounter && typeof window.goatcounter.count === "function") {
        var label = a.getAttribute("data-track");
        window.goatcounter.count({ path: "click/" + label, title: label, event: true });
      }
    });
  }

  /* ---- Thêm nhắc giờ vào lịch (.ics) ---- */
  var icsBtn = document.getElementById("icsBtn");
  if (icsBtn) {
    icsBtn.addEventListener("click", function () {
      var vn = new Date(Date.now() + 7 * 3600e3);
      var y = vn.getUTCFullYear(), m = vn.getUTCMonth(), d = vn.getUTCDate();
      function stamp(ms) { return new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, ""); }
      var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DealNest//VI", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Khung giờ săn mã"];
      SLOTS.forEach(function (h) {
        lines.push(
          "BEGIN:VEVENT",
          "UID:dealnest-slot-" + h + "@dealnest",
          "DTSTAMP:" + stamp(Date.now()),
          "DTSTART:" + stamp(Date.UTC(y, m, d, h - 7, 0, 0)),
          "DURATION:PT30M",
          "RRULE:FREQ=DAILY",
          "SUMMARY:Khung giờ săn mã " + h + ":00",
          "DESCRIPTION:Vào kiểm tra voucher. Lịch có thể thay đổi theo chương trình.",
          "BEGIN:VALARM", "TRIGGER:-PT5M", "ACTION:DISPLAY", "DESCRIPTION:Sắp tới khung giờ săn mã " + h + ":00", "END:VALARM",
          "END:VEVENT"
        );
      });
      lines.push("END:VCALENDAR");
      var blob = new Blob([lines.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "khung-gio-san-ma.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

  /* ---- Cài web lên màn hình chính (PWA) ---- */
  var installBtn = document.getElementById("installBtn");
  var deferred = null;
  var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (installBtn && !standalone) installBtn.hidden = false;
  });
  if (installBtn) {
    installBtn.addEventListener("click", function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; installBtn.hidden = true; });
    });
  }
  window.addEventListener("appinstalled", function () { if (installBtn) installBtn.hidden = true; });
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var iosHint = document.getElementById("iosHint");
  if (iosHint && ios && !standalone) iosHint.hidden = false;
  if ("serviceWorker" in navigator && /^https:$|^http:$/.test(location.protocol) && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  /* ---- Vé bay nhẹ ở nền hero (tắt khi người dùng bật giảm chuyển động) ---- */
  var hero = document.getElementById("top");
  if (hero && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    for (var i = 0; i < 7; i++) {
      var s = document.createElement("span");
      s.className = "ticket t" + (i + 1);
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3z"/><path d="M13 7v10" stroke-dasharray="2 2.5"/></svg>';
      hero.appendChild(s);
    }
  }
})();
