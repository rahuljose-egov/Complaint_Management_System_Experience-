/* ============================================================
   screens-service.js — the view a person gets once their
   complaint service is live.

   It is personalised two ways:
     1. the PERSPECTIVE — nobody is asked which role they hold, so it
        opens on the administrator's view (service health) and the
        "Viewing as" select switches to officer, service manager or
        department manager;
     2. the SERVICE — only the KPIs they picked appear, and the rules
        panel reflects their own assignment, resolution and
        escalation choices.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  function roles() {
    var t = STORE.template();
    return t ? t.roles : DATA.STD_ROLES;
  }
  function assignedTo(roleId) { return STORE.get('system.roles.' + roleId, []) || []; }
  function roleLabelById(id) {
    var rs = roles();
    for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i].label;
    return id;
  }


  /* Nobody is asked which role they hold, so this opens on the
     administrator's view and the "Viewing as" select changes it. */
  function persona() {
    var chosen = STORE.get('view.as', '');
    return DATA.PERSONAS[chosen] || DATA.PERSONAS[DATA.DEFAULT_PERSONA];
  }

  S.push({
    id: 'service-view', phase: 'launch', chrome: 'app', nav: 'home', showProgress: false,
    render: function (ctx) {
      var sys = STORE.activeSystem();
      var t = STORE.template();
      if (!sys || !t) { setTimeout(function () { ctx.go('systems'); }, 0); return h('div'); }

      var p = persona();
      var kpis = STORE.get('system.metrics', null) || t.metrics;

      return [
        /* who this view belongs to */
        h('div.page-head', [
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flexWrap: 'wrap' } }, [
            h('h1', 'Good to go, ' + STORE.firstName()),
            h('span.pill.pill-' + (sys.status === 'live' ? 'live' : 'draft'),
              sys.status === 'live' ? 'Published' : 'Draft')
          ]),
          h('p', p.lead + ' You are seeing ' + sys.name + ' as ' + p.label + '.')
        ]),

        viewAsBar(ctx, p),
        serviceFacts(sys),
        kpiRow(kpis),
        personaPanel(p, t),
        rulesPanel(t),

        /* No link to `review` — that screen is only for the moment
           after an edit pass, and this service is already published. */
        h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
          UI.btn('Edit this service', { icon: 'gear',
            onclick: function () { ctx.go('template-workspace'); } }),
          UI.btn('All complaint systems', { variant: 'ghost',
            onclick: function () { ctx.go('systems'); } })
        ])
      ];
    }
  });

  /* ---- "viewing as" switcher ------------------------------- */
  function viewAsBar(ctx, current) {
    var opts = Object.keys(DATA.PERSONAS).map(function (k) {
      return { value: k, label: DATA.PERSONAS[k].label };
    });
    return h('div.banner.banner-brand', { style: { alignItems: 'center' } }, [
      UI.icon('eye', 17),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flexWrap: 'wrap', flex: '1' } }, [
        h('span', 'Choose whose view of this service you want to see.'),
        h('div', { style: { marginLeft: 'auto', minWidth: '210px' } }, [
          UI.select({
            value: current.id,
            options: opts,
            onchange: function (v) { STORE.set('view.as', v); ctx.refresh(); }
          })
        ])
      ])
    ]);
  }

  /* ---- what they told us when adopting the template -------
     The operational area was collected in the adoption intake; this
     is where it surfaces. */
  function serviceFacts(sys) {
    var hier = DATA.hierarchies().filter(function (x) { return x.id === sys.hierarchyId; })[0];
    return h('div.facts', { style: { marginBottom: 'var(--s-5)' } }, [
      factRow('pin', 'mint', 'Runs in', hier ? hier.name : 'No geography chosen'),
      factRow('globe', 'sky', 'Levels', hier
        ? hier.levels.map(function (lv) { return lv.label; }).join(' › ')
        : '—')
    ]);
  }
  function factRow(icon, hue, label, value) {
    return h('div.fact', [
      h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
        UI.icon(icon, 17)),
      h('div', [h('b', label), h('span', value)])
    ]);
  }

  /* ---- only the KPIs they chose --------------------------- */
  function kpiRow(kpis) {
    var hues = ['lilac', 'blush', 'sky', 'mint', 'peach', 'butter'];
    if (!kpis.length) {
      return UI.banner('warn', 'No KPIs selected for this service yet.', 'chart');
    }
    return h('div', { style: { marginBottom: 'var(--s-5)' } }, [
      h('div.stat-grid', kpis.map(function (k, i) {
        return h('div.stat', [
          h('div.k', k),
          h('div.v', { style: { color: 'var(--' + hues[i % hues.length] + '-ink)' } },
            DATA.KPI_MOCK[k] || '—')
        ]);
      })),
      h('div.sublabel', { style: { marginTop: 'var(--s-2)', marginBottom: 0 } },
        kpis.length + ' of ' + 4 + ' available KPIs are on this dashboard.')
    ]);
  }

  /* ---- the panel that differs per person ------------------ */
  function personaPanel(p, t) {
    var e = DATA.EXAMPLES[t.id] || DATA.EXAMPLES.other;
    var body;

    if (p.id === 'officer') {
      body = [
        h('div.list', [
          caseRow('CMP-4417', e.place, 'Due in 6 hours', 'draft'),
          caseRow('CMP-4402', 'Kangemi', 'Due tomorrow', 'draft'),
          caseRow('CMP-4388', 'Karura', 'Due in 2 days', 'draft')
        ]),
        h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          UI.btn('Open the oldest', { icon: 'arrow', iconRight: true }),
          UI.btn('My resolved cases', { variant: 'ghost' })
        ])
      ];
    } else if (p.id === 'supervisor') {
      body = [
        UI.banner('warn', 'One officer is carrying more than they can clear today.', 'people'),
        h('div.list', [
          personRow('Anita Wanjiru', '7 open · 2 near deadline'),
          personRow('John Otieno', '9 open · 1 overdue'),
          personRow('Mary Chebet', '2 open')
        ]),
        h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          UI.btn('Rebalance workload', { icon: 'flow' }),
          UI.btn('See all open complaints', { variant: 'ghost' })
        ])
      ];
    } else if (p.id === 'manager') {
      body = [
        UI.banner('warn', 'Past its ' + DATA.resolutionLabel() + ' deadline. ' + DATA.overdueLabel() + '.', 'clock'),
        h('div.list', [
          h('div.row-item', [
            UI.avatar('John Otieno'),
            h('div.who', [
              h('b', 'CMP-4402 · ' + e.place),
              h('span', e.complaint.charAt(0).toUpperCase() + e.complaint.slice(1))
            ]),
            h('div.end', [h('span.pill.pill-draft', 'Overdue')])
          ])
        ]),
        h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          UI.btn('Reassign', { variant: 'secondary' }),
          UI.btn('Full dashboard', { variant: 'ghost' })
        ])
      ];
    } else {
      /* administrator — is the service actually set up properly? */
      var checks = [
        ['Roles filled', roles().every(function (r) { return assignedTo(r.id).length > 0; }),
         roles().map(function (r) { return r.label + ': ' + (assignedTo(r.id).length || 0); }).join(' · ')],
        ['Assignment rule', !!STORE.get('system.assignment.mode'), DATA.assignmentLabel()],
        ['Resolution time', !!STORE.get('system.resolution.preset'), DATA.resolutionLabel()],
        ['Escalation', !!STORE.get('system.overdue'), DATA.overdueLabel()],
        ['Channels', STORE.get('system.updates.how', []).length > 0,
         STORE.get('system.updates.how', []).map(DATA.channelLabel).join(', ') || 'None chosen']
      ];
      body = [
        h('div.sum', checks.map(function (c) {
          return h('div.sum-row', [
            h('div.ic', {
              style: {
                background: c[1] ? 'var(--ok-fill)' : 'var(--warn-fill)',
                color: c[1] ? 'var(--ok-ink)' : 'var(--warn-ink)'
              }
            }, UI.icon(c[1] ? 'check' : 'info', 18)),
            h('div.tx', [h('b', c[0]), h('span', c[2])]),
            h('div.end', [h('span.pill.pill-' + (c[1] ? 'conf' : 'draft'), c[1] ? 'Set' : 'Check')])
          ]);
        }))
      ];
    }

    return h('div.panel', [
      h('div.panel-head', [UI.icon(p.id === 'admin' ? 'gear' : 'bell', 18), h('h3', p.panel)]),
      body
    ]);
  }

  function caseRow(ref, place, due, kind) {
    return h('div.row-item', [
      h('div.who', [h('b', ref + ' · ' + place), h('span', due)]),
      h('div.end', [h('span.pill.pill-' + kind, due)])
    ]);
  }
  function personRow(name, load) {
    return h('div.row-item', [
      UI.avatar(name),
      h('div.who', [h('b', name), h('span', load)]),
      h('div.end', [UI.btn('Reassign', { variant: 'ghost', sm: true })])
    ]);
  }

  /* ---- the rules they configured, in plain words ---------- */
  function rulesPanel(t) {
    var who = STORE.get('system.updates.who', []).map(function (id) {
      return id === 'other' ? (STORE.get('system.updates.other') || 'Other') : roleLabelById(id);
    }).join(', ') || 'Nobody selected';

    var rows = [
      ['pin',    'sky',    'Assignment',     DATA.assignmentLabel()],
      ['clock',  'butter', 'Resolution time', DATA.resolutionLabel()],
      ['bell',   'peach',  'When overdue',   DATA.overdueLabel()],
      ['people', 'mint',   'Who gets updates', who],
      ['mail',   'lilac',  'Channels',
       STORE.get('system.updates.how', []).map(DATA.channelLabel).join(', ') || 'None chosen']
    ];

    return h('div.panel', [
      h('div.panel-head', [UI.icon('flow', 18), h('h3', 'How complaints flow here')]),
      h('div.sum', rows.map(function (r) {
        return h('div.sum-row', [
          h('div.ic', { style: { background: 'var(--' + r[1] + '-fill)', color: 'var(--' + r[1] + '-ink)' } },
            UI.icon(r[0], 18)),
          h('div.tx', [h('b', r[2]), h('span', r[3])])
        ]);
      }))
    ]);
  }
})();
