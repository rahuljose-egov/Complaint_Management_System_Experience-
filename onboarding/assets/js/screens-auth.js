/* ============================================================
   screens-auth.js — the login screen.

   Everything before it (sign up, email verification, organisation
   name and type, workspace URL, invites) was removed on request
   2026-09-04: the app opens at login, so the account, organisation
   and workspace already exist. Their values are seeded in store.js.
   ============================================================ */
window.SCREENS = window.SCREENS || [];

(function () {
  'use strict';
  var h = UI.h, S = window.SCREENS;

  /* ---------- Login — the entry point ----------------------- */
  S.push({
    id: 'login', phase: 'login', chrome: 'focus', showProgress: false,
    /* Straight into the two questions asked after login — unless the
       organisation is already set up, in which case Home is right. */
    next: function () {
      /* skipped counts as answered for this purpose — they said not now */
      return (window.ORG_LOGIN_RUN_OVER && window.ORG_LOGIN_RUN_OVER()) ? 'home' : 'org-language';
    },
    render: function (ctx) {
      var err = h('span.err', { style: { display: 'none' } });
      var userId = UI.input({
        id: 'f-uid', value: STORE.get('account.email'), placeholder: 'User ID', autocomplete: 'username'
      });
      var pw = UI.input({
        id: 'f-pw', type: 'password', placeholder: 'Password', autocomplete: 'current-password',
        onenter: function () { submit(); }
      });

      function submit() {
        if (pw.value !== '12345') {
          err.textContent = 'Incorrect password. For this prototype the password is 12345.';
          err.style.display = 'block';
          pw.setAttribute('aria-invalid', 'true');
          pw.focus();
          return;
        }
        ctx.next();
      }

      /* No Back — this is the first screen. */
      return UI.screen({
        eyebrow: STORE.orgName(),
        title: 'Log in to your workspace',
        help: STORE.get('workspace.url') + '.complaints.gov',
        body: [
          UI.field('User ID', userId, { id: 'f-uid' }),
          UI.field('Password', h('div', [pw, err]), { id: 'f-pw' }),
          UI.banner('info', ['Prototype credentials — password is ', h('b', '12345'), '.'], 'lock')
        ],
        actions: [UI.btn('Log in', { block: true, onclick: submit })]
      });
    }
  });
})();
