/* Giao diện sáng/tối: nhớ lựa chọn của người xem, mặc định theo thiết bị. */
(function () {
  "use strict";
  var KEY = "dealnest_theme";
  var theme = null;
  try { theme = localStorage.getItem(KEY); } catch (e) {}
  if (theme !== "dark" && theme !== "light") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("themeBtn");
    if (!btn) return;
    var icon = btn.firstElementChild;
    function paint() {
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      icon.textContent = dark ? "☀️" : "🌙";
      btn.setAttribute("aria-label", dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối");
    }
    paint();
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint();
    });
  });
})();
