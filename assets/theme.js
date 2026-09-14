/* ===========================================================
   رازهای مگو — theme behaviour
   Static file, no Liquid. URLs arrive via window.SITE, set by
   _layouts/default.html.
   =========================================================== */
(function () {
  'use strict';
  var SITE = window.SITE || {};
  var root = document.documentElement;
  root.classList.add('js');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Persian digits ---------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(s) { return String(s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Gregorian → Jalali ---------- */
  var J_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function toJalali(gy, gm, gd) {
    var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
      + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
    var jy = -1595 + 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm, jd;
    if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
    else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
    return [jy, jm, jd];
  }
  function jalaliText(iso, fmt) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return null;
    var j = toJalali(+m[1], +m[2], +m[3]);
    if (fmt === 'short') return fa(j[0] + '/' + pad2(j[1]) + '/' + pad2(j[2]));
    if (fmt === 'md') return fa(pad2(j[1]) + '/' + pad2(j[2]));
    if (fmt === 'year') return fa(j[0]);
    return fa(j[2]) + ' ' + J_MONTHS[j[1] - 1] + ' ' + fa(j[0]);
  }
  window.jalaliText = jalaliText;
  window.faDigits = fa;

  function stampDates(scope) {
    (scope || document).querySelectorAll('time[datetime]').forEach(function (el) {
      if (el.dataset.done) return;
      var txt = jalaliText(el.getAttribute('datetime'), el.dataset.fmt || 'long');
      if (txt) el.textContent = txt;
      el.dataset.done = '1';
    });
    (scope || document).querySelectorAll('[data-num]').forEach(function (el) {
      if (el.dataset.done) return;
      el.textContent = fa(el.textContent);
      el.dataset.done = '1';
    });
  }
  stampDates(document);

  /* ---------- theme toggle (initial value is set inline in <head>) ---------- */
  var tBtn = document.querySelector('[data-theme-toggle]');
  if (tBtn) {
    var syncLabel = function () {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      tBtn.setAttribute('aria-label', dark ? 'حالت روشن' : 'حالت تاریک');
      tBtn.setAttribute('title', dark ? 'حالت روشن' : 'حالت تاریک');
      tBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    };
    syncLabel();
    tBtn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('rm-theme', next); } catch (e) {}
      syncLabel();
    });
  }

  /* ---------- sticky header state ---------- */
  var head = document.querySelector('.site-head');
  if (head) {
    var onScrollHead = function () { head.classList.toggle('is-stuck', window.pageYOffset > 6); };
    onScrollHead();
    window.addEventListener('scroll', onScrollHead, { passive: true });
  }

  /* ---------- mobile drawer ---------- */
  var drawer = document.getElementById('drawer');
  var navBtn = document.querySelector('[data-nav-open]');
  if (drawer && navBtn) {
    var lastFocus = null;
    var focusables = function () {
      return Array.prototype.filter.call(
        drawer.querySelectorAll('a[href],button:not([disabled])'),
        function (el) { return el.offsetParent !== null; });
    };
    var open = function () {
      lastFocus = document.activeElement;
      drawer.setAttribute('data-open', '');
      navBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var f = focusables();
      if (f.length) f[0].focus();
    };
    var close = function () {
      drawer.removeAttribute('data-open');
      navBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    navBtn.addEventListener('click', open);
    drawer.querySelectorAll('[data-nav-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 900 && drawer.hasAttribute('data-open')) close();
    });
  }

  /* ---------- reading progress ---------- */
  var art = document.querySelector('[data-progress]');
  var bar = document.querySelector('.progress i');
  if (art && bar) {
    var upd = function () {
      var top = art.offsetTop;
      var total = art.offsetHeight - window.innerHeight * 0.4;
      var pct = total > 0 ? Math.min(Math.max((window.pageYOffset - top) / total, 0), 1) : 0;
      bar.style.width = (pct * 100).toFixed(2) + '%';
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
  }

  /* ---------- back to top ---------- */
  var top = document.querySelector('.totop');
  if (top) {
    var onScrollTop = function () { top.classList.toggle('is-on', window.pageYOffset > 900); };
    onScrollTop();
    window.addEventListener('scroll', onScrollTop, { passive: true });
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------- table of contents ---------- */
  var toc = document.querySelector('.toc');
  var prose = document.querySelector('.article-body .prose');
  if (toc && prose) {
    var heads = Array.prototype.slice.call(prose.querySelectorAll('h2,h3'));
    if (heads.length >= 3) {
      var ol = toc.querySelector('ol');
      var used = {};
      heads.forEach(function (h, i) {
        if (!h.id) {
          var base = (h.textContent || '').trim().replace(/\s+/g, '-').replace(/[^\u0600-\u06FF\w-]/g, '').slice(0, 40) || ('h' + i);
          var id = base; var n = 2;
          while (used[id] || document.getElementById(id)) { id = base + '-' + n++; }
          used[id] = 1; h.id = id;
        }
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = (h.textContent || '').trim();
        if (h.tagName === 'H3') a.className = 'lvl3';
        li.appendChild(a); ol.appendChild(li);
      });
      toc.classList.add('is-on');
      var shell = document.querySelector('.article-shell');
      if (shell) shell.classList.add('has-toc');
      if ('IntersectionObserver' in window) {
        var links = toc.querySelectorAll('a');
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (l) {
              l.classList.toggle('is-here', l.getAttribute('href') === '#' + en.target.id);
            });
          });
        }, { rootMargin: '-80px 0px -70% 0px' });
        heads.forEach(function (h) { io.observe(h); });
      }
    }
  }

  /* ---------- prose repairs: tables, embeds, code copy ---------- */
  document.querySelectorAll('.prose table').forEach(function (t) {
    if (t.parentNode && t.parentNode.classList.contains('tableWrap')) return;
    var w = document.createElement('div'); w.className = 'tableWrap';
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });
  document.querySelectorAll('.prose iframe').forEach(function (f) {
    if (f.closest('.embed')) return;
    if (!/youtube|youtu\.be|aparat|vimeo/.test(f.src || '')) return;
    var w = document.createElement('div'); w.className = 'embed';
    f.parentNode.insertBefore(w, f); w.appendChild(f);
  });
  document.querySelectorAll('.prose pre').forEach(function (pre) {
    if (pre.parentNode.classList.contains('codeBox')) return;
    var box = document.createElement('div'); box.className = 'codeBox';
    pre.parentNode.insertBefore(box, pre); box.appendChild(pre);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'codeCopy'; b.textContent = 'کپی';
    b.setAttribute('aria-label', 'کپی کد');
    b.addEventListener('click', function () {
      var txt = pre.innerText;
      var done = function () { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = 'کپی'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () {});
      else done();
    });
    box.appendChild(b);
  });

  /* ---------- copy link ---------- */
  document.querySelectorAll('[data-copy-url]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.textContent;
      var url = b.getAttribute('data-copy-url');
      var done = function () { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
      else done();
    });
  });

  /* ---------- reveal on scroll ---------- */
  var rev = document.querySelectorAll('.reveal');
  if (rev.length) {
    if (reduce || !('IntersectionObserver' in window)) {
      rev.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      rev.forEach(function (el) { ro.observe(el); });
    }
  }

  /* ---------- slideshow ---------- */
  document.querySelectorAll('.slideshow').forEach(function (box) {
    var kids = Array.prototype.slice.call(box.children).filter(function (el) {
      return el.tagName === 'FIGURE' || el.tagName === 'IMG' || el.tagName === 'PICTURE';
    });
    if (kids.length < 2) return;
    var view = document.createElement('div'); view.className = 'ssView';
    var track = document.createElement('div'); track.className = 'ssTrack';
    kids.forEach(function (el) {
      var s;
      if (el.tagName === 'FIGURE') { s = el; }
      else { s = document.createElement('figure'); el.parentNode.insertBefore(s, el); s.appendChild(el); }
      s.classList.add('ssSlide'); track.appendChild(s);
    });
    view.appendChild(track); box.insertBefore(view, box.firstChild);

    var barEl = document.createElement('div'); barEl.className = 'ssBar';
    var prev = document.createElement('button'); prev.type = 'button'; prev.textContent = 'قبلی';
    var next = document.createElement('button'); next.type = 'button'; next.textContent = 'بعدی';
    var dots = document.createElement('div'); dots.className = 'ssDots';
    var count = document.createElement('span'); count.className = 'ssCount num';
    kids.forEach(function (_, i) {
      var d = document.createElement('i');
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    barEl.appendChild(prev); barEl.appendChild(next); barEl.appendChild(dots); barEl.appendChild(count);
    box.appendChild(barEl);

    var at = 0, n = kids.length;
    function go(i) {
      at = Math.min(Math.max(i, 0), n - 1);
      track.style.transform = 'translateX(' + (at * 100) + '%)';
      count.textContent = fa(at + 1) + ' از ' + fa(n);
      prev.disabled = at === 0; next.disabled = at === n - 1;
      dots.querySelectorAll('i').forEach(function (d, k) { d.classList.toggle('on', k === at); });
    }
    prev.addEventListener('click', function () { go(at - 1); });
    next.addEventListener('click', function () { go(at + 1); });
    var x0 = null;
    view.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    view.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(dx < 0 ? at + 1 : at - 1);
      x0 = null;
    }, { passive: true });
    box.setAttribute('tabindex', '0');
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(at + 1);
      else if (e.key === 'ArrowRight') go(at - 1);
    });
    box.classList.add('ready'); go(0);
  });

  /* ---------- archive / tags filters ---------- */
  var filters = document.querySelector('[data-filters]');
  if (filters) {
    var rows = document.querySelectorAll('[data-tags]');
    var groups = document.querySelectorAll('[data-group]');
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var val = b.getAttribute('data-filter') || '';
      filters.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      rows.forEach(function (r) {
        var ok = !val || (' ' + r.getAttribute('data-tags') + ' ').indexOf(' ' + val + ' ') > -1;
        r.style.display = ok ? '' : 'none';
      });
      groups.forEach(function (g) {
        var any = Array.prototype.some.call(g.querySelectorAll('[data-tags]'), function (r) {
          return r.style.display !== 'none';
        });
        g.style.display = any ? '' : 'none';
      });
    });
  }

  /* ---------- Persian-aware search index ---------- */
  window.siteSearch = (function () {
    var data = null, loading = null;
    function norm(s) {
      return String(s || '')
        .replace(/[\u064A\u0649]/g, '\u06CC')
        .replace(/\u0643/g, '\u06A9')
        .replace(/[\u0622\u0623\u0625]/g, '\u0627')
        .replace(/\u0629/g, '\u0647')
        .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
        .replace(/[\u200B-\u200F\u202A-\u202E]/g, ' ')
        .replace(/[\u06F0-\u06F9]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 1776 + 48); })
        .replace(/[\u0660-\u0669]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 1632 + 48); })
        .replace(/\s+/g, ' ').toLowerCase().trim();
    }
    function join(s) { return norm(s).replace(/[\s\u200c]+/g, ''); }
    function esc(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function load() {
      if (data) return Promise.resolve(data);
      if (loading) return loading;
      loading = fetch(SITE.searchJson || 'search.json').then(function (r) { return r.json(); })
        .then(function (list) {
          data = list.map(function (p) {
            var all = p.title + ' ' + p.description + ' ' + p.tags + ' ' + p.body;
            return { raw: p, nt: norm(p.title), ntj: join(p.title), hay: norm(all), hayj: join(all) };
          });
          return data;
        }).catch(function () { data = []; return data; });
      return loading;
    }
    function query(v) {
      var words = norm(v).split(' ').filter(Boolean);
      if (!words.length || !data) return [];
      var out = [];
      data.forEach(function (d) {
        var score = 0, all = true;
        words.forEach(function (w) {
          var wj = w.replace(/[\s\u200c]+/g, '');
          if (d.nt.indexOf(w) > -1 || d.ntj.indexOf(wj) > -1) score += 8;
          else if (d.hay.indexOf(w) > -1 || d.hayj.indexOf(wj) > -1) score += 2;
          else all = false;
        });
        if (all) out.push({ p: d.raw, score: score, words: words });
      });
      return out.sort(function (a, b) { return b.score - a.score; });
    }
    function mark(txt, words) {
      var out = esc(txt);
      words.forEach(function (w) {
        if (!w) return;
        var pat = w.split('').map(function (c) {
          var e = c.replace(/[.*+?^{}()|[\]\\$]/g, '\\$&');
          if (c === '\u06CC') e = '[\u06CC\u064A\u0649]';
          if (c === '\u06A9') e = '[\u06A9\u0643]';
          if (c === '\u0627') e = '[\u0627\u0622\u0623\u0625]';
          return e;
        }).join('\u200c?');
        try { out = out.replace(new RegExp(pat, 'gi'), function (m) { return '<mark>' + m + '</mark>'; }); } catch (e) {}
      });
      return out;
    }
    function snippet(hit) {
      var body = String(hit.p.body || '');
      if (!body) return '';
      var n = norm(body), k = n.indexOf(hit.words[0]);
      var start = k > 80 ? k - 70 : 0;
      var txt = (start > 0 ? '\u2026' : '') + body.slice(start, start + 220).trim() + '\u2026';
      return mark(txt, hit.words);
    }
    return { load: load, query: query, mark: mark, snippet: snippet, norm: norm, join: join, esc: esc };
  })();
})();
