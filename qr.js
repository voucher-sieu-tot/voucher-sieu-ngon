/* Bộ tạo mã QR nhỏ gọn (chế độ byte, mức sửa lỗi M, phiên bản 1 đến 10: tối đa khoảng 200 ký tự). */
(function (root) {
  "use strict";
  var EXP = [], LOG = [], i;
  (function () { var x = 1; for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function gmul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function rsGen(n) {
    var g = [1];
    for (var k = 0; k < n; k++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[k]); }
      g = ng;
    }
    return g;
  }
  function rsEnc(data, n) {
    var g = rsGen(n), res = new Array(n).fill(0);
    data.forEach(function (d) {
      var f = d ^ res[0];
      res.shift(); res.push(0);
      for (var k = 0; k < n; k++) res[k] ^= gmul(g[k + 1], f);
    });
    return res;
  }
  var VER = { 1: [10, [[1, 16]]], 2: [16, [[1, 28]]], 3: [26, [[1, 44]]], 4: [18, [[2, 32]]], 5: [24, [[2, 43]]], 6: [16, [[4, 27]]], 7: [18, [[4, 31]]], 8: [22, [[2, 38], [2, 39]]], 9: [22, [[3, 36], [2, 37]]], 10: [26, [[4, 43], [1, 44]]] };
  var ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  function capacity(v) { return VER[v][1].reduce(function (s, b) { return s + b[0] * b[1]; }, 0); }

  function utf8(str) {
    if (typeof TextEncoder !== "undefined") return Array.prototype.slice.call(new TextEncoder().encode(str));
    var s = unescape(encodeURIComponent(str)), out = [];
    for (var k = 0; k < s.length; k++) out.push(s.charCodeAt(k));
    return out;
  }

  function make(text) {
    var bytes = utf8(String(text)), v;
    for (v = 1; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + 8 * bytes.length <= capacity(v) * 8) break;
    if (v > 10) throw new Error("Nội dung quá dài để tạo mã QR.");
    var bits = [];
    function put(val, len) { for (var k = len - 1; k >= 0; k--) bits.push((val >>> k) & 1); }
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var cap = capacity(v) * 8;
    for (var t = 0; t < 4 && bits.length < cap; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    var data = [];
    for (var k = 0; k < bits.length; k += 8) { var by = 0; for (var q = 0; q < 8; q++) by = (by << 1) | bits[k + q]; data.push(by); }
    for (var pad = 0xec; data.length < capacity(v); pad ^= 0xec ^ 0x11) data.push(pad);

    var ecLen = VER[v][0], blocks = [], pos = 0;
    VER[v][1].forEach(function (g) { for (var n = 0; n < g[0]; n++) { var d = data.slice(pos, pos + g[1]); pos += g[1]; blocks.push({ d: d, e: rsEnc(d, ecLen) }); } });
    var all = [], maxD = 0;
    blocks.forEach(function (b) { if (b.d.length > maxD) maxD = b.d.length; });
    for (k = 0; k < maxD; k++) blocks.forEach(function (b) { if (k < b.d.length) all.push(b.d[k]); });
    for (k = 0; k < ecLen; k++) blocks.forEach(function (b) { all.push(b.e[k]); });
    var stream = [];
    all.forEach(function (b) { put2(b); });
    function put2(b) { for (var z = 7; z >= 0; z--) stream.push((b >>> z) & 1); }

    var size = 17 + 4 * v, m = [], fn = [], r, c;
    for (r = 0; r < size; r++) { m.push(new Array(size).fill(0)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, dark) { m[y][x] = dark ? 1 : 0; fn[y][x] = true; }
    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var ap = ALIGN[v], last = ap.length - 1;
    ap.forEach(function (py, a) { ap.forEach(function (px, b) {
      if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) return;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }); });
    function formatBits(mask) {
      var d = mask, rem = d; // mức M = 00
      for (var z = 0; z < 10; z++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      return ((d << 10) | rem) ^ 0x5412;
    }
    function drawFormat(mask) {
      var b = formatBits(mask), z;
      function bit(n) { return ((b >>> n) & 1) !== 0; }
      for (z = 0; z <= 5; z++) setF(8, z, bit(z));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (z = 9; z < 15; z++) setF(14 - z, 8, bit(z));
      for (z = 0; z < 8; z++) setF(size - 1 - z, 8, bit(z));
      for (z = 8; z < 15; z++) setF(8, size - 15 + z, bit(z));
      setF(8, size - 8, true);
    }
    drawFormat(0);
    if (v >= 7) {
      var rem = v;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var vb = (v << 12) | rem;
      for (i = 0; i < 18; i++) { var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + (i % 3), b2 = Math.floor(i / 3); setF(a, b2, bt); setF(b2, a, bt); }
    }
    var idx = 0, up = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var kk = 0; kk < size; kk++) {
        var y = up ? size - 1 - kk : kk;
        for (c = 0; c < 2; c++) { var x = col - c; if (!fn[y][x]) { m[y][x] = idx < stream.length ? stream[idx] : 0; idx++; } }
      }
      up = !up;
    }
    var MASKS = [
      function (y, x) { return (x + y) % 2 === 0; }, function (y) { return y % 2 === 0; }, function (y, x) { return x % 3 === 0; },
      function (y, x) { return (x + y) % 3 === 0; }, function (y, x) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function (y, x) { return (x * y) % 2 + (x * y) % 3 === 0; }, function (y, x) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
      function (y, x) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
    ];
    function applyMask(mask) { for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) if (!fn[yy][xx] && MASKS[mask](yy, xx)) m[yy][xx] ^= 1; }
    function penalty() {
      var p = 0, yy, xx, run, k2;
      function line(get) {
        for (var a = 0; a < size; a++) {
          run = 1;
          for (var b = 1; b < size; b++) {
            if (get(a, b) === get(a, b - 1)) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
          }
          for (b = 0; b + 11 <= size; b++) {
            var s = "";
            for (k2 = 0; k2 < 11; k2++) s += get(a, b + k2);
            if (s === "10111010000" || s === "00001011101") p += 40;
          }
        }
      }
      line(function (a, b) { return m[a][b]; });
      line(function (a, b) { return m[b][a]; });
      for (yy = 0; yy < size - 1; yy++) for (xx = 0; xx < size - 1; xx++) { var s2 = m[yy][xx] + m[yy][xx + 1] + m[yy + 1][xx] + m[yy + 1][xx + 1]; if (s2 === 0 || s2 === 4) p += 3; }
      var dark = 0; for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) dark += m[yy][xx];
      p += 10 * Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5);
      return p;
    }
    var best = 0, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) { applyMask(mk); drawFormat(mk); var pp = penalty(); if (pp < bestP) { bestP = pp; best = mk; } applyMask(mk); }
    applyMask(best); drawFormat(best);
    return { size: size, version: v, get: function (x, y) { return m[y][x] === 1; } };
  }
  root.DealNestQR = { make: make };
  if (typeof module !== "undefined" && module.exports) module.exports = root.DealNestQR;
})(typeof window !== "undefined" ? window : this);
