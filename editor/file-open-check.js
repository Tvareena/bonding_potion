// Runs as a plain script (not a module), so it also works when the page is opened by double-clicking the file.
// Browsers don't run the editors' code from file:///..., so: if the local server is running, jump to the same page
// on http://localhost:8080; otherwise explain what to do instead of showing buttons that do nothing.
(function () {
  if (location.protocol !== 'file:') return;
  var page = location.pathname.split('/').pop() || 'editor.html';
  var local = 'http://localhost:8080/' + page + location.hash;
  var online = 'https://tvareena.github.io/bonding_potion/' + page;

  function notice() {
    var box = document.createElement('section');
    box.className = 'notice';
    box.style.borderColor = '#b23a3a';
    box.innerHTML =
      '<p><b>This page was opened as a file, so its buttons can\'t work.</b> Browsers only run the editor when it is opened through a web address.</p>' +
      '<ol>' +
      '<li>Double-click <b>Open editors.bat</b> in the project folder. It starts the local server and opens both editors (this page will also work after that: just reload it).</li>' +
      '<li>Or use the online editor (it still edits the folder on your computer): <a href="' + online + '">' + online + '</a></li>' +
      '</ol>';
    var header = document.querySelector('header');
    if (header && header.parentNode) header.parentNode.insertBefore(box, header.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
    var btn = document.getElementById('btn-pick');
    if (btn) { btn.disabled = true; btn.title = 'Open the editor through Open editors.bat or the online link'; }
  }

  // Is the local server running? Try to load a small picture from it.
  var probe = new Image();
  var done = false;
  probe.onload = function () { if (!done) { done = true; location.replace(local); } };
  probe.onerror = function () { if (!done) { done = true; whenReady(notice); } };
  setTimeout(function () { if (!done) { done = true; whenReady(notice); } }, 2500);
  probe.src = 'http://localhost:8080/favicon.png?probe=' + Date.now();

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn();
  }
})();
