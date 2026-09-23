/* ============================================================
   screens-system.js — Home, Complaint Management, templates,
   the adoption intake, and the template workspace.

   Home is the landing page. It shows templates under "Start
   creating" — NOT an organisation-setup checklist. Organisation
   setup lives in the sidebar and in Settings.

   Complaint Management (the `systems` screen) shows PUBLISHED
   services only, as cards, with a search bar at the top. No status
   filter — drafts are on Home, under "Pick up where you left off".
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  function statusLabel(s) { return s === 'live' ? 'Published' : 'Draft'; }

  /* A complaint system as a card. Published ones open on the
     personalised live view; drafts open where you can finish them.
     `opts.deletable` adds the delete affordance the old list had. */
  function systemCard(sys, ctx, opts) {
    opts = opts || {};
    var t = STORE.templateFor(sys);
    var hue = t ? t.hue : 'lilac';
    var live = sys.status === 'live';

    return h('div.syscard', [
      h('div.syscard-top', [
        h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
          UI.icon(t ? t.icon : 'grid', 20)),
        h('span.pill.pill-' + (live ? 'live' : 'draft'), statusLabel(sys.status))
      ]),
      h('h3', sys.name),
      h('p', live
        ? (sys.areas && sys.areas.length
            ? 'Live in ' + sys.areas.length + (sys.areas.length === 1 ? ' area.' : ' areas.')
            : 'Live and receiving complaints.')
        : sys.customised ? 'Customised, not published yet.' : 'Not customised yet.'),
      h('div.acts', [
        UI.btn(live ? 'Open' : 'Continue', {
          sm: true,
          onclick: function () {
            STORE.setActiveSystem(sys.id);
            ctx.go(live ? 'service-view' : 'template-workspace');
          }
        }),
        opts.deletable ? h('button.iconbtn', {
          type: 'button', 'aria-label': 'Delete ' + sys.name, title: live ? 'Delete' : 'Delete draft',
          style: { marginLeft: 'auto' },
          onclick: function () {
            var m = UI.modal({
              icon: 'trash',
              title: 'Delete ' + (live ? '' : 'draft ') + sys.name + '?',
              desc: live
                ? 'This removes the complaint system and its customisation. It cannot be undone.'
                : 'This removes the draft and everything configured on it so far. It cannot be undone.',
              actions: [
                UI.btn('Delete', { onclick: function () {
                  STORE.removeSystem(sys.id);
                  m.close();
                  if (opts.onChange) opts.onChange();
                } }),
                UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })
              ]
            });
          }
        }, UI.icon('trash', 17)) : null
      ])
    ]);
  }

  function templateCard(t, opts) {
    opts = opts || {};
    return h('div.tmpl-card', [
      h('div.ic', { style: { background: 'var(--' + t.hue + '-fill)', color: 'var(--' + t.hue + '-ink)' } },
        UI.icon(t.icon, 22)),
      h('h3', t.name),
      h('p', t.desc),
      h('div.acts', [
        UI.btn('Preview', {
          variant: 'ghost', sm: true, icon: 'eye',
          onclick: function () { window.APP.previewTemplate(t.id); }
        }),
        UI.btn('Use this template', { sm: true, onclick: function () { window.APP.useTemplate(t.id); } })
      ])
    ]);
  }

  /* ---------- HOME — the landing page ----------------------- */
  S.push({
    id: 'home', phase: 'home', chrome: 'app', nav: 'home', showProgress: false,
    render: function (ctx) {
      var out = [];
      /* Home is the launcher: DRAFTS to pick up, then templates.
         Published services live under Complaint Management. */
      var drafts = STORE.allSystems().filter(function (s) { return s.status !== 'live'; });
      var live   = STORE.allSystems().filter(function (s) { return s.status === 'live'; });

      out.push(h('div.page-head', [
        h('h1', 'Hey ' + STORE.firstName()),
        h('p', 'Pick a template to start a new complaint system. Everything arrives already configured.')
      ]));

      if (drafts.length) {
        out.push(h('div', { style: { marginBottom: 'var(--s-7)' } }, [
          h('div.panel-head', [
            h('h3', { style: { font: 'var(--t-title)' } }, 'Pick up where you left off'),
            h('div.end', [
              UI.btn('View all', { variant: 'ghost', sm: true, onclick: function () { ctx.go('systems'); } })
            ])
          ]),
          h('div.syscards', drafts.slice(0, 3).map(function (sys) {
            return systemCard(sys, ctx, { deletable: true, onChange: function () { ctx.refresh(); } });
          }))
        ]));
      } else if (live.length) {
        /* No drafts to pick up, but published services exist — and
           there is no nav item for them, so Home has to offer the
           route or they become unreachable. */
        out.push(h('div.panel-head', { style: { marginBottom: 'var(--s-7)' } }, [
          h('h3', { style: { font: 'var(--t-title)' } },
            live.length + (live.length === 1 ? ' published service' : ' published services')),
          h('div.end', [
            UI.btn('View all', { variant: 'ghost', sm: true,
              onclick: function () { ctx.go('systems'); } })
          ])
        ]));
      }

      /* Templates. Before anything exists they are the point of the
         page, so they get the full grid. Once a complaint system has
         been started they move to the bottom, into a grey strip that
         scrolls sideways with the browse-all CTA at its right. */
      var started = STORE.allSystems().length > 0;

      if (!started) {
        /* Every template is already on the page — there is nowhere
           else to browse to, so no browse-all here. */
        out.push(h('div.panel-head', { style: { marginTop: 'var(--s-2)' } }, [
          h('h3', { style: { font: 'var(--t-title)' } }, 'Start creating')
        ]));
        out.push(h('div.tmpl-grid', DATA.allTemplates().map(function (t) { return templateCard(t); })));
      } else {
        out.push(h('div.tstrip', [
          h('div.tstrip-head', [
            h('h3', 'Start another complaint system'),
            h('button.linkish', { type: 'button', onclick: function () { ctx.go('templates'); } },
              'Browse all templates →')
          ]),
          h('div.tstrip-rail', DATA.allTemplates().map(function (t) {
            return templateCard(t);
          }))
        ]));
      }

      return out;
    }
  });

  /* ---------- Your Complaint Systems ----------------------- */
  /* Seeds a few example systems the first time this page is
     opened with a real system already present, so search and the
     draft/published filter have something to act on. All removable. */
  function seedSystems() {
    if (STORE.get('systemsSeeded')) return;
    if (!STORE.allSystems().length) return;

    var examples = [
      { templateId: 'governance', status: 'live'  },
      { templateId: 'water',      status: 'draft' }
    ];
    var list = STORE.allSystems();
    examples.forEach(function (ex) {
      var already = list.some(function (s) { return s.templateId === ex.templateId; });
      if (already) return;
      var rec = STORE.blankSystem(ex.templateId);
      rec.status = ex.status;
      rec.customised = ex.status === 'live';
      rec.seeded = true;
      list.push(rec);
    });
    STORE.set('systemsSeeded', true);
    STORE.save();
  }

  S.push({
    id: 'systems', phase: 'home', chrome: 'app', nav: 'home', showProgress: false,
    render: function (ctx) {
      seedSystems();

      var query = '';
      var grid = h('div.syscards');
      var note = h('div.sublabel', { style: { marginBottom: 'var(--s-4)' } });

      /* Published services only. Drafts live on Home. */
      function published() {
        return STORE.allSystems().filter(function (s) { return s.status === 'live'; });
      }

      function matching() {
        var q = query.trim().toLowerCase();
        if (!q) return published();
        return published().filter(function (sys) {
          var t = STORE.templateFor(sys);
          return (sys.name + ' ' + (t ? t.desc : '')).toLowerCase().indexOf(q) !== -1;
        });
      }

      function drawGrid() {
        UI.clear(grid);
        var all = published();
        var rows = matching();

        note.textContent = query
          ? 'Showing ' + rows.length + ' of ' + all.length
          : all.length + (all.length === 1 ? ' published service' : ' published services');

        if (!rows.length) {
          grid.appendChild(h('div.empty', { style: { gridColumn: '1 / -1' } }, [
            h('div.ic', UI.icon(query ? 'eye' : 'grid', 24)),
            h('h3', query ? 'Nothing matches “' + query + '”' : 'Nothing published yet'),
            h('p', query
              ? 'Try a different word, or clear the search.'
              : 'Drafts you are still working on are on Home, under “Pick up where you left off”.'),
            query ? null : UI.btn('Go to Home', { onclick: function () { ctx.go('home'); } })
          ]));
          return;
        }

        rows.forEach(function (sys) {
          grid.appendChild(systemCard(sys, ctx, { deletable: true, onChange: drawGrid }));
        });
      }

      /* nothing created at all yet */
      if (!STORE.allSystems().length) {
        return [
          UI.pageHead('Complaint Management', 'Every complaint system you run lives here.'),
          h('div.empty', [
            h('div.ic', UI.icon('grid', 26)),
            h('h3', "You haven't created a complaint system yet"),
            h('p', "Start with a ready-made template and we'll handle the heavy lifting."),
            UI.btn('Browse templates', { icon: 'arrow', iconRight: true,
              onclick: function () { ctx.go('templates'); } })
          ])
        ];
      }

      var search = UI.input({
        id: 'sys-q', placeholder: 'Search published services…',
        oninput: function (v) { query = v; drawGrid(); }
      });

      drawGrid();

      return [
        UI.pageHead('Complaint Management', 'The complaint services your organisation is running.'),
        h('div', { style: { display: 'flex', gap: 'var(--s-3)', alignItems: 'center', marginBottom: 'var(--s-4)', flexWrap: 'wrap' } }, [
          h('div', { style: { flex: '1', minWidth: '240px' } }, [search]),
          UI.btn('New complaint system', { sm: true, icon: 'plus',
            onclick: function () { ctx.go('templates'); } })
        ]),
        note,
        grid
      ];
    }
  });


  /* ---------- Template gallery ------------------------------ */
  S.push({
    id: 'templates', phase: 'home', chrome: 'app', nav: 'templates', showProgress: false,
    render: function (ctx) {
      var imported = STORE.get('templates.custom', []);

      return [
        UI.pageHead('Complaints Template',
          'Each template arrives with its forms, workflow, roles, notifications and dashboard already configured.',
          UI.btn('Import template', { sm: true, icon: 'plus',
            onclick: function () { openImport(ctx); } })),

        h('div.tmpl-grid', DATA.allTemplates().map(function (t) { return templateCard(t); })),

        imported.length
          ? h('div.sublabel', { style: { marginTop: 'var(--s-4)' } },
              imported.length + (imported.length === 1 ? ' template was' : ' templates were') + ' imported.')
          : null
      ];
    }
  });

  /* ---- importing a template -------------------------------- */
  function openImport(ctx) {
    var report = h('div', { style: { marginTop: 'var(--s-4)' } });
    var area = h('textarea.input', {
      rows: '10',
      placeholder: [
        '{',
        '  "name": "Water Complaints",',
        '  "desc": "Leaks, outages and billing.",',
        '  "formFields": ["Issue", "Location", "Photo"],',
        '  "workflow": ["Submitted", "Assigned", "Resolved"]',
        '}'
      ].join(String.fromCharCode(10))
    });

    var fileIn = h('input', { type: 'file', accept: '.json,application/json,text/plain',
                              style: { display: 'none' } });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { area.value = r.result; };
      r.readAsText(f);
    });

    var m = UI.modal({
      wide: true, icon: 'form',
      title: 'Import a template',
      desc: 'Paste a template definition, or choose a JSON file. It joins the ones already here.',
      body: [
        h('div.actions', { style: { marginBottom: 'var(--s-4)' } }, [
          UI.btn('Choose a JSON file', { variant: 'secondary', icon: 'grid',
            onclick: function () { fileIn.click(); } }),
          h('span.sublabel', { style: { margin: 0 } }, 'or paste below'),
          fileIn
        ]),
        UI.field('Template definition', area, { id: 'tpl-json' }),
        report
      ],
      actions: [
        UI.btn('Import', { icon: 'check', onclick: function () {
          var res = DATA.parseTemplateImport(area.value);
          UI.clear(report);
          if (!res.template) {
            report.appendChild(UI.banner('err', [
              h('b', 'Could not import that. '),
              res.errors.join(' ')
            ], 'info'));
            return;
          }
          STORE.push('templates.custom', res.template);
          m.close();
          ctx.refresh();
        } }),
        UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })
      ]
    });
  }

  /* ============================================================
     Adopting a template creates a DRAFT immediately, then asks the
     two things the template cannot know: what to call it, and which
     operational area it runs in. Everything else already came with
     the template, so the workspace opens straight after.
     ============================================================ */

  /* ---------- 8. Name the service -------------------------- */
  S.push({
    id: 'svc-name', phase: 'system', chrome: 'focus',
    render: function (ctx) {
      var sys = STORE.activeSystem();
      if (!sys) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      var cont = UI.btn('Continue', { icon: 'arrow', iconRight: true, onclick: submit });
      function check() {
        var ok = String(STORE.get('system.name', '')).trim().length > 1;
        cont.disabled = !ok; return ok;
      }
      function submit() { if (check()) ctx.next(); }

      var el = UI.input({
        id: 's-name', value: sys.name, placeholder: 'Road & Infrastructure Complaints',
        oninput: function (v) { STORE.set('system.name', v); check(); },
        onenter: submit
      });
      check();   /* synchronously, so Continue is never briefly clickable */

      return UI.screen({
        eyebrow: 'New complaint system',
        title: 'What would you like to call this service?',
        help: 'This is the name your organisation and the public will see. We have started you off with the template name.',
        body: UI.field('Service name', el, { id: 's-name' }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 9. Which operational area it runs in ----------
     Not a ward-by-ward pick any more: the organisation keeps boundary
     hierarchies, and the service runs in one of them. Same card as the
     Operational area screen, so choosing here looks like choosing
     there. */
  S.push({
    id: 'svc-geography', phase: 'system', chrome: 'focus', wide: true,
    render: function (ctx) {
      var list = DATA.hierarchies();
      var chosen = STORE.get('system.hierarchyId', '') ||
                   (DATA.activeHierarchy() || {}).id || '';

      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true,
        onclick: function () { if (STORE.get('system.hierarchyId')) ctx.next(); }
      });

      var body;
      if (!list.length) {
        body = [
          UI.banner('warn',
            'Your organisation has no geography yet, so there is nothing for this service to run in.',
            'info'),
          h('div', { style: { marginTop: 'var(--s-4)' } }, [
            UI.btn('Set up your geography', {
              variant: 'secondary', icon: 'arrow', iconRight: true,
              onclick: function () {
                STORE.set('ui.returnTo', 'svc-geography');
                ctx.go('org-operational-area');
              }
            })
          ])
        ];
      } else {
        var grid = h('div.hgrid');
        var expanded = {};

        function paint() {
          UI.clear(grid);
          list.forEach(function (hier) {
            /* Which one is in use belongs to the organisation setup, not
               here — this is a choice, so the only state a card shows
               is whether it is the one they picked. */
            grid.appendChild(UI.hierarchyCard(hier, {
              selected: hier.id === chosen,
              expanded: !!expanded[hier.id],
              ontoggle: function () { expanded[hier.id] = !expanded[hier.id]; paint(); },
              onselect: function () {
                chosen = hier.id;
                STORE.set('system.hierarchyId', hier.id);
                /* the service works in it, so everything downstream —
                   the levels, the areas to assign by — follows it */
                STORE.set('org.activeHierarchyId', hier.id);
                cont.disabled = false;
                paint();
              }
            }));
          });
        }
        paint();
        body = grid;
      }

      /* pre-selected when they only have the one, but never silently:
         the card shows as chosen and Continue is live */
      if (list.length && chosen) STORE.set('system.hierarchyId', chosen);
      cont.disabled = !STORE.get('system.hierarchyId');

      return UI.screen({
        eyebrow: STORE.get('system.name') || 'New complaint system',
        title: 'Which geography will this service run in?',
        help: 'Complaints will be routed within the levels of the one you pick.',
        body: body,
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- Template workspace --------------------------- */
  S.push({
    id: 'template-workspace', phase: 'home', chrome: 'app', nav: 'home',
    showProgress: false, collapseNav: true, stickyBar: true,
    render: function (ctx) {
      var sys = STORE.activeSystem();
      var t = STORE.template();
      if (!sys || !t) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      var customised = STORE.get('system.customised');

      /* Popups are for complaint types and nothing else, so a card
         that only shows you something opens it here, under the cards. */
      var detail = h('div');
      function showPanel(part) {
        UI.clear(detail);
        var make = window.SERVICE_PANELS && window.SERVICE_PANELS[part.key];
        if (!make) return;
        detail.appendChild(h('div.panel', { style: { marginTop: 'var(--s-5)' } }, [
          h('div.panel-head', [
            UI.icon(part.icon, 18),
            h('h3', part.title),
            h('div.end', [
              UI.btn('Close', { variant: 'ghost', sm: true,
                onclick: function () { UI.clear(detail); } })
            ])
          ])
        ].concat(make(t))));
      }

      /* The title, what it is, and then the five parts of it. No
         workflow chain here — the Workflow card is where that lives. */
      return [
        UI.pageHead(sys.name, t.desc,
          h('span.pill.pill-' + (sys.status === 'live' ? 'live' : 'draft'), statusLabel(sys.status))),

        customised
          ? null
          : UI.banner('brand', 'Everything is already configured. You only need to adapt it to your organisation.', 'sparkle'),

        /* what this service takes reports about — theirs to narrow */
        UI.typeCards(sys.templateId, {
          editable: true,
          onchange: function () { ctx.refresh(); }
        }),

        /* On a draft each card says what it does — Edit forms, Edit
           workflow, View Roles. Once the questions are answered they
           become "Manage …". A card either walks that part's questions
           or opens what the template already set up; Forms has no
           questions and Roles is a view, so both open. */
        h('div.drills', DATA.SERVICE_PARTS.map(function (part) {
          var opens = !part.edit || (part.viewOnly && !customised);
          var label = customised ? part.manage : part.cta;
          /* Forms are not editable in this prototype yet, so the card
             says so rather than opening something that pretends. */
          var idle = part.key === 'forms';
          return UI.partCard(part, UI.btn(label, {
            variant: 'secondary', sm: true,
            /* anything that edits carries the settings icon */
            icon: /^(Edit|Manage)/.test(label) ? 'gear' : 'eye',
            disabled: idle,
            title: idle ? 'Editing forms is not part of this prototype yet' : null,
            onclick: function () {
              if (idle) return;
              if (!opens) {
                window.APP.editPart(part.key, 'template-workspace');
                return;
              }
              /* inline where there is a panel for it, a dialog otherwise */
              if (window.SERVICE_PANELS && window.SERVICE_PANELS[part.key]) showPanel(part);
              else if (window.SERVICE_DRILLS) window.SERVICE_DRILLS[part.key](t);
            }
          }));
        })),

        detail,

        /* Publishing is out of scope for now, so the bar is just the one
           thing: look at the service as it stands. It stays in reach at
           the bottom of the page however far down you have scrolled. */
        h('div.stickybar', [
          sys.status === 'live'
            ? UI.btn('Open live view', {
                icon: 'arrow', iconRight: true,
                onclick: function () { ctx.go('service-view'); }
              })
            : UI.btn('Preview', {
                icon: 'eye',
                onclick: function () { ctx.go('review'); }
              })
        ])
      ];
    }
  });


})();
