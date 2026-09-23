/* ============================================================
   app.js — router, chrome and progress.

   Screens declare themselves in window.SCREENS. Their push order
   (set by the script order in index.html) IS the flow order, so
   adding a question means inserting one object in the right place.

   A screen can override the linear path with `next` / `back`
   (a screen id, or a function returning one). Organisation setup
   uses this to hang off Home instead of sitting on the main path.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h;
  var SCREENS = window.SCREENS || [];
  var root = document.getElementById('root');
  var progressEl = document.getElementById('progress');

  function byId(id) {
    for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i].id === id) return SCREENS[i];
    return null;
  }
  function indexOf(id) {
    for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i].id === id) return i;
    return -1;
  }

  /* A screen is skipped when its `when()` says it does not apply —
     this is how the location-assignment branch disappears. */
  function applies(s) { return !s.when || s.when(); }

  function override(screen, key) {
    var v = screen ? screen[key] : null;
    if (typeof v === 'function') v = v();
    return (typeof v === 'string' && byId(v)) ? v : null;
  }

  /* Editing one part of a service walks ONLY that part's questions.
     While a scope is set, navigation ignores every screen belonging
     to another part, and running out of them ends the edit. */
  function scope() { return STORE.get('edit.scope', ''); }
  function inScope(s) { return !scope() || s.part === scope(); }

  function nextId(id) {
    var ov = override(byId(id), 'next');
    if (ov) return ov;
    for (var i = indexOf(id) + 1; i < SCREENS.length; i++) {
      if (applies(SCREENS[i]) && inScope(SCREENS[i])) return SCREENS[i].id;
    }
    return null;
  }
  function prevId(id) {
    var ov = override(byId(id), 'back');
    if (ov) return ov;
    for (var i = indexOf(id) - 1; i >= 0; i--) {
      if (applies(SCREENS[i]) && inScope(SCREENS[i])) return SCREENS[i].id;
    }
    return null;
  }

  function endScope() {
    var back = STORE.get('edit.back', '');
    STORE.set('edit.scope', '');
    STORE.set('edit.back', '');
    return back;
  }

  function currentId() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    return byId(raw) ? raw : SCREENS[0].id;
  }

  function go(id) {
    if (!byId(id)) return;
    setupPopOpen = false;   /* the panel is about "what's next", not a sticky menu */
    location.hash = '#/' + id;
  }

  /* ---- accent: the branding choice recolours the brand tokens */
  function applyAccent() {
    var a = STORE.get('org.branding.accent', 'lilac');
    var r = document.documentElement.style;
    r.setProperty('--brand-fill',  'var(--' + a + '-fill)');
    r.setProperty('--brand-solid', 'var(--' + a + '-solid)');
    r.setProperty('--brand-ink',   'var(--' + a + '-ink)');
    r.setProperty('--focus', getComputedStyle(document.documentElement)
      .getPropertyValue('--' + a + '-ink').trim() || '#4A45A8');
  }

  /* ---- progress ---------------------------------------------
     Relative to the CURRENT phase, so the bar means something in
     each guided run (sign-up, org setup, customisation) instead of
     crawling across thirty screens. Still no step numbers. */
  function drawProgress(screen) {
    if (screen.showProgress === false) { progressEl.hidden = true; return; }
    progressEl.hidden = false;
    var list = SCREENS.filter(function (s) {
      return s.phase === screen.phase && applies(s) && inScope(s) && s.showProgress !== false;
    });
    var pos = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === screen.id) pos = i;
    var pct = list.length ? Math.round(((pos + 1) / list.length) * 100) : 0;
    progressEl.firstElementChild.style.width = pct + '%';
    progressEl.setAttribute('aria-valuenow', String(pct));
  }

  /* ---- in-product sidebar ---------------------------------- */
  /* No "Complaint Management" item by request. Published services are
     reached from Home, which always offers a route once any system
     exists — see the systems section in screens-system.js. */
  var NAV = [
    { key: 'home',      label: 'Home',                icon: 'home', go: 'home' },
    { key: 'templates', label: 'Complaints Template', icon: 'form', go: 'templates' }
  ];

  function firstIncompleteArea() {
    var list = window.ORG_SETUP_AREAS || window.ORG_AREAS;
    if (!list) return 'org-branding';
    var marked = STORE.get('org.areasDone', []) || [];
    var a = list.filter(function (x) { return marked.indexOf(x.id) === -1; })[0];
    return a ? a.id : 'org-branding';
  }

  /* The organisation-setup nudge. On the tick that completes it, the
     card turns green and confetti fires; a moment later it retires for
     good. `org.setupCelebrated` makes that a one-off, not something
     that replays on every render. */
  var celebrating = false;
  var setupPopOpen = false;

  function buildSetupCard() {
    var p = window.ORG_PROGRESS ? window.ORG_PROGRESS() : { done: 0, total: 5 };
    var done = p.done >= p.total;

    if (done && STORE.get('org.setupCelebrated')) return null;

    if (done) {
      var card = h('div.setupcard.is-done', [
        h('div.t', [UI.icon('check', 17), 'Your organisation is set up', h('span', '')]),
        h('div.track', h('i', { style: { width: '100%' } })),
        h('small', p.total + ' of ' + p.total + ' completed')
      ]);

      if (!celebrating) {
        celebrating = true;
        setTimeout(function () { UI.confetti(); }, 60);
        setTimeout(function () {
          STORE.set('org.setupCelebrated', true);
          celebrating = false;
          /* Remove by selector, not by the node captured above: a
             re-render during these few seconds replaces that node, and
             holding the stale one would leave the card on screen. A
             full re-render would work too, but would tear down
             anything else open. */
          var live = document.querySelectorAll('.setupcard.is-done');
          Array.prototype.forEach.call(live, function (el) {
            if (el.parentNode) el.parentNode.removeChild(el);
          });
        }, 2600);
      }
      return card;
    }

    var next = firstIncompleteArea();
    var area = (window.ORG_SETUP_AREAS || []).filter(function (a) { return a.id === next; })[0];

    var card = h('button.setupcard' + (setupPopOpen ? '.is-open' : ''), {
      type: 'button',
      'aria-expanded': setupPopOpen ? 'true' : 'false',
      onclick: function (e) {
        /* Clicking the card reveals what is next; only "Go to Setup"
           navigates, so nobody is dropped into a screen unannounced. */
        e.stopPropagation();
        setupPopOpen = !setupPopOpen;
        render();
      }
    }, [
      h('div.t', ['Let’s set up your organisation', h('span', setupPopOpen ? '‹' : '›')]),
      h('div.track', h('i', { style: { width: Math.round((p.done / p.total) * 100) + '%' } })),
      h('small', p.done + ' of ' + p.total + ' completed')
    ]);

    /* What to do next, said out loud — the card alone tells you how far
       in you are, not what is waiting. Sits alongside on hover or when
       the card takes focus, so it is reachable by keyboard too. */
    var pop = area ? h('div.setup-pop' + (setupPopOpen ? '.is-open' : ''), {
      onclick: function (e) { e.stopPropagation(); }
    }, [
      h('div.t', [UI.icon('rocket', 15), 'Next Step: ', h('b', area.label)]),
      h('p', area.need + '.'),
      h('div.setup-pop-acts', [
        UI.btn('Go to Setup', {
          sm: true, icon: 'arrow', iconRight: true,
          onclick: function () { setupPopOpen = false; go(area.id); }
        }),
        /* Always offered — a demo gets walked through repeatedly, not
           only on a blank slate. */
        UI.btn('Take the walkthrough', {
          sm: true, variant: 'secondary',
          onclick: function () { setupPopOpen = false; render(); startWalkthrough(); }
        })
      ])
    ]) : null;

    return h('div.setupwrap', [card, pop]);
  }

  /* The panel is an overlay, so it closes the way the topbar menus do:
     click anywhere else, or press Escape. */
  document.addEventListener('click', function () {
    if (!setupPopOpen) return;
    setupPopOpen = false;
    render();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && setupPopOpen) { setupPopOpen = false; render(); }
  });

  /* The sidebar scrolls, which clips anything absolutely positioned
     inside it — so the panel is fixed and anchored by measurement. */
  function placeSetupPop() {
    var pop = document.querySelector('.setup-pop.is-open');
    var card = document.querySelector('.setupcard');
    if (!pop || !card) return;
    var c = card.getBoundingClientRect();
    var w = pop.offsetWidth || 262;
    var left = c.right + 14;
    if (left + w > window.innerWidth - 12) left = Math.max(12, c.left - w - 14);
    pop.style.left = left + 'px';
    pop.style.top = Math.max(12, Math.min(c.top, window.innerHeight - pop.offsetHeight - 12)) + 'px';
  }

  /* ---- guided walkthrough (only offered on a blank slate) ---- */
  function startWalkthrough() {
    var steps = (window.ORG_SETUP_AREAS || []).slice();
    if (!steps.length) return;
    var i = 0;
    var root = h('div.wt-scrim');

    function close(skip) {
      if (skip) STORE.set('org.walkthroughSkipped', true);
      if (root.parentNode) root.parentNode.removeChild(root);
      document.removeEventListener('keydown', onKey);
      render();
    }
    function onKey(e) {
      if (e.key === 'Escape') close(true);
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    }
    function next() { if (i < steps.length - 1) { i++; draw(); } else { close(false); go(steps[0].id); } }
    function prev() { if (i > 0) { i--; draw(); } }

    function scrollerFor(el) {
      /* the real scroller is whichever ancestor actually overflows —
         `.side-nav` renders at natural height, `.sidebar` scrolls */
      for (var n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        var ov = getComputedStyle(n).overflowY;
        if ((ov === 'auto' || ov === 'scroll') && n.scrollHeight > n.clientHeight) return n;
      }
      return null;
    }

    function draw() {
      UI.clear(root);
      var a = steps[i];
      var target = document.querySelector('.nav-item[title="' + a.label + '"]');
      var box = null;
      if (target) {
        var sc = scrollerFor(target);
        if (sc) {
          var t0 = target.getBoundingClientRect(), s0 = sc.getBoundingClientRect();
          sc.scrollTop += (t0.top - s0.top) - (s0.height - t0.height) / 2;
        }
        box = target.getBoundingClientRect();
        /* an off-screen ring is worse than none — clamp against the
           viewport, which is what the user can actually see */
        if (box.top < 0 || box.bottom > window.innerHeight) box = null;
      }

      if (box) {
        root.appendChild(h('div.wt-ring', {
          style: {
            top: (box.top - 4) + 'px', left: (box.left - 4) + 'px',
            width: (box.width + 8) + 'px', height: (box.height + 8) + 'px'
          }
        }));
      }

      var card = h('div.wt-card', {
        style: box
          ? { top: Math.min(box.top - 8, window.innerHeight - 260) + 'px', left: (box.right + 18) + 'px' }
          : { top: '96px', left: '300px' }
      }, [
        h('div.wt-count', 'Step ' + (i + 1) + ' of ' + steps.length),
        h('div.wt-t', a.label),
        h('p.wt-p', a.need + '.'),
        h('div.wt-dots', steps.map(function (_, n) {
          return h('i' + (n === i ? '.is-on' : ''));
        })),
        h('div.wt-acts', [
          UI.btn(i === steps.length - 1 ? 'Start setup' : 'Next', {
            sm: true, onclick: next
          }),
          i > 0 ? UI.btn('Back', { sm: true, variant: 'ghost', onclick: prev }) : null,
          h('button.wt-skip', { type: 'button', onclick: function () { close(true); } }, 'Skip')
        ])
      ]);
      root.appendChild(card);
    }

    root.addEventListener('click', function (e) { if (e.target === root) close(true); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(root);
    draw();
  }
  window.ORG_WALKTHROUGH = startWalkthrough;

  /* Screens where the nav is in the way of the work start collapsed.
     Opening it is one click, and it stays open until they move to
     another one of those screens. */
  var navOpened = false;
  var navCollapsed = false;   /* set by the sidebar toggle, any screen */
  var lastScreenId = '';
  var priorScreenId = '';   /* the screen actually visited before this one */

  function sidebar(active, collapsed) {
    var logo = STORE.get('org.branding.logo');
    var brandName = STORE.get('org.branding.name') || STORE.orgName();

    var nav = h('nav.side-nav');
    NAV.forEach(function (n) {
      nav.appendChild(h('button.nav-item', {
        type: 'button', title: n.label,
        'aria-current': n.key === active ? 'page' : null,
        onclick: function () { go(n.go); }
      }, [UI.icon(n.icon, 17), h('span.lbl', n.label)]));
    });

    /* The rest of the nav is the organisation setup — the same plain
       list of icons as everything above it. How far in they are lives
       on the progress card at the bottom, not up here. */
    var seenGroups = {};
    (window.ORG_AREAS || []).forEach(function (a) {
      if (a.navHidden) return;
      if (a.group && !seenGroups[a.group]) {
        seenGroups[a.group] = true;
        nav.appendChild(h('div.nav-sec', a.group));
      }
      nav.appendChild(h('button.nav-item', {
        type: 'button', title: a.label,
        'aria-current': a.nav === active ? 'page' : null,
        onclick: function () { go(a.id); }
      }, [UI.icon(a.icon, 17), h('span.lbl', a.label)]));
    });

    var setupCard = buildSetupCard();

    return h('aside.sidebar' + (collapsed ? '.is-collapsed' : ''), [
      h('button.side-toggle', {
        type: 'button',
        'aria-expanded': collapsed ? 'false' : 'true',
        'aria-label': collapsed ? 'Open the menu' : 'Close the menu',
        title: collapsed ? 'Open sidebar' : 'Close sidebar',
        onclick: function () { navCollapsed = !collapsed; navOpened = collapsed; render(); }
      }, UI.icon('panel', 18)),
      h('div.side-brand', [
        h('div.logo', { style: logo ? { backgroundImage: 'url(' + logo + ')' } : null },
          logo ? '' : UI.initials(brandName)),
        h('div.nm', brandName)
      ]),
      setupCard,
      nav,
      h('div.side-foot', [
        h('button.console-switch', {
          type: 'button',
          title: 'Switch to Management Console',
          onclick: function () {
            window.location.href = '../index.html?resume=studio'
              + '&org=' + encodeURIComponent(STORE.get('org.name') || '')
              + '&email=' + encodeURIComponent(STORE.get('account.email') || '');
          }
        }, [
          UI.icon('grid', 16),
          h('span.cs-tx', [h('b', 'Switch to Management Console')]),
          UI.icon('arrow', 15)
        ]),
        /* A prototype gets demoed repeatedly, and answered questions
           are remembered — so make starting the setup over easy. */
        h('button.side-reset', {
          type: 'button',
          onclick: function () {
            var m = UI.modal({
              icon: 'rocket',
              title: 'Start the setup over?',
              desc: 'This clears every completed setup step and puts the counter back to 0 of 6. You stay signed in.',
              actions: [
                UI.btn('Reset setup', { onclick: function () { m.close(); window.APP.restart(); } }),
                UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })
              ]
            });
          }
        }, 'Reset setup')
      ])
    ]);
  }

  /* ---- render ---------------------------------------------- */
  /* ---- help rail -------------------------------------------- */
  var DOCS_URL = 'https://docs.digit.org/complaints-management';

  var HELP = {
    home:           { title: 'Getting started with onboarding',  desc: 'How the six setup steps fit together and what to prepare before you begin.' },
    profile:        { title: 'Managing your profile',            desc: 'Display name, recovery email and how password changes are handled.' },
    templates:      { title: 'Working with complaint templates', desc: 'What a template includes and how customising one creates a live service.' },
    branding:       { title: 'Branding and themes',              desc: 'Logo requirements, the citizen-facing name, and what each brand theme changes.' },
    language:       { title: 'Languages and localisation',       desc: 'Setting a default language and what gets translated for citizens.' },
    departments:    { title: 'Setting up departments',           desc: 'Naming conventions, department codes and how routing uses them.' },
    employees:      { title: 'Adding employees',                 desc: 'Bulk upload columns, department mapping and role assignment.' },
    'operational-area': { title: 'Defining your geography',      desc: 'Boundary hierarchies, levels and the areas a service can run in.' },
    notifications:  { title: 'Notification channels',            desc: 'Configuring email, SMS and WhatsApp accounts for citizen updates.' }
  };

  function helpRail(screen) {
    var key = screen.nav || screen.id;
    var doc = HELP[key] || HELP.home;
    if (!helpOpen) return null;
    return h('aside.helprail', [
      h('div.hr-head', [
        UI.icon('book', 16),
        h('span', 'Help and documentation'),
        h('button.hr-close', {
          type: 'button', 'aria-label': 'Close help',
          onclick: function () { helpOpen = false; render(); }
        }, UI.icon('x', 16))
      ]),
      h('a.hr-doc', { href: DOCS_URL, target: '_blank', rel: 'noopener' }, [
        h('b', doc.title),
        h('span', doc.desc),
        h('span.hr-go', ['Read the guide', UI.icon('arrow', 14)])
      ]),
      h('div.hr-sec', 'More'),
      h('a.hr-link', { href: DOCS_URL, target: '_blank', rel: 'noopener' },
        [UI.icon('form', 15), h('span', 'All documentation')]),
      h('a.hr-link', { href: DOCS_URL, target: '_blank', rel: 'noopener' },
        [UI.icon('people', 15), h('span', 'Contact platform support')])
    ]);
  }

  /* The rail is opt-in: only a small icon sits in the topbar until it
     is asked for. */
  var helpOpen = false;

  function helpToggle() {
    return h('button.tb-help' + (helpOpen ? '.is-on' : ''), {
      type: 'button',
      'aria-expanded': helpOpen ? 'true' : 'false',
      'aria-label': helpOpen ? 'Hide help and documentation' : 'Help and documentation',
      title: 'Help and documentation',
      onclick: function () { helpOpen = !helpOpen; render(); }
    }, UI.icon('book', 17));
  }

  function render() {
    applyBrandTheme();
    /* a collection sub-mode registers its own Back target; clear it per
       render so a previous screen's closure never intercepts this one */
    window.COLL_BACK = null;
    UI.clear(document.getElementById('modal-root'));

    var screen = byId(currentId());

    if (!applies(screen)) {
      var fwd = nextId(screen.id);
      if (fwd) { go(fwd); return; }
    }

    if (screen.id !== lastScreenId) {
      priorScreenId = lastScreenId;
      lastScreenId = screen.id;
      navOpened = false;
    }

    /* Reaching Home means the run of questions asked right after login
       is behind them — whether they answered them, skipped them, or
       were sent straight here because they had answered them before.
       Without this, a returning person clicking Branding or Language
       got the standalone version with no side nav. */
    if (screen.id === 'home' && !STORE.get('org.setupRunOver')) {
      STORE.set('org.setupRunOver', true);
    }

    applyAccent();
    drawProgress(screen);
    UI.clear(root);

    var ctx = {
      go: go,
      /* Running out of in-scope screens finishes a part edit and
         returns to wherever it was launched from. */
      next: function () {
        var n = nextId(screen.id);
        if (n) { go(n); return; }
        var back = scope() ? endScope() : '';
        if (back) go(back);
      },
      back: function () {
        var p = prevId(screen.id);
        if (p) { go(p); return; }
        var back = scope() ? endScope() : '';
        if (back) go(back);
      },
      refresh: render,
      screenId: screen.id,
      /* where the user actually came from, ignoring screen-level
         `back` overrides */
      goPrior: function () { go(priorScreenId || 'home'); }
    };

    /* A screen may decide: the three questions asked right after login
       stand alone until that run is over, then they are nav pages.
       Asked BEFORE rendering, so a screen that fills something in on
       the way past cannot change its own chrome underneath itself. */
    var chrome = typeof screen.chrome === 'function' ? screen.chrome() : screen.chrome;

    var content = screen.render(ctx);

    if (chrome === 'app') {
      var main = h('main.main', [
        h('div.topbar', [
          h('h2', screenTitle(screen)),
          h('div.topbar-end', [helpToggle(), themePicker(), profileMenu()])
        ]),
        h('div.main-body', [
          /* a screen with a fixed action bar needs room under its content
             so the last card is not hidden behind it */
          h('div', {
            class: 'content screen-enter' + (screen.narrow ? ' narrow' : '') +
                   (screen.stickyBar ? ' has-bar' : '')
          }, Array.isArray(content) ? content : [content]),
          helpRail(screen)
        ])
      ]);
      var collapsed = navCollapsed || (!!screen.collapseNav && !navOpened);
      root.appendChild(h('div.shell' + (collapsed ? '.is-tight' : ''),
        [sidebar(screen.nav, collapsed), main]));
    } else {
      var inner = h('div.focus-inner.screen-enter', Array.isArray(content) ? content : [content]);
      /* the product mark belongs on the login screen */
      if (screen.phase === 'login') {
        inner.insertBefore(h('div.brandmark', [h('div.bm', 'C'), 'Complaint Systems']), inner.firstChild);
      }
      root.appendChild(h('div.focus' + (screen.wide ? '.wide' : ''), [inner]));
    }

    window.scrollTo(0, 0);
    if (setupPopOpen) placeSetupPop();
  }

  /* ---- topbar: theme picker + profile menu ------------------ */
  /* Brand themes. `themed: true` means a real token set exists; the
     other two are options in the picker without their own styling. */
  window.BRAND_THEMES = [
    { id: 'cms-blue',      label: 'CMS Blue',      hex: '#2563EB', accent: 'sky',    themed: true },
    { id: 'moz-green',     label: 'Moz Green',     hex: '#16794C', accent: 'mint',   themed: true },
    { id: 'digit-orange',  label: 'DIGIT Orange',  hex: '#E2711D', accent: 'butter', themed: false },
    { id: 'bomet-indigo',  label: 'Bomet Indigo',  hex: '#4338CA', accent: 'lilac',  themed: false }
  ];

  function applyBrandTheme() {
    var id = STORE.get('org.branding.theme', 'cms-blue');
    var t = window.BRAND_THEMES.filter(function (x) { return x.id === id; })[0];
    /* only the themed ones swap tokens — anything else stays CMS Blue */
    document.documentElement.setAttribute('data-theme', (t && t.themed) ? t.id : 'cms-blue');
  }
  window.APPLY_BRAND_THEME = applyBrandTheme;

  function themePicker() {
    var current = STORE.get('org.branding.theme', 'cms-blue');
    var open = false;
    var wrap = h('div.tb-menu');
    var cur = window.BRAND_THEMES.filter(function (t) { return t.id === current; })[0] || window.BRAND_THEMES[0];
    var trigger = h('button.tb-chip', { type: 'button', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, [
      h('span.k', 'Theme'), h('span.v', cur.label), UI.icon('chev', 14)
    ]);
    var list = h('div.tb-pop', { role: 'listbox' }, window.BRAND_THEMES.map(function (t) {
      return h('button.tb-opt' + (t.id === current ? '.is-on' : ''), {
        type: 'button', role: 'option', 'aria-selected': t.id === current ? 'true' : 'false',
        onclick: function () {
          STORE.set('org.branding.theme', t.id);
          STORE.set('org.branding.accent', t.accent);
          applyBrandTheme();
          render();
        }
      }, [h('span.sw', { style: { background: t.hex } }), h('span', t.label), t.id === current ? UI.icon('check', 14) : null]);
    }));
    function toggle() {
      open = !open;
      wrap.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    trigger.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener('click', function () { if (open) toggle(); });
    wrap.appendChild(trigger);
    wrap.appendChild(list);
    return wrap;
  }

  function profileMenu() {
    var name = (STORE.get('account.first') || 'Jane') + ' ' + (STORE.get('account.last') || 'Doe');
    var email = STORE.get('account.email') || 'jane.doe@kisumu.go.ke';
    var open = false;
    var wrap = h('div.tb-menu');
    var trigger = h('button.tb-avatar', {
      type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      'aria-label': 'Account menu', title: name
    }, UI.initials(name));
    var pop = h('div.tb-pop.tb-pop-wide', { role: 'menu' }, [
      h('div.tb-who', [h('b', name), h('span', email)]),
      h('button.tb-opt', { type: 'button', role: 'menuitem', onclick: function () { go('profile'); render(); } },
        [UI.icon('people', 15), h('span', 'Edit profile')]),
      h('button.tb-opt', { type: 'button', role: 'menuitem', onclick: logout },
        [UI.icon('back', 15), h('span', 'Log out')])
    ]);
    function toggle() {
      open = !open;
      wrap.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    trigger.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    document.addEventListener('click', function () { if (open) toggle(); });
    wrap.appendChild(trigger);
    wrap.appendChild(pop);
    return wrap;
  }

  function logout() {
    var m = UI.modal({
      icon: 'lock', title: 'Log out?',
      desc: 'You will be returned to the sign-in screen. Your setup progress is kept.',
      actions: [
        UI.btn('Log out', { onclick: function () { m.close(); window.location.href = '../index.html'; } }),
        UI.btn('Stay signed in', { variant: 'ghost', onclick: function () { m.close(); } })
      ]
    });
  }

  function screenTitle(screen) {
    /* the topbar is the product's name, not the screen's — the page
       heading below it already says where you are */
    return 'Complaint Management System Onboarding';
  }

  function unusedScreenTitle(screen) {
    if (screen.id === 'profile') return 'Profile';
    if (screen.id === 'home') return 'Complaint Management System Onboarding';
    if (screen.id === 'templates') return 'Templates';
    if (screen.id === 'org-communication') return 'Notifications';
    if (screen.phase === 'org') return 'Organisation setup';
    if (screen.phase === 'launch') return 'Review';
    return 'Complaint Systems';
  }


  /* ---- public actions used by screens ---------------------- */
  window.APP = {
    go: go,
    /* Each use of a template creates a NEW complaint system, so an
       organisation can run several side by side. The draft exists
       from this moment; the next few screens only collect what is
       needed to configure it. */
    useTemplate: function (templateId) {
      STORE.createSystem(templateId);
      UI.clear(document.getElementById('modal-root'));
      go('svc-name');
      render();
    },
    /* Previewing is read-only: it records which template and where the
       user came from, then hands over to the role chooser. No system
       is created, so a user can look through every role for free. */
    previewTemplate: function (templateId) {
      STORE.set('preview.templateId', templateId);
      STORE.set('preview.from', currentId() === 'home' ? 'home' : 'templates');
      UI.clear(document.getElementById('modal-root'));
      go('preview-role');
      render();
    },
    /* Edit ONE part: walk only its questions, then come back here. */
    editPart: function (partKey, backTo) {
      var part = DATA.partByKey(partKey);
      if (!part || !part.edit) return;
      /* the levels on offer come from the hierarchy this service runs
         in, so make sure that is the one in play before asking */
      var hid = STORE.get('system.hierarchyId', '');
      if (hid) STORE.set('org.activeHierarchyId', hid);
      STORE.set('edit.scope', partKey);
      STORE.set('edit.back', backTo || currentId());
      go(part.edit);
      render();
    },
    /* Walk the WHOLE customisation flow, not one part. */
    editAll: function (fromScreen) {
      STORE.set('edit.scope', '');
      STORE.set('edit.back', '');
      go(fromScreen || 'cust-assignment');
      render();
    },
    restart: function () {
      /* Puts the organisation-setup counter back to 0 of 6 without
         signing anyone out — the progress marks are the only state
         the card reads. */
      STORE.set('org.areasDone', []);
      STORE.set('org.setupCelebrated', false);
      STORE.set('org.walkthroughSkipped', false);
      go('home');
      render();
    },
    render: render
  };

  window.addEventListener('hashchange', render);

  if (!location.hash) location.hash = '#/' + SCREENS[0].id;
  render();
})();
