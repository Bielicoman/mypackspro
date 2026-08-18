/* My Packs Pro — site
   Duas coisas apenas: encher a grade do herói e revelar as secções ao rolar.
   Nada aqui é essencial ao conteúdo; sem JS a página continua legível. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────── grade do herói ───────────────
     A grade preenche-se célula a célula, como o painel real faz ao gerar
     previews. É a demonstração mais honesta do produto: em vez de descrever
     que os previews aparecem sob demanda, a página mostra. */

  var TINTS = [
    '#2E3A4A', '#3A2E4A', '#2E4A3A', '#4A3A2E',
    '#243040', '#402430', '#304024', '#3A3040',
    '#2A3646', '#46362A', '#2A4636', '#36462A'
  ];

  // 0 = vídeo, 1 = áudio, 2 = imagem. Mistura pensada, não aleatória:
  // é o que um pack de edição real tem dentro.
  var KINDS = [0, 1, 0, 2, 1, 0, 0, 1, 2, 0, 1, 0, 2, 0, 1, 0, 0, 2, 1, 0];

  function bars(seed) {
    var svg = '<svg class="wave" viewBox="0 0 100 40" preserveAspectRatio="none">';
    var h = seed * 9301 + 49297;
    for (var i = 0; i < 26; i++) {
      h = (h * 9301 + 49297) % 233280;
      var r = h / 233280;
      var env = 0.3 + 0.7 * Math.pow(1 - i / 26, 0.5);
      var a = Math.max(1.5, r * env * 19);
      svg += '<rect x="' + (i * 3.85 + 0.6).toFixed(2) + '" y="' + (20 - a).toFixed(2) +
             '" width="1.9" height="' + (a * 2).toFixed(2) + '" rx="0.95"/>';
    }
    return svg + '</svg>';
  }

  var grid = document.getElementById('grid');
  if (grid) {
    var cells = [];
    for (var i = 0; i < KINDS.length; i++) {
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.setProperty('--fill', TINTS[i % TINTS.length]);

      var inner = '';
      if (KINDS[i] === 1) inner = bars(i + 1);
      else if (KINDS[i] === 0) inner = '<span class="play"></span>';

      cell.innerHTML = '<div class="cell__thumb">' + inner + '</div><div class="cell__name"></div>';
      grid.appendChild(cell);
      cells.push(cell);
    }

    if (reduced) {
      cells.forEach(function (c) { c.classList.add('is-ready'); });
    } else {
      // Escalonado e fora de ordem, como uma fila real a despachar trabalhos.
      var order = [0, 3, 1, 6, 2, 5, 9, 4, 12, 8, 7, 15, 11, 10, 17, 13, 19, 14, 16, 18];
      order.forEach(function (idx, n) {
        setTimeout(function () {
          if (cells[idx]) cells[idx].classList.add('is-ready');
        }, 420 + n * 190);
      });
    }
  }

  /* ─────────────── revelação ao rolar ─────────────── */

  var targets = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      // Um pequeno atraso por posição dá cadência a grupos de cartões,
      // sem transformar a rolagem numa sequência de animações.
      var delay = (entry.target.dataset.i || 0) * 60;
      setTimeout(function () { entry.target.classList.add('is-in'); }, delay);
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  var groups = {};
  Array.prototype.forEach.call(targets, function (el) {
    var key = el.parentElement ? el.parentElement.className : 'x';
    groups[key] = (groups[key] || 0);
    el.dataset.i = groups[key]++;
    io.observe(el);
  });

  /* ─────────────── sincronizador de versão ao vivo ─────────────── */
  try {
    fetch('version.json?_t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.version) return;
        var v = data.version;
        document.querySelectorAll('.live-version-badge, .brand__version, [data-version-tag]').forEach(function (el) {
          el.textContent = 'v' + v;
        });
      })
      .catch(function () {});
  } catch (e) {}
})();

