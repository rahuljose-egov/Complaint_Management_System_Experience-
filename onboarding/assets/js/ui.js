/* ============================================================
   ui.js — tiny DOM helpers + reusable field widgets.
   No framework. h() builds elements, the rest compose them.
   ============================================================ */
(function () {
  'use strict';

  /* ---- element builder -------------------------------------
     h('div.panel', { onclick: fn }, [child, 'text'])            */
  function h(spec, attrs, children) {
    var parts = String(spec).split(/(?=[.#])/);
    var el = document.createElement(parts[0] || 'div');
    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];
      /* one class per token: a stray space in the spec would make
         classList.add throw, which would take the whole render with it */
      if (p[0] === '.') {
        p.slice(1).split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); });
      }
      else if (p[0] === '#') el.id = p.slice(1);
    }
    if (attrs && (attrs.nodeType || typeof attrs === 'string' || Array.isArray(attrs))) {
      children = attrs; attrs = null;
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    append(el, children);
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) { children.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  /* ---- icons ------------------------------------------------ */
  var PATHS = {
    check:    '<path d="M20 6L9 17l-5-5"/>',
    arrow:    '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back:     '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    panel:    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9.5 4v16"/>',
    plus:     '<path d="M12 5v14M5 12h14"/>',
    down:     '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    up:       '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    lang:     '<path d="M4 5h8M8 5v3c0 3-2 5-4 6M6 9c0 2 2 4 5 4"/><path d="M13 20l4-11 4 11M14.5 16h5"/>',
    trash:    '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    mail:     '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/>',
    sms:      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    chat:     '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5A8.4 8.4 0 0 1 4 11.5a8.5 8.5 0 0 1 17 0z"/>',
    people:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/>',
    pin:      '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    building: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/>',
    sitemap:  '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v6M5 16v-2h14v2"/>',
    city:     '<path d="M3 21h18M4 21V9l6-4v16M14 21V11h6v10"/><path d="M17 15h.01M17 18h.01M7 12h.01M7 16h.01"/>',
    shield:   '<path d="M12 2l8 4v6c0 5-3.5 8.7-8 10-4.5-1.3-8-5-8-10V6z"/>',
    drop:     '<path d="M12 2.7s6 6.1 6 10.1a6 6 0 0 1-12 0c0-4 6-10.1 6-10.1z"/>',
    heart:    '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/>',
    dots:     '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    form:     '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    flow:     '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6H13a2.5 2.5 0 0 1 2.5 2.5v1M15.5 14.5v1A2.5 2.5 0 0 1 13 18H8.5"/>',
    bell:     '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    chart:    '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    road:     '<path d="M4 21L8 3M20 21L16 3M12 4v3M12 11v3M12 18v3"/>',
    paw:      '<circle cx="7" cy="8" r="2.2"/><circle cx="12" cy="6" r="2.2"/><circle cx="17" cy="8" r="2.2"/><path d="M12 11c-3 0-5 2.4-5 4.7 0 2 1.6 3.3 3.4 3.3h3.2c1.8 0 3.4-1.3 3.4-3.3C17 13.4 15 11 12 11z"/>',
    leaf:     '<path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-10 0 9-3 16-9 17z"/><path d="M6 18c4-5 7-7 11-9"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    sparkle:  '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
    lock:     '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    rocket:   '<path d="M12 2s5 2 5 9c0 4-2 6-2 6H9s-2-2-2-6c0-7 5-9 5-9z"/><path d="M9 17l-2 4 3-1M15 17l2 4-3-1"/><circle cx="12" cy="9" r="1.6"/>',
    info:     '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
    palette:  '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-2 0-1.4-1.4-1.6-1.4-3 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.5-4-6.2-9-6.2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="8" r="1"/>',
    eye:      '<path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/>',
    home:     '<path d="M3 10.5L12 3l9 7.5V21H3z"/><path d="M9 21v-6h6v6"/>',
    grid:     '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    eye:      '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    'eye-off':'<path d="M4 4l16 16"/><path d="M10.6 6.2A9.6 9.6 0 0 1 12 6c6.4 0 10 6 10 6a18 18 0 0 1-3 3.6M6.9 7.7A17.4 17.4 0 0 0 2 12s3.6 6 10 6a9.5 9.5 0 0 0 3.6-.7"/><path d="M9.5 10a3 3 0 0 0 4.3 4.2"/>',
    book:     '<path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2z"/><path d="M19 17.5v3H6"/>',
    x:        '<path d="M6 6l12 12M18 6L6 18"/>',
    chev:     '<path d="M6 9l6 6 6-6"/>',
    gear:     '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>'
  };

  function icon(name, size) {
    var s = size || 20;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', s); svg.setAttribute('height', s);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = PATHS[name] || PATHS.dots;
    return svg;
  }

  /* ---- form fields ------------------------------------------ */
  function field(label, control, opts) {
    opts = opts || {};
    var kids = [];
    if (label) {
      kids.push(h('label.label', { for: opts.id || null }, [
        label, opts.optional ? h('span.opt', ' · optional') : null
      ]));
    }
    if (opts.sub) kids.push(h('div.sublabel', opts.sub));
    kids.push(control);
    if (opts.hint) kids.push(h('div.sublabel', { style: { marginTop: '6px', marginBottom: 0 } }, opts.hint));
    return h('div.field', kids);
  }

  function input(opts) {
    opts = opts || {};
    var el = h('input.input', {
      type: opts.type || 'text',
      id: opts.id || null,
      value: opts.value || '',
      placeholder: opts.placeholder || '',
      autocomplete: opts.autocomplete || 'off',
      inputmode: opts.inputmode || null
    });
    if (opts.oninput) el.addEventListener('input', function () { opts.oninput(el.value, el); });
    if (opts.onenter) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); opts.onenter(el.value, el); }
      });
    }
    return el;
  }

  function select(opts) {
    opts = opts || {};
    var el = h('select.select', { id: opts.id || null });
    (opts.options || []).forEach(function (o) {
      var val = (typeof o === 'string') ? o : o.value;
      var lab = (typeof o === 'string') ? o : o.label;
      el.appendChild(h('option', { value: val, selected: opts.value === val }, lab));
    });
    if (opts.placeholder) {
      el.insertBefore(h('option', { value: '', disabled: true, selected: !opts.value }, opts.placeholder), el.firstChild);
    }
    /* the selected attribute alone does not set the value everywhere */
    if (opts.value) el.value = opts.value;
    if (opts.onchange) el.addEventListener('change', function () { opts.onchange(el.value, el); });
    return el;
  }

  /* single-select option cards.
     items: [{id,label,desc,hue,icon}]                            */
  function optionCards(items, opts) {
    opts = opts || {};
    var wrap = h('div.cards' + (opts.cols === 2 ? '.cols-2' : ''), { role: 'radiogroup' });
    items.forEach(function (it) {
      var selected = opts.value === it.id;
      var hue = it.hue || 'lilac';
      var card = h('button.card-opt', {
        type: 'button', role: 'radio', 'aria-checked': selected ? 'true' : 'false'
      }, [
        it.icon ? h('span.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
                    icon(it.icon)) : null,
        h('span.tx', [ h('b', it.label), it.desc ? h('span', it.desc) : null ]),
        h('span.mark', icon('check', 13))
      ]);
      card.addEventListener('click', function () {
        Array.prototype.forEach.call(wrap.querySelectorAll('.card-opt'), function (c) {
          c.setAttribute('aria-checked', 'false');
        });
        card.setAttribute('aria-checked', 'true');
        if (opts.onchange) opts.onchange(it.id, it);
      });
      wrap.appendChild(card);
    });
    return wrap;
  }

  /* multi-select option cards. values: array of ids */
  function multiCards(items, opts) {
    opts = opts || {};
    var wrap = h('div.cards' + (opts.cols === 2 ? '.cols-2' : ''), { role: 'group' });
    items.forEach(function (it) {
      var on = (opts.values || []).indexOf(it.id) !== -1;
      var hue = it.hue || 'lilac';
      var card = h('button.card-opt.multi', {
        type: 'button', 'aria-pressed': on ? 'true' : 'false'
      }, [
        it.icon ? h('span.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
                    icon(it.icon)) : null,
        h('span.tx', [ h('b', it.label), it.desc ? h('span', it.desc) : null ]),
        h('span.mark', icon('check', 13))
      ]);
      card.addEventListener('click', function () {
        var now = card.getAttribute('aria-pressed') !== 'true';
        card.setAttribute('aria-pressed', now ? 'true' : 'false');
        if (opts.onchange) opts.onchange(it.id, now);
      });
      wrap.appendChild(card);
    });
    return wrap;
  }

  function banner(kind, content, iconName) {
    return h('div.banner.banner-' + kind, [
      icon(iconName || 'info', 17),
      h('div', Array.isArray(content) ? content : [content])
    ]);
  }

  function btn(label, opts) {
    opts = opts || {};
    var kids = [];
    if (opts.icon && !opts.iconRight) kids.push(icon(opts.icon, 17));
    kids.push(label);
    if (opts.icon && opts.iconRight) kids.push(icon(opts.icon, 17));
    var el = h('button.btn.btn-' + (opts.variant || 'primary') + (opts.sm ? '.btn-sm' : '') + (opts.block ? '.btn-block' : ''),
               { type: 'button', disabled: opts.disabled || null,
                 /* worth saying why a button is not live */
                 title: opts.title || null }, kids);
    if (opts.onclick) el.addEventListener('click', opts.onclick);
    return el;
  }

  /* initials + a stable pastel per person */
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/);
    return ((p[0] || '')[0] || '?').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase();
  }
  function hueFor(str) {
    var hues = window.DATA.ACCENTS, n = 0;
    for (var i = 0; i < String(str).length; i++) n = (n + String(str).charCodeAt(i)) % 997;
    return hues[n % hues.length];
  }
  function avatar(name) {
    var hue = hueFor(name);
    return h('span.av', {
      style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' }
    }, initials(name));
  }

  /* ---- modal ------------------------------------------------- */
  var openModals = [];
  function modal(opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    var card = h('div.modal' + (opts.wide ? '.lg' : ''), { role: 'dialog', 'aria-modal': 'true' });

    if (opts.title) {
      card.appendChild(h('div.modal-head', [
        opts.icon ? h('div.ic', icon(opts.icon, 22)) : null,
        h('h2', opts.title),
        opts.desc ? h('p', opts.desc) : null
      ]));
    }
    if (opts.body) append(card, opts.body);
    if (opts.actions) card.appendChild(h('div.actions', { style: { marginTop: 'var(--s-5)' } }, opts.actions));

    var back = h('div.backdrop', [card]);
    var prevFocus = document.activeElement;

    function close() {
      if (back.parentNode) back.parentNode.removeChild(back);
      openModals = openModals.filter(function (m) { return m !== api; });
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === 'Escape' && opts.dismissible !== false) { e.stopPropagation(); close(); }
    }
    if (opts.dismissible !== false) {
      back.addEventListener('click', function (e) { if (e.target === back) close(); });
    }
    document.addEventListener('keydown', onKey);

    root.appendChild(back);
    var focusable = card.querySelector('input, select, button');
    if (focusable) focusable.focus();

    var api = { close: close, card: card };
    openModals.push(api);
    return api;
  }

  function announce(msg) {
    var live = document.getElementById('live');
    if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 40); }
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }

  function slugify(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
  }

  /* ---- screen shells ----------------------------------------
     One-question screen: eyebrow, question, help, body, actions.
     Deliberately no step counter — a hairline bar carries progress. */
  function screen(opts) {
    opts = opts || {};
    return [
      opts.eyebrow ? h('p.eyebrow', opts.eyebrow) : null,
      opts.title ? h('h1.qtitle', opts.title) : null,
      opts.help ? h('p.qhelp', opts.help) : null,
      opts.body ? h('div.qbody', Array.isArray(opts.body) ? opts.body : [opts.body]) : null,
      opts.actions ? h('div.actions', opts.actions) : null
    ];
  }

  /* ---- multi-select dropdown --------------------------------
     Boundary questions use this rather than option cards: a ward
     list can run to dozens, which cards handle badly. Closed by
     default, shows a summary, opens a checkable list with a filter
     once the list is long. */
  function multiSelect(opts) {
    opts = opts || {};
    var options = opts.options || [];
    var values = (opts.values || []).slice();
    var open = false;

    var sum = h('span.msel-sum');
    var btn = h('button.msel-btn', {
      type: 'button', id: opts.id || null,
      'aria-haspopup': 'listbox', 'aria-expanded': 'false',
      disabled: options.length ? null : true
    }, [sum, icon('chev', 16)]);

    var list = h('div.msel-list', { role: 'listbox', 'aria-multiselectable': 'true' });
    var filter = null;
    var panel = h('div.msel-panel', { hidden: true });
    var wrap = h('div.msel', [btn, panel]);

    function summarise() {
      if (!options.length) { sum.textContent = opts.emptyText || 'Nothing to choose yet'; return; }
      if (!values.length)  { sum.textContent = opts.placeholder || 'Select…'; sum.classList.add('is-empty'); return; }
      sum.classList.remove('is-empty');
      sum.textContent = values.length === 1 ? values[0]
        : values.length === 2 ? values.join(', ')
        : values.length + ' selected';
    }

    function emit() {
      summarise();
      if (opts.onchange) opts.onchange(values.slice());
    }

    function drawList() {
      clear(list);
      var q = filter ? filter.value.trim().toLowerCase() : '';
      var shown = options.filter(function (o) { return !q || o.toLowerCase().indexOf(q) !== -1; });

      if (!shown.length) {
        list.appendChild(h('div.msel-none', 'No match'));
        return;
      }
      shown.forEach(function (o) {
        var on = values.indexOf(o) !== -1;
        var row = h('button.msel-opt', {
          type: 'button', role: 'option', 'aria-selected': on ? 'true' : 'false'
        }, [h('span.mark', icon('check', 12)), o]);
        row.addEventListener('click', function () {
          var i = values.indexOf(o);
          if (i === -1) values.push(o); else values.splice(i, 1);
          row.setAttribute('aria-selected', i === -1 ? 'true' : 'false');
          emit();
        });
        list.appendChild(row);
      });
    }

    function onDocClick(e) {
      if (!wrap.contains || wrap.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }

    function setOpen(v) {
      open = v;
      panel.hidden = !v;
      btn.setAttribute('aria-expanded', v ? 'true' : 'false');
      wrap.classList[v ? 'add' : 'remove']('is-open');
      if (v) {
        drawList();
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onKey);
        if (filter) filter.focus();
      } else {
        document.removeEventListener('click', onDocClick);
        document.removeEventListener('keydown', onKey);
      }
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (options.length) setOpen(!open);
    });

    /* a filter only earns its place on a long list */
    if (options.length > 8) {
      filter = h('input.msel-filter', { type: 'text', placeholder: 'Filter…' });
      filter.addEventListener('input', drawList);
      panel.appendChild(filter);
    }
    panel.appendChild(h('div.msel-tools', [
      h('button', { type: 'button', onclick: function () {
        var q = filter ? filter.value.trim().toLowerCase() : '';
        options.filter(function (o) { return !q || o.toLowerCase().indexOf(q) !== -1; })
               .forEach(function (o) { if (values.indexOf(o) === -1) values.push(o); });
        drawList(); emit();
      } }, 'Select all'),
      h('button', { type: 'button', onclick: function () {
        values = []; drawList(); emit();
      } }, 'Clear')
    ]));
    panel.appendChild(list);

    summarise();
    drawList();

    wrap.getValues = function () { return values.slice(); };
    return wrap;
  }

  /* ---- confetti ---------------------------------------------
     A short pastel burst for the one moment worth marking. Cleans
     itself up, and does nothing at all if the person has asked for
     reduced motion. */
  /* A hierarchy, as a card: what it is called and the levels it goes
     by. Used both to list them and to choose between them, so the
     selected and active states travel with it. */
  /* An on/off switch. Off is the resting state everywhere it is used,
     so nothing is turned on for someone without them saying so. */
  function toggle(opts) {
    opts = opts || {};
    var on = !!opts.checked;
    var btn = h('button.switch' + (on ? '.is-on' : ''), {
      type: 'button', role: 'switch',
      'aria-checked': on ? 'true' : 'false',
      'aria-label': opts.label || null
    }, h('span.knob'));

    btn.addEventListener('click', function () {
      on = !on;
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) btn.classList.add('is-on'); else btn.classList.remove('is-on');
      if (opts.onchange) opts.onchange(on);
    });
    return btn;
  }

  /* What a template takes reports about, as two numbers you can open.
     Previewing is read-only; a service being set up gets checkboxes,
     so the same pair of cards serves both. */
  function typeCards(templateId, opts) {
    opts = opts || {};
    var types = window.DATA.complaintTypes(templateId);
    var editable = !!opts.editable;

    function typesOn() {
      return editable ? window.DATA.serviceTypeIds(templateId).length : types.length;
    }
    function subsOn() {
      return editable ? window.DATA.serviceSubtypes(templateId).length
                      : window.DATA.subtypeCount(templateId);
    }

    var vals = {};
    /* Only the two numbers, never the whole screen: a full re-render
       clears #modal-root and would close the dialog mid-tick. */
    function sync() {
      if (vals.types) vals.types.textContent = String(typesOn());
      if (vals.subs) vals.subs.textContent = String(subsOn());
    }

    /* The types card lists types. The subtypes card lists subtypes.
       Neither shows the other's rows — one question per dialog. */
    function open(mode) {
      if (opts.onopen) { opts.onopen(mode); return; }
      var subs = mode === 'subtypes';
      var dlg = modal({
        wide: true,
        icon: subs ? 'flow' : 'form',
        title: subs ? 'Complaint subtypes' : 'Complaint types',
        desc: editable
          ? (subs ? 'Untick any subtype this service should not take.'
                  : 'Untick any type this service should not take. Everything is on to begin with.')
          : (subs ? 'Every subtype the template arrives with, under its type.'
                  : 'Every complaint type the template arrives with.'),
        body: typeList(templateId, editable, sync, mode || 'types'),
        actions: [btn('Done', { icon: 'check', onclick: function () {
          dlg.close();
          /* now that the dialog is gone, the page can catch up */
          if (opts.onchange) opts.onchange();
        } })]
      });
    }

    function card(label, value, hue, ic, key) {
      var vnode = h('div.v', String(value));
      vals[key] = vnode;
      function mine() { open(key === 'subs' ? 'subtypes' : 'types'); }
      var el = h('div.stat.stat-open', {
        role: 'button', tabindex: '0',
        'aria-label': label + ': ' + value
      }, [
        h('div.k', [
          h('span.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
            icon(ic, 14)),
          label
        ]),
        vnode,
        editable
          ? btn('Edit', { variant: 'secondary', sm: true, icon: 'gear', onclick: mine })
          : btn('View', { variant: 'ghost', sm: true, icon: 'eye', onclick: mine })
      ]);
      el.addEventListener('click', mine);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { if (e.preventDefault) e.preventDefault(); mine(); }
      });
      return el;
    }

    return h('div.stat-grid.cols-2', [
      card('Complaint types', typesOn(), 'lilac', 'form', 'types'),
      card('Complaint subtypes', subsOn(), 'sky', 'flow', 'subs')
    ]);
  }

  /* The list behind those cards. Read-only when previewing; ticked
     when a service is choosing what it takes. */
  function typeList(templateId, editable, onchange, mode) {
    var types = window.DATA.complaintTypes(templateId);
    var wantSubs = mode === 'subtypes';
    var wrap = h('div.typelist');

    function draw() {
      clear(wrap);
      var onIds = window.DATA.serviceTypeIds(templateId);
      var onSubs = window.DATA.serviceSubtypes(templateId);

      types.forEach(function (t) {
        var typeOn = !editable || onIds.indexOf(t.id) !== -1;

        var head = h('div.typerow', [
          editable && !wantSubs
            ? h('label.tick', [
                (function () {
                  var box = h('input', { type: 'checkbox' });
                  if (typeOn) box.setAttribute('checked', '');
                  box.checked = typeOn;
                  box.addEventListener('change', function () {
                    var ids = window.DATA.complaintTypes(templateId)
                      .map(function (x) { return x.id; })
                      .filter(function (id) {
                        return id === t.id ? !typeOn : onIds.indexOf(id) !== -1;
                      });
                    window.STORE.set('system.types', ids);
                    if (onchange) onchange();
                    draw();
                  });
                  return box;
                })(),
                h('b', t.label)
              ])
            : h('b', t.label),
          h('span.sublabel', { style: { margin: 0, marginLeft: 'auto' } },
            t.subtypes.length + ' subtypes')
        ]);

        /* the types list stops at the type: its subtypes are the other
           card's business */
        if (!wantSubs) {
          wrap.appendChild(h('div.typeblock' + (typeOn ? '' : '.is-off'), [head]));
          return;
        }

        var subs = h('div.subrow', t.subtypes.map(function (sub) {
          var key = t.id + ':' + sub;
          var subOn = !editable || onSubs.indexOf(key) !== -1;
          if (!editable) return h('span.chip', sub);

          var box = h('input', { type: 'checkbox' });
          if (subOn && typeOn) box.setAttribute('checked', '');
          box.checked = subOn && typeOn;
          if (!typeOn) box.setAttribute('disabled', '');
          box.addEventListener('change', function () {
            var all = [];
            window.DATA.complaintTypes(templateId).forEach(function (x) {
              x.subtypes.forEach(function (sx) {
                var k = x.id + ':' + sx;
                var was = window.DATA.serviceSubtypes(templateId).indexOf(k) !== -1;
                var now = k === key ? !subOn : was;
                if (now) all.push(k);
              });
            });
            window.STORE.set('system.subtypes', all);
            if (onchange) onchange();
            draw();
          });
          return h('label.tick', [box, sub]);
        }));

        wrap.appendChild(h('div.typeblock' + (typeOn ? '' : '.is-off'), [head, subs]));
      });
    }
    draw();
    return wrap;
  }

  /* A tab strip. Each item renders its own body when selected, so a
     panel is always built from current state. */
  function tabs(items, opts) {
    opts = opts || {};
    var active = opts.value || (items[0] && items[0].id);
    var strip = h('div.tabstrip', { role: 'tablist' });
    var panel = h('div.tabpanel');

    function draw() {
      clear(strip);
      clear(panel);
      items.forEach(function (it) {
        strip.appendChild(h('button.tab' + (it.id === active ? '.is-on' : ''), {
          type: 'button', role: 'tab',
          'aria-selected': it.id === active ? 'true' : 'false',
          onclick: function () { active = it.id; draw(); }
        }, it.label));
      });
      var cur = items.filter(function (i) { return i.id === active; })[0];
      if (cur) append(panel, typeof cur.body === 'function' ? cur.body() : cur.body);
    }
    draw();
    return h('div.tabs', [strip, panel]);
  }

  function hierarchyCard(hier, opts) {
    opts = opts || {};
    var levels = hier.levels || [];
    var max = opts.max || 5;
    var open = !!opts.expanded;
    var shown = open ? levels : levels.slice(0, max);

    var card = h('div.hcard' + (opts.active ? '.is-active' : '') +
                 (opts.selected ? '.is-selected' : ''), {
      role: 'button', tabindex: '0', 'aria-pressed': opts.selected ? 'true' : 'false'
    });

    if (opts.active) card.appendChild(h('span.hcard-badge', 'Active'));

    card.appendChild(h('div.hcard-top', [
      h('h4', hier.name),
      opts.ondelete ? h('button.iconbtn', {
        type: 'button', 'aria-label': 'Delete ' + hier.name,
        onclick: function (e) {
          if (e && e.stopPropagation) e.stopPropagation();
          opts.ondelete();
        }
      }, icon('trash', 16)) : null
    ]));

    card.appendChild(h('div.hcard-levels', shown.map(function (lv, i) {
      return h('div.hcard-level', [
        h('span.lvl-n', 'L' + (i + 1)),
        h('span.lvl-name', lv.label)
      ]);
    })));

    if (levels.length > max) {
      card.appendChild(h('button.linkbtn', {
        type: 'button',
        onclick: function (e) {
          if (e && e.stopPropagation) e.stopPropagation();
          if (opts.ontoggle) opts.ontoggle();
        }
      }, open ? 'Show fewer levels' :
                'View ' + (levels.length - max) + ' more level' +
                (levels.length - max === 1 ? '' : 's')));
    }

    if (opts.summary) card.appendChild(h('div.hcard-scope', opts.summary));

    if (opts.onselect) {
      card.addEventListener('click', function () { opts.onselect(); });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.preventDefault) e.preventDefault();
          opts.onselect();
        }
      });
    }
    return card;
  }

  function confetti(opts) {
    opts = opts || {};
    var reduced = window.matchMedia &&
                  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    var hues = ['lilac', 'mint', 'sky', 'peach', 'butter', 'blush'];
    var box = h('div.confetti', { 'aria-hidden': 'true' });
    var count = opts.count || 70;

    for (var i = 0; i < count; i++) {
      var hue = hues[i % hues.length];
      box.appendChild(h('i', {
        style: {
          left: (Math.random() * 100).toFixed(2) + '%',
          background: 'var(--' + hue + '-solid)',
          width: (6 + Math.random() * 6).toFixed(0) + 'px',
          height: (8 + Math.random() * 8).toFixed(0) + 'px',
          borderRadius: Math.random() > 0.6 ? '50%' : '2px',
          animationDelay: (Math.random() * 0.5).toFixed(2) + 's',
          animationDuration: (1.9 + Math.random() * 1.4).toFixed(2) + 's',
          transform: 'rotate(' + Math.floor(Math.random() * 360) + 'deg)'
        }
      }));
    }

    document.body.appendChild(box);
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
    }, opts.life || 3400);
    return box;
  }

  /* ---- collection screen ------------------------------------
     Employees, Departments and Operational area all behave the same:
     with nothing added yet, ask HOW ("Create manually" / "Bulk
     upload"); once there is data, show it with search, filters and a
     primary Add button top-right that asks how again.

     cfg = {
       singular, plural,
       items()            -> current array
       manual(done)       -> node; call done('Anita added.') when one is
                             added, to land on the list; done() bare just
                             refreshes in place (the boundary picker does)
       bulkRows(file)     -> array of new items for a chosen file
       onBulk(rows)       -> commit them
       row(item, i, redraw)-> node
       match(item, query) -> bool
       filters: [{ id, label, options(), match(item, value) }]
       listHeader()      -> node above the toolbar, or null
       afterChoose(done) -> a question asked once they have picked
                             manually or a file, before either starts;
                             call done() to get on with that route
       onAdd()           -> a new pass is starting; forget the last one
       bulkTitle         -> heading for the upload panel
       templateColumns() -> headers for the downloadable template
       templateExample() -> one example row for it, optional
       chooserNoun       -> what the opening question asks about
       listClass         -> class for the row container (default "list")
       addLabel          -> label for the primary Add button
       manualDesc, bulkDesc
     }                                                            */
  function collection(cfg) {
    var wrap = h('div');
    var mode = cfg.items().length ? 'list' : 'choose';
    var pending = '';                 /* the route waiting on that question */
    var query = '';
    var active = {};                  /* filter id -> chosen value */
    var notice = null;

    function backToList() {
      mode = cfg.items().length ? 'list' : 'choose';
      draw();
    }

    /* picking a route may have one question in front of it */
    function pick(route) {
      if (cfg.afterChoose) { pending = route; mode = 'named'; }
      else mode = route;
      draw();
    }
    /* Adding another starts at the front again — and says so, because
       a screen with a `before` step is usually holding some state for
       the thing being added and needs to start fresh. */
    function addAnother() {
      if (cfg.onAdd) cfg.onAdd();
      mode = 'choose';
      draw();
    }

    /* ---- how would you like to add them? ---- */
    function chooser() {
      return h('div', [
        h('h3', { style: { font: 'var(--t-title)', marginBottom: 'var(--s-4)' } },
          'How do you want to add your ' + (cfg.chooserNoun || cfg.plural) + '?'),
        h('div.rolegrid', [
          card('form', 'lilac', 'Create manually',
               cfg.manualDesc || 'Add them one at a time.',
               function () { pick('manual'); }),
          card('grid', 'mint', 'Bulk upload',
               cfg.bulkDesc || 'Upload a file and we will bring them in.',
               function () { pick('bulk'); })
        ])
      ]);
    }

    function card(ic, hue, title, desc, onclick) {
      return h('div.rolecard', [
        h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
          icon(ic, 26)),
        h('h3', title),
        h('p', desc),
        btn(title === 'Bulk upload' ? 'Upload a file' : 'Start adding', {
          variant: 'secondary', sm: true, icon: 'arrow', iconRight: true, onclick: onclick
        })
      ]);
    }

    /* ---- bulk: any file produces data ---- */
    function bulk() {
      var fileIn = h('input', { type: 'file', style: { display: 'none' } });
      fileIn.addEventListener('change', function () {
        var f = fileIn.files && fileIn.files[0];
        if (!f) return;
        var rows = cfg.bulkRows(f);
        cfg.onBulk(rows);
        notice = rows.length + ' ' + (rows.length === 1 ? cfg.singular : cfg.plural) +
                 ' imported from ' + (f.name || 'your file') + '.';
        mode = 'list';
        draw();
      });

      /* Nobody guesses column names right. Hand them the file. */
      function downloadTemplate() {
        var cols = (cfg.templateColumns && cfg.templateColumns()) || ['Name'];
        var rows = [cols];
        var eg = cfg.templateExample && cfg.templateExample();
        if (eg && eg.length) rows.push(eg);
        var csv = rows.map(function (r) {
          return r.map(function (cell) {
            var v = String(cell === undefined ? '' : cell);
            return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
          }).join(',');
        }).join('\n') + '\n';

        var a = h('a', {
          href: 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv),
          download: (cfg.templateFile || cfg.plural).replace(/\s+/g, '-') + '-template.csv'
        });
        document.body.appendChild(a);
        a.click();
        if (a.parentNode) a.parentNode.removeChild(a);
        announce('Template downloaded.');
      }

      return h('div', [
        h('div.rolecard', { style: { aspectRatio: 'auto', alignItems: 'center', textAlign: 'center', maxWidth: '440px', padding: 'var(--s-6)' } }, [
          h('div.ic', { style: { background: 'var(--mint-fill)', color: 'var(--mint-ink)' } },
            icon('grid', 26)),
          h('h3', cfg.bulkTitle || ('Upload your ' + cfg.plural)),
          h('p', 'Choose a spreadsheet or CSV. This is a prototype, so any file will bring in a sample set.'),
          btn('Choose a file', { icon: 'grid', onclick: function () { fileIn.click(); } }),
          h('div.sublabel', { style: { margin: 'var(--s-3) 0 0' } },
            'Not sure of the columns? Start from ours.'),
          btn('Download template', { variant: 'ghost', sm: true, icon: 'down', onclick: downloadTemplate }),
          fileIn
        ])
      ]);
    }

    /* ---- the toolbar above the data ---- */
    function toolbar() {
      var search = input({
        id: 'coll-q',
        placeholder: 'Search ' + cfg.plural + '…',
        value: query,
        oninput: function (v) { query = v; drawBody(); }
      });

      var controls = [h('div', { style: { flex: '1', minWidth: '200px' } }, [search])];

      (cfg.filters || []).forEach(function (f) {
        var opts = f.options();
        if (!opts.length) return;
        controls.push(h('div', { style: { minWidth: '170px' } }, [
          select({
            /* no placeholder — the "All …" option already means
               "not filtering", and two of them is one too many */
            value: active[f.id] || '',
            options: [{ value: '', label: 'All ' + f.label.toLowerCase() }].concat(
              opts.map(function (o) { return { value: o, label: o }; })),
            onchange: function (v) { active[f.id] = v; drawBody(); }
          })
        ]));
      });

      controls.push(btn(cfg.addLabel || ('Add ' + cfg.plural), {
        sm: true, icon: 'plus', onclick: addAnother
      }));

      return h('div.coll-bar', controls);
    }

    function matching() {
      var q = query.trim().toLowerCase();
      return cfg.items().filter(function (it) {
        if (q && cfg.match && !cfg.match(it, q)) return false;
        var keep = true;
        (cfg.filters || []).forEach(function (f) {
          var v = active[f.id];
          if (v && !f.match(it, v)) keep = false;
        });
        return keep;
      });
    }

    var body = h('div');
    function drawBody() {
      clear(body);
      var rows = matching();
      var total = cfg.items().length;

      body.appendChild(h('div.sublabel', { style: { marginBottom: 'var(--s-3)' } },
        rows.length === total
          ? total + ' ' + (total === 1 ? cfg.singular : cfg.plural)
          : 'Showing ' + rows.length + ' of ' + total));

      if (!rows.length) {
        body.appendChild(h('div.empty', [
          h('div.ic', icon('eye', 24)),
          h('h3', 'Nothing matches'),
          h('p', 'Try a different search, or clear the filters.')
        ]));
        return;
      }
      var listEl = h('div.' + (cfg.listClass || 'list'), rows.map(function (it, i) {
        /* removing the last one leaves nothing to show, so ask how
           they want to add again rather than sit on an empty list */
        return cfg.row(it, i, function () {
          if (!cfg.items().length) { mode = 'choose'; draw(); } else drawBody();
        });
      }));
      /* a collection that reads as a table gets its column header */
      if (cfg.tableHead) listEl.insertBefore(cfg.tableHead(), listEl.firstChild);
      body.appendChild(listEl);
    }

    function draw() {
      clear(wrap);
      /* only the manual/bulk sub-modes hand Back a target inside the
         screen; every other mode lets Back leave the screen */
      window.COLL_BACK = null;
      /* a row's Edit action needs a way back into the form */
      window.COLL_MANUAL = function () { mode = 'manual'; draw(); };
      if (notice && mode === 'list') {
        wrap.appendChild(banner('ok', notice, 'check'));
        notice = null;
      }
      if (mode === 'named') {
        wrap.appendChild(cfg.afterChoose(function () {
          mode = pending || 'manual';
          draw();
        }));
        return;
      }
      if (mode === 'choose') {
        /* one Back per screen: while the chooser is up over an existing
           list, Back returns to that list rather than leaving */
        if (cfg.items().length) window.COLL_BACK = backToList;
        wrap.appendChild(chooser());
        return;
      }
      if (mode === 'bulk')   {
        window.COLL_BACK = function () { mode = 'choose'; draw(); };
        wrap.appendChild(bulk()); return;
      }
      if (mode === 'manual') {
        window.COLL_BACK = function () { mode = 'choose'; draw(); };
        /* Adding one by hand lands on the same list a bulk import does,
           with that single entry in it — search, filters and all.
           A form with a step in front of it (the boundary hierarchy)
           gets handed the two trailing pieces so it can hide them
           until its own question is answered. */
        /* No "Done adding" here — Save at the foot of the screen is the
           single point of confirmation. */
        var acts = h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          btn('Bulk upload instead', { variant: 'ghost',
            onclick: function () { mode = 'bulk'; draw(); } })
        ]);
        var below = h('div', { style: { marginTop: 'var(--s-5)' } });

        wrap.appendChild(cfg.manual(function (msg) {
          if (msg) { notice = msg; mode = 'list'; draw(); return; }
          drawBody();
        }, { actions: acts, list: below }));

        wrap.appendChild(acts);
        if (cfg.items().length) { below.appendChild(body); wrap.appendChild(below); drawBody(); }
        return;
      }
      if (cfg.listHeader) {
        var head = cfg.listHeader();
        if (head) wrap.appendChild(head);
      }
      wrap.appendChild(toolbar());
      wrap.appendChild(body);
      drawBody();
    }

    draw();
    return wrap;
  }

  /* ---- cascading boundary picker ----------------------------
     One multi-select per level. Choosing at a level only redraws the
     levels BELOW it, so the dropdown you are working in stays open
     while you tick several options. */
  function boundaryPicker(opts) {
    opts = opts || {};
    var levels = opts.levels || window.DATA.LEVELS.map(function (l) { return l.id; });
    var slots = levels.map(function () { return h('div'); });
    var wrap = h('div', slots);

    var rootLevel = window.DATA.levelById(levels[0]);

    function drawSlot(i) {
      var levelId = levels[i];
      var lv = window.DATA.levelById(levelId);
      var sel = opts.get();

      /* Nothing below the root is selectable until the root is chosen.
         After that every deeper level is open, so a level can be
         skipped — leaving it empty means "all of them". */
      var gated = i > 0 && !(sel[rootLevel.key] || []).length;
      var options = gated ? [] : window.DATA.optionsForLevel(levelId, sel);
      var chosen = (sel[lv.key] || []).filter(function (x) { return options.indexOf(x) !== -1; });

      var ms = multiSelect({
        id: 'b-' + levelId,
        options: options,
        values: chosen,
        placeholder: 'Select ' + lv.label.toLowerCase(),
        emptyText: gated ? 'Choose a ' + rootLevel.label.toLowerCase() + ' first' : 'Nothing to choose',
        onchange: function (values) {
          var s = opts.get();
          s[lv.key] = values;
          /* emptying the root invalidates everything below it */
          if (i === 0 && !values.length) {
            levels.slice(1).forEach(function (id) {
              s[window.DATA.levelById(id).key] = [];
            });
          }
          window.DATA.pruneSelection(s);
          opts.set(s);
          for (var j = i + 1; j < levels.length; j++) drawSlot(j);
          if (opts.onchange) opts.onchange(s);
        }
      });

      clear(slots[i]);
      slots[i].appendChild(field(lv.label, ms, {
        id: 'b-' + levelId,
        optional: !!opts.optionalFrom && i >= opts.optionalFrom,
        hint: options.length
          ? (chosen.length ? chosen.length + ' of ' + options.length + ' selected'
                           : 'Leave empty to include all ' + options.length)
          : null
      }));
    }

    levels.forEach(function (_, i) { drawSlot(i); });
    return wrap;
  }

  /* The complaint lifecycle as a chain of pastel chips. */
  function chain(steps) {
    return h('div.chain', steps.map(function (step, i) {
      return h('span.chain-item', [
        i ? h('i.chain-arrow', { 'aria-hidden': 'true' }, '→') : null,
        h('b', { style: { background: 'var(--' + step[1] + '-fill)', color: 'var(--' + step[1] + '-ink)' } },
          step[0])
      ]);
    }));
  }

  /* One configurable part of a service, as a card. `action` is the
     node placed at the bottom — an Edit button or a Preview link. */
  function partCard(part, action) {
    return h('div.drill', [
      h('div.drill-top', [
        h('div.ic', { style: { background: 'var(--' + part.hue + '-fill)', color: 'var(--' + part.hue + '-ink)' } },
          icon(part.icon, 19))
      ]),
      h('h3', part.title),
      h('p', part.desc),
      action
    ]);
  }

  /* In-product page header. */
  function pageHead(title, sub, end) {
    return h('div.page-head', [
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--s-3)' } },
        [h('h1', title), end || null]),
      sub ? h('p', sub) : null
    ]);
  }

  window.UI = {
    h: h, clear: clear, append: append, icon: icon, field: field, input: input,
    screen: screen, pageHead: pageHead, chain: chain, partCard: partCard,
    multiSelect: multiSelect, boundaryPicker: boundaryPicker, collection: collection,
    confetti: confetti, hierarchyCard: hierarchyCard, toggle: toggle,
    typeCards: typeCards, typeList: typeList, tabs: tabs,
    select: select, optionCards: optionCards, multiCards: multiCards, banner: banner,
    btn: btn, avatar: avatar, initials: initials, hueFor: hueFor, modal: modal,
    announce: announce, isEmail: isEmail, slugify: slugify
  };
})();
