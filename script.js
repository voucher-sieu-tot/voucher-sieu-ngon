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

  /* ---------- Build one card ---------- */
  function buildCard(v, index) {
    var slot = el("div", "card-slot reveal");
    if (v.featured) slot.className += " float";
    slot.style.transitionDelay = Math.min(index, 5) * 60 + "ms";

    var card = el("article", "card " + v.platform);

    var media = el("div", "media");
    var src = imageFor(v);
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = "Voucher " + (NAMES[v.platform] || "");
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
    }
    card.appendChild(media);

    var body = el("div", "body");

    var top = el("div", "top");
    var badge = el("span", "badge");
    var icon = el("i");
    icon.appendChild(svg(v.platform === "shopee" ? ICON.bag : ICON.note, 15));
    badge.appendChild(icon);
    badge.appendChild(el("span", null, NAMES[v.platform] || ""));
    top.appendChild(badge);
    var tags = el("div", "tags");
    if (v.tag) tags.appendChild(el("span", "tag vip", String(v.tag)));
    if (v.featured) {
      var tag = el("span", "tag");
      tag.appendChild(svg(ICON.star, 11));
      tag.appendChild(document.createTextNode("Nổi bật"));
      tags.appendChild(tag);
    }
    if (tags.childNodes.length) top.appendChild(tags);
    body.appendChild(top);

    var info = el("div");
    info.appendChild(el("h3", null, v.title));
    info.appendChild(el("p", "discount", v.discount));
    if (v.minimum) info.appendChild(el("p", "min", "Cho đơn từ " + v.minimum));
    if (v.maximum) info.appendChild(el("p", "min", "Giảm tối đa " + v.maximum));
    body.appendChild(info);
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
    tiktok: document.getElementById("gridTiktok")
  };
  var sections = {
    featured: document.getElementById("featured"),
    shopee: document.getElementById("shopee"),
    tiktok: document.getElementById("tiktok")
  };
  var emptyBox = document.getElementById("empty");
  var searchInput = document.getElementById("search");
  var clearBtn = document.getElementById("clear");

  var list = [];
  if (typeof VOUCHERS !== "undefined" && Array.isArray(VOUCHERS)) {
    list = VOUCHERS.filter(function (v) {
      return v && (v.platform === "shopee" || v.platform === "tiktok") && v.title && v.discount;
    });
  } else {
    emptyBox.hidden = false;
    emptyBox.textContent = "Không đọc được file vouchers.js. Hãy kiểm tra xem có thiếu dấu phẩy hoặc dấu ngoặc không.";
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

  function render(query) {
    var q = (query || "").trim().toLowerCase();
    var items = q
      ? list.filter(function (v) {
          return [v.title, v.discount, v.minimum || "", v.tag || ""].join(" ").toLowerCase().indexOf(q) !== -1;
        })
      : list;

    var featured = items.filter(function (v) { return v.featured; });
    var shopee = items.filter(function (v) { return v.platform === "shopee"; });
    var tiktok = items.filter(function (v) { return v.platform === "tiktok"; });

    sections.featured.hidden = featured.length === 0;
    sections.shopee.hidden = !!q && shopee.length === 0;
    sections.tiktok.hidden = !!q && tiktok.length === 0;

    fill("featured", featured);
    fill("shopee", shopee, "Chưa có voucher Shopee.");
    fill("tiktok", tiktok, "Chưa có voucher TikTok Shop.");

    if (q && items.length === 0) {
      emptyBox.hidden = false;
      emptyBox.textContent = "Không tìm thấy voucher nào khớp với “" + query.trim() + "”.";
    } else if (list.length > 0 || typeof VOUCHERS !== "undefined") {
      emptyBox.hidden = true;
    }
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
      navLinks.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
})();
