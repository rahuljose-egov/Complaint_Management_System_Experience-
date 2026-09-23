/* ============================================================
   screens-custom.js — §7–§15.
   Guided customisation, then review and publish.

   The model enforced here:
     Organisation -> Employees
     Template     -> Roles -> Employees mapped to roles
   The user never creates a role. They only fill the ones the
   template already defines.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  function roles() {
    var t = STORE.template();
    return t ? t.roles : DATA.STD_ROLES;
  }
  function assignedTo(roleId) { return STORE.get('system.roles.' + roleId, []) || []; }

  /* ---------- 6b. Before you begin -------------------------
     Sets expectations before the customisation questions start:
     how long it takes and what they need to hand. The mirror of
     the organisation setup, but for a template. (The organisation's
     own "before you begin" screen was removed — login now asks two
     questions directly.) */
  S.push({
    id: 'cust-welcome', phase: 'customise', chrome: 'focus', wide: true, showProgress: false,
    render: function (ctx) {
      var t = STORE.template();
      var sys = STORE.activeSystem();
      if (!t || !sys) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      /* the gate is the start of a FULL pass, so no part scope */
      STORE.set('edit.scope', '');
      STORE.set('edit.back', '');

      var noEmployees = STORE.employees().length === 0;

      var steps = h('div.sum', DATA.CUST_STEPS.map(function (s) {
        return h('div.sum-row', [
          h('div.ic', { style: { background: 'var(--' + s.hue + '-fill)', color: 'var(--' + s.hue + '-ink)' } },
            UI.icon(s.icon, 18)),
          h('div.tx', [h('b', s.label), h('span', s.need)]),
          h('div.end', [
            h('span.sublabel', { style: { margin: 0 } },
              s.conditional ? '+' + s.mins + ' min' : s.mins + ' min')
          ])
        ]);
      }));

      return [
        h('div.page-head', [
          h('h1', 'Before you begin'),
          h('p', 'You are about to customise ' + sys.name + ' for ' + STORE.orgName() + '. ' +
                 'The template is already built — these questions only adapt it to how your organisation works.')
        ]),

        UI.banner('brand', [
          h('b', 'About ' + DATA.custMins(false) + ' minutes'),
          ' across ' + DATA.CUST_STEPS.filter(function (s) { return !s.conditional; }).length +
          ' questions. Routing by location adds a couple more.'
        ], 'clock'),

        /* the one real prerequisite */
        noEmployees
          ? UI.banner('warn', [
              h('b', 'You have no employees yet. '),
              'The roles step needs people to assign. Add them first, then come back.'
            ], 'people')
          : null,

        h('h3', { style: { font: 'var(--t-title)', margin: 'var(--s-5) 0 var(--s-3)' } },
          'What you’ll need'),
        steps,

        h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
          noEmployees
            ? UI.btn('Add employees first', { icon: 'arrow', iconRight: true,
                onclick: function () {
                  STORE.set('ui.returnTo', 'cust-welcome');
                  ctx.go('org-employees');
                } })
            : UI.btn('Start customising', { icon: 'arrow', iconRight: true, onclick: ctx.next }),
          UI.btn('I’ll do this later', { variant: 'ghost',
            onclick: function () { ctx.go('template-workspace'); } })
        ]),

        h('div.sublabel', { style: { marginTop: 'var(--s-3)' } },
          'You can stop at any point — nothing publishes until you say so.')
      ];
    }
  });

  /* ---------- 7. How should complaints be assigned? --------- */
  S.push({
    id: 'cust-assignment', phase: 'customise', chrome: 'focus', part: 'workflow',
    render: function (ctx) {
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true, disabled: !STORE.get('system.assignment.mode'),
        onclick: function () { if (STORE.get('system.assignment.mode')) ctx.next(); }
      });

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'How should complaints be assigned?',
        help: 'This decides who picks up a complaint the moment it arrives.',
        body: UI.optionCards(DATA.ASSIGNMENT_MODES, {
          value: STORE.get('system.assignment.mode'),
          onchange: function (id) {
            var was = STORE.get('system.assignment.mode');
            STORE.set('system.assignment.mode', id);
            /* switching between the modes leaves a mapping in the wrong
               shape behind, which would then show up in the review */
            if (was && was !== id) {
              STORE.set('system.assignment.byLocation', {});
              STORE.set('system.assignment.byRoleLocation', {});
              if (!DATA.usesLocation(id)) STORE.set('system.assignment.level', '');
            }
            cont.disabled = false;
          }
        }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 7a. Which location level? -------------------- */
  S.push({
    id: 'cust-location-level', phase: 'customise', chrome: 'focus', part: 'workflow',
    when: function () { return DATA.usesLocation(STORE.get('system.assignment.mode')); },
    render: function (ctx) {
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true, disabled: !STORE.get('system.assignment.level'),
        onclick: function () { if (STORE.get('system.assignment.level')) ctx.next(); }
      });

      var scope = DATA.scopeSummary(DATA.orgScope());
      var levels = DATA.locationLevels().map(function (l) {
        var count = DATA.locationsForLevel(l.id).length;
        return {
          id: l.id, label: l.label, icon: 'pin', hue: 'mint',
          desc: l.desc + (count ? ' (' + count + ' to map)' : '')
        };
      });

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'Which location level should determine assignment?',
        help: 'Complaints will be routed by the level you choose, within your geography (' +
              scope + ').',
        body: UI.optionCards(levels, {
          value: STORE.get('system.assignment.level'),
          onchange: function (id) {
            /* the mapping is keyed by location name, so changing level
               invalidates both shapes of it */
            STORE.set('system.assignment.level', id);
            STORE.set('system.assignment.byLocation', {});
            STORE.set('system.assignment.byRoleLocation', {});
            cont.disabled = false;
          }
        }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* What the role mapping is for depends on the rule chosen in 7. */
  function rolesNote() {
    var mode = STORE.get('system.assignment.mode');
    var lvl = STORE.get('system.assignment.level')
      ? DATA.levelLabel(STORE.get('system.assignment.level')).toLowerCase()
      : 'location';

    if (mode === 'location') {
      return ['brand',
        'You chose to assign by ' + lvl + ', so you will pick a per-' + lvl +
        ' assignee next. These role mappings still decide oversight and escalation.',
        'pin'];
    }
    if (mode === 'role-location') {
      return ['brand',
        'You chose to assign by role and ' + lvl + '. These are your organisation-wide defaults — ' +
        'next you can override them for individual ' + lvl + 's.',
        'flow'];
    }
    return ['brand',
      'You chose to assign to the relevant role, so these mappings decide who picks up every complaint.',
      'people'];
  }

  /* ---------- 7b. Who will handle complaints? -------------- */
  S.push({
    id: 'cust-roles', phase: 'customise', chrome: 'focus', part: 'assignments',
    render: function (ctx) {
      var wrap = h('div');
      var cont = UI.btn('Continue', { icon: 'arrow', iconRight: true, onclick: function () {
        if (complete()) ctx.next();
      } });
      var warn = h('div.sublabel', { style: { marginTop: 'var(--s-3)' } });

      function complete() {
        return roles().every(function (r) { return assignedTo(r.id).length > 0; });
      }
      function refreshState() {
        var ok = complete();
        cont.disabled = !ok;
        warn.textContent = ok ? '' : 'Assign at least one employee to each role to continue.';
      }

      function draw() {
        UI.clear(wrap);
        var employees = STORE.employees();

        roles().forEach(function (r) {
          var chosen = assignedTo(r.id);
          var chips = h('div.chips', { style: { marginBottom: 'var(--s-3)' } });

          if (!chosen.length) {
            chips.appendChild(h('span.sublabel', { style: { margin: 0 } }, 'Nobody assigned yet.'));
          }
          chosen.forEach(function (id) {
            chips.appendChild(h('span.chip', [
              STORE.employeeName(id),
              h('button', {
                type: 'button', 'aria-label': 'Remove ' + STORE.employeeName(id),
                onclick: function () {
                  STORE.set('system.roles.' + r.id, chosen.filter(function (x) { return x !== id; }));
                  draw(); refreshState();
                }
              }, '×')
            ]));
          });

          var remaining = employees.filter(function (e) { return chosen.indexOf(e.id) === -1; });
          var picker = remaining.length
            ? UI.select({
                value: '', placeholder: 'Select employee…',
                options: remaining.map(function (e) { return { value: e.id, label: e.name + ' · ' + e.email }; }),
                onchange: function (v) {
                  if (!v) return;
                  STORE.set('system.roles.' + r.id, chosen.concat([v]));
                  draw(); refreshState();
                }
              })
            : h('div.sublabel', { style: { margin: 0 } }, 'Every employee is already assigned to this role.');

          wrap.appendChild(h('div.panel', [
            h('div.panel-head', [
              h('div.ic', {
                style: {
                  width: '36px', height: '36px', borderRadius: 'var(--r-sm)', display: 'grid',
                  placeItems: 'center', background: 'var(--mint-fill)', color: 'var(--mint-ink)'
                }
              }, UI.icon('people', 18)),
              h('div', [h('h3', r.label), h('div.sublabel', { style: { margin: 0 } }, r.desc)])
            ]),
            chips,
            picker
          ]));
        });
      }

      draw();
      refreshState();   /* synchronously, so Continue is never briefly clickable */

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'Who will handle complaints?',
        help: null,
        body: [
          UI.banner('info',
            'This template already includes the roles needed to manage complaints. Assign employees from your organisation to these roles.',
            'people'),
          /* This screen follows the assignment rule, so it can say what
             the mapping is actually FOR — which is why the order matters. */
          UI.banner(rolesNote()[0], rolesNote()[1], rolesNote()[2]),
          wrap,
          warn
        ],
        actions: [
          UI.btn('Back', { variant: 'ghost', onclick: ctx.back }),
          cont
        ]
      });
    }
  });

  /* ---------- 7c. Assign employees by location ------------- */
  /* Two shapes, depending on the mode chosen in 7:
       location       one assignee per location   -> byLocation[loc]
       role-location  an assignee per role, per location
                                                  -> byRoleLocation[loc][roleId]
     Only the FIRST role is required in the combined mode; the rest
     fall back to the org-wide role mapping from §7. */
  S.push({
    id: 'cust-location-map', phase: 'customise', chrome: 'focus', wide: true, part: 'assignments',
    when: function () { return DATA.usesLocation(STORE.get('system.assignment.mode')); },
    render: function (ctx) {
      var mode      = STORE.get('system.assignment.mode');
      var combined  = mode === 'role-location';
      var level     = STORE.get('system.assignment.level');
      var locations = DATA.locationsForLevel(level);
      var employees = STORE.employees();
      var rs        = roles();
      var primary   = rs[0];

      var cont = UI.btn('Continue', { icon: 'arrow', iconRight: true, onclick: function () {
        if (allMapped()) ctx.next();
      } });
      var warn = h('div.sublabel', { style: { marginTop: 'var(--s-3)' } });

      function allMapped() {
        if (!locations.length) return false;
        if (combined) {
          var m = STORE.get('system.assignment.byRoleLocation', {});
          return locations.every(function (l) { return m[l] && m[l][primary.id]; });
        }
        var map = STORE.get('system.assignment.byLocation', {});
        return locations.every(function (l) { return !!map[l]; });
      }

      function refreshState() {
        var ok = allMapped();
        cont.disabled = !ok;
        warn.textContent = ok ? ''
          : combined
            ? 'Choose a ' + primary.label + ' for every location to continue.'
            : 'Choose an employee for every location to continue.';
      }

      function empOptions() {
        return employees.map(function (e) { return { value: e.id, label: e.name }; });
      }

      function levelHeader() {
        return DATA.levelLabel(level);
      }

      function locationCell(loc) {
        return h('td', h('div', {
          style: { display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }
        }, [UI.icon('pin', 15), loc]));
      }

      /* one assignee per location */
      function simpleTable() {
        return h('table.tbl', [
          h('thead', h('tr', [h('th', levelHeader()), h('th', primary.label)])),
          h('tbody', locations.map(function (loc) {
            var map = STORE.get('system.assignment.byLocation', {});
            return h('tr', [
              locationCell(loc),
              h('td', UI.select({
                value: map[loc] || '', placeholder: 'Select employee…',
                options: empOptions(),
                onchange: function (v) {
                  var m = STORE.get('system.assignment.byLocation', {});
                  m[loc] = v;
                  STORE.set('system.assignment.byLocation', m);
                  refreshState();
                }
              }))
            ]);
          }))
        ]);
      }

      /* an assignee per role, per location */
      function combinedTable() {
        return h('table.tbl', [
          h('thead', h('tr', [h('th', levelHeader())].concat(rs.map(function (r, i) {
            return h('th', r.label + (i === 0 ? '' : ' · optional'));
          })))),
          h('tbody', locations.map(function (loc) {
            return h('tr', [locationCell(loc)].concat(rs.map(function (r, i) {
              var m = STORE.get('system.assignment.byRoleLocation', {});
              var current = (m[loc] && m[loc][r.id]) || '';
              /* the fallback for optional roles is whoever holds the role org-wide */
              var fallback = (assignedTo(r.id)[0] && STORE.employeeName(assignedTo(r.id)[0])) || 'role default';
              return h('td', UI.select({
                value: current,
                placeholder: i === 0 ? 'Select employee…' : 'Use ' + fallback,
                options: empOptions(),
                onchange: function (v) {
                  var mm = STORE.get('system.assignment.byRoleLocation', {});
                  if (!mm[loc]) mm[loc] = {};
                  mm[loc][r.id] = v;
                  STORE.set('system.assignment.byRoleLocation', mm);
                  refreshState();
                }
              }));
            })));
          }))
        ]);
      }

      var body;
      if (!locations.length) {
        body = UI.banner('warn',
          'No locations found at this level. Go back and add wards in your geography.', 'info');
      } else {
        body = [
          UI.banner('info', combined
            ? 'A complaint goes to the person holding the relevant role in the location it was reported. Roles you leave blank fall back to your organisation-wide mapping.'
            : 'Complaints reported in each location go to the employee you choose here. Everyone else keeps their role permissions.',
            combined ? 'flow' : 'pin'),
          combined ? combinedTable() : simpleTable(),
          warn
        ];
      }

      refreshState();   /* synchronously, so Continue is never briefly clickable */

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: combined ? 'Assign employees by role and location' : 'Assign employees by location',
        help: null,
        body: body,
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 9. Resolution time ---------------------------- */
  S.push({
    id: 'cust-resolution', phase: 'customise', chrome: 'focus', part: 'workflow',
    render: function (ctx) {
      var customWrap = h('div', { style: { marginTop: 'var(--s-4)' } });
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true, disabled: !STORE.get('system.resolution.preset'),
        onclick: function () { if (STORE.get('system.resolution.preset')) ctx.next(); }
      });

      function drawCustom() {
        UI.clear(customWrap);
        if (STORE.get('system.resolution.preset') !== 'custom') return;
        customWrap.appendChild(h('div.panel', [
          h('div', { style: { display: 'flex', gap: 'var(--s-3)', alignItems: 'flex-end' } }, [
            h('div', { style: { flex: '0 0 110px' } }, [
              UI.field('Resolve within', UI.input({
                id: 'r-val', type: 'number', value: STORE.get('system.resolution.value'),
                oninput: function (v) { STORE.set('system.resolution.value', Math.max(1, parseInt(v, 10) || 1)); }
              }), { id: 'r-val' })
            ]),
            h('div', { style: { flex: '1' } }, [
              UI.field(' ', UI.select({
                value: STORE.get('system.resolution.unit'),
                options: [
                  { value: 'hours', label: 'Hours' },
                  { value: 'days',  label: 'Days' },
                  { value: 'weeks', label: 'Weeks' }
                ],
                onchange: function (v) { STORE.set('system.resolution.unit', v); }
              }))
            ])
          ])
        ]));
      }
      drawCustom();

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'How much time should a complaint have to be resolved?',
        help: 'This is your own target, not a legal SLA — nothing is promised to the ' +
              'public. The clock starts when a complaint is assigned, and going past ' +
              'it marks the complaint overdue.',
        body: [
          UI.optionCards(DATA.RESOLUTION_PRESETS.map(function (p) {
            return { id: p.id, label: p.label, desc: p.desc, icon: 'clock', hue: 'butter' };
          }), {
            value: STORE.get('system.resolution.preset'),
            onchange: function (id) {
              STORE.set('system.resolution.preset', id);
              cont.disabled = false;
              drawCustom();
            }
          }),
          customWrap
        ],
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 10. Overdue behaviour ------------------------- */
  S.push({
    id: 'cust-overdue', phase: 'customise', chrome: 'focus', part: 'workflow',
    render: function (ctx) {
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true, disabled: !STORE.get('system.overdue'),
        onclick: function () { if (STORE.get('system.overdue')) ctx.next(); }
      });

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'What should happen when a complaint becomes overdue?',
        help: 'Escalation runs automatically once the resolution time of ' + DATA.resolutionLabel() + ' passes.',
        body: UI.optionCards(DATA.OVERDUE_ACTIONS.map(function (o) {
          return { id: o.id, label: o.label, desc: o.desc, icon: 'bell', hue: o.hue };
        }), {
          value: STORE.get('system.overdue'),
          onchange: function (id) { STORE.set('system.overdue', id); cont.disabled = false; }
        }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 10b. The workflow, as configured --------------
     Only shown at the end of an Edit workflow pass: the four answers
     take a moment to settle, then the workflow is shown back with the
     detail they just chose. */
  S.push({
    id: 'cust-workflow-ready', phase: 'customise', chrome: 'focus', part: 'workflow', wide: true,
    when: function () { return STORE.get('edit.scope') === 'workflow'; },
    render: function (ctx) {
      var wrap = h('div');

      wrap.appendChild(h('div.loading', [
        h('span.spin'),
        h('b', 'Setting your workflow up'),
        h('span', 'Applying your answers to the template.')
      ]));

      function summary() {
        var mode = STORE.get('system.assignment.mode');
        var rows = [
          ['flow', 'lilac', 'Assignment', DATA.assignmentLabel()]
        ];
        if (DATA.usesLocation(mode)) {
          rows.push(['pin', 'mint', 'Location level',
            DATA.levelLabel(STORE.get('system.assignment.level'))]);
        }
        rows.push(['clock', 'butter', 'Resolution time', DATA.resolutionLabel()]);
        rows.push(['bell', 'peach', 'If it runs late', DATA.overdueLabel()]);

        return h('div', [
          UI.banner('ok', 'Your workflow is set up. This is how a complaint will move.', 'check'),
          h('div.panel', { style: { marginTop: 'var(--s-5)' } }, [
            h('div.panel-head', [UI.icon('flow', 18), h('h3', 'How a complaint will move')]),
            UI.chain(DATA.CHAIN_STEPS)
          ]),
          h('div.facts', { style: { marginTop: 'var(--s-5)' } }, rows.map(function (r) {
            return h('div.fact', [
              h('div.ic', { style: { background: 'var(--' + r[1] + '-fill)', color: 'var(--' + r[1] + '-ink)' } },
                UI.icon(r[0], 17)),
              h('div', [h('b', r[2]), h('span', r[3])])
            ]);
          })),
          h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
            UI.btn('Back to the template', { icon: 'check', onclick: ctx.next }),
            UI.btn('Change my answers', { variant: 'ghost', onclick: ctx.back })
          ])
        ]);
      }

      setTimeout(function () {
        if (!wrap.parentNode) return;      /* they navigated away */
        UI.clear(wrap);
        wrap.appendChild(summary());
      }, 1100);

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'Your workflow',
        help: null,
        body: wrap
      });
    }
  });

  /* ---------- 11a. Who should receive updates? -------------- */
  S.push({
    id: 'cust-updates-who', phase: 'customise', chrome: 'focus', part: 'notifications',
    render: function (ctx) {
      var otherWrap = h('div', { style: { marginTop: 'var(--s-4)' } });
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true,
        disabled: STORE.get('system.updates.who', []).length === 0,
        onclick: function () { if (STORE.get('system.updates.who', []).length) ctx.next(); }
      });

      var items = roles().map(function (r) {
        return { id: r.id, label: r.label, desc: r.desc, icon: 'people', hue: 'lilac' };
      });
      items.push({ id: 'other', label: 'Other', desc: 'Someone outside these roles.', icon: 'dots', hue: 'blush' });

      function drawOther() {
        UI.clear(otherWrap);
        if (!STORE.has('system.updates.who', 'other')) return;
        otherWrap.appendChild(UI.field('Who else should be notified?', UI.input({
          id: 'u-other', value: STORE.get('system.updates.other'),
          placeholder: 'e.g. Office of the Governor, or an email address',
          oninput: function (v) { STORE.set('system.updates.other', v); }
        }), { id: 'u-other' }));
      }
      drawOther();

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'Who should receive updates?',
        help: 'Choose who should be notified when something important happens to a complaint.',
        body: [
          UI.multiCards(items, {
            values: STORE.get('system.updates.who', []),
            onchange: function (id) {
              STORE.toggle('system.updates.who', id);
              cont.disabled = STORE.get('system.updates.who', []).length === 0;
              drawOther();
            }
          }),
          otherWrap
        ],
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 11b. How should they be notified? ------------- */
  S.push({
    id: 'cust-updates-how', phase: 'customise', chrome: 'focus', part: 'notifications',
    render: function (ctx) {
      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true,
        disabled: STORE.get('system.updates.how', []).length === 0,
        onclick: function () { if (STORE.get('system.updates.how', []).length) ctx.next(); }
      });

      var orgChannels = STORE.get('org.channels', []);
      var items = DATA.CHANNELS.map(function (c) {
        var enabled = orgChannels.indexOf(c.id) !== -1;
        return {
          id: c.id, label: c.label, icon: c.icon, hue: c.hue,
          desc: enabled ? c.desc : c.desc + ' (not enabled for your organisation yet)'
        };
      });

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'How should they be notified?',
        help: 'Updates go out on every channel you pick.',
        body: UI.multiCards(items, {
          values: STORE.get('system.updates.how', []),
          onchange: function (id) {
            STORE.toggle('system.updates.how', id);
            cont.disabled = STORE.get('system.updates.how', []).length === 0;
          }
        }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });

  /* ---------- 11c. The notifications, as configured ---------
     Shown at the end of an Edit notifications pass: a card per channel
     they chose, and inside each one the notifications that would go
     out on it. */
  S.push({
    id: 'cust-notifications-ready', phase: 'customise', chrome: 'focus', part: 'notifications', wide: true,
    when: function () { return STORE.get('edit.scope') === 'notifications'; },
    render: function (ctx) {
      var chosen = STORE.get('system.updates.how', []);
      var events = DATA.NOTIFICATION_EVENTS;

      /* one channel's notifications live on a screen of their own */
      function openChannel(ch) {
        STORE.set('ui.notifChannel', ch.id);
        ctx.go('cust-notif-channel');
      }

      var body = [
        UI.banner('ok', 'Your notifications are set up. These are the channels they go out on.', 'check'),
        h('div.rolegrid', { style: { marginTop: 'var(--s-5)' } },
          chosen.map(function (id) {
            var ch = DATA.CHANNELS.filter(function (c) { return c.id === id; })[0];
            if (!ch) return null;
            return h('div.rolecard', [
              h('div.ic', {
                style: { background: 'var(--' + ch.hue + '-fill)', color: 'var(--' + ch.hue + '-ink)' }
              }, UI.icon(ch.icon, 26)),
              h('h3', ch.label),
              h('p', events.length + ' notifications go out on ' + ch.label + '.'),
              UI.btn('Open', {
                variant: 'secondary', sm: true, icon: 'arrow', iconRight: true,
                onclick: function () { openChannel(ch); }
              })
            ]);
          }).filter(Boolean))
      ];

      if (!chosen.length) {
        body = [UI.banner('warn',
          'No channel chosen, so nothing would go out. Go back and pick at least one.', 'info')];
      }

      body.push(h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
        UI.btn('Back to the template', { icon: 'check', onclick: ctx.next }),
        UI.btn('Change my answers', { variant: 'ghost', onclick: ctx.back })
      ]));

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: 'Your notifications',
        help: null,
        body: body
      });
    }
  });

  /* ---------- 11d. One channel's notifications --------------
     A screen of its own, reached from a channel card. Not part of any
     edit chain — it is a detour, so Continue never walks into it. */
  S.push({
    id: 'cust-notif-channel', phase: 'customise', chrome: 'focus', wide: true,
    back: 'cust-notifications-ready', next: 'cust-notifications-ready',
    render: function (ctx) {
      var id = STORE.get('ui.notifChannel', '') ||
               (STORE.get('system.updates.how', [])[0] || 'email');
      var ch = DATA.CHANNELS.filter(function (c) { return c.id === id; })[0] || DATA.CHANNELS[0];
      var events = DATA.NOTIFICATION_EVENTS;

      var q = '';
      var state = '';
      var list = h('div.notifs');

      function draw() {
        UI.clear(list);
        var rows = events.filter(function (e) {
          if (state && e.state !== state) return false;
          if (q && (e.name + ' ' + e.desc).toLowerCase().indexOf(q) === -1) return false;
          return true;
        });
        if (!rows.length) {
          list.appendChild(h('div.empty', [
            h('h3', 'Nothing matches'),
            h('p', 'Try a different name, or clear the workflow state.')
          ]));
          return;
        }
        rows.forEach(function (e) {
          list.appendChild(h('div.notif', [
            h('h4', e.name),
            h('span.pill.pill-conf', e.state),
            h('p', e.desc),
            h('div.notif-acts', [
              UI.btn('Edit', { variant: 'secondary', sm: true, icon: 'gear',
                onclick: function () { UI.announce('Editing is not part of this prototype yet.'); } }),
              UI.btn('Duplicate', { variant: 'secondary', sm: true, icon: 'plus',
                onclick: function () { UI.announce('Duplicated.'); } })
            ])
          ]));
        });
      }

      var search = UI.input({
        id: 'nf-q', placeholder: 'Search by notification name',
        oninput: function (v) { q = v.trim().toLowerCase(); draw(); }
      });
      var states = UI.select({
        value: '', placeholder: 'All workflow states',
        options: events.map(function (e) { return { value: e.state, label: e.state }; }),
        onchange: function (v) { state = v; draw(); }
      });
      draw();

      return UI.screen({
        eyebrow: (STORE.template() || {}).name || 'Customisation',
        title: ch.label + ' notifications',
        help: 'Everything the template sends on ' + ch.label + ', and when.',
        body: [
          h('div.coll-bar', [
            h('div', { style: { flex: '1', minWidth: '200px' } }, [
              UI.field('Search by notification name', search, { id: 'nf-q' })
            ]),
            h('div', { style: { minWidth: '190px' } }, [
              UI.field('Workflow state', states)
            ])
          ]),
          list
        ],
        actions: [
          UI.btn('Back to your notifications', { variant: 'ghost', icon: 'back',
            onclick: function () { ctx.go('cust-notifications-ready'); } })
        ]
      });
    }
  });

  /* ---------- 12. Dashboard --------------------------------- */
  S.push({
    /* Just the question: which KPIs. No mock dashboard preview here —
       the real, personalised dashboard is `service-view`, after publish. */
    id: 'cust-dashboard', phase: 'customise', chrome: 'focus', part: 'dashboard',
    render: function (ctx) {
      var t = STORE.template();
      var all = t ? t.metrics.slice() : [];

      /* everything the template ships with is on by default */
      if (STORE.get('system.metrics', null) === null) STORE.set('system.metrics', all.slice());

      var cont = UI.btn('Continue', {
        icon: 'arrow', iconRight: true,
        disabled: STORE.get('system.metrics', []).length === 0,
        onclick: function () { if (STORE.get('system.metrics', []).length) ctx.next(); }
      });

      return UI.screen({
        eyebrow: (t || {}).name || 'Customisation',
        title: 'Which KPIs should your dashboard track?',
        help: 'Pick the numbers your organisation actually acts on. You can change them later.',
        body: UI.multiCards(all.map(function (m) {
          return { id: m, label: m, icon: 'chart', hue: 'butter' };
        }), {
          values: STORE.get('system.metrics', []),
          onchange: function (id) {
            STORE.toggle('system.metrics', id);
            cont.disabled = STORE.get('system.metrics', []).length === 0;
          }
        }),
        actions: [UI.btn('Back', { variant: 'ghost', onclick: ctx.back }), cont]
      });
    }
  });


  /* ---------- 12b. The dashboard, as configured ------------
     Shown at the end of an Edit dashboard pass: the KPIs they picked,
     as they would appear. */
  S.push({
    id: 'cust-dashboard-ready', phase: 'customise', chrome: 'focus', part: 'dashboard', wide: true,
    when: function () { return STORE.get('edit.scope') === 'dashboard'; },
    render: function (ctx) {
      var t = STORE.template();
      if (!t) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      return UI.screen({
        eyebrow: t.name,
        title: 'Your dashboard',
        help: null,
        body: [
          UI.banner('ok', 'Your dashboard is set up. This is what your employees would open.', 'check'),
          backDashboard(t),
          h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
            UI.btn('Back to the template', { icon: 'check', onclick: ctx.next }),
            UI.btn('Change which KPIs', { variant: 'ghost', onclick: ctx.back })
          ])
        ]
      });
    }
  });

  /* ---------- 13. Your complaints system is ready ------------
     This screen exists for exactly ONE moment: landing here after
     editing the template. It is not a general "view my config"
     page — a published service goes to `service-view` instead, and
     nothing else links here. A summary, not a dump: four configured
     things, each with a one-line description and a drill-in. */
  S.push({
    id: 'review', phase: 'launch', chrome: 'app', nav: 'home', wide: true, showProgress: false,
    render: function (ctx) {
      var t = STORE.template();
      var sys = STORE.activeSystem();
      if (!t || !sys) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      /* Already published? Then this is not the right screen. */
      if (sys.status === 'live') {
        setTimeout(function () { ctx.go('service-view'); }, 0);
        return h('div');
      }

      /* Reaching here means an edit pass just finished. */
      STORE.set('system.customised', true);
      STORE.set('system.status', 'draft');


      /* opens the matching drill-in for a service part */
      var OPEN = {
        forms:         function () { openForms(t); },
        workflow:      function () { openWorkflow(t); },
        dashboard:     function () { openDashboard(t); },
        assignments:   function () { openAssignments(t); },
        notifications: function () { openNotifications(t); }
      };

      return [
        UI.pageHead('Your complaints system is ready', null,
          h('span.pill.pill-draft', 'Draft')),
        h('p.qhelp', { style: { marginTop: 'calc(var(--s-5) * -1)', marginBottom: 'var(--s-6)' } },
          'Your template has been customised for your organisation. Review how the service works and what you’ve configured before publishing.'),

        /* ---- how it will work ---- */
        h('div.panel', [
          h('div.panel-head', [UI.icon('flow', 18), h('h3', 'How will the complaints system work?')]),

          UI.chain(DATA.CHAIN_STEPS),

          h('div.facts', [
            fact('clock', 'butter', 'Resolution time', DATA.resolutionLabel()),
            fact('bell', 'peach', 'If overdue', DATA.overdueSentence())
          ]),

          null
        ]),

        /* ---- the configured pieces ----
           Each card gets its read-only drill-in AND, once setup is
           done, a manage CTA that edits ONLY that part's questions. */
        h('div.drills', DATA.SERVICE_PARTS.map(function (part) {
          return UI.partCard(part, h('div.acts', [
            OPEN[part.key]
              ? h('button.linkish', { type: 'button', onclick: OPEN[part.key] }, part.link + ' →')
              : null,
            part.edit
              ? UI.btn(part.manage, {
                  variant: 'secondary', sm: true, icon: 'gear',
                  onclick: function () { window.APP.editPart(part.key, 'review'); }
                })
              : null
          ]));
        })),

        h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
          UI.btn('Back to the template', { icon: 'arrow', iconRight: true,
            onclick: function () {
              /* finishing a review pass is what completes the
                 Complaints Template setup step */
              if (window.ORG_MARK_DONE) window.ORG_MARK_DONE('templates');
              ctx.go('template-workspace');
            } }),
          UI.btn('Keep editing', { variant: 'ghost',
            onclick: function () { window.APP.editAll('cust-assignment'); } })
        ])
      ];
    }
  });

  function fact(icon, hue, label, value) {
    return h('div.fact', [
      h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
        UI.icon(icon, 17)),
      h('div', [h('b', label), h('span', value)])
    ]);
  }

  /* ---- drill-in: the detailed workflow -------------------- */
  function openWorkflow(t) {
    var m = UI.modal({
      wide: true, icon: 'flow',
      title: 'Detailed workflow',
      desc: 'Every step a complaint goes through.',
      body: [
        h('div.sublabel', 'The stages this template moves a complaint through:'),
        h('div.chips', { style: { marginBottom: 'var(--s-5)' } }, t.workflow.map(function (w, i) {
          return h('span.chip', { style: { paddingRight: '14px' } }, (i + 1) + '. ' + w);
        })),
        h('div.tl', endToEnd(t).map(function (s, i) {
          return h('div.tl-item', [
            h('div.n', String(i + 1)),
            h('div.tx', [h('b', s[0]), h('p', s[1])])
          ]);
        }))
      ],
      actions: [UI.btn('Close', { variant: 'ghost', onclick: function () { m.close(); } })]
    });
  }

  /* ---- drill-in: the forms (front of house) --------------- */
  function openForms(t) {
    var m = UI.modal({
      wide: true, icon: 'form',
      title: 'Forms',
      desc: 'This is the form people fill in, on your own address.',
      body: [
        UI.banner('info', 'Everything here is public. Nothing internal is shown to the person reporting.', 'eye'),
        frontForm(t),
        frontAfter(t)
      ],
      actions: [UI.btn('Close', { variant: 'ghost', onclick: function () { m.close(); } })]
    });
  }

  /* ---- drill-in: the dashboard ---------------------------- */
  function openDashboard(t) {
    var m = UI.modal({
      wide: true, icon: 'chart',
      title: 'Dashboard',
      desc: 'What employees see when monitoring this service.',
      body: [backDashboard(t)],
      actions: [
        UI.btn('Change which KPIs', { variant: 'secondary',
          onclick: function () { m.close(); window.APP.go('cust-dashboard'); } }),
        UI.btn('Close', { variant: 'ghost', onclick: function () { m.close(); } })
      ]
    });
  }

  /* ---- drill-in: who is assigned -------------------------- */
  /* The roles, as a block any screen can drop in — the workspace shows
     it inline rather than in a dialog. */
  function assignmentsPanel(t) {
    var mode = STORE.get('system.assignment.mode');
    var hues = ['lilac', 'mint', 'sky', 'peach', 'butter', 'blush'];

    /* The roles the template ships with, as cards. Whether work
       actually reaches them depends on the workflow, so say which. */
    var cards = h('div.rolegrid', roles().map(function (r, i) {
      var on = assignedTo(r.id);
      var hue = hues[i % hues.length];
      return h('div.rolecard', [
        h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
          UI.icon('people', 26)),
        h('h3', r.label),
        h('p', r.desc || 'A role this template already defines.'),
        h('div.sublabel', { style: { margin: 0 } },
          on.length
            ? on.map(function (id) { return STORE.employeeName(id); }).join(', ')
            : 'Nobody mapped yet')
      ]);
    }));

    var body = [
      mode
        ? UI.banner('info',
            'Complaints are assigned ' + DATA.assignmentPhrase() + ', and a complaint ' +
            'has ' + DATA.resolutionLabel() + ' before it counts as overdue.',
            'flow')
        : UI.banner('warn',
            'The workflow is not set up yet, so nothing routes to these roles. ' +
            'Edit the workflow to decide how complaints reach them.',
            'info'),
      cards,
      backRouting(t)
    ];

    /* if they route by location, show that mapping too */
    if (DATA.usesLocation(mode)) {
      var level = STORE.get('system.assignment.level');
      var locations = DATA.locationsForLevel(level);
      var combined = mode === 'role-location';
      var rs = roles();

      body.push(h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
        h('div.panel-head', [UI.icon('pin', 18), h('h3', 'By ' + (level || 'location'))]),
        locations.length
          ? h('table.tbl', [
              h('thead', h('tr', [h('th', 'Location')].concat(
                combined ? rs.map(function (r) { return h('th', r.label); })
                         : [h('th', rs[0].label)]
              ))),
              h('tbody', locations.map(function (loc) {
                var cells = [h('td', loc)];
                if (combined) {
                  var mm = STORE.get('system.assignment.byRoleLocation', {});
                  rs.forEach(function (r) {
                    var id = (mm[loc] && mm[loc][r.id]) || '';
                    cells.push(h('td', id ? STORE.employeeName(id)
                                          : h('span.sublabel', { style: { margin: 0 } }, 'role default')));
                  });
                } else {
                  var m2 = STORE.get('system.assignment.byLocation', {});
                  cells.push(h('td', m2[loc] ? STORE.employeeName(m2[loc])
                                             : h('span.sublabel', { style: { margin: 0 } }, 'not set')));
                }
                return h('tr', cells);
              }))
            ])
          : UI.banner('warn', 'No locations mapped at this level.', 'info')
      ]));
    }

    return body;
  }

  function openAssignments(t) {
    var m = UI.modal({
      wide: true, icon: 'people',
      title: 'Roles',
      desc: 'Who picks up a complaint, and why.',
      body: assignmentsPanel(t),
      actions: [
        UI.btn('Change assignments', { variant: 'secondary',
          onclick: function () { m.close(); window.APP.go('cust-roles'); } }),
        UI.btn('Close', { variant: 'ghost', onclick: function () { m.close(); } })
      ]
    });
  }

  /* ---- drill-in: notifications ---------------------------- */
  /* What is sent, WHEN it is sent, and WHO receives it. */
  function openNotifications(t) {
    var how = STORE.get('system.updates.how', []).map(DATA.channelLabel).join(', ') || 'no channel yet';
    var who = updatesWhoLabel();

    var events = [
      { when: 'When a complaint is submitted', to: 'The person who reported it',
        what: 'A reference number and confirmation' },
      { when: 'When it is assigned', to: who,
        what: 'A new complaint is waiting' },
      { when: 'While it is open', to: 'The person who reported it',
        what: 'Progress updates at each stage' },
      { when: 'If it passes ' + DATA.resolutionLabel(), to: escalationTarget(),
        what: DATA.overdueSentence() },
      { when: 'When it is resolved', to: 'The person who reported it, and ' + who,
        what: 'Outcome and closing note' }
    ];

    var m = UI.modal({
      wide: true, icon: 'bell',
      title: 'Notifications',
      desc: 'Sent by ' + how + '.',
      body: [
        h('table.tbl', [
          h('thead', h('tr', [h('th', 'When'), h('th', 'Who receives it'), h('th', 'What it says')])),
          h('tbody', events.map(function (e) {
            return h('tr', [
              h('td', e.when),
              h('td', e.to),
              h('td', e.what)
            ]);
          }))
        ]),
        STORE.get('system.updates.how', []).length
          ? null
          : UI.banner('warn', 'No channel chosen yet, so nothing would actually be delivered.', 'info')
      ],
      actions: [
        UI.btn('Change notifications', { variant: 'secondary',
          onclick: function () { m.close(); window.APP.go('cust-updates-who'); } }),
        UI.btn('Close', { variant: 'ghost', onclick: function () { m.close(); } })
      ]
    });
  }

  function escalationTarget() {
    var id = STORE.get('system.overdue');
    if (id === 'remind')      return 'The assigned employee';
    if (id === 'remind-then') return 'The assigned employee, then their manager';
    if (id === 'manager-now') return 'The manager';
    return 'Nobody';
  }


  /* ---- FRONT: the form they will actually get -------------- */
  function frontForm(t) {
    var e = DATA.EXAMPLES[t.id] || DATA.EXAMPLES.other;
    var sample = {};
    sample[t.formFields[0]] = t.name.replace(' Complaints', '');
    return h('div.mock', [
      h('div.mock-bar', [h('i'), h('i'), h('i'),
        h('span', { style: { marginLeft: 'var(--s-2)' } },
          (STORE.get('workspace.url') || 'your-org') + '.complaints.gov/report')]),
      h('div.mock-body', [
        h('h3', { style: { font: 'var(--t-title)', marginBottom: 'var(--s-1)' } },
          STORE.get('org.branding.name') || STORE.orgName()),
        h('p.sublabel', 'Report a problem · takes about a minute'),
        h('div', t.formFields.map(function (f, i) {
          return h('div.mock-field', [
            h('b', f),
            i === 1 ? e.place : i === 0 ? sample[t.formFields[0]] : '—'
          ]);
        })),
        UI.btn('Submit complaint', { block: true })
      ])
    ]);
  }

  /* ---- FRONT: what the reporter gets afterwards ------------ */
  function frontAfter(t) {
    var how = STORE.get('system.updates.how', []).map(DATA.channelLabel);
    return h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
      h('div.panel-head', [UI.icon('check', 18), h('h3', 'What they get back')]),
      h('div.sum', [
        miniRow('check', 'mint', 'A reference number', 'Straight away, on screen — e.g. CMP-4417.'),
        miniRow('mail', 'sky', 'A confirmation',
          how.length ? 'Sent by ' + how.join(' and ') + '.' : 'No channel chosen yet.'),
        miniRow('clock', 'butter', 'A promise',
          'Resolved within ' + DATA.resolutionLabel() + '.'),
        miniRow('eye', 'lilac', 'Progress they can follow',
          t.workflow.length + ' stages, without phoning an office.')
      ])
    ]);
  }

  /* ---- BACK: who it goes to -------------------------------- */
  function backRouting(t) {
    var rows = roles().map(function (r) {
      var people = assignedTo(r.id).map(STORE.employeeName);
      return miniRow('people', 'mint', r.label, people.length ? people.join(', ') : 'Nobody assigned');
    });
    return h('div.panel', [
      h('div.panel-head', [UI.icon('pin', 18), h('h3', 'Who picks it up')]),
      UI.banner('info', DATA.assignmentLabel() + '.', 'flow'),
      h('div.sum', rows)
    ]);
  }

  /* ---- BACK: the clock and the escalation ------------------ */
  function backClock() {
    var who = STORE.get('system.updates.who', []).map(function (id) {
      if (id === 'other') return STORE.get('system.updates.other') || 'Other';
      var rs = roles();
      for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i].label;
      return id;
    });
    return h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
      h('div.panel-head', [UI.icon('clock', 18), h('h3', 'The clock and the chase')]),
      h('div.sum', [
        miniRow('clock', 'butter', 'Resolution time', DATA.resolutionLabel()),
        miniRow('bell', 'peach', 'If it runs late', DATA.overdueLabel()),
        miniRow('people', 'lilac', 'Who gets told',
          who.length ? who.join(', ') : 'Nobody selected')
      ])
    ]);
  }

  /* ---- BACK: how their dashboard would look ---------------- */
  function backDashboard(t) {
    var kpis = STORE.get('system.metrics', null) || t.metrics;
    var hues = ['lilac', 'blush', 'sky', 'mint', 'peach', 'butter'];
    return h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
      h('div.panel-head', [UI.icon('chart', 18), h('h3', 'How your dashboard would look')]),
      kpis.length
        ? h('div', [
            h('div.stat-grid.compact', kpis.map(function (k, i) {
              return h('div.stat', [
                h('div.k', k),
                h('div.v', { style: { color: 'var(--' + hues[i % hues.length] + '-ink)' } },
                  DATA.KPI_MOCK[k] || '—')
              ]);
            })),
            h('div.sublabel', { style: { marginTop: 'var(--s-3)', marginBottom: 0 } },
              'Sample figures. Only the KPIs you chose appear.')
          ])
        : UI.banner('warn', 'No KPIs chosen yet.', 'chart')
    ]);
  }

  function miniRow(icon, hue, label, value) {
    return h('div.sum-row', [
      h('div.ic', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } },
        UI.icon(icon, 18)),
      h('div.tx', [h('b', label), h('span', value)])
    ]);
  }

  /* Each step is tagged front or back, so the split holds here too. */
  function endToEnd(t) {
    return [
      ['Complaint submitted', 'Someone fills in the form on your public page.'],
      ['Complaint assigned',  'Assigned ' + DATA.assignmentPhrase() + '.'],
      ['Complaint handled',   'The assigned employee works it through ' + t.workflow.length + ' stages.'],
      ['Resolution period',   'It should be resolved within ' + DATA.resolutionLabel() + '.'],
      ['If overdue',          DATA.overdueLabel() + '.'],
      ['Updates',             updatesSentence()]
    ];
  }


  function updatesWhoLabel() {
    var who = STORE.get('system.updates.who', []);
    var names = who.map(function (id) {
      if (id === 'other') return STORE.get('system.updates.other') || 'Other';
      var rs = roles();
      for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i].label;
      return id;
    });
    return names.join(', ') || 'Nobody selected';
  }
  function updatesSentence() {
    var how = STORE.get('system.updates.how', []).map(DATA.channelLabel).join(', ');
    return updatesWhoLabel() + (how ? ' receive updates by ' + how + '.' : ' receive updates.');
  }

  /* Blocks a screen can render inline instead of opening a dialog:
     the user asked for popups to be reserved for complaint types. */
  window.SERVICE_PANELS = {
    assignments: assignmentsPanel
  };

  window.SERVICE_DRILLS = {
    forms:         function (t) { openForms(t); },
    dashboard:     function (t) { openDashboard(t); },
    assignments:   function (t) { openAssignments(t); },
    notifications: function (t) { openNotifications(t); },
    workflow:      function (t) { openWorkflow(t); }
  };

})();
