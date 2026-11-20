(function () {
  "use strict";

  /* =====================================================================
     TRANG QUẢN TRỊ
     - Khóa GitHub (token) được mã hóa AES-GCM bằng khóa sinh từ "mật khẩu + mã PIN"
       (PBKDF2, 600.000 vòng) rồi mới lưu trong trình duyệt này. Không bao giờ lưu dạng thô.
     - Khi lưu, trang gọi GitHub API để cập nhật file vouchers-data.js trong kho của bạn.
       GitHub Pages sẽ tự đăng lại web sau khoảng 1 đến 2 phút.
     ===================================================================== */

  var DATA_PATH = "vouchers-data.js";
  var CFG_KEY = "dealnest_admin_v1";
  var FAIL_KEY = "dealnest_admin_fail_v1";
  var IDLE_MS = 15 * 60 * 1000;
  var ITERATIONS = 600000;
  var MAX_FAILS = 5;
  var LOCK_MS = 5 * 60 * 1000;
  var KEY_ORDER = ["platform", "title", "discount", "minimum", "maximum", "expires", "tag", "link", "featured", "used", "image"];
  var PLATFORM_NAME = { shopee: "Shopee", tiktok: "TikTok Shop" };

  var state = { token: null, cfg: null, header: "", list: null, settings: null, orig: "", sha: null, editing: -1, idleTimer: null, busy: false };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function show(name) {
    ["setup", "lock", "panel"].forEach(function (n) { $("screen-" + n).hidden = n !== name; });
  }
  function setMsg(node, text) {
    node.textContent = text || "";
    node.hidden = !text;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- Lưu trữ trong trình duyệt ---------- */
  function storeSet(key, value) {
    try {
      if (value == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }
  function storeGet(key) {
    try {
      var s = localStorage.getItem(key);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  /* ---------- Mã hóa ---------- */
  var enc = new TextEncoder();
  var dec = new TextDecoder();
  function toB64(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  function fromB64(str) {
    var s = atob(str), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  async function deriveKey(password, pin, salt) {
    var base = await crypto.subtle.importKey("raw", enc.encode(password + "\u0000" + pin), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: ITERATIONS, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async function sealToken(token, password, pin) {
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var key = await deriveKey(password, pin, salt);
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, enc.encode(token));
    return { salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
  }
  async function openToken(cfg, password, pin) {
    var key = await deriveKey(password, pin, fromB64(cfg.salt));
    var pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(cfg.iv) }, key, fromB64(cfg.ct));
    return dec.decode(pt);
  }

  /* ---------- GitHub ---------- */
  function GhError(status, message) {
    this.status = status;
    this.message = message;
  }
  async function gh(token, cfg, method, path, body) {
    var url = "https://api.github.com/repos/" + encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) + path;
    var res;
    try {
      res = await fetch(url, {
        method: method,
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + token,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new GhError(0, "Không kết nối được tới GitHub. Hãy kiểm tra mạng rồi thử lại.");
    }
    var data = null;
    try { data = await res.json(); } catch (e) { /* không có nội dung */ }
    if (!res.ok) throw new GhError(res.status, (data && data.message) || "Lỗi GitHub " + res.status);
    return data;
  }
  function explain(e) {
    if (!(e instanceof GhError)) return "Đã xảy ra lỗi: " + (e && e.message ? e.message : e);
    if (e.status === 0) return e.message;
    if (e.status === 401) return "Khóa GitHub không đúng hoặc đã hết hạn. Hãy tạo khóa mới và cài đặt lại.";
    if (e.status === 403) return "GitHub từ chối yêu cầu (khóa thiếu quyền hoặc bị giới hạn tạm thời). Kiểm tra khóa có quyền Contents: Read and write.";
    if (e.status === 404) return "Không tìm thấy kho hoặc file trên GitHub. Kiểm tra lại tên tài khoản, tên kho, nhánh, và khóa đã được cấp quyền cho kho này.";
    if (e.status === 409 || e.status === 422) return "CONFLICT";
    return e.message;
  }
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function normSettings(o) {
    var s = o && typeof o === "object" && !Array.isArray(o) ? Object.assign({}, o) : {};
    var b = s.banner && typeof s.banner === "object" ? s.banner : {};
    s.banner = {
      enabled: b.enabled === true,
      text: typeof b.text === "string" ? b.text : "",
      link: typeof b.link === "string" ? b.link : ""
    };
    var c = s.contact && typeof s.contact === "object" ? s.contact : {};
    s.contact = { tiktok: typeof c.tiktok === "string" ? c.tiktok : "", threads: typeof c.threads === "string" ? c.threads : "" };
    var an = s.analytics && typeof s.analytics === "object" ? s.analytics : {};
    s.analytics = { goatcounter: typeof an.goatcounter === "string" ? an.goatcounter : "" };
    s.stash = (Array.isArray(s.stash) ? s.stash : []).filter(function (x) { return x && typeof x === "object" && typeof x.link === "string"; })
      .map(function (x) { return { id: String(x.id || uid()), link: x.link, code: typeof x.code === "string" ? x.code : "", note: typeof x.note === "string" ? x.note : "", used: x.used === true }; });
    s.schedule = (Array.isArray(s.schedule) ? s.schedule : []).filter(function (x) { return x && typeof x.link === "string" && typeof x.voucherId === "string" && !isNaN(Date.parse(x.at)); })
      .map(function (x) { return { id: String(x.id || uid()), voucherId: x.voucherId, at: x.at, link: x.link }; });
    s.reportUrl = typeof s.reportUrl === "string" ? s.reportUrl : "";
    s.updated = typeof s.updated === "string" ? s.updated : "";
    return s;
  }
  function parseData(text) {
    var settings = {};
    var si = text.indexOf("\nconst SITE_SETTINGS");
    si = si >= 0 ? si + 1 : (text.indexOf("const SITE_SETTINGS") === 0 ? 0 : -1);
    var vi = text.lastIndexOf("\nconst VOUCHERS");
    vi = vi >= 0 ? vi + 1 : text.indexOf("const VOUCHERS");
    if (vi < 0) throw new Error("File " + DATA_PATH + " không đúng định dạng.");
    var headEnd = vi;
    if (si >= 0) {
      if (si > vi) throw new Error("File " + DATA_PATH + " không đúng định dạng.");
      headEnd = si;
      var sb = text.indexOf("{", text.indexOf("=", si));
      var se = text.lastIndexOf("}", vi);
      try { settings = JSON.parse(text.slice(sb, se + 1)); }
      catch (e) { throw new Error("Phần SITE_SETTINGS trong " + DATA_PATH + " bị viết sai định dạng. Hãy sửa lại hoặc khôi phục bản cũ trên GitHub."); }
    }
    var i = vi;
    var start = i < 0 ? -1 : text.indexOf("[", text.indexOf("=", i));
    var end = text.lastIndexOf("]");
    if (i < 0 || start < 0 || end < start) throw new Error("File " + DATA_PATH + " không đúng định dạng.");
    var arr;
    try { arr = JSON.parse(text.slice(start, end + 1)); }
    catch (e) { throw new Error("File " + DATA_PATH + " có chỗ viết sai định dạng (có thể do sửa tay). Hãy sửa lại hoặc khôi phục bản cũ trên GitHub."); }
    if (!Array.isArray(arr)) throw new Error("File " + DATA_PATH + " không đúng định dạng.");
    return { header: text.slice(0, headEnd), list: arr, settings: normSettings(settings) };
  }
  async function fetchData() {
    var f = await gh(state.token, state.cfg, "GET",
      "/contents/" + DATA_PATH + "?ref=" + encodeURIComponent(state.cfg.branch) + "&_=" + Date.now());
    var text = dec.decode(fromB64(String(f.content).replace(/\s/g, "")));
    var parsed = parseData(text);
    state.header = parsed.header;
    state.list = parsed.list.filter(function (v) { return v && typeof v === "object"; });
    state.settings = parsed.settings;
    state.orig = snapshot();
    state.sha = f.sha;
  }
  function snapshot() { return JSON.stringify({ l: state.list, s: state.settings }); }
  function serialize() {
    return state.header + "const SITE_SETTINGS = " + JSON.stringify(state.settings, null, 2) + ";\n" +
      "const VOUCHERS = " + JSON.stringify(state.list, null, 2) + ";\n";
  }

  /* ---------- Kiểm tra dữ liệu ---------- */
  function safeUrl(raw) {
    if (typeof raw !== "string") return null;
    var v = raw.trim();
    if (!v) return null;
    try {
      var u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:" ? v : null;
    } catch (e) { return null; }
  }
  function isDirty() { return snapshot() !== state.orig; }

  /* ---------- Màn hình khóa / mở khóa ---------- */
  function lockState() { return storeGet(FAIL_KEY) || { n: 0, until: 0 }; }

  function showLockScreen() {
    clearTimeout(state.idleTimer);
    state.token = null;
    $("lPass").value = "";
    $("lPin").value = "";
    setMsg($("lockError"), "");
    show("lock");
    refreshLockout();
    setTimeout(function () { $("lPass").focus(); }, 0);
  }
  var lockTick = null;
  function refreshLockout() {
    clearInterval(lockTick);
    var ls = lockState();
    var btn = $("lockBtn");
    function tick() {
      var left = ls.until - Date.now();
      if (left > 0) {
        btn.disabled = true;
        var m = Math.floor(left / 60000), s = Math.ceil((left % 60000) / 1000);
        setMsg($("lockError"), "Nhập sai quá nhiều lần. Thử lại sau " + m + " phút " + (s < 10 ? "0" : "") + (s === 60 ? 59 : s) + " giây.");
      } else {
        btn.disabled = false;
        if (ls.until) { storeSet(FAIL_KEY, { n: 0, until: 0 }); ls = { n: 0, until: 0 }; setMsg($("lockError"), ""); }
        clearInterval(lockTick);
      }
    }
    if (ls.until > Date.now()) { tick(); lockTick = setInterval(tick, 1000); } else { btn.disabled = false; }
  }

  $("lockForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = $("lockBtn");
    if (btn.disabled) return;
    var cfg = storeGet(CFG_KEY);
    if (!cfg) { initialScreen(); return; }
    btn.disabled = true;
    setMsg($("lockError"), "");
    var token = null;
    try {
      token = await openToken(cfg, $("lPass").value, $("lPin").value.trim());
    } catch (err) {
      await sleep(800);
      var ls = lockState();
      ls.n = (ls.n || 0) + 1;
      if (ls.n >= MAX_FAILS) { ls = { n: 0, until: Date.now() + LOCK_MS }; }
      storeSet(FAIL_KEY, ls);
      if (ls.until > Date.now()) { refreshLockout(); }
      else {
        btn.disabled = false;
        setMsg($("lockError"), "Sai mật khẩu hoặc mã PIN. Bạn còn " + (MAX_FAILS - ls.n) + " lần thử.");
      }
      return;
    }
    storeSet(FAIL_KEY, { n: 0, until: 0 });
    state.token = token;
    state.cfg = cfg;
    btn.disabled = false;
    await enterPanel();
  });

  $("resetDevice").addEventListener("click", function () {
    if (!confirm("Xóa cài đặt quản trị khỏi trình duyệt này? Bạn sẽ cần nhập lại khóa GitHub và đặt mật khẩu, mã PIN mới. Web và voucher không bị ảnh hưởng.")) return;
    storeSet(CFG_KEY, null);
    storeSet(FAIL_KEY, null);
    state.token = null; state.list = null; state.settings = null; state.orig = "";
    initialScreen();
  });

  /* ---------- Cài đặt lần đầu ---------- */
  function initialScreen() {
    var cfg = storeGet(CFG_KEY);
    if (cfg) { showLockScreen(); return; }
    var host = location.hostname || "";
    if (/\.github\.io$/i.test(host)) {
      $("sOwner").value = host.split(".")[0];
      var seg = location.pathname.split("/").filter(Boolean)[0];
      $("sRepo").value = seg && !/\.html?$/i.test(seg) ? seg : host;
    }
    show("setup");
  }

  $("setupForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = $("setupError");
    setMsg(err, "");
    var owner = $("sOwner").value.trim(), repo = $("sRepo").value.trim(), branch = $("sBranch").value.trim() || "main";
    var token = $("sToken").value.trim(), pass = $("sPass").value, pin = $("sPin").value.trim();
    if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) return setMsg(err, "Tên tài khoản hoặc tên kho không hợp lệ (chỉ gồm chữ, số, dấu chấm, gạch).");
    if (!/^[A-Za-z0-9._\/-]+$/.test(branch)) return setMsg(err, "Tên nhánh không hợp lệ.");
    if (!token) return setMsg(err, "Hãy dán khóa GitHub vào.");
    if (pass.length < 10) return setMsg(err, "Mật khẩu cần có ít nhất 10 ký tự.");
    if (pass !== $("sPass2").value) return setMsg(err, "Hai ô mật khẩu chưa giống nhau.");
    if (!/^\d{6,8}$/.test(pin)) return setMsg(err, "Mã PIN gồm 6 đến 8 chữ số.");
    if (pin !== $("sPin2").value.trim()) return setMsg(err, "Hai ô mã PIN chưa giống nhau.");

    var btn = $("setupBtn");
    btn.disabled = true;
    btn.textContent = "Đang kiểm tra…";
    try {
      var cfg = { owner: owner, repo: repo, branch: branch };
      var info = await gh(token, cfg, "GET", "");
      if (!info.permissions || !info.permissions.push) {
        throw new Error("Khóa này chưa có quyền ghi vào kho. Hãy cấp quyền Contents: Read and write.");
      }
      await gh(token, cfg, "GET", "/contents/" + DATA_PATH + "?ref=" + encodeURIComponent(branch));
      var sealed = await sealToken(token, pass, pin);
      var saved = storeSet(CFG_KEY, { v: 1, owner: owner, repo: repo, branch: branch, salt: sealed.salt, iv: sealed.iv, ct: sealed.ct });
      if (!saved) throw new Error("Trình duyệt đang chặn lưu dữ liệu (có thể do chế độ riêng tư).");
      state.token = token;
      state.cfg = cfg;
      $("setupForm").reset();
      await enterPanel();
    } catch (ex) {
      var m = explain(ex);
      setMsg(err, m === "CONFLICT" ? "GitHub báo xung đột, hãy thử lại." : m);
    } finally {
      btn.disabled = false;
      btn.textContent = "Kiểm tra & lưu";
    }
  });

  /* ---------- Bảng quản lý ---------- */
  async function enterPanel() {
    show("panel");
    startIdle();
    setMsg($("panelError"), "");
    if (state.list && isDirty()) { render(); return; } // giữ thay đổi chưa lưu sau khi mở khóa lại
    $("loading").hidden = false;
    $("list").textContent = "";
    try {
      await fetchData();
      $("loading").hidden = true;
      render();
    } catch (ex) {
      $("loading").hidden = true;
      var m = explain(ex);
      setMsg($("panelError"), m === "CONFLICT" ? "Không đọc được dữ liệu." : m);
    }
  }

  function startIdle() {
    clearTimeout(state.idleTimer);
    state.idleTimer = setTimeout(function () {
      if ($("formDlg").open) $("formDlg").close();
      if ($("bulkDlg").open) $("bulkDlg").close();
      showLockScreen();
    }, IDLE_MS);
  }
  ["click", "keydown", "touchstart", "mousemove", "scroll"].forEach(function (ev) {
    document.addEventListener(ev, function () { if (state.token) startIdle(); }, { passive: true });
  });

  $("lockNow").addEventListener("click", function () {
    if ($("formDlg").open) $("formDlg").close();
    if ($("bulkDlg").open) $("bulkDlg").close();
    showLockScreen();
  });

  window.addEventListener("beforeunload", function (e) {
    if (state.list && isDirty()) { e.preventDefault(); e.returnValue = ""; }
  });

  function updateToolbar() {
    var dirty = isDirty();
    $("dirtyNote").hidden = !dirty;
    $("saveBtn").disabled = !dirty || state.busy;
    $("discardBtn").disabled = !dirty || state.busy;
  }

  function render() {
    renderSettings();
    renderStash();
    var ul = $("list");
    ul.textContent = "";
    if (!state.list.length) ul.appendChild(el("li", "muted center pad", "Chưa có voucher nào. Bấm “+ Thêm voucher” để tạo."));

    state.list.forEach(function (v, i) {
      var li = el("li", "row");

      var grip = el("span", "grip", "⠿");
      grip.title = "Kéo để đổi thứ tự (trên điện thoại hãy dùng nút ↑ ↓)";
      grip.setAttribute("aria-hidden", "true");
      grip.draggable = true;
      grip.addEventListener("dragstart", function (e) {
        state.dragFrom = i;
        li.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(i));
        try { e.dataTransfer.setDragImage(li, 12, 12); } catch (err) {}
      });
      grip.addEventListener("dragend", function () { li.classList.remove("dragging"); state.dragFrom = null; });
      li.addEventListener("dragover", function (e) { if (state.dragFrom != null) { e.preventDefault(); li.classList.add("over"); } });
      li.addEventListener("dragleave", function () { li.classList.remove("over"); });
      li.addEventListener("drop", function (e) {
        e.preventDefault();
        li.classList.remove("over");
        var from = state.dragFrom;
        state.dragFrom = null;
        if (from == null || from === i) return;
        var item = state.list.splice(from, 1)[0];
        state.list.splice(i, 0, item);
        render();
      });

      var head = el("div", "row-head");
      head.appendChild(grip);
      head.appendChild(el("span", "pill " + (v.platform === "tiktok" ? "tiktok" : "shopee"), PLATFORM_NAME[v.platform] || "?"));
      head.appendChild(el("span", "row-title", String(v.title || "(chưa có tên)")));
      if (v.tag) head.appendChild(el("span", "pill vip", String(v.tag)));
      if (v.featured) head.appendChild(el("span", "pill feat", "Nổi bật"));
      li.appendChild(head);

      var sub = [v.discount, v.minimum ? "đơn từ " + v.minimum : "", v.maximum ? "tối đa " + v.maximum : ""].filter(Boolean).join(" · ");
      li.appendChild(el("div", "row-sub", sub));

      var linkBox = el("div", "row-link");
      var lab = el("label", null, "Link nhận voucher");
      var id = "lk" + i;
      lab.setAttribute("for", id);
      var inp = document.createElement("input");
      inp.type = "url";
      inp.id = id;
      inp.inputMode = "url";
      inp.placeholder = "https://";
      inp.value = v.link || "";
      inp.autocomplete = "off";
      var hint = el("p", "error");
      hint.hidden = true;
      function check() {
        var val = inp.value.trim();
        var bad = val !== "" && !safeUrl(val);
        inp.classList.toggle("invalid", bad);
        hint.textContent = bad ? "Link phải bắt đầu bằng https:// hoặc http://" : "";
        hint.hidden = !bad;
        return !bad;
      }
      inp.addEventListener("input", function () {
        var val = inp.value.trim();
        if (val) v.link = val; else delete v.link;
        check();
        updateToolbar();
      });
      linkBox.appendChild(lab);
      linkBox.appendChild(inp);
      linkBox.appendChild(hint);
      li.appendChild(linkBox);

      var acts = el("div", "row-actions");
      function btn(label, cls, fn, aria) {
        var b = el("button", "btn btn-sm " + cls, label);
        b.type = "button";
        if (aria) b.setAttribute("aria-label", aria);
        b.addEventListener("click", fn);
        acts.appendChild(b);
        return b;
      }
      btn("Sửa chi tiết", "btn-ghost", function () { openForm(i); });
      btn(v.featured ? "★ Bỏ nổi bật" : "☆ Đặt nổi bật", "btn-ghost", function () {
        if (v.featured) delete v.featured; else v.featured = true;
        render();
      });
      btn("Nhân bản", "btn-ghost", function () {
        var copy = JSON.parse(JSON.stringify(v));
        delete copy.id;
        copy.added = new Date().toISOString();
        state.list.splice(i + 1, 0, copy);
        render();
      });
      var up = btn("↑", "btn-ghost", function () { move(i, -1); }, "Chuyển lên");
      var down = btn("↓", "btn-ghost", function () { move(i, 1); }, "Chuyển xuống");
      up.disabled = i === 0;
      down.disabled = i === state.list.length - 1;
      var del = btn("Xóa", "btn-danger push", function () {
        if (confirm("Xóa voucher “" + (v.title || "") + "”?\n(Chỉ được xóa thật khi bạn bấm “Lưu & đăng lên web”.)")) {
          state.list.splice(i, 1);
          render();
        }
      });
      del.setAttribute("aria-label", "Xóa voucher " + (v.title || ""));
      li.appendChild(acts);

      ul.appendChild(li);
      check();
    });
    updateToolbar();
  }

  function move(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= state.list.length) return;
    var t = state.list[i];
    state.list[i] = state.list[j];
    state.list[j] = t;
    render();
  }

  /* ---------- Form thêm / sửa ---------- */
  var dlg = $("formDlg");
  function fv(id) { return $(id).value.trim(); }

  function openForm(index) {
    state.editing = index;
    var v = index >= 0 ? state.list[index] : {};
    $("formTitle").textContent = index >= 0 ? "Sửa voucher" : "Thêm voucher";
    $("fPlatform").value = v.platform === "tiktok" ? "tiktok" : "shopee";
    $("fDiscount").value = v.discount || "";
    $("fTitle").value = v.title || "";
    $("fLink").value = v.link || "";
    $("fMin").value = v.minimum || "";
    $("fMax").value = v.maximum || "";
    var mode = "none";
    if (typeof v.expires === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.expires)) mode = "fixed";
    $("fExpMode").value = mode;
    $("fExpDate").value = mode === "fixed" ? v.expires : "";
    $("fExpWrap").hidden = mode !== "fixed";
    $("fTag").value = v.tag || "";
    $("fUsed").value = typeof v.used === "number" ? String(v.used) : "";
    $("fImage").value = v.image || "";
    $("fFeatured").checked = !!v.featured;
    setMsg($("formError"), "");
    ["fLink", "fTitle", "fDiscount"].forEach(function (id) { $(id).classList.remove("invalid"); });
    dlg.showModal();
    $("fTitle").focus();
  }

  $("fExpMode").addEventListener("change", function () { $("fExpWrap").hidden = $("fExpMode").value !== "fixed"; });
  $("addBtn").addEventListener("click", function () { if (state.list) openForm(-1); });
  $("formCancel").addEventListener("click", function () { dlg.close(); });

  $("vForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var fail = function (id, msg) {
      $(id).classList.add("invalid");
      setMsg($("formError"), msg);
      $(id).focus();
    };
    ["fLink", "fTitle", "fDiscount"].forEach(function (id) { $(id).classList.remove("invalid"); });

    var title = fv("fTitle"), discount = fv("fDiscount"), link = fv("fLink"), image = fv("fImage");
    if (!title) return fail("fTitle", "Hãy nhập tên voucher.");
    if (title.length > 200) return fail("fTitle", "Tên voucher tối đa 200 ký tự.");
    if (!discount) return fail("fDiscount", "Hãy nhập mức giảm (ví dụ: Giảm 50K).");
    if (link && !safeUrl(link)) return fail("fLink", "Link phải bắt đầu bằng https:// hoặc http://");
    if (image && !/^(images\/[\w .\-\/]+|https?:\/\/\S+)$/i.test(image)) return fail("fImage", "Ảnh phải là đường dẫn trong thư mục images/ hoặc một link https://");
    var mode = $("fExpMode").value, expires = null;
    if (mode === "fixed") {
      var d = $("fExpDate").value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return fail("fExpDate", "Hãy chọn ngày hết hạn.");
      expires = d;
    }
    var usedRaw = fv("fUsed"), used = null;
    if (usedRaw !== "") {
      used = Number(usedRaw);
      if (!Number.isInteger(used) || used < 0 || used > 100) return fail("fUsed", "% đã dùng phải là số nguyên từ 0 đến 100.");
    }

    var base = state.editing >= 0 ? state.list[state.editing] : {};
    var next = {
      platform: $("fPlatform").value,
      title: title,
      discount: discount
    };
    if (fv("fMin")) next.minimum = fv("fMin");
    if (fv("fMax")) next.maximum = fv("fMax");
    if (expires) next.expires = expires;
    if (fv("fTag")) next.tag = fv("fTag");
    if (link) next.link = link;
    if ($("fFeatured").checked) next.featured = true;
    if (used !== null) next.used = used;
    if (image) next.image = image;
    Object.keys(base).forEach(function (k) { if (KEY_ORDER.indexOf(k) < 0) next[k] = base[k]; }); // giữ trường lạ

    if (state.editing >= 0) state.list[state.editing] = next;
    else { next.added = new Date().toISOString(); state.list.unshift(next); }
    dlg.close();
    render();
  });

  /* ---------- Kho lưu & lịch đổi link ---------- */
  function tail(url) { return String(url).replace(/^https?:\/\//, "").slice(-26); }
  function voucherLabel(v) {
    return (PLATFORM_NAME[v.platform] || "?") + " · " + (v.discount || "") + (v.minimum ? " · đơn từ " + v.minimum : "") + " · " + (v.link ? tail(v.link) : "chưa có link");
  }
  function fmtTime(iso) {
    return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function voucherSelect() {
    var sel = document.createElement("select");
    sel.setAttribute("aria-label", "Chọn voucher");
    state.list.forEach(function (v, i) {
      var o = document.createElement("option");
      o.value = String(i);
      o.textContent = voucherLabel(v);
      sel.appendChild(o);
    });
    return sel;
  }
  function stashFail(msg) { setMsg($("stashError"), msg); }
  function renderStash() {
    var st = state.settings;
    $("stashBox").hidden = false;
    var ul = $("stashList");
    ul.textContent = "";
    if (!st.stash.length) ul.appendChild(el("li", "muted tiny", "Kho đang trống."));
    st.stash.forEach(function (it, idx) {
      var li = el("li", "stash-item" + (it.used ? " used" : ""));
      var top = el("div", "stash-top");
      top.appendChild(el("b", null, it.note || "(không ghi chú)"));
      if (it.code) top.appendChild(el("span", "pill", "Mã: " + it.code));
      if (it.used) top.appendChild(el("span", "pill", "Đã dùng"));
      li.appendChild(top);
      li.appendChild(el("div", "stash-link", it.link));
      var acts = el("div", "stash-acts");
      if (state.list.length) {
        var sel = voucherSelect();
        acts.appendChild(sel);
        var now = el("button", "btn btn-ghost btn-sm", "Gán ngay");
        now.type = "button";
        now.addEventListener("click", function () {
          if (!safeUrl(it.link)) return stashFail("Link trong kho không hợp lệ.");
          state.list[Number(sel.value)].link = it.link;
          it.used = true;
          stashFail("");
          render();
        });
        acts.appendChild(now);
        var when = document.createElement("input");
        when.type = "datetime-local";
        when.setAttribute("aria-label", "Giờ đổi link");
        acts.appendChild(when);
        var sch = el("button", "btn btn-ghost btn-sm", "Hẹn giờ");
        sch.type = "button";
        sch.addEventListener("click", function () {
          if (!safeUrl(it.link)) return stashFail("Link trong kho không hợp lệ.");
          if (!when.value) return stashFail("Hãy chọn giờ cần đổi link.");
          var ts = new Date(when.value);
          if (isNaN(ts.getTime())) return stashFail("Giờ không hợp lệ.");
          var v = state.list[Number(sel.value)];
          if (!v.id) v.id = uid();
          st.schedule.push({ id: uid(), voucherId: v.id, at: ts.toISOString(), link: it.link });
          it.used = true;
          stashFail("");
          render();
        });
        acts.appendChild(sch);
      }
      var del = el("button", "btn btn-danger btn-sm", "Xóa");
      del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("Xóa mục này khỏi kho?")) return;
        st.stash.splice(idx, 1);
        render();
      });
      acts.appendChild(del);
      li.appendChild(acts);
      ul.appendChild(li);
    });

    var sl = $("schedList");
    sl.textContent = "";
    var items = st.schedule.slice().sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
    if (!items.length) sl.appendChild(el("li", "muted tiny", "Chưa có lịch nào."));
    items.forEach(function (e) {
      var v = state.list.filter(function (x) { return x.id === e.voucherId; })[0];
      var li = el("li", "stash-item");
      var done = Date.parse(e.at) <= Date.now();
      var top = el("div", "stash-top");
      top.appendChild(el("b", null, fmtTime(e.at)));
      top.appendChild(el("span", "pill " + (done ? "feat" : ""), done ? "Đã đến giờ" : "Chờ"));
      top.appendChild(el("span", null, v ? voucherLabel(v) : "(voucher đã bị xóa)"));
      li.appendChild(top);
      li.appendChild(el("div", "stash-link", "→ " + e.link));
      var acts = el("div", "stash-acts");
      var del = el("button", "btn btn-danger btn-sm", "Hủy lịch");
      del.type = "button";
      del.addEventListener("click", function () {
        st.schedule = st.schedule.filter(function (x) { return x.id !== e.id; });
        render();
      });
      acts.appendChild(del);
      li.appendChild(acts);
      sl.appendChild(li);
    });
  }
  $("kAdd").addEventListener("click", function () {
    if (!state.settings) return;
    var link = $("kLink").value.trim(), code = $("kCode").value.trim(), note = $("kNote").value.trim();
    if (!link && !code) return stashFail("Hãy nhập link hoặc mã.");
    if (link && !safeUrl(link)) return stashFail("Link phải bắt đầu bằng https:// hoặc http://");
    if (!link) return stashFail("Kho này cần có link để gán vào voucher. Hãy nhập thêm link.");
    if (state.settings.stash.length >= 200) return stashFail("Kho đã đầy (tối đa 200 mục).");
    state.settings.stash.unshift({ id: uid(), link: link, code: code, note: note, used: false });
    $("kLink").value = ""; $("kCode").value = ""; $("kNote").value = "";
    stashFail("");
    render();
  });
  $("schedClean").addEventListener("click", function () {
    var st = state.settings, now = Date.now(), n = 0;
    st.schedule.slice().sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); }).forEach(function (e) {
      if (Date.parse(e.at) > now) return;
      var v = state.list.filter(function (x) { return x.id === e.voucherId; })[0];
      if (v && safeUrl(e.link)) { v.link = e.link; n++; }
    });
    st.schedule = st.schedule.filter(function (e) { return Date.parse(e.at) > now; });
    setMsg($("panelMsg"), n ? "Đã đưa " + n + " lịch đã chạy vào danh sách voucher. Bấm Lưu để đăng lên web." : "Chưa có lịch nào đã đến giờ.");
    render();
  });

  /* ---------- Thêm nhiều link ---------- */
  var bulkDlg = $("bulkDlg");
  function parseBulk() {
    var lines = $("bLines").value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var platform = $("bPlatform").value;
    var defDiscount = $("bDiscount").value.trim(), defMin = $("bMin").value.trim();
    var title = $("bTitle").value.trim() || (platform === "shopee" ? "Voucher Shopee" : "Voucher TikTok Shop");
    var seen = {};
    (state.list || []).forEach(function (v) { if (typeof v.link === "string") seen[v.link] = true; });
    var out = { items: [], dup: 0, bad: [], tooMany: lines.length > 50 };
    lines.slice(0, 50).forEach(function (line, i) {
      var parts = line.split("|").map(function (p) { return p.trim(); });
      var link = parts[0], discount = parts[1] || defDiscount, minimum = parts[2] || defMin;
      if (!safeUrl(link)) { out.bad.push("dòng " + (i + 1) + ": link phải bắt đầu bằng https:// hoặc http://"); return; }
      if (seen[link]) { out.dup++; return; }
      if (!discount) { out.bad.push("dòng " + (i + 1) + ": chưa có mức giảm (điền sau dấu | hoặc ô mặc định)"); return; }
      if (discount.length > 100 || minimum.length > 100) { out.bad.push("dòng " + (i + 1) + ": mức giảm / đơn tối thiểu quá dài"); return; }
      seen[link] = true;
      var v = { platform: platform, title: title, discount: discount };
      if (minimum) v.minimum = minimum;
      v.link = link;
      if ($("bFeatured").checked) v.featured = true;
      out.items.push(v);
    });
    return out;
  }
  function bulkPreview() {
    var r = parseBulk();
    var t = "Sẽ thêm " + r.items.length + " voucher";
    if (r.dup) t += "; bỏ " + r.dup + " dòng trùng link";
    if (r.bad.length) t += "; " + r.bad.length + " dòng lỗi";
    $("bulkInfo").textContent = t + ".";
  }
  ["bLines", "bPlatform", "bTitle", "bDiscount", "bMin", "bFeatured"].forEach(function (id) {
    $(id).addEventListener("input", bulkPreview);
  });
  $("bulkBtn").addEventListener("click", function () {
    if (!state.list) return;
    setMsg($("bulkError"), "");
    bulkPreview();
    bulkDlg.showModal();
    $("bLines").focus();
  });
  $("bulkCancel").addEventListener("click", function () { bulkDlg.close(); });
  $("bulkForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var r = parseBulk();
    if (r.tooMany) return setMsg($("bulkError"), "Tối đa 50 dòng mỗi lần. Hãy chia nhỏ danh sách.");
    if (r.bad.length) return setMsg($("bulkError"), "Cần sửa: " + r.bad.slice(0, 3).join("; ") + (r.bad.length > 3 ? "; …" : ""));
    if (!r.items.length) return setMsg($("bulkError"), "Chưa có voucher nào để thêm.");
    var now = Date.now();
    r.items.forEach(function (v, i) { v.added = new Date(now).toISOString(); });
    // giữ đúng thứ tự dán: dòng đầu nằm trên cùng
    state.list = r.items.concat(state.list);
    $("bLines").value = "";
    bulkDlg.close();
    render();
  });

  /* ---------- Hủy / Lưu ---------- */
  $("discardBtn").addEventListener("click", function () {
    if (!isDirty()) return;
    if (!confirm("Bỏ toàn bộ thay đổi chưa lưu?")) return;
    var o = JSON.parse(state.orig);
    state.list = o.l;
    state.settings = o.s;
    setMsg($("panelMsg"), "");
    render();
  });

  function settingsFail(msg, id) {
    $("settingsBox").open = true;
    setMsg($("settingsError"), msg);
    setMsg($("panelError"), msg);
    if (id) $(id).focus();
  }

  /* ---------- Cài đặt web (banner, biểu mẫu báo mã hết) ---------- */
  function renderSettings() {
    var st = state.settings;
    $("settingsBox").hidden = false;
    $("stBanner").checked = st.banner.enabled;
    $("stBannerText").value = st.banner.text;
    $("stBannerLink").value = st.banner.link;
    $("stReport").value = st.reportUrl;
    $("stGoat").value = st.analytics.goatcounter;
    $("stTiktok").value = st.contact.tiktok;
    $("stThreads").value = st.contact.threads;
  }
  function bindSetting(id, fn) {
    $(id).addEventListener("input", function () {
      if (!state.settings) return;
      fn($(id));
      setMsg($("settingsError"), "");
      updateToolbar();
    });
  }
  bindSetting("stBanner", function (n) { state.settings.banner.enabled = n.checked; });
  bindSetting("stBannerText", function (n) { state.settings.banner.text = n.value; });
  bindSetting("stBannerLink", function (n) { state.settings.banner.link = n.value.trim(); });
  bindSetting("stGoat", function (n) { state.settings.analytics.goatcounter = n.value.trim().toLowerCase(); });
  bindSetting("stTiktok", function (n) { state.settings.contact.tiktok = n.value.trim(); });
  bindSetting("stThreads", function (n) { state.settings.contact.threads = n.value.trim(); });
  bindSetting("stReport", function (n) { state.settings.reportUrl = n.value.trim(); });

  $("saveBtn").addEventListener("click", async function () {
    setMsg($("panelError"), "");
    setMsg($("panelMsg"), "");
    for (var i = 0; i < state.list.length; i++) {
      var v = state.list[i];
      if (v.link && !safeUrl(v.link)) {
        setMsg($("panelError"), "Voucher “" + (v.title || "") + "” có link không hợp lệ. Link phải bắt đầu bằng https:// hoặc http://");
        var bad = $("lk" + i);
        if (bad) bad.focus();
        return;
      }
    }
    var st = state.settings;
    if (st.banner.enabled && !st.banner.text.trim()) { return settingsFail("Bạn đã bật banner nhưng chưa nhập nội dung."); }
    if (st.banner.link.trim() && !safeUrl(st.banner.link)) { return settingsFail("Link của banner phải bắt đầu bằng https:// hoặc http://", "stBannerLink"); }
    if (st.analytics.goatcounter && !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(st.analytics.goatcounter)) { return settingsFail("Mã GoatCounter chỉ gồm chữ thường, số và dấu gạch ngang (3 đến 40 ký tự), không phải cả link.", "stGoat"); }
    if (st.contact.tiktok.trim() && !safeUrl(st.contact.tiktok)) { return settingsFail("Link TikTok phải bắt đầu bằng https:// hoặc http://", "stTiktok"); }
    if (st.contact.threads.trim() && !safeUrl(st.contact.threads)) { return settingsFail("Link Threads phải bắt đầu bằng https:// hoặc http://", "stThreads"); }
    if (st.reportUrl.trim() && !safeUrl(st.reportUrl)) { return settingsFail("Link biểu mẫu “Báo mã hết” phải bắt đầu bằng https:// hoặc http://", "stReport"); }
    if (st.stash.some(function (x) { return !safeUrl(x.link); }) || st.schedule.some(function (x) { return !safeUrl(x.link); })) { return settingsFail("Có link trong kho hoặc lịch không hợp lệ."); }
    st.updated = new Date().toISOString();
    state.busy = true;
    updateToolbar();
    $("saveBtn").textContent = "Đang lưu…";
    try {
      var res = await gh(state.token, state.cfg, "PUT", "/contents/" + DATA_PATH, {
        message: "Cập nhật voucher qua trang admin",
        content: toB64(enc.encode(serialize())),
        sha: state.sha,
        branch: state.cfg.branch
      });
      state.sha = res.content.sha;
      state.orig = snapshot();
      setMsg($("panelMsg"), "Đã lưu thành công. Web công khai sẽ cập nhật sau khoảng 1 đến 2 phút (nhấn Ctrl+F5 để xem bản mới).");
    } catch (ex) {
      var m = explain(ex);
      if (m === "CONFLICT") {
        setMsg($("panelError"), "File voucher trên GitHub vừa bị thay đổi ở nơi khác nên chưa lưu được. Hãy bấm “Hủy thay đổi” rồi tải lại trang, sau đó làm lại.");
      } else {
        setMsg($("panelError"), m);
      }
    } finally {
      state.busy = false;
      $("saveBtn").textContent = "Lưu & đăng lên web";
      updateToolbar();
    }
  });

  /* ---------- Khởi động ---------- */
  if (!window.crypto || !crypto.subtle) {
    document.body.textContent = "Trình duyệt hoặc địa chỉ này không hỗ trợ mã hóa an toàn. Hãy mở trang quản trị bằng địa chỉ https:// của bạn.";
    return;
  }
  initialScreen();
})();
