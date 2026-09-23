/* Entry bridge from the sign-in mockup.
   The sign-in flow already handled the account, language and branding,
   so this demo starts at Home with those answers seeded. The selected
   account travels in the query string (?org=&acct=&email=). */
(function () {
  'use strict';
  var S = window.STORE;
  if (!S) return;

  var q = new URLSearchParams(location.search);
  var org = q.get('org');
  var email = q.get('email');

  var fresh = q.get('fresh') === '1';

  /* A "new to onboarding" account must always land on a blank slate —
     reset before anything is seeded so a previous demo can't leak in. */
  if (fresh) {
    S.reset();
    S.set('signin.email', email || '');
  }

  if (!S.get('org.bootstrappedV2')) {
    S.set('org.setupRunOver', true);
    S.set('org.bootstrappedV2', true);
    /* language and branding are onboarding steps of their own — only
       pre-answer them for demos that are meant to be part-way through */
    if (!fresh) {
      S.set('org.language', 'en');
      S.set('org.branding.accent', 'sky');
    }
  }
  /* applied on every load so an older saved name cannot stick */
  S.set('account.first', 'Jane');
  S.set('account.last', 'Doe');
  if (email) S.set('account.email', email);
  if (org) {
    S.set('org.name', org);
    if (!fresh) S.set('org.branding.name', org);
    S.set('workspace.url', org.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  }
  /* remember where to hand control back to */
  S.set('signin.return', '../index.html');

  /* "onboarding in progress" demo account: seed the areas that are
     already configured so the sidebar progress and Home reflect it. */
  if (q.get('progress') === '1' && !S.get('org.progressSeeded')) {
    S.set('org.progressSeeded', true);
    S.set('org.areasDone', ['org-branding', 'org-departments', 'org-operational-area', 'org-communication']);
    S.set('org.channels', ['email', 'sms']);
    S.set('org.channelConfig', {
      email: { from: 'no-reply@kisumu.go.ke', name: 'Kisumu County Complaints' },
      sms: { sender: 'KSMCTY', key: 'demo-key-2026' }
    });
    if (window.DATA && DATA.dummyOperationalArea) {
      S.set('org.operationalArea', DATA.dummyOperationalArea());
    }
    if (window.DATA && DATA.DUMMY_DEPARTMENTS) {
      S.set('org.departments', DATA.DUMMY_DEPARTMENTS.slice(0, 3).map(function (d, i) {
        return { id: 'dep-' + (i + 1), name: d.name, desc: d.desc };
      }));
    }
  }

  var here = (location.hash || '').replace(/^#\/?/, '');
  if (!here || here === 'login' || here === 'org-language' || here === 'org-branding') {
    location.hash = '#/home';
  }
})();
