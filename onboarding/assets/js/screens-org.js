/* ============================================================
   screens-org.js — organisation-level settings.
   These keep the side nav: they are nav destinations. The nav only
   disappears for Use template and Preview template.
   Onboarding covers language, operational area, communication and
   branding. Employees is NOT part of it — that screen is reached
   from the side nav and offers bulk upload or manual entry.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  /* Which org-setup areas are done — drives the sidebar progress card
     and the welcome page. `mins` and `need` feed the "how long / what
     you'll need" promise, so the estimate updates if areas change. */
  var AREAS = [
    { id: 'org-branding', nav: 'branding', label: 'Branding', group: 'Account',
      mins: 1, icon: 'palette', hue: 'butter',
      need: 'Your logo and the name citizens should see (a logo is optional)',
      done: function () { return !!STORE.get('org.branding.name'); } },

    /* a nav destination, not part of the six setup steps; kept beside
       Branding so the Account nav group stays contiguous */
    { id: 'org-language', nav: 'language', label: 'Language', group: 'Account',
      extra: true, mins: 1, icon: 'globe', hue: 'sky',
      need: 'The language your services should default to',
      done: function () { return !!STORE.get('org.language'); } },

    { id: 'org-operational-area', nav: 'operational-area', label: 'Geography', group: 'Organisation',
      mins: 1, icon: 'pin', hue: 'mint',
      need: 'The levels your boundaries go by, and the areas you cover',
      /* done once the top level of the hierarchy in use has something in it */
      done: function () {
        var root = DATA.builtInLevels()[0];
        return !!root && (DATA.orgScope()[root.key] || []).length > 0;
      } },

    { id: 'org-departments', nav: 'departments', label: 'Departments', group: 'Organisation',
      mins: 1, icon: 'sitemap', hue: 'blush',
      need: 'The departments complaints get routed to',
      done: function () { return STORE.get('org.departments', []).length > 0; } },

    /* after departments, because everyone is added to one */
    { id: 'org-employees', nav: 'employees', label: 'Employees', group: 'Organisation',
      mins: 2, icon: 'people', hue: 'lilac',
      need: 'The people who will use your complaint systems',
      done: function () { return STORE.employees().length > 0; } },

    /* lives in the top-level nav, so it is a setup step without a nav
       entry of its own */
    { id: 'templates', nav: 'templates', label: 'Complaints Template', navHidden: true,
      mins: 3, icon: 'form', hue: 'sky',
      need: 'At least one complaint system, started from a template',
      done: function () { return STORE.allSystems().length > 0; } },

    { id: 'org-communication', nav: 'notifications', label: 'Notifications', group: 'Organisation',
      mins: 1, icon: 'bell', hue: 'peach',
      need: 'Which channels you can reach people on — email, SMS or WhatsApp',
      done: function () { return STORE.get('org.channels', []).length > 0; } },

  ];
  window.ORG_AREAS = AREAS;
  window.ORG_SETUP_AREAS = AREAS.filter(function (a) { return !a.extra; });

  function allDone() {
    return window.ORG_SETUP_AREAS.every(function (a) { return a.done(); });
  }
  window.ORG_ALL_DONE = allDone;

  /* Only Language and Branding are asked right after login. The rest
     are set up later from the side nav, so logging in again must not
     drag the person back through these two. */
  var LOGIN_AREAS = ['org-language', 'org-branding'];
  function loginSetupDone() {
    return AREAS.filter(function (a) { return LOGIN_AREAS.indexOf(a.id) !== -1; })
                .every(function (a) { return a.done(); });
  }
  window.ORG_LOGIN_DONE = loginSetupDone;

  /* The run right after login has no side nav — it is a straight line
     of questions. The nav appears the moment they step out of it,
     whether by finishing or by skipping. */
  function loginRunOver() {
    return !!STORE.get('org.setupRunOver') || loginSetupDone();
  }
  function endLoginRun() { STORE.set('org.setupRunOver', true); }
  window.ORG_LOGIN_RUN_OVER = loginRunOver;

  /* Deliberately the flag alone, not loginSetupDone(): opening the
     branding question fills the name in for them, and that must not
     make the nav appear halfway through the run. */
  function runChrome() { return STORE.get('org.setupRunOver') ? 'app' : 'focus'; }

  /* Every area screen offers a way out — the user asked to be able to
     skip the whole thing, not just the first page. */
  function finishLater(ctx) {
    return UI.btn('Finish later', {
      variant: 'ghost',
      onclick: function () { endLoginRun(); ctx.go('home'); }
    });
  }

  /* Progress is a deliberate act, not a side effect of data: an area
     only counts once its own Done / Finish setup button is pressed. */
  function markAreaDone(id) {
    if (!id) return;
    var list = STORE.get('org.areasDone', []) || [];
    if (list.indexOf(id) === -1) STORE.set('org.areasDone', list.concat([id]));
  }
  window.ORG_MARK_DONE = markAreaDone;

  /* Every completion row is the same pair: Back, then Save. Back steps
     to whatever the user actually came from — and while a collection is
     in its manual or bulk sub-mode, back out of that first. */
  function backBtn(ctx) {
    return UI.btn('Back', { variant: 'ghost', onclick: function () {
      if (typeof window.COLL_BACK === 'function') { window.COLL_BACK(); return; }
      var back = STORE.get('ui.returnTo', '');
      if (back) { STORE.set('ui.returnTo', ''); ctx.go(back); return; }
      ctx.goPrior();
    } });
  }

  /* Standalone org screens are reached from the side nav, so they
     save and return rather than continuing a chain. */
  function doneBtn(ctx, cont) {
    var b = UI.btn('Save', { icon: 'check', onclick: function () {
      markAreaDone(ctx.screenId);
      var back = STORE.get('ui.returnTo', '');
      STORE.set('ui.returnTo', '');
      ctx.go(back || 'home');
    } });
    /* mirror whatever gating the screen put on its Continue button */
    if (cont && cont.disabled) b.disabled = true;
    return b;
  }

  function orgProgress() {
    var marked = STORE.get('org.areasDone', []) || [];
    var list = window.ORG_SETUP_AREAS;
    var done = list.filter(function (a) { return marked.indexOf(a.id) !== -1; }).length;
    return { done: done, total: list.length };
  }
  window.ORG_PROGRESS = orgProgress;


  /* ---------- 3.1 Language ---------------------------------- */
  S.push({
    /* The first of the two asked right after login. There is nothing
       before it, so no Back. */
    id: 'org-language', phase: 'org', chrome: runChrome, nav: 'language', narrow: true,
    next: 'org-branding',
    render: function (ctx) {
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true, disabled: !STORE.get('org.language'),
        onclick: function () { if (STORE.get('org.language')) ctx.next(); }
      });

      return UI.screen({
        eyebrow: 'Organisation setup',
        title: 'What language should your organisation use?',
        help: 'This sets the default for forms, notifications and the citizen-facing services you publish.',
        body: UI.field('Language', UI.select({
          id: 'org-lang',
          value: STORE.get('org.language'),
          placeholder: 'Select a language',
          options: DATA.LANGUAGES.map(function (l) {
            return { value: l.id, label: l.label };
          }),
          onchange: function (v) {
            STORE.set('org.language', v);
            cont.disabled = !v;
          }
        }), { id: 'org-lang', hint: 'You can add more languages later.' }),
        /* during the run it continues; afterwards it is a settings
           page, so it saves and hands back */
        actions: STORE.get('org.setupRunOver')
          ? [backBtn(ctx), doneBtn(ctx, cont)]
          : [cont, finishLater(ctx)]
      });
    }
  });

  /* ---------- Operational area ------------------------------
     An organisation can keep several boundary hierarchies. This lists
     them as cards — what each is called and the levels it goes by —
     and the one you pick is the one everything else works in. Making a
     new one by hand is three questions: its name, its levels, and then
     what sits in them. A file skips all three. */
  S.push({
    id: 'org-operational-area', phase: 'org', chrome: 'app', nav: 'operational-area',
    back: 'home', next: 'home',
    render: function (ctx) {
      /* Three ways in: a preconfigured set, OpenStreetMap, or a
         spreadsheet. Only the spreadsheet route is wired up. */
      function hierarchies() { return DATA.hierarchies(); }
      function scopeLine(hier) {
        var built = DATA.builtInLevels(hier);
        var scope = hier.scope || (hier.id === (DATA.activeHierarchy() || {}).id
          ? DATA.orgScope() : {});
        var parts = built.map(function (lv) {
          var n = (scope[lv.key] || []).length;
          return n ? n + ' ' + (n === 1 ? lv.label.toLowerCase() : lv.label.toLowerCase() + 's') : null;
        }).filter(Boolean);
        return parts.length ? parts.join(' · ') : 'Nothing in it yet';
      }
      function addHier(name) {
        var hr = { id: STORE.uid('hier'), name: name, levels: DATA.defaultLevels() };
        STORE.set('org.hierarchies', hierarchies().concat([hr]));
        STORE.set('org.activeHierarchyId', hr.id);
        return hr;
      }
      function removeHier(hier) {
        var left = hierarchies().filter(function (x) { return x.id !== hier.id; });
        STORE.set('org.hierarchies', left);
        if (STORE.get('org.activeHierarchyId') === hier.id) {
          STORE.set('org.activeHierarchyId', left.length ? left[0].id : '');
        }
      }

      var wrap = h('div');
      var expanded = {};
      var notice = null;

      function importFromFile() {
        var hr = addHier('Administrative boundaries');
        STORE.set('org.hierarchies', hierarchies().map(function (x) {
          return x.id === hr.id ? Object.assign({}, x, { scope: DATA.dummyOperationalArea() }) : x;
        }));
        STORE.set('org.operationalArea', DATA.dummyOperationalArea());
        notice = 'Boundaries imported from your spreadsheet.';
        redraw();
      }

      /* the same tile layout the chooser used before */
      function sourceCard(ic, hue, title, desc, action, opts) {
        opts = opts || {};
        return h('div.rolecard' + (opts.soon ? '.is-soon' : ''), [
          h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
            UI.icon(ic, 26)),
          h('h3', title),
          h('p', desc),
          UI.btn(action, {
            variant: opts.soon ? 'ghost' : 'secondary',
            icon: opts.soon ? null : 'arrow', iconRight: true,
            disabled: opts.soon ? true : null,
            onclick: opts.onclick || function () {}
          })
        ]);
      }

      function sources() {
        var fileIn = h('input', { type: 'file', accept: '.csv,.xlsx,.xls', style: { display: 'none' } });
        fileIn.addEventListener('change', function () { if (fileIn.files && fileIn.files[0]) importFromFile(); });
        return h('div', [
          h('h3', { style: { font: 'var(--t-title)', marginBottom: 'var(--s-4)' } },
            'How do you want to bring in your geography?'),
          h('div.rolegrid', [
            sourceCard('grid', 'lilac', 'Preconfigured',
              'Start from a boundary set we already hold for your country.',
              'Coming soon', { soon: true }),
            sourceCard('pin', 'mint', 'OpenStreetMap',
              'Pull administrative boundaries straight from OSM.',
              'Coming soon', { soon: true }),
            sourceCard('down', 'sky', 'Upload from Excel',
              'Bring in your own levels and areas from a spreadsheet.',
              'Upload a file', { onclick: function () { fileIn.click(); } })
          ]),
          fileIn,
          h('div.sublabel', { style: { marginTop: 'var(--s-3)' } },
            'Any file works in this prototype — it brings in a sample boundary set.')
        ]);
      }

      function redraw() {
        UI.clear(wrap);
        if (notice) {
          wrap.appendChild(UI.banner('ok', notice, 'check'));
          notice = null;
        }
        wrap.appendChild(sources());
        var list = hierarchies();
        if (list.length) {
          wrap.appendChild(h('div.sublabel', { style: { margin: 'var(--s-5) 0 var(--s-3)' } },
            list.length + (list.length === 1 ? ' hierarchy' : ' hierarchies')));
          wrap.appendChild(h('div.list', list.map(function (hier) {
            var active = DATA.activeHierarchy();
            var isActive = !!active && active.id === hier.id;
            return UI.hierarchyCard(hier, {
              active: isActive,
              selected: isActive,
              expanded: !!expanded[hier.id],
              summary: scopeLine(hier),
              ontoggle: function () { expanded[hier.id] = !expanded[hier.id]; redraw(); },
              onselect: function () { STORE.set('org.activeHierarchyId', hier.id); redraw(); },
              ondelete: function () { removeHier(hier); redraw(); }
            });
          })));
        }
      }
      redraw();

      return UI.screen({
        eyebrow: 'Your organisation',
        title: 'Geography',
        help: 'The boundary hierarchies your complaint services work in. Bring them in from one of three sources.',
        body: wrap,
        /* Demo convenience: saving with nothing imported drops in a
           sample boundary set so the template flow can be shown. */
        actions: [backBtn(ctx), UI.btn('Save', { icon: 'check', onclick: function () {
          if (!hierarchies().length) importFromFile();
          markAreaDone(ctx.screenId);
          var back = STORE.get('ui.returnTo', '');
          STORE.set('ui.returnTo', '');
          ctx.go(back || 'home');
        } })]
      });
    }
  });

  function uniq(list) {
    var seen = {}, out = [];
    list.forEach(function (x) { if (x && !seen[x]) { seen[x] = true; out.push(x); } });
    return out.sort();
  }

  /* ---------- Employees ------------------------------------- */
  S.push({
    id: 'org-employees', phase: 'org', chrome: 'app', nav: 'employees',
    back: 'home', next: 'home',
    render: function (ctx) {
      /* Everyone here is added to a department, so there is nothing to
         add anyone to until there is one. Say that plainly rather than
         offering a form that cannot be filled in properly. */
      if (!STORE.get('org.departments', []).length) {
        return UI.screen({
          eyebrow: 'Your organisation',
          title: 'Employees',
          help: 'The people who will use your complaint systems.',
          body: h('div.empty', [
            h('div.ic', { style: { background: 'var(--blush-fill)', color: 'var(--blush-ink)' } },
              UI.icon('sitemap', 26)),
            h('h3', 'You will have to create a department first'),
            h('p', 'Everyone you add belongs to a department, so there needs to be ' +
                   'at least one before you can start adding employees.'),
            UI.btn('Add departments', {
              icon: 'arrow', iconRight: true,
              onclick: function () {
                /* keep whatever detour is already running — the
                   customisation gate sends people here too */
                if (!STORE.get('ui.returnTo')) STORE.set('ui.returnTo', 'org-employees');
                ctx.go('org-departments');
              }
            })
          ]),
          actions: [backBtn(ctx), doneBtn(ctx)]
        });
      }

      var coll = UI.collection({
        singular: 'employee', plural: 'employees',
        manualDesc: 'Type in names and email addresses one at a time.',
        bulkDesc: 'Upload a staff list and we will bring everyone in.',
        bulkTitle: 'Upload your staff list',
        templateColumns: function () { return ['Name', 'Email', 'Department']; },
        templateExample: function () {
          var d = STORE.get('org.departments', [])[0];
          return ['Anita Wanjiru', 'anita@county.go.ke', d ? d.name : ''];
        },

        items: function () { return STORE.employees(); },

        manual: function (done) {
          /* A new employee is captured in a focused dialog; the screen
             behind it stays the table of everyone added so far. */
          var hint = h('div.panel.emp-cta', [
            h('div.ic', UI.icon('people', 22)),
            h('div', [
              h('b', 'Add your employees'),
              h('span', 'Capture one person at a time. Each is added to the list below.')
            ]),
            UI.btn('Add employee', { icon: 'plus', onclick: function () { openForm(); } })
          ]);

          function deptOptions() {
            return STORE.get('org.departments', []).map(function (d) { return d.code || d.name; });
          }
          function jurisdictionOptions() {
            var root = DATA.builtInLevels()[0];
            return root ? (DATA.orgScope()[root.key] || []) : [];
          }

          function openForm(existing) {
            var ex = existing || null;
            var picked = {
              depts: ex ? (ex.departments || []).slice() : [],
              roles: ex ? (ex.roles || []).slice() : [],
              areas: ex ? (ex.areas || []).slice() : []
            };
            var err = h('span.err', { style: { display: 'none' } });
            var codeIn = UI.input({ id: 'e-code', placeholder: 'EMP-0148', value: ex ? ex.code : '' });
            var nameIn = UI.input({ id: 'e-name', placeholder: 'Anita Wanjiru', value: ex ? ex.name : '' });
            var phoneIn = UI.input({ id: 'e-phone', type: 'tel', placeholder: '+254 712 345 678', value: ex ? ex.phone : '' });
            var mailIn = UI.input({ id: 'e-mail', type: 'email', placeholder: 'anita@county.go.ke', value: ex ? ex.email : '' });

            var deptSel = UI.multiSelect({
              id: 'e-dept', options: deptOptions(), values: picked.depts,
              placeholder: 'Select department codes',
              emptyText: 'Add departments first',
              onchange: function (v) { picked.depts = v; }
            });
            var roleSel = UI.multiSelect({
              id: 'e-role', options: DATA.STD_ROLES.map(function (r) { return r.label; }), values: picked.roles,
              placeholder: 'Select system roles',
              onchange: function (v) { picked.roles = v; }
            });
            var areaSel = UI.multiSelect({
              id: 'e-area', options: jurisdictionOptions(), values: picked.areas,
              placeholder: 'Select jurisdictions',
              emptyText: 'Set up your geography first',
              onchange: function (v) { picked.areas = v; }
            });

            function fail(msg, el) {
              err.textContent = msg; err.style.display = 'block'; if (el) el.focus();
            }

            var save = UI.btn(ex ? 'Save changes' : 'Add employee', { icon: ex ? 'check' : 'plus', onclick: function () {
              var code = codeIn.value.trim(), n = nameIn.value.trim();
              var ph = phoneIn.value.trim(), em = mailIn.value.trim();
              if (!code) return fail('Enter an employee code.', codeIn);
              if (!n) return fail('Enter a name.', nameIn);
              if (!ph) return fail('Enter a mobile number.', phoneIn);
              if (!UI.isEmail(em)) return fail('Enter a valid email address.', mailIn);
              if (STORE.employees().some(function (e) {
                return (!ex || e.id !== ex.id) && e.email.toLowerCase() === em.toLowerCase();
              })) return fail('That email is already on the list.', mailIn);
              if (!picked.roles.length) return fail('Choose at least one system role.');

              var rec = {
                code: code, name: n, phone: ph, email: em,
                departments: picked.depts, department: picked.depts[0] || '',
                roles: picked.roles, areas: picked.areas, seeded: false
              };
              if (ex) {
                STORE.set('org.employees', STORE.employees().map(function (e) {
                  return e.id === ex.id ? Object.assign({}, e, rec) : e;
                }));
              } else {
                rec.id = STORE.uid('emp');
                STORE.push('org.employees', rec);
              }
              m.close();
              done(n + (ex ? ' updated.' : ' added.'));
            } });

            var m = UI.modal({
              icon: 'people',
              title: ex ? 'Edit employee' : 'Add employee',
              desc: ex
                ? 'Update the details for ' + ex.name + '.'
                : 'Complete the form below to add a new employee to ' + (STORE.orgName() || 'your organisation') + '.',
              body: [
                h('div.grid-2', [
                  UI.field('Employee code', codeIn, { id: 'e-code' }),
                  UI.field('Name', nameIn, { id: 'e-name' })
                ]),
                h('div.grid-2', [
                  UI.field('Mobile number', phoneIn, { id: 'e-phone' }),
                  UI.field('Email ID', mailIn, { id: 'e-mail' })
                ]),
                UI.field('Department code', deptSel, { id: 'e-dept', sub: 'Choose one or more.' }),
                UI.field('System role', roleSel, { id: 'e-role', sub: 'Choose one or more.' }),
                UI.field('Jurisdictions', areaSel, { id: 'e-area', sub: 'Where this person can act.' }),
                err
              ],
              actions: [save, UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })]
            });
          }

          window.EMP_EDIT = openForm;
          var pending = window.EMP_PENDING; window.EMP_PENDING = null;
          setTimeout(function () { openForm(pending || null); }, 0);
          return hint;
        },

        bulkRows: function () {
          var have = STORE.employees().map(function (e) { return e.email.toLowerCase(); });
          var depts = STORE.get('org.departments', []);
          return DATA.DUMMY_EMPLOYEES
            .filter(function (d) { return have.indexOf(d.email.toLowerCase()) === -1; })
            .map(function (d, i) {
              return {
                id: STORE.uid('emp'), name: d.name, email: d.email,
                department: depts.length ? depts[i % depts.length].name : '',
                seeded: false
              };
            });
        },
        onBulk: function (rows) {
          STORE.set('org.employees', STORE.employees().concat(rows));
        },

        match: function (e, q) {
          return (e.name + ' ' + e.email + ' ' + (e.code || '') + ' ' +
                  (e.departments || [e.department]).join(' ') + ' ' +
                  (e.roles || []).join(' ')).toLowerCase().indexOf(q) !== -1;
        },

        filters: [
          { id: 'dept', label: 'Departments',
            options: function () {
              return uniq(STORE.employees().map(function (e) { return e.department; }));
            },
            match: function (e, v) { return e.department === v; } }
        ],

        /* Employees read as a table: one appended row per person. */
        listClass: 'dtable',
        tableHead: function () {
          return h('div.dt-head', [
            h('span', 'Code'), h('span', 'Name'), h('span', 'Contact'),
            h('span', 'Departments'), h('span', 'System roles'), h('span', 'Jurisdictions'), h('span', '')
          ]);
        },
        row: function (e, i, redraw) {
          var depts = (e.departments && e.departments.length) ? e.departments : (e.department ? [e.department] : []);
          return h('div.dt-row', [
            h('span.mono', e.code || '—'),
            h('span.nm', [UI.avatar(e.name), h('b', e.name)]),
            h('span', [h('span.ct', e.email), e.phone ? h('span.ct.dim', e.phone) : null]),
            h('span', depts.length ? depts.join(', ') : '—'),
            h('span', (e.roles || []).length ? e.roles.join(', ') : '—'),
            h('span', (e.areas || []).length ? e.areas.join(', ') : '—'),
            h('span.act', [
              h('button.iconbtn', {
                type: 'button', 'aria-label': 'Edit ' + e.name, title: 'Edit',
                onclick: function () {
                  if (window.EMP_EDIT) { window.EMP_EDIT(e); return; }
                  window.EMP_PENDING = e;
                  if (window.COLL_MANUAL) window.COLL_MANUAL();
                }
              }, UI.icon('gear', 16)),
              h('button.iconbtn', {
                type: 'button', 'aria-label': 'Remove ' + e.name, title: 'Remove',
                onclick: function () { removeEmployee(e); redraw(); }
              }, UI.icon('trash', 17))
            ])
          ]);
        }
      });

      return UI.screen({
        eyebrow: 'Your organisation',
        title: 'Employees',
        help: 'The people who will use your complaint systems. You will map them to roles when you customise a template.',
        body: coll,
        actions: [backBtn(ctx), doneBtn(ctx)]
      });
    }
  });

  /* Removing someone must not leave them mapped anywhere. */
  function removeEmployee(e) {
    STORE.allSystems().forEach(function (sys) {
      Object.keys(sys.roles || {}).forEach(function (r) {
        sys.roles[r] = (sys.roles[r] || []).filter(function (id) { return id !== e.id; });
      });
      var byLoc = (sys.assignment && sys.assignment.byLocation) || {};
      Object.keys(byLoc).forEach(function (loc) { if (byLoc[loc] === e.id) delete byLoc[loc]; });
      var byRL = (sys.assignment && sys.assignment.byRoleLocation) || {};
      Object.keys(byRL).forEach(function (loc) {
        Object.keys(byRL[loc] || {}).forEach(function (rid) {
          if (byRL[loc][rid] === e.id) delete byRL[loc][rid];
        });
      });
    });
    STORE.set('org.employees', STORE.employees().filter(function (x) { return x.id !== e.id; }));
  }

  /* An employee's departments are stored by code (older records by
     name), so a rename or recode has to follow through to them.
     `next` null means the department is gone. */
  function deptTags(d) {
    return [d && d.code, d && d.name].filter(Boolean);
  }
  function employeesIn(d) {
    var tags = deptTags(d).map(function (t) { return t.toLowerCase(); });
    return STORE.employees().filter(function (e) {
      var mine = (e.departments && e.departments.length) ? e.departments : (e.department ? [e.department] : []);
      return mine.some(function (m) { return tags.indexOf(String(m).toLowerCase()) !== -1; });
    });
  }
  function retagEmployees(was, next) {
    var olds = deptTags(was).map(function (t) { return t.toLowerCase(); });
    if (!olds.length) return;
    STORE.set('org.employees', STORE.employees().map(function (e) {
      var mine = (e.departments && e.departments.length) ? e.departments.slice()
               : (e.department ? [e.department] : []);
      var hit = false;
      var out = [];
      mine.forEach(function (m) {
        if (olds.indexOf(String(m).toLowerCase()) === -1) { out.push(m); return; }
        hit = true;
        if (next) out.push(next.code || next.name);
      });
      if (!hit) return e;
      out = out.filter(function (v, i) { return out.indexOf(v) === i; });
      return Object.assign({}, e, { departments: out, department: out[0] || '' });
    }));
  }

  /* ---------- Departments ----------------------------------- */
  S.push({
    id: 'org-departments', phase: 'org', chrome: 'app', nav: 'departments',
    back: 'home', next: 'home',
    render: function (ctx) {
      var coll = UI.collection({
        singular: 'department', plural: 'departments',
        manualDesc: 'Name them one at a time.',
        templateColumns: function () { return ['Name', 'What it does']; },
        templateExample: function () {
          return ['Roads and Infrastructure', 'Potholes, street lighting and drainage'];
        },
        bulkDesc: 'Upload a list and we will bring them in.',

        items: function () { return STORE.get('org.departments', []); },

        manual: function (done) {
          var editing = null;
          var err = h('span.err', { style: { display: 'none' } });
          var nameIn = UI.input({ id: 'd-name', placeholder: 'Roads and Infrastructure' });
          var codeIn = UI.input({ id: 'd-code', placeholder: 'RDS-01', onenter: add });
          var saveBtn = UI.btn('Add department', { variant: 'secondary', icon: 'plus', onclick: add });
          var cancelWrap = h('span');

          function edit(d) {
            editing = d;
            nameIn.value = d.name; codeIn.value = d.code || '';
            err.style.display = 'none';
            UI.clear(saveBtn); UI.append(saveBtn, [UI.icon('check', 16), 'Save changes']);
            UI.clear(cancelWrap);
            cancelWrap.appendChild(UI.btn('Cancel', { variant: 'ghost', onclick: reset }));
            nameIn.focus();
          }
          function reset() {
            editing = null;
            nameIn.value = ''; codeIn.value = '';
            err.style.display = 'none';
            UI.clear(saveBtn); UI.append(saveBtn, [UI.icon('plus', 16), 'Add department']);
            UI.clear(cancelWrap);
          }

          function add() {
            var n = nameIn.value.trim();
            var c = codeIn.value.trim();
            if (!n) {
              err.textContent = 'Enter a department name.';
              err.style.display = 'block'; nameIn.focus(); return;
            }
            if (!c) {
              err.textContent = 'Enter a department code.';
              err.style.display = 'block'; codeIn.focus(); return;
            }
            if (STORE.get('org.departments', []).some(function (d) {
              return (!editing || d.id !== editing.id) && d.name.toLowerCase() === n.toLowerCase();
            })) {
              err.textContent = 'That department already exists.';
              err.style.display = 'block'; return;
            }
            if (editing) {
              var was = { name: editing.name, code: editing.code };
              STORE.set('org.departments', STORE.get('org.departments', []).map(function (d) {
                return d.id === editing.id ? Object.assign({}, d, { name: n, code: c, desc: c }) : d;
              }));
              retagEmployees(was, { name: n, code: c });
              var label = n;
              reset();
              done(label + ' updated.');
              return;
            }
            STORE.push('org.departments', {
              id: STORE.uid('dept'), name: n, code: c, desc: c
            });
            reset();
            done(n + ' added.');
          }

          window.DEPT_EDIT = edit;
          if (window.DEPT_PENDING) { var pend = window.DEPT_PENDING; window.DEPT_PENDING = null; setTimeout(function () { edit(pend); }, 0); }

          return h('div.panel', [
            h('div.grid-2', [
              UI.field('Department name', nameIn, { id: 'd-name' }),
              UI.field('Department code', codeIn, { id: 'd-code' })
            ]),
            err,
            h('div.actions', { style: { marginTop: 'var(--s-2)' } }, [saveBtn, cancelWrap])
          ]);
        },

        bulkRows: function () {
          var have = STORE.get('org.departments', []).map(function (d) { return d.name.toLowerCase(); });
          return DATA.DUMMY_DEPARTMENTS
            .filter(function (d) { return have.indexOf(d.name.toLowerCase()) === -1; })
            .map(function (d) {
              return { id: STORE.uid('dept'), name: d.name, desc: d.desc };
            });
        },
        onBulk: function (rows) {
          STORE.set('org.departments', STORE.get('org.departments', []).concat(rows));
        },

        match: function (d, q) {
          return (d.name + ' ' + (d.code || d.desc || '')).toLowerCase().indexOf(q) !== -1;
        },

        filters: [
          { id: 'staffed', label: 'Staffing',
            options: function () { return ['With employees', 'Without employees']; },
            match: function (d, v) {
              var has = employeesIn(d).length > 0;
              return v === 'With employees' ? has : !has;
            } }
        ],

        listClass: 'dtable dtable-dept',
        tableHead: function () {
          return h('div.dt-head', [
            h('span', 'Code'), h('span', 'Department'), h('span', 'Employees'), h('span', '')
          ]);
        },
        row: function (d, i, redraw) {
          var staff = employeesIn(d).length;
          return h('div.dt-row', [
            h('span.mono', d.code || '—'),
            h('span.nm', [h('b', d.name)]),
            h('span', staff ? staff + (staff === 1 ? ' employee' : ' employees') : 'None yet'),
            h('span.act', [
              h('button.iconbtn', {
                type: 'button', 'aria-label': 'Edit ' + d.name, title: 'Edit',
                onclick: function () {
                  if (window.DEPT_EDIT) { window.DEPT_EDIT(d); return; }
                  window.DEPT_PENDING = d;
                  if (window.COLL_MANUAL) window.COLL_MANUAL();
                }
              }, UI.icon('gear', 16)),
              h('button.iconbtn', {
                type: 'button', 'aria-label': 'Remove ' + d.name, title: 'Remove',
                onclick: function () {
                  var was = { name: d.name, code: d.code };
                  STORE.set('org.departments',
                    STORE.get('org.departments', []).filter(function (x) { return x.id !== d.id; }));
                  retagEmployees(was, null);
                  redraw();
                }
              }, UI.icon('trash', 17))
            ])
          ]);
        }
      });

      return UI.screen({
        eyebrow: 'Your organisation',
        title: 'Departments',
        help: 'The departments complaints get routed to. A template’s Department Manager is accountable ' +
              'for the service their department runs.',
        body: coll,
        actions: [backBtn(ctx), doneBtn(ctx)]
      });
    }
  });

  /* ---------- 3.3 Notifications -----------------------------
     Every channel starts off. Turning one on opens its account
     settings right underneath it, because choosing a channel and
     being able to send on it are not the same thing. */
  S.push({
    id: 'org-communication', phase: 'org', chrome: 'app', nav: 'notifications', narrow: true,
    back: 'home', next: 'home',
    render: function (ctx) {
      var list = h('div.channels');
      var warn = h('div', { style: { marginTop: 'var(--s-4)' } });
      var done = doneBtn(ctx);

      function isOn(id) { return STORE.get('org.channels', []).indexOf(id) !== -1; }

      function saveField(id, field, value) {
        var all = STORE.get('org.channelConfig', {}) || {};
        all[id] = all[id] || {};
        all[id][field] = value;
        STORE.set('org.channelConfig', all);
      }

      /* the account behind one channel, opened underneath its row */
      function settings(ch, pill) {
        var setup = DATA.channelSetup(ch.id);
        var saved = DATA.channelConfig(ch.id);

        function refresh() {
          var ready = DATA.channelConnected(ch.id);
          pill.textContent = ready ? 'Connected' : 'Not connected';
          pill.classList.remove(ready ? 'pill-draft' : 'pill-live');
          pill.classList.add(ready ? 'pill-live' : 'pill-draft');
          drawWarning();
        }

        return h('div.ch-settings', [
          setup.note ? h('p.sublabel', { style: { marginBottom: 'var(--s-3)' } }, setup.note) : null,
          h('div.grid-2', setup.fields.map(function (f) {
            var el = UI.input({
              id: 'cc-' + ch.id + '-' + f.id,
              type: f.secret ? 'password' : 'text',
              value: saved[f.id] || '',
              placeholder: f.placeholder,
              oninput: function (v) { saveField(ch.id, f.id, v); refresh(); }
            });
            return UI.field(f.label, el, { id: 'cc-' + ch.id + '-' + f.id });
          }))
        ]);
      }

      function drawWarning() {
        UI.clear(warn);
        var pending = DATA.channelsNeedingSetup();
        if (!pending.length) return;
        warn.appendChild(UI.banner('warn',
          pending.map(DATA.channelLabel).join(' and ') +
          (pending.length === 1 ? ' cannot send anything until its account is filled in.'
                                : ' cannot send anything until their accounts are filled in.'),
          'info'));
      }

      function draw() {
        UI.clear(list);
        DATA.CHANNELS.forEach(function (ch) {
          var on = isOn(ch.id);
          var ready = DATA.channelConnected(ch.id);
          var pill = h('span.pill' + (ready ? '.pill-live' : '.pill-draft'),
            ready ? 'Connected' : 'Not connected');

          var card = h('div.ch-card' + (on ? '.is-on' : ''));
          card.appendChild(h('div.ch-row', [
            h('div.ic', {
              style: {
                width: '34px', height: '34px', borderRadius: 'var(--r-sm)', flex: 'none',
                display: 'grid', placeItems: 'center',
                background: 'var(--' + ch.hue + '-fill)', color: 'var(--' + ch.hue + '-ink)'
              }
            }, UI.icon(ch.icon, 17)),
            h('div.who', [h('b', ch.label), h('span', ch.desc)]),
            h('div.end', [
              on ? pill : null,
              UI.toggle({
                checked: on,
                label: 'Use ' + ch.label,
                onchange: function () {
                  STORE.toggle('org.channels', ch.id);
                  done.disabled = STORE.get('org.channels', []).length === 0;
                  draw();
                }
              })
            ])
          ]));
          if (on) card.appendChild(settings(ch, pill));
          list.appendChild(card);
        });
        drawWarning();
      }

      draw();
      done.disabled = STORE.get('org.channels', []).length === 0;

      return UI.screen({
        eyebrow: 'Your organisation',
        title: 'Notifications',
        help: 'How people hear back about their complaints. Turn on the channels your ' +
              'organisation can support and fill in the account behind each one.',
        body: [list, warn],
        actions: [backBtn(ctx), done]
      });
    }
  });

  /* ---------- 3.4 Branding ---------------------------------- */
  S.push({
    /* The last of the two asked right after login. */
    id: 'org-branding', phase: 'org', chrome: runChrome, nav: 'branding', narrow: true,
    back: 'org-language', next: 'home',
    render: function (ctx) {
      if (!STORE.get('org.branding.name')) STORE.set('org.branding.name', STORE.get('org.name'));

      var preview = h('div.prev');
      var swatches = h('div.theme-opts');

      function drawPreview() {
        var accent = STORE.get('org.branding.accent', 'lilac');
        var logo = STORE.get('org.branding.logo');
        preview.style.background = logo ? 'url(' + logo + ')' : 'var(--' + accent + '-fill)';
        preview.style.color = 'var(--' + accent + '-ink)';
        UI.clear(preview);
        if (!logo) preview.appendChild(document.createTextNode(UI.initials(STORE.get('org.branding.name'))));
      }

      /* Named brand themes as colour tiles — the name shows on hover
         or focus, so the row stays one line tall. Only CMS Blue and
         Moz Green carry a real token set. */
      (window.BRAND_THEMES || []).forEach(function (t) {
        var b = h('button.theme-tile', {
          type: 'button', title: t.label, 'aria-label': t.label,
          'aria-pressed': STORE.get('org.branding.theme', 'cms-blue') === t.id ? 'true' : 'false',
          style: { background: t.hex }
        }, [
          UI.icon('check', 18),
          h('span.tip', t.themed ? t.label : t.label + ' · preview only')
        ]);
        b.addEventListener('click', function () {
          STORE.set('org.branding.theme', t.id);
          STORE.set('org.branding.accent', t.accent);
          Array.prototype.forEach.call(swatches.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          drawPreview();
        });
        swatches.appendChild(b);
      });

      var fileIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
      fileIn.addEventListener('change', function () {
        var f = fileIn.files && fileIn.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () { STORE.set('org.branding.logo', r.result); drawPreview(); };
        r.readAsDataURL(f);
      });

      drawPreview();

      return UI.screen({
        eyebrow: 'Organisation setup',
        title: 'Branding',
        help: 'Your logo, name and colour appear across your workspace and on the services citizens and employees experience.',
        body: [
          UI.field('Organisation logo', h('div.logo-drop', [
            preview,
            h('div', { style: { flex: '1' } }, [
              h('div.sublabel', { style: { marginBottom: '6px' } },
                STORE.get('org.branding.logo') ? 'Logo uploaded.' : 'PNG or SVG, at least 128px square.'),
              h('div', { style: { display: 'flex', gap: 'var(--s-2)' } }, [
                UI.btn(STORE.get('org.branding.logo') ? 'Replace' : 'Upload logo', {
                  variant: 'secondary', sm: true, onclick: function () { fileIn.click(); }
                }),
                STORE.get('org.branding.logo') ? UI.btn('Remove', {
                  variant: 'ghost', sm: true,
                  onclick: function () { STORE.set('org.branding.logo', null); ctx.refresh(); }
                }) : null
              ])
            ]),
            fileIn
          ])),
          UI.field('Organisation name', UI.input({
            id: 'b-name', value: STORE.get('org.branding.name'),
            oninput: function (v) { STORE.set('org.branding.name', v); drawPreview(); }
          }), { id: 'b-name', hint: 'This is what citizens see. It can differ from your legal name.' }),
          UI.field('Brand Theme', swatches, { sub: 'Applied across your workspace and the services people see.' })
        ],
        actions: [
          backBtn(ctx),
          UI.btn('Save', {
            icon: 'check',
            onclick: function () {
              if (window.APPLY_BRAND_THEME) window.APPLY_BRAND_THEME();
              markAreaDone(ctx.screenId); endLoginRun(); ctx.next();
            }
          })
        ]
      });
    }
  });

})();
