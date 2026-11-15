/* Analítica con consentimiento (Google Analytics 4).
   No se carga nada de Google ni se guarda ninguna cookie hasta que el visitante pulsa «Aceptar». */
(function () {
  'use strict';
  var GA_ID = 'G-6658P7RZ8S';
  var KEY = 'consentimiento_analitica';
  var loaded = false;

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* modo privado */ } }

  function loadGA() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function banner() {
    if (document.getElementById('aviso-cookies')) return;
    var box = document.createElement('div');
    box.id = 'aviso-cookies';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Aviso de cookies');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:520px;margin:0 auto;background:#0f172a;color:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif';
    var p = document.createElement('p');
    p.style.cssText = 'margin:0 0 10px;color:#fff';
    p.textContent = 'Usamos cookies de Google Analytics solo para contar visitas de forma agregada. ¿Nos dejas?';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px';
    function btn(text, bg, fg, value) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'flex:1;border:0;border-radius:10px;padding:10px 12px;font:700 14px system-ui,sans-serif;cursor:pointer;background:' + bg + ';color:' + fg;
      b.addEventListener('click', function () {
        set(value);
        box.remove();
        if (value === 'si') loadGA();
      });
      return b;
    }
    // Los dos botones tienen el mismo peso visual: rechazar es tan fácil como aceptar
    row.appendChild(btn('Rechazar', '#e2e8f0', '#0f172a', 'no'));
    row.appendChild(btn('Aceptar', '#e2e8f0', '#0f172a', 'si'));
    box.appendChild(p);
    box.appendChild(row);
    document.body.appendChild(box);
  }

  function start() {
    var c = get();
    if (c === 'si') loadGA();
    else if (c !== 'no') banner();
  }

  // Para un enlace «Cambiar preferencias de cookies», si algún día lo quieres
  window.abrirAvisoCookies = function () { try { localStorage.removeItem(KEY); } catch (e) {} banner(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
