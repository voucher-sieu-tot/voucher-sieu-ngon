(function () {
  "use strict";

  var NAMES = { shopee: "Shopee", tiktok: "TikTok Shop" };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Safe link: only http(s), used exactly as written ---------- */
  function safeUrl(raw) {
    if (typeof raw !== "string") return null;
    var value = raw.trim();
    if (!value) return null;
    try {
      var u = new URL(value);
      return u.protocol === "https:" || u.protocol === "http:" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function parseExpiry(s) {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var p = s.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2], 23, 59, 59);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svg(inner, size) {
    var s = size || 14;
    var span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.style.display = "inline-flex";
    span.innerHTML =
      '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      inner + "</svg>";
    return span;
  }

  var ICON = {
    bag: '<path d="M6 8h12l-1 11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
    note: '<path d="M4 4h8l8 8a2 2 0 0 1 0 3l-5 5a2 2 0 0 1-3 0l-8-8z"/><circle cx="8.5" cy="8.5" r="1"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    out: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'
  };

  /* ---------- Thông báo nhỏ, sao chép, chia sẻ ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? "Đã sao chép link voucher" : "Không sao chép được, hãy thử lại");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Đã sao chép link voucher"); }, fallback);
    } else {
      fallback();
    }
  }

  function isNew(v) {
    if (typeof v.added !== "string") return false;
    var t = Date.parse(v.added);
    if (isNaN(t)) return false;
    var age = Date.now() - t;
    return age >= -3600e3 && age < 48 * 3600e3;
  }

  var settings = typeof SITE_SETTINGS === "object" && SITE_SETTINGS ? SITE_SETTINGS : {};

  /* Lịch đổi link do bạn hẹn trong admin: đến giờ thì voucher dùng link mới đã chọn */
  (function applySchedule() {
    if (!Array.isArray(settings.schedule) || typeof VOUCHERS === "undefined") return;
    var now = Date.now();
    settings.schedule
      .filter(function (e) { return e && typeof e.voucherId === "string" && Date.parse(e.at) <= now && safeUrl(e.link); })
      .sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); })
      .forEach(function (e) {
        VOUCHERS.forEach(function (v) { if (v.id === e.voucherId) v.link = e.link; });
      });
  })();
  var reportUrl = safeUrl(settings.reportUrl);

  function imageFor(v) {
    if (v.image) return v.image;
    return (typeof PLATFORM_IMAGES === "object" && PLATFORM_IMAGES[v.platform]) || "";
  }

  /* ---------- Thanh phần trăm đã dùng (chỉ khi có số liệu thật) ---------- */
  function buildUsage(v) {
    var real = typeof v.used === "number" && v.used >= 0 && v.used <= 100;
    if (!real) return null;

    var value = Math.round(v.used);
    var wrap = el("div", "used");
    var top = el("div", "used-top");
    var label = el("span", null, "Đã dùng");
    var pct = el("b", null, value + "%");
    top.appendChild(label);
    top.appendChild(pct);
    var track = el("div", "track");
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(value));
    track.setAttribute("aria-label", "Đã dùng");
    var fill = el("span", "fill");
    fill.style.width = "0%";
    track.appendChild(fill);
    wrap.appendChild(top);
    wrap.appendChild(track);
    // mở thanh ra sau khi hiện lên màn hình
    requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = value + "%"; }); });
    return wrap;
  }

  /* ---------- Build one card (kiểu vé: phần trên là mức giảm, phần dưới là chi tiết) ---------- */
  function buildCard(v, index) {
    var slot = el("div", "card-slot reveal");
    if (v.featured) slot.className += " float";
    slot.style.transitionDelay = Math.min(index, 5) * 60 + "ms";

    var card = el("article", "card " + v.platform + (v.featured ? " hot" : ""));

    var stub = el("div", "stub");
    var src = imageFor(v);
    if (src) {
      var img = document.createElement("img");
      img.className = "stub-img";
      img.src = src;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      stub.appendChild(img);
    }

    var top = el("div", "top");
    var badge = el("span", "badge");
    var icon = el("i");
    icon.appendChild(svg(v.platform === "shopee" ? ICON.bag : ICON.note, 15));
    badge.appendChild(icon);
    badge.appendChild(el("span", null, NAMES[v.platform] || ""));
    top.appendChild(badge);
    var tags = el("div", "tags");
    if (isNew(v)) tags.appendChild(el("span", "tag new", "Mới"));
    if (v.tag) tags.appendChild(el("span", "tag vip", String(v.tag)));
    if (v.featured) {
      var tag = el("span", "tag");
      tag.appendChild(svg(ICON.star, 11));
      tag.appendChild(document.createTextNode("Nổi bật"));
      tags.appendChild(tag);
    }
    if (tags.childNodes.length) top.appendChild(tags);
    stub.appendChild(top);

    stub.appendChild(el("p", "discount", v.discount));
    if (v.minimum) stub.appendChild(el("p", "min", "Cho đơn từ " + v.minimum));
    if (v.maximum) stub.appendChild(el("p", "min", "Giảm tối đa " + v.maximum));
    card.appendChild(stub);

    var perf = el("div", "perf");
    perf.setAttribute("aria-hidden", "true");
    card.appendChild(perf);

    var body = el("div", "body");
    body.appendChild(el("h3", null, v.title));
    var usageEl = buildUsage(v);
    if (usageEl) body.appendChild(usageEl);

    var foot = el("div", "foot");
    var exp = el("p", "exp");
    exp.appendChild(svg(ICON.cal, 14));
    var expDate = parseExpiry(v.expires);
    var expired = expDate ? expDate.getTime() < Date.now() : false;
    var expText = document.createTextNode(expDate ? (expired ? "Đã hết hạn" : "HSD " + fmtDate(expDate)) : "Không có hạn dùng");
    exp.appendChild(expText);
    if (expDate) foot.appendChild(exp);
    else foot.className += " solo";

    var url = safeUrl(v.link);
    if (url && !expired) {
      var a = el("a", "btn");
      a.href = url; // exactly the link you wrote
      a.target = "_blank";
      a.rel = "sponsored noopener noreferrer";
      a.addEventListener("click", function () { setTried(v, true); if (card._paintTried) card._paintTried(); });
      a.setAttribute("data-track", (v.featured ? "Nổi bật" : "Thường") + " | " + (NAMES[v.platform] || v.platform) + " | " + v.discount + (v.minimum ? " | đơn từ " + v.minimum : "") + " | " + url.replace(/^https?:\/\//, "").slice(-24));
      a.appendChild(document.createTextNode("Lấy voucher"));
      a.appendChild(svg(ICON.out, 14));
      foot.appendChild(a);
    } else {
      var b = el("button", "btn off");
      b.type = "button";
      b.disabled = true;
      b.appendChild(svg(ICON.ban, 14));
      b.appendChild(document.createTextNode(expired ? "Hết hạn" : "Chưa có link"));
      foot.appendChild(b);
    }
    body.appendChild(foot);

    /* Nút phụ: sao chép / chia sẻ / báo mã hết (chỉ khi có link dùng được) */
    {
      var tools = el("div", "tools");
      var favBtn = el("button", "tool fav");
      favBtn.type = "button";
      var paintFav = function () {
        var on = isFav(v);
        favBtn.textContent = on ? "♥ Đã lưu" : "♡ Lưu";
        favBtn.classList.toggle("on", on);
        favBtn.setAttribute("aria-pressed", String(on));
      };
      paintFav();
      favBtn.addEventListener("click", function () {
        var k = favKey(v), i = favs.indexOf(k);
        if (i === -1) favs.push(k); else favs.splice(i, 1);
        saveFavs();
        updateSavedCount();
        if (activeTab === "saved") render(searchInput.value); else paintFav();
      });
      tools.appendChild(favBtn);
      var triedBtn = el("button", "tool tried-btn");
      triedBtn.type = "button";
      var paintTried = function () {
        var on = isTried(v);
        triedBtn.textContent = on ? "✓ Đã thử (bỏ)" : "Đánh dấu đã thử";
        triedBtn.setAttribute("aria-pressed", String(on));
        card.classList.toggle("tried", on);
      };
      card._paintTried = paintTried;
      paintTried();
      triedBtn.addEventListener("click", function () { setTried(v, !isTried(v)); paintTried(); });
      tools.appendChild(triedBtn);
      if (url && !expired) {
        var copyBtn = el("button", "tool", "Sao chép link");
        copyBtn.type = "button";
        copyBtn.addEventListener("click", function () { copyText(url); });
        tools.appendChild(copyBtn);
        if (navigator.share) {
          var shareBtn = el("button", "tool", "Chia sẻ");
          shareBtn.type = "button";
          shareBtn.addEventListener("click", function () {
            navigator.share({ title: v.title + " " + v.discount, text: (NAMES[v.platform] || "Voucher") + ": " + v.discount, url: url })
              .catch(function () {});
          });
          tools.appendChild(shareBtn);
        }
      }
      if (reportUrl) {
        var rep = el("a", "tool", "Báo mã hết");
        rep.href = reportUrl;
        rep.target = "_blank";
        rep.rel = "noopener noreferrer";
        tools.appendChild(rep);
      }
      body.appendChild(tools);
    }
    card.appendChild(body);
    slot.appendChild(card);

    /* subtle 3D tilt */
    if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "rotateX(" + -y * 8 + "deg) rotateY(" + x * 8 + "deg) scale(1.015)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    }
    return slot;
  }

  /* ---------- Scroll reveal ---------- */
  var observer = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            observer.unobserve(en.target);
          }
        });
      }, { rootMargin: "0px 0px -40px 0px" })
    : null;

  function watch(node) {
    if (observer) observer.observe(node);
    else node.classList.add("in");
  }

  /* ---------- Render ---------- */
  var grids = {
    featured: document.getElementById("gridFeatured"),
    shopee: document.getElementById("gridShopee"),
    tiktok: document.getElementById("gridTiktok"),
    saved: document.getElementById("gridSaved")
  };
  var sections = {
    featured: document.getElementById("featured"),
    shopee: document.getElementById("shopee"),
    tiktok: document.getElementById("tiktok"),
    saved: document.getElementById("saved")
  };

  /* ---------- Voucher yêu thích (lưu ngay trên máy người xem) ---------- */
  var FAVKEY = "dealnest_fav";
  var favs = [];
  try {
    var rawFav = JSON.parse(localStorage.getItem(FAVKEY) || "[]");
    if (Array.isArray(rawFav)) favs = rawFav.filter(function (s) { return typeof s === "string"; }).slice(0, 200);
  } catch (e) {}
  function favKey(v) { return v.id ? "id:" + v.id : v.platform + "|" + (v.link || "") + "|" + v.discount; }
  function isFav(v) { return favs.indexOf(favKey(v)) !== -1; }
  function saveFavs() { try { localStorage.setItem(FAVKEY, JSON.stringify(favs)); } catch (e) {} }
  function updateSavedCount() {
    var n = list.filter(isFav).length;
    var c = document.getElementById("savedCount");
    if (c) c.textContent = n ? "(" + n + ")" : "";
  }
  var emptyBox = document.getElementById("empty");
  var searchInput = document.getElementById("search");
  var clearBtn = document.getElementById("clear");

  var activeTab = "all";
  var sortMode = "default";
  var activeChip = null;

  /* ---------- Đã thử: tự mờ đi, sau 1 giờ tự trở lại bình thường ---------- */
  var TRIED_KEY = "dealnest_tried";
  var TRIED_MS = 60 * 60 * 1000;
  var tried = {};
  try {
    var rawT = JSON.parse(localStorage.getItem(TRIED_KEY) || "{}");
    if (rawT && typeof rawT === "object" && !Array.isArray(rawT)) tried = rawT;
  } catch (e) {}
  function purgeTried() {
    var now = Date.now(), changed = false;
    Object.keys(tried).forEach(function (k) {
      if (typeof tried[k] !== "number" || now - tried[k] >= TRIED_MS) { delete tried[k]; changed = true; }
    });
    if (changed) { try { localStorage.setItem(TRIED_KEY, JSON.stringify(tried)); } catch (e) {} }
  }
  function isTried(v) { var t = tried[favKey(v)]; return typeof t === "number" && Date.now() - t < TRIED_MS; }
  function setTried(v, on) {
    if (on) tried[favKey(v)] = Date.now(); else delete tried[favKey(v)];
    try { localStorage.setItem(TRIED_KEY, JSON.stringify(tried)); } catch (e) {}
  }
  purgeTried();
  setInterval(function () {
    purgeTried();
    document.querySelectorAll(".card").forEach(function (c) { if (c._paintTried) c._paintTried(); });
  }, 30000);

  /* ---------- Chuyển đổi số liệu để sắp xếp / lọc ---------- */
  function money(str) {
    if (typeof str !== "string") return null;
    var m = str.replace(/\./g, "").replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(k|tr|m|triệu|nghìn|ngàn|đ|d)?/i);
    if (!m) return null;
    var n = parseFloat(m[1]), u = (m[2] || "").toLowerCase();
    if (u === "k" || u === "nghìn" || u === "ngàn") return n * 1e3;
    if (u === "tr" || u === "m" || u === "triệu") return n * 1e6;
    return n;
  }
  function discountValue(v) {
    var d = String(v.discount || "");
    if (d.indexOf("%") !== -1) {
      var cap = money(v.maximum);
      return cap != null ? cap : (parseFloat(d.replace(/[^\d.,]/g, "").replace(",", ".")) || 0) * 1000;
    }
    var n = money(d);
    return n == null ? 0 : n;
  }
  function minimumValue(v) { var n = money(v.minimum); return n == null ? 0 : n; }
  function isExpiredV(v) { var d = parseExpiry(v.expires); return d ? d.getTime() < Date.now() : false; }
  function sorted(items) {
    var a = items.map(function (v, i) { return { v: v, i: i }; });
    var cmp = {
      "new": function (x, y) { return (Date.parse(y.v.added) || 0) - (Date.parse(x.v.added) || 0); },
      "discount": function (x, y) { return discountValue(y.v) - discountValue(x.v); },
      "minimum": function (x, y) { return minimumValue(x.v) - minimumValue(y.v); }
    }[sortMode];
    if (cmp) a.sort(function (x, y) { return cmp(x, y) || x.i - y.i; });
    return a.map(function (o) { return o.v; });
  }
  function chipMatch(v) {
    if (!activeChip) return true;
    if (activeChip === "zero") return minimumValue(v) === 0 && v.minimum != null && String(v.minimum).trim() !== "";
    if (activeChip.indexOf("tag:") === 0) return v.tag === activeChip.slice(4);
    return true;
  }
  var tabsEl = document.getElementById("tabs");

  var list = [];
  if (typeof VOUCHERS !== "undefined" && Array.isArray(VOUCHERS)) {
    list = VOUCHERS.filter(function (v) {
      return v && (v.platform === "shopee" || v.platform === "tiktok") && v.title && v.discount;
    });
  } else {
    emptyBox.hidden = false;
    emptyBox.textContent = "Không đọc được file vouchers-data.js. Hãy kiểm tra xem có thiếu dấu phẩy hoặc dấu ngoặc không.";
  }

  function fill(key, items, emptyText) {
    var grid = grids[key];
    grid.textContent = "";
    if (items.length === 0) {
      if (emptyText) grid.appendChild(el("p", "empty", emptyText));
      return;
    }
    items.forEach(function (v, i) {
      var c = buildCard(v, i);
      grid.appendChild(c);
      watch(c);
    });
  }

  /* Nút "Xem tất cả" dưới mục sàn khi một phần voucher đang nằm ở mục Nổi bật */
  function seeAll(key, total, shown, name) {
    var old = sections[key].querySelector(".see-all");
    if (old) old.remove();
    if (activeTab !== "all" || total <= shown) return;
    var b = el("button", "see-all", "Xem tất cả " + total + " voucher " + name);
    b.type = "button";
    b.addEventListener("click", function () { setTab(key); sections[key].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); });
    sections[key].appendChild(b);
  }

  function render(query) {
    var q = (query || "").trim().toLowerCase();
    var items = q
      ? list.filter(function (v) {
          return [v.title, v.discount, v.minimum || "", v.tag || ""].join(" ").toLowerCase().indexOf(q) !== -1;
        })
      : list;

    items = sorted(items.filter(chipMatch));
    updateCountBar(items.length);

    var featured = items.filter(function (v) { return v.featured; });
    var shopee = items.filter(function (v) { return v.platform === "shopee"; });
    var tiktok = items.filter(function (v) { return v.platform === "tiktok"; });

    var tab = activeTab;
    var savedItems = items.filter(isFav);
    sections.saved.hidden = tab !== "saved";
    if (tab === "saved") fill("saved", savedItems, "Chưa lưu voucher nào. Bấm “♡ Lưu” trên thẻ voucher để lưu lại.");
    else grids.saved.textContent = "";
    updateSavedCount();
    sections.featured.hidden = featured.length === 0 || (tab !== "all" && tab !== "featured");
    sections.shopee.hidden = (!!q && shopee.length === 0) || (tab !== "all" && tab !== "shopee");
    sections.tiktok.hidden = (!!q && tiktok.length === 0) || (tab !== "all" && tab !== "tiktok");

    /* Tab "Tất cả": voucher nổi bật chỉ hiện ở mục Nổi bật, tránh lặp lại */
    var dedupe = tab === "all" && featured.length > 0;
    var shopeeShown = dedupe ? shopee.filter(function (v) { return !v.featured; }) : shopee;
    var tiktokShown = dedupe ? tiktok.filter(function (v) { return !v.featured; }) : tiktok;

    fill("featured", featured);
    fill("shopee", shopeeShown, shopee.length ? "" : "Chưa có voucher Shopee.");
    fill("tiktok", tiktokShown, tiktok.length ? "" : "Chưa có voucher TikTok Shop.");
    seeAll("shopee", shopee.length, shopeeShown.length, "Shopee");
    seeAll("tiktok", tiktok.length, tiktokShown.length, "TikTok Shop");
    if (dedupe && shopeeShown.length === 0 && shopee.length > 0) sections.shopee.hidden = true;
    if (dedupe && tiktokShown.length === 0 && tiktok.length > 0) sections.tiktok.hidden = true;

    if (q && items.length === 0) {
      emptyBox.hidden = false;
      emptyBox.textContent = "Không tìm thấy voucher nào khớp với “" + query.trim() + "”.";
    } else if (tab === "featured" && featured.length === 0 && list.length > 0) {
      emptyBox.hidden = false;
      emptyBox.textContent = "Chưa có voucher nổi bật.";
    } else if (list.length > 0 || typeof VOUCHERS !== "undefined") {
      emptyBox.hidden = true;
    }
  }

  function updateCountBar(shown) {
    var bar = document.getElementById("countBar");
    if (!bar) return;
    var live = list.filter(function (v) { return !isExpiredV(v); });
    var sp = live.filter(function (v) { return v.platform === "shopee"; }).length;
    var tt = live.length - sp;
    var txt = live.length + " voucher đang có (Shopee " + sp + " · TikTok Shop " + tt + ")";
    if (shown !== list.length) txt += " — đang hiển thị " + shown;
    bar.textContent = list.length ? txt : "";
  }

  function buildChips() {
    var box = document.getElementById("chips");
    if (!box) return;
    box.textContent = "";
    var defs = [];
    if (list.some(function (v) { return v.minimum != null && minimumValue(v) === 0 && String(v.minimum).trim() !== ""; })) defs.push(["zero", "Đơn 0đ"]);
    var seen = {};
    list.forEach(function (v) { if (v.tag && !seen[v.tag]) { seen[v.tag] = true; defs.push(["tag:" + v.tag, String(v.tag)]); } });
    box.hidden = defs.length === 0;
    defs.forEach(function (d) {
      var b = el("button", "chip" + (activeChip === d[0] ? " on" : ""), d[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", String(activeChip === d[0]));
      b.addEventListener("click", function () {
        activeChip = activeChip === d[0] ? null : d[0];
        buildChips();
        render(searchInput.value);
      });
      box.appendChild(b);
    });
  }
  buildChips();

  /* ---------- "Có gì mới kể từ lần ghé trước" ---------- */
  (function sinceLastVisit() {
    var prev = null;
    try {
      var ss = sessionStorage.getItem("dn_prev");
      if (ss !== null) {
        prev = ss === "none" ? null : Number(ss);
      } else {
        var ls = localStorage.getItem("dealnest_lastvisit");
        prev = ls ? Number(ls) : null;
        sessionStorage.setItem("dn_prev", prev == null ? "none" : String(prev));
        localStorage.setItem("dealnest_lastvisit", String(Date.now()));
      }
    } catch (e) {}
    if (!prev || isNaN(prev)) return;
    var nv = list.filter(function (v) { var t = Date.parse(v.added); return !isNaN(t) && t > prev && !isExpiredV(v); }).length;
    var nn = Array.isArray(settings.news) ? settings.news.filter(function (n) { var t = n && Date.parse(n.at); return t && t > prev; }).length : 0;
    if (!nv && !nn) return;
    var parts = [];
    if (nv) parts.push(nv + " voucher mới");
    if (nn) parts.push(nn + " tin mới");
    var when = new Date(prev).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    document.getElementById("sinceText").textContent = "✨ Kể từ lần ghé trước (" + when + ") có " + parts.join(" và ") + ".";
    var go = document.getElementById("sinceGo");
    go.hidden = !nv;
    go.addEventListener("click", function () {
      sortMode = "new";
      var sel = document.getElementById("sortSel");
      if (sel) sel.value = "new";
      render(searchInput.value);
    });
    document.getElementById("sinceX").addEventListener("click", function () { document.getElementById("sinceBox").hidden = true; });
    document.getElementById("sinceBox").hidden = false;
  })();

  var sortSel = document.getElementById("sortSel");
  if (sortSel) sortSel.addEventListener("change", function () { sortMode = sortSel.value; render(searchInput.value); });

  var VIEW_KEY = "dealnest_view";
  function setView(mode) {
    document.documentElement.classList.toggle("compact", mode === "list");
    var c = document.getElementById("viewCards"), l = document.getElementById("viewList");
    if (c) { c.classList.toggle("on", mode !== "list"); c.setAttribute("aria-pressed", String(mode !== "list")); }
    if (l) { l.classList.toggle("on", mode === "list"); l.setAttribute("aria-pressed", String(mode === "list")); }
    try { localStorage.setItem(VIEW_KEY, mode); } catch (e) {}
  }
  var vc = document.getElementById("viewCards"), vl = document.getElementById("viewList");
  if (vc) vc.addEventListener("click", function () { setView("cards"); });
  if (vl) vl.addEventListener("click", function () { setView("list"); });
  try { if (localStorage.getItem(VIEW_KEY) === "list") setView("list"); } catch (e) {}

  function setTab(name) {
    activeTab = name;
    if (tabsEl) {
      tabsEl.querySelectorAll(".tab").forEach(function (b) {
        var on = b.getAttribute("data-tab") === name;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    render(searchInput.value);
  }
  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".tab") : null;
      if (b) setTab(b.getAttribute("data-tab"));
    });
  }

  render("");
  document.querySelectorAll(".section .reveal").forEach(watch);

  searchInput.addEventListener("input", function () {
    clearBtn.hidden = !searchInput.value;
    render(searchInput.value);
  });
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    clearBtn.hidden = true;
    render("");
    searchInput.focus();
  });
  document.getElementById("searchForm").addEventListener("submit", function (e) { e.preventDefault(); });

  /* ---------- Site name ---------- */
  if (typeof SITE_NAME === "string" && SITE_NAME) {
    document.getElementById("brandName").textContent = SITE_NAME;
    document.getElementById("footName").textContent = SITE_NAME;
    document.title = SITE_NAME + " — Khám phá ưu đãi tốt nhất";
  }
  document.getElementById("year").textContent =
    "© " + new Date().getFullYear() + " " + (typeof SITE_NAME === "string" ? SITE_NAME : "") + ". Bảo lưu mọi quyền.";

  /* ---------- Navigation ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");
  menuBtn.addEventListener("click", function () {
    var open = navLinks.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  });
  document.querySelectorAll("[data-scroll]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      if (target.hidden && activeTab !== "all") setTab("all");
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
})();
