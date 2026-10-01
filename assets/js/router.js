/* Preview-only page loader.
   The artifact viewer does not follow links between published pages, so inside the preview
   every local link is fetched and written into this document in place. The real site does
   not load this file; it uses ordinary links. */
(function () {
  "use strict";
  var PAGES = /^(home|journal|interviews|essays|catalogue|about|interview|essay|work|disciplines|how-we-work|contact|letter|404)$/;

  function isLocal(h) { return !!h && /^[a-z0-9-]+\.html(#[A-Za-z0-9_-]*)?$/.test(h); }

  function load(href) {
    var parts = href.split("#"), page = parts[0], anchor = parts[1] || "";
    fetch(page).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (html) {
      window.__vlncGen = (window.__vlncGen || 0) + 1;
      window.__vlncAnchor = anchor;
      try { history.replaceState(null, "", "#" + page.replace(".html", "")); } catch (e) { /* not allowed here */ }
      document.open();
      document.write(html);
      document.close();
    }).catch(function () { window.location.href = href; });
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var h = a.getAttribute("href");
    if (!isLocal(h)) return;
    e.preventDefault();
    var menu = document.getElementById("menu");
    if (menu) menu.hidden = true;
    load(h);
  });

  var anchor = window.__vlncAnchor;
  window.__vlncAnchor = "";
  if (anchor) {
    setTimeout(function () { var el = document.getElementById(anchor); if (el) el.scrollIntoView(); }, 80);
  } else {
    window.scrollTo(0, 0);
  }

  // a deep link such as #journal opens that page on first load
  if (!window.__vlncBooted) {
    window.__vlncBooted = true;
    var h = (location.hash || "").slice(1);
    if (PAGES.test(h) && h !== "home") load(h + ".html");
  }
})();
