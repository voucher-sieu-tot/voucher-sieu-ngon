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
  var night = document.getElementById("nightNote");
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
    if (night) night.hidden = !(sec >= 21 * 3600 + 30 * 60);
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

  /* ---- Tin mới (do bạn viết trong admin) ---- */
  var news = Array.isArray(settings.news) ? settings.news.filter(function (n) { return n && typeof n.text === "string" && n.text.trim() && !isNaN(Date.parse(n.at)); }) : [];
  var newsSec = document.getElementById("news");
  if (newsSec && news.length) {
    news.sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });
    var render = function (ul, arr) {
      arr.forEach(function (n) {
        var li = document.createElement("li");
        var t = document.createElement("time");
        t.dateTime = n.at;
        t.textContent = new Date(n.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        var s = document.createElement("span");
        s.textContent = n.text.trim().slice(0, 200);
        li.appendChild(t);
        li.appendChild(s);
        ul.appendChild(li);
      });
    };
    render(document.getElementById("newsList"), news.slice(0, 3));
    if (news.length > 3) {
      render(document.getElementById("newsOld"), news.slice(3, 53));
      document.getElementById("newsMore").hidden = false;
    }
    newsSec.hidden = false;
  }

  /* ---- Chế độ bảo trì (bật trong admin) ---- */
  var mt = settings.maintenance;
  if (mt && mt.enabled === true) {
    var box = document.createElement("section");
    box.className = "maint-box";
    box.setAttribute("role", "status");
    var h = document.createElement("h1");
    h.textContent = "Đang cập nhật";
    var p = document.createElement("p");
    p.textContent = typeof mt.message === "string" && mt.message.trim() ? mt.message.trim().slice(0, 300) : "Web đang được cập nhật voucher. Bạn quay lại sau ít phút nhé.";
    var rb = document.createElement("button");
    rb.type = "button";
    rb.className = "ics-btn";
    rb.textContent = "Thử lại";
    rb.addEventListener("click", function () { location.reload(); });
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(rb);
    document.body.appendChild(box);
    document.documentElement.classList.add("maint");
  }

  /* ---- Mã QR (của web và của từng voucher), có tên và logo DealNest bên dưới ---- */
  var qrBtn = document.getElementById("qrBtn"), qrDlg = document.getElementById("qrDlg");
  if (qrDlg && window.DealNestQR && typeof qrDlg.showModal === "function") {
    var qrCur = null; // { text, obj, caption, file }
    var qrSiteUrl = function () { return location.protocol === "file:" ? location.href : ((location.origin + location.pathname).replace(/index\.html$/, "") || location.href); };
    var qrSiteName = typeof SITE_NAME === "string" && SITE_NAME ? SITE_NAME : "DealNest";
    var openQR = function (opt) {
      var box = document.getElementById("qrBox"), obj = null;
      box.textContent = "";
      document.getElementById("qrTitle").textContent = opt.title || "Quét để mở web";
      document.getElementById("qrUrl").textContent = opt.text;
      document.getElementById("qrCap").textContent = opt.caption || "";
      document.getElementById("qrCap").hidden = !opt.caption;
      document.getElementById("qrBrandName").textContent = qrSiteName;
      try { obj = window.DealNestQR.make(opt.text); } catch (err) { obj = null; }
      qrCur = obj ? { text: opt.text, obj: obj, caption: opt.caption || "", file: opt.file || "qr-dealnest" } : null;
      document.getElementById("qrDl").disabled = !obj;
      if (!obj) { box.textContent = "Link quá dài để tạo mã QR."; qrDlg.showModal(); return; }
      var n = obj.size, q = 4, NS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + (n + 2 * q) + " " + (n + 2 * q));
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Mã QR dẫn tới " + opt.text);
      svg.setAttribute("shape-rendering", "crispEdges");
      var bg = document.createElementNS(NS, "rect");
      bg.setAttribute("width", n + 2 * q); bg.setAttribute("height", n + 2 * q); bg.setAttribute("fill", "#fff");
      svg.appendChild(bg);
      var d = "";
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (obj.get(x, y)) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", d); path.setAttribute("fill", "#000");
      svg.appendChild(path);
      box.appendChild(svg);
      qrDlg.showModal();
    };
    window.DealNestShowQR = openQR;
    if (qrBtn) qrBtn.addEventListener("click", function () { openQR({ text: qrSiteUrl(), title: "Quét để mở web", file: "qr-dealnest" }); });
    document.getElementById("qrClose").addEventListener("click", function () { qrDlg.close(); });
    document.getElementById("qrCopy").addEventListener("click", function () {
      var u = document.getElementById("qrUrl").textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).catch(function () {});
    });
    document.getElementById("qrDl").addEventListener("click", function () {
      if (!qrCur) return;
      var cur = qrCur, obj = cur.obj, n = obj.size, q = 4, S = Math.max(8, Math.floor(1024 / (n + 2 * q))), W = (n + 2 * q) * S;
      var FONT = "system-ui, 'Segoe UI', Roboto, Arial, sans-serif";
      var cv = document.createElement("canvas");
      cv.width = W; cv.height = W + (cur.caption ? 300 : 230);
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#000";
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (obj.get(x, y)) ctx.fillRect((x + q) * S, (y + q) * S, S, S);
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      if (cur.caption) {
        var fs = 52; ctx.font = "700 " + fs + "px " + FONT;
        while (ctx.measureText(cur.caption).width > W - 80 && fs > 24) { fs -= 2; ctx.font = "700 " + fs + "px " + FONT; }
        ctx.fillStyle = "#44403c"; ctx.fillText(cur.caption, W / 2, W + 40);
      }
      var by = W + (cur.caption ? 100 : 40), L = 110;
      ctx.font = "800 84px " + FONT;
      var tw = ctx.measureText(qrSiteName).width, x0 = (W - (L + 24 + tw)) / 2;
      var finish = function (img) {
        if (img) ctx.drawImage(img, x0, by, L, L);
        ctx.textAlign = "left"; ctx.fillStyle = "#ee4d2d"; ctx.font = "800 84px " + FONT;
        ctx.fillText(qrSiteName, x0 + (img ? L + 24 : 0), by + 82);
        cv.toBlob(function (blob) {
          if (!blob) return;
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = cur.file + ".png";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        }, "image/png");
      };
      var logo = new Image();
      logo.onload = function () { finish(logo); };
      logo.onerror = function () { x0 = (W - tw) / 2; finish(null); };
      logo.src = "images/icon-192.png";
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
