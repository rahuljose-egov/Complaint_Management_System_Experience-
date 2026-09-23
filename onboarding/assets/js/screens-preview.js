/* ============================================================
   screens-preview.js — "Preview" on a template opens a role
   chooser, then a narrated setup, then the role's actual view.

     preview-role  → How would you like to experience this?
     preview-story → beats revealed one at a time, with pauses
     preview-play  → what that role actually sees

   Previewing never creates a complaint system. It writes only to
   `preview` in the store, so looking is free.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  function tid()  { return STORE.get('preview.templateId'); }
  function role() { return STORE.get('preview.role') || 'officer'; }
  function tpl()  { return DATA.templateById(tid()); }
  function from() { return STORE.get('preview.from') || 'templates'; }
  function ex()   { return DATA.EXAMPLES[tid()] || DATA.EXAMPLES.other; }

  function hueForRole(r) {
    return { citizen: 'sky', officer: 'lilac', supervisor: 'mint', manager: 'peach' }[r] || 'lilac';
  }

  /* ---------- 1. Choose a perspective ---------------------- */
  S.push({
    id: 'preview-role', phase: 'preview', chrome: 'focus', wide: true, showProgress: false,
    render: function (ctx) {
      var t = tpl();
      if (!t) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      return [
        UI.pageHead('How would you like to experience this template?',
          'Pick a perspective and we will walk you through a real situation before showing you the screen.',
          h('span.pill.pill-conf', t.name)),

        /* what it takes reports about, before who handles them */
        UI.typeCards(tid()),

        UI.banner('info',
          'These are the roles this template already includes. Nothing you pick here changes your setup.',
          'people'),

        /* Square cards, each with its own Explore CTA. */
        h('div.rolegrid', DATA.previewRoles(tid()).map(function (r) {
          return h('div.rolecard', [
            h('div.ic', {
              style: { background: 'var(--' + r.hue + '-fill)', color: 'var(--' + r.hue + '-ink)' }
            }, UI.icon(r.icon, 26)),
            h('h3', r.label),
            h('p', r.desc),
            UI.btn('Explore', {
              variant: 'secondary', sm: true, icon: 'arrow', iconRight: true,
              onclick: function () {
                STORE.set('preview.role', r.id);
                ctx.go('preview-story');
              }
            })
          ]);
        })),

        h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
          UI.btn('Back to templates', { variant: 'ghost', onclick: function () { ctx.go(from()); } })
        ])
      ];
    }
  });

  /* ---------- 2. The narrated setup ------------------------ */
  /* Beats appear one at a time with a pause between them. A run id
     invalidates timers from a screen the user has already left, so a
     stale callback can never append a beat to a detached node. */
  var runId = 0;

  S.push({
    id: 'preview-story', phase: 'preview', chrome: 'focus', showProgress: false,
    render: function (ctx) {
      var t = tpl();
      if (!t) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }

      var myRun = ++runId;
      var beats = DATA.storyFor(tid(), role());
      var storyEl = h('div.story');
      var timer = null;
      var shown = 0;
      var thinking = null;

      var mainBtn = UI.btn('Continue', { onclick: onMain });

      function clearThinking() {
        if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
        thinking = null;
      }

      function addThinking() {
        thinking = h('div.thinking', [
          h('span.dots', [h('i'), h('i'), h('i')]),
          'a moment later…'
        ]);
        storyEl.appendChild(thinking);
      }

      function beatNode(b, isFinal) {
        return h('div.beat' + (isFinal ? '.final' : ''), [
          h('span.ic', {
            style: { background: 'var(--' + b.hue + '-fill)', color: 'var(--' + b.hue + '-ink)' }
          }, UI.icon(b.icon, 19)),
          h('span.tx', [h('b', b.text), b.note ? h('span', b.note) : null])
        ]);
      }

      function reveal() {
        if (myRun !== runId) return;          /* user left this screen */
        clearThinking();

        var b = beats[shown];
        var isFinal = shown === beats.length - 1;
        storyEl.appendChild(beatNode(b, isFinal));
        UI.announce(b.text);
        shown++;

        if (shown < beats.length) {
          addThinking();
          timer = setTimeout(reveal, b.wait || 2400);
        } else {
          mainBtn.textContent = 'See the preview';
        }
      }

      function onMain() {
        if (shown < beats.length) {           /* impatient — skip the pause */
          if (timer) { clearTimeout(timer); timer = null; }
          reveal();
        } else {
          ctx.go('preview-play');
        }
      }

      reveal();

      return UI.screen({
        eyebrow: t.name + ' · as ' + DATA.previewRoleLabel(tid(), role()),
        title: 'Here is the situation',
        help: null,
        body: storyEl,
        actions: [
          UI.btn('Back', { variant: 'ghost', onclick: function () { runId++; ctx.go('preview-role'); } }),
          mainBtn,
          UI.btn('Skip to the preview', {
            variant: 'ghost',
            onclick: function () { runId++; if (timer) clearTimeout(timer); ctx.go('preview-play'); }
          })
        ]
      });
    }
  });

  /* ---------- 3. What that role actually sees -------------- */
  S.push({
    id: 'preview-play', phase: 'preview', chrome: 'focus', wide: true, showProgress: false,
    render: function (ctx) {
      var t = tpl();
      if (!t) { setTimeout(function () { ctx.go('templates'); }, 0); return h('div'); }
      var r = role();
      var hue = hueForRole(r);

      var views = { citizen: citizenView, officer: officerView, supervisor: supervisorView, manager: managerView };
      var view = (views[r] || officerView)(t);

      return [
        h('div.role-hero', { style: { background: 'var(--' + hue + '-fill)', color: 'var(--' + hue + '-ink)' } }, [
          h('div.ic', UI.icon('eye', 20)),
          h('div', [
            h('b', 'You are seeing this as ' + DATA.previewRoleLabel(tid(), r)),
            h('span', t.name + ' · preview only, nothing here is saved')
          ]),
          h('div.end', [
            UI.btn('Try another role', {
              variant: 'secondary', sm: true, onclick: function () { ctx.go('preview-role'); }
            })
          ])
        ]),

        view,
        includedPanel(t),

        h('div.actions', { style: { marginTop: 'var(--s-6)' } }, [
          UI.btn('Use this template', { icon: 'sparkle', onclick: function () { window.APP.useTemplate(tid()); } }),
          UI.btn('Back to templates', { variant: 'ghost', onclick: function () { ctx.go(from()); } })
        ])
      ];
    }
  });

  /* ---- the four role views -------------------------------- */

  function citizenView(t) {
    var e = ex();
    return h('div', [
      h('div.mock', [
        h('div.mock-bar', [h('i'), h('i'), h('i'),
          h('span', { style: { marginLeft: 'var(--s-2)' } },
            (STORE.get('workspace.url') || 'your-org') + '.complaints.gov/report')]),
        h('div.mock-body', [
          h('h3', { style: { font: 'var(--t-title)', marginBottom: 'var(--s-2)' } }, 'Report a problem'),
          h('p.sublabel', 'Takes about a minute. You do not need an account.'),
          h('div', t.formFields.map(function (f, i) {
            return h('div.mock-field', [
              h('b', f),
              i === 0 ? t.name.replace(' Complaints', '') :
              i === 1 ? e.place :
              i === 2 ? 'photo-2291.jpg' :
              i === 3 ? e.complaint.charAt(0).toUpperCase() + e.complaint.slice(1) :
                        e.reporter + ' · 07xx xxx xxx'
            ]);
          })),
          UI.btn('Submit complaint', { block: true })
        ])
      ]),

      h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
        h('div.panel-head', [UI.icon('check', 18), h('h3', 'What happens next')]),
        UI.banner('ok', ['Reference ', h('b', 'CMP-4417'), ' — saved. You will get a confirmation on your chosen channel.'], 'check'),
        h('div.tl', t.workflow.map(function (w, i) {
          return h('div.tl-item', [
            h('div.n', { style: i === 0
              ? { background: 'var(--ok-fill)', color: 'var(--ok-ink)' }
              : null }, i === 0 ? '✓' : String(i + 1)),
            h('div.tx', [
              h('b', w),
              h('p', i === 0 ? 'Done — just now' : 'You will be notified when this happens.')
            ])
          ]);
        }))
      ])
    ]);
  }

  function officerView(t) {
    var e = ex();
    return h('div.panel', [
      h('div.panel-head', [
        h('div', { style: {
          width: '40px', height: '40px', borderRadius: 'var(--r-md)', display: 'grid',
          placeItems: 'center', background: 'var(--' + t.hue + '-fill)', color: 'var(--' + t.hue + '-ink)'
        } }, UI.icon(t.icon, 20)),
        h('div', [
          h('h3', 'CMP-4417'),
          h('div.sublabel', { style: { margin: 0 } }, 'Assigned to you · reported by ' + e.reporter)
        ]),
        h('div.end', [h('span.pill.pill-draft', DATA.resolutionLabel() + ' to resolve')])
      ]),

      UI.banner('ok', 'Verified as a legitimate complaint. Duplicates were filtered out.', 'check'),

      h('div.list', { style: { marginBottom: 'var(--s-4)' } }, [
        h('div.row-item', [h('div.who', [h('b', 'What was reported'),
          h('span', e.complaint.charAt(0).toUpperCase() + e.complaint.slice(1))])]),
        h('div.row-item', [h('div.who', [h('b', 'Where'), h('span', e.place)])]),
        h('div.row-item', [h('div.who', [h('b', 'Evidence'), h('span', '1 photo attached')])]),
        h('div.row-item', [h('div.who', [h('b', 'Channel'), h('span', 'Submitted through the citizen form')])])
      ]),

      h('div.sublabel', 'Move it through the workflow:'),
      h('div.chips', t.workflow.slice(1).map(function (w) {
        return h('span.chip', { style: { paddingRight: '14px' } }, w);
      })),
      h('div.actions', { style: { marginTop: 'var(--s-5)' } }, [
        UI.btn('Take action', { icon: 'check' }),
        UI.btn('Reassign', { variant: 'secondary' }),
        UI.btn('Ask for more detail', { variant: 'ghost' })
      ])
    ]);
  }

  function supervisorView(t) {
    var e = ex();
    var rows = [
      ['CMP-4417', e.place,          'Anita Wanjiru', 'Due in 6 hours', 'draft'],
      ['CMP-4402', 'Kangemi',        'John Otieno',   'Overdue',        'draft'],
      ['CMP-4388', 'Karura',         'Anita Wanjiru', 'Due tomorrow',   'draft'],
      ['CMP-4351', 'Mountain View',  'Mary Chebet',   'Resolved',       'live']
    ];
    return h('div', [
      h('div.stat-grid', { style: { marginBottom: 'var(--s-4)' } }, [
        h('div.stat', [h('div.k', 'Open in your area'), h('div.v', { style: { color: 'var(--lilac-ink)' } }, '12')]),
        h('div.stat', [h('div.k', 'Approaching deadline'), h('div.v', { style: { color: 'var(--butter-ink)' } }, '4')]),
        h('div.stat', [h('div.k', 'Overdue'), h('div.v', { style: { color: 'var(--blush-ink)' } }, '1')])
      ]),
      h('div.panel', [
        h('div.panel-head', [UI.icon('flow', 18), h('h3', 'Where work is stuck')]),
        h('table.tbl', [
          h('thead', h('tr', [h('th', 'Reference'), h('th', 'Location'), h('th', 'Assigned to'), h('th', 'Status')])),
          h('tbody', rows.map(function (rw) {
            return h('tr', [
              h('td', rw[0]), h('td', rw[1]), h('td', rw[2]),
              h('td', h('span.pill.pill-' + (rw[4] === 'live' ? 'live' : 'draft'), rw[3]))
            ]);
          }))
        ]),
        h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          UI.btn('Reassign selected', { variant: 'secondary' }),
          UI.btn('Escalate to manager', { variant: 'ghost' })
        ])
      ])
    ]);
  }

  function managerView(t) {
    var e = ex();
    var mock = {
      'Open complaints': '128', 'Overdue complaints': '9',
      'Complaints by location': '14 wards', 'Resolution time': '2.4 days'
    };
    var hues = ['lilac', 'blush', 'sky', 'mint'];
    return h('div', [
      h('div.stat-grid', { style: { marginBottom: 'var(--s-4)' } },
        t.metrics.map(function (m, i) {
          return h('div.stat', [
            h('div.k', m),
            h('div.v', { style: { color: 'var(--' + hues[i % hues.length] + '-ink)' } }, mock[m] || '—')
          ]);
        })),
      h('div.panel', [
        h('div.panel-head', [UI.icon('bell', 18), h('h3', 'Escalated to you')]),
        UI.banner('warn', 'Past its ' + DATA.resolutionLabel() + ' deadline. The officer was reminded automatically.', 'clock'),
        h('div.list', [
          h('div.row-item', [
            UI.avatar('Anita Wanjiru'),
            h('div.who', [h('b', 'CMP-4402 · ' + e.place),
              h('span', e.complaint.charAt(0).toUpperCase() + e.complaint.slice(1))]),
            h('div.end', [h('span.pill.pill-draft', 'Overdue')])
          ])
        ]),
        h('div.actions', { style: { marginTop: 'var(--s-4)' } }, [
          UI.btn('Reassign', { variant: 'secondary' }),
          UI.btn('See full dashboard', { variant: 'ghost' })
        ])
      ])
    ]);
  }

  /* The detail that used to live in the old preview modal. */
  function includedPanel(t) {
    function chips(items, numbered) {
      return h('div.chips', items.map(function (x, i) {
        return h('span.chip', { style: { paddingRight: '14px' } }, (numbered ? (i + 1) + '. ' : '') + x);
      }));
    }
    return h('div.panel', { style: { marginTop: 'var(--s-4)' } }, [
      h('div.panel-head', [UI.icon('sparkle', 18), h('h3', 'Everything this template already includes')]),
      h('div.sublabel', 'Form fields'), chips(t.formFields),
      h('div.sublabel', { style: { marginTop: 'var(--s-4)' } }, 'Workflow'), chips(t.workflow, true),
      h('div.sublabel', { style: { marginTop: 'var(--s-4)' } }, 'Roles'),
      chips(t.roles.map(function (r) { return r.label; })),
      h('div.sublabel', { style: { marginTop: 'var(--s-4)' } }, 'Dashboard metrics'), chips(t.metrics)
    ]);
  }
})();
