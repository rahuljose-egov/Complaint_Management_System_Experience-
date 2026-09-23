/* ============================================================
   screens-profile.js — account profile, reached from the topbar
   avatar menu. Display name is editable; email is display-only
   with a change request; phone is editable.
   ============================================================ */
(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  /* password row: masked value with a show/hide eye, plus the modal
     that actually changes it */
  function passwordField() {
    var shown = false;
    var box = UI.input({ id: 'pf-pass', type: 'password', value: 'digit-demo-2026' });
    box.readOnly = true;
    var eye = h('button.pass-eye', {
      type: 'button', 'aria-label': 'Show password', title: 'Show password',
      onclick: function () {
        shown = !shown;
        box.type = shown ? 'text' : 'password';
        eye.setAttribute('aria-label', shown ? 'Hide password' : 'Show password');
        eye.title = shown ? 'Hide password' : 'Show password';
        UI.clear(eye);
        UI.append(eye, UI.icon(shown ? 'eye-off' : 'eye', 17));
      }
    }, UI.icon('eye', 17));

    var row = h('div.pass-row', [h('div.pass-box', [box, eye]), UI.btn('Change password', {
      variant: 'secondary', sm: true, onclick: openChange
    })]);

    return UI.field('Password', row, { id: 'pf-pass', hint: 'Last changed 4 months ago.' });
  }

  function openChange() {
    var cur = '', next = '', confirm = '';
    var note = h('div.sublabel', { style: { margin: '2px 0 0', color: 'var(--butter-ink)' } }, '');
    function check() {
      var ok = cur.length > 0 && next.length >= 8 && next === confirm;
      note.textContent = !next ? ''
        : next.length < 8 ? 'Use at least 8 characters.'
        : (confirm && next !== confirm) ? 'Both passwords need to match.' : '';
      save.disabled = !ok;
    }
    var save = UI.btn('Change password', { disabled: true, onclick: function () { m.close(); } });
    var m = UI.modal({
      icon: 'lock', title: 'Change password',
      desc: 'Choose a new password of at least 8 characters.',
      body: [
        UI.field('Current password', UI.input({ id: 'cp-cur', type: 'password', oninput: function (v) { cur = v; check(); } }), { id: 'cp-cur' }),
        UI.field('New password', UI.input({ id: 'cp-new', type: 'password', oninput: function (v) { next = v; check(); } }), { id: 'cp-new' }),
        UI.field('Confirm password', UI.input({ id: 'cp-conf', type: 'password', oninput: function (v) { confirm = v; check(); } }), { id: 'cp-conf' }),
        note
      ],
      actions: [save, UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })]
    });
  }

  S.push({
    id: 'profile', phase: 'home', chrome: 'app', nav: null, showProgress: false, narrow: true,
    render: function () {
      var draft = {
        name: (STORE.get('account.first') || 'Jane') + ' ' + (STORE.get('account.last') || 'Doe'),
        phone: STORE.get('account.phone') || '+254 712 345 678',
        recovery: STORE.get('account.recovery') || ''
      };
      var email = STORE.get('account.email') || 'jane.doe@kisumu.go.ke';
      var saveBtn;

      function touched() {
        if (saveBtn) saveBtn.disabled = !draft.name.trim();
      }

      var readonly = h('div.profile-readonly', [
        h('span.v', email),
        h('span.tag', 'Verified')
      ]);

      return [
        UI.pageHead('Edit profile', 'Your name and number appear on complaints you act on.'),

        h('div.panel', [
          h('div.profile-id', [
            h('div.avatar-lg', UI.initials(draft.name)),
            h('div', [
              h('div.profile-nm', draft.name),
              h('div.sublabel', { style: { margin: 0 } }, 'Administrator · ' + (STORE.get('org.name') || 'Your organisation'))
            ])
          ]),

          UI.field('Display name', UI.input({
            id: 'pf-name', value: draft.name,
            oninput: function (v) { draft.name = v; touched(); }
          }), { id: 'pf-name' }),

          UI.field('Email address', readonly, {
            hint: 'Your email is your sign-in identity and cannot be edited here.'
          }),
          h('div', { style: { marginTop: 'calc(-1 * var(--s-3))', marginBottom: 'var(--s-5)' } }, [
            UI.btn('Request email change', {
              variant: 'secondary', sm: true,
              onclick: function () {
                var next = '', err;
                var control = UI.input({
                  id: 'pf-newmail', type: 'email', placeholder: 'name@organisation.org',
                  oninput: function (v) {
                    next = v;
                    if (err) { err.remove(); err = null; }
                    send.disabled = !UI.isEmail(v);
                  }
                });
                var send = UI.btn('Send request', {
                  disabled: true,
                  onclick: function () { m.close(); }
                });
                var m = UI.modal({
                  icon: 'mail', title: 'Request an email change',
                  desc: 'Enter the new address. We send a confirmation link to ' + email +
                        ' and copy your platform administrator on the request.',
                  body: [
                    UI.field('New email address', control, {
                      id: 'pf-newmail',
                      hint: 'Your current address stays active until the new one is confirmed.'
                    })
                  ],
                  actions: [send, UI.btn('Cancel', { variant: 'ghost', onclick: function () { m.close(); } })]
                });
              }
            })
          ]),

          UI.field('Phone number', UI.input({
            id: 'pf-phone', value: draft.phone, type: 'tel', inputmode: 'tel',
            oninput: function (v) { draft.phone = v; }
          }), { id: 'pf-phone', hint: 'Used for escalation calls and SMS alerts.' }),

          UI.field('Recovery admin email', UI.input({
            id: 'pf-recovery', type: 'email', value: draft.recovery,
            placeholder: 'admin@organisation.org',
            oninput: function (v) { draft.recovery = v; }
          }), { id: 'pf-recovery', hint: 'A second administrator who can restore access if you are locked out.' }),

          passwordField()
        ]),

        h('div.actions', { style: { marginTop: 'var(--s-5)' } }, [
          (saveBtn = UI.btn('Change profile', {
            onclick: function () {
              var parts = draft.name.trim().split(/\s+/);
              STORE.set('account.first', parts[0] || 'Jane');
              STORE.set('account.last', parts.slice(1).join(' ') || '');
              STORE.set('account.phone', draft.phone);
              STORE.set('account.recovery', draft.recovery);
              window.APP.go('home');
            }
          })),
          UI.btn('Cancel', { variant: 'ghost', onclick: function () { window.APP.go('home'); } })
        ])
      ];
    }
  });
})();
