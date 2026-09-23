/* ============================================================
   store.js — the single source of truth for the whole flow.
   Persists to localStorage so a refresh keeps your place.

   Shape mirrors the agreed model exactly:
     Organisation -> Employees
     Template     -> Roles -> Employee mapping
   There is deliberately no `team` anywhere in this object.

   An organisation can run MANY complaint systems, so they live in
   `systems[]` with one of them active. Any path beginning
   `system.` is transparently redirected to the ACTIVE record —
   that is why screens can still say STORE.get('system.roles').
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'cs-onboarding-v4';

  function defaults() {
    return {
      /* The app opens at login, so the account and its organisation
         already exist — there is no sign-up to create them. */
      account:   { first: 'Amina', last: 'Odhiambo',
                   email: 'amina@county.go.ke', verified: true },
      workspace: { url: 'nairobi-county', invites: [] },
      org: {
        name: 'Nairobi County Government', type: 'county',
        language:  '',
        /* Country → State/Province → District → City → Ward, multi-select
           at every level. Sign-up fills the top two; organisation setup
           refines the rest. There is no separate `location` — that used
           to duplicate this and drift out of sync. */
        operationalArea: {
          countries: [], states: [], districts: [], cities: [], wards: []
        },
        employees: [],
        departments: [],
        channels:  [],
        /* channel id -> the credentials it sends with */
        channelConfig: {},
        /* true once they have finished or skipped the run of
           questions asked right after login */
        setupRunOver: false,
        branding:  { name: '', accent: 'lilac', logo: null }
      },
      systems: [],            /* every complaint system this org runs */
      activeSystemId: null,   /* the one currently being viewed/edited */
      systemsSeeded: false,

      /* templates the organisation imported, alongside the built-ins */
      templates: { custom: [] },

      /* Previewing a template is separate from adopting one — you can
         look through a role's eyes without creating a system. */
      preview: { templateId: null, role: '', from: 'templates' },

      /* Optional override for the personalised post-publish view.
         Empty means "derive it from the role given at sign-up". */
      view: { as: '' },

      /* Editing one part of a service walks only that part's
         questions, then returns to `edit.back`. */
      edit: { scope: '', back: '' },

      /* where to go after a detour, e.g. adding employees mid-flow */
      ui: { returnTo: '', notifChannel: '' }
    };
  }

  var state = load();

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    Object.keys(saved).forEach(function (k) {
      var sv = saved[k], bv = base[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) &&
          bv && typeof bv === 'object' && !Array.isArray(bv)) {
        merge(bv, sv);
      } else if (sv !== undefined) {
        base[k] = sv;
      }
    });
    return base;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? merge(defaults(), JSON.parse(raw)) : defaults();
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9);
  }

  /* ---- systems ---------------------------------------------- */

  function blankSystem(templateId) {
    var t = (window.DATA && templateId) ? window.DATA.templateById(templateId) : null;
    return {
      id: uid('sys'),
      templateId: templateId || null,
      name: t ? t.name : 'Untitled complaint system',
      /* collected right after "Use this template", before the
         template workspace opens */
      hierarchyId: '',            /* the operational area it runs in */
      /* which of the template's complaint types this service takes.
         Empty means all of them, which is how a template arrives. */
      types: [],
      subtypes: [],
      status: 'draft',            /* draft | live */
      customised: false,
      roles: {},                  /* roleId -> [employeeId] */
      assignment: {
        mode: '',                 /* role | location | role-location */
        level: '',                /* country | state | district | city | ward */
        byLocation: {},           /* location -> employeeId          (mode: location) */
        byRoleLocation: {}        /* location -> { roleId: employeeId } (mode: role-location) */
      },
      resolution: { preset: '', value: 5, unit: 'days' },
      overdue: '',
      updates: { who: [], other: '', how: [] },
      metrics: null,
      seeded: false,
      createdAt: Date.now()
    };
  }

  function createSystem(templateId) {
    var rec = blankSystem(templateId);
    state.systems.push(rec);
    state.activeSystemId = rec.id;
    save();
    return rec;
  }

  function activeSystem() {
    var id = state.activeSystemId;
    if (!id) return null;
    for (var i = 0; i < state.systems.length; i++) {
      if (state.systems[i].id === id) return state.systems[i];
    }
    return null;
  }

  function setActiveSystem(id) { state.activeSystemId = id; save(); }
  function allSystems() { return state.systems; }
  function systemById(id) {
    for (var i = 0; i < state.systems.length; i++) if (state.systems[i].id === id) return state.systems[i];
    return null;
  }
  function removeSystem(id) {
    state.systems = state.systems.filter(function (s) { return s.id !== id; });
    if (state.activeSystemId === id) state.activeSystemId = null;
    save();
  }

  /* ---- dot-path access -------------------------------------- */
  /* `system.foo.bar` is rewritten onto the active record. Reads on
     a missing active record return the fallback; writes no-op, so a
     stray write can never conjure a phantom complaint system. */
  function resolve(path) {
    var parts = String(path).split('.');
    if (parts[0] === 'system') {
      var sys = activeSystem();
      if (!sys) return null;
      return { root: sys, parts: parts.slice(1) };
    }
    return { root: state, parts: parts };
  }

  function get(path, fallback) {
    var r = resolve(path);
    if (!r) return fallback;
    if (!r.parts.length) return r.root;
    var cur = r.root;
    for (var i = 0; i < r.parts.length; i++) {
      if (cur === null || cur === undefined) return fallback;
      cur = cur[r.parts[i]];
    }
    return cur === undefined ? fallback : cur;
  }

  function set(path, value) {
    var r = resolve(path);
    if (!r || !r.parts.length) return value;
    var cur = r.root;
    for (var i = 0; i < r.parts.length - 1; i++) {
      if (typeof cur[r.parts[i]] !== 'object' || cur[r.parts[i]] === null) cur[r.parts[i]] = {};
      cur = cur[r.parts[i]];
    }
    cur[r.parts[r.parts.length - 1]] = value;
    save();
    return value;
  }

  function push(path, value) {
    var arr = get(path, []);
    if (!Array.isArray(arr)) arr = [];
    arr.push(value);
    set(path, arr);
    return arr;
  }

  function removeAt(path, index) {
    var arr = get(path, []);
    if (!Array.isArray(arr)) return [];
    arr.splice(index, 1);
    set(path, arr);
    return arr;
  }

  function toggle(path, value) {
    var arr = get(path, []);
    if (!Array.isArray(arr)) arr = [];
    var i = arr.indexOf(value);
    if (i === -1) arr.push(value); else arr.splice(i, 1);
    set(path, arr);
    return arr;
  }

  function has(path, value) {
    var arr = get(path, []);
    return Array.isArray(arr) && arr.indexOf(value) !== -1;
  }

  /* ---- derived helpers -------------------------------------- */

  function employees() { return get('org.employees', []); }

  function employeeById(id) {
    var list = employees();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function employeeName(id) {
    var e = employeeById(id);
    return e ? e.name : '';
  }

  function orgName() { return get('org.name', '') || 'Your organisation'; }

  function firstName() { return get('account.first', '') || 'there'; }

  /* the template behind the ACTIVE system */
  function template() {
    var sys = activeSystem();
    return (sys && sys.templateId && window.DATA) ? window.DATA.templateById(sys.templateId) : null;
  }

  function templateFor(sys) {
    return (sys && sys.templateId && window.DATA) ? window.DATA.templateById(sys.templateId) : null;
  }

  function reset() {
    state = defaults();
    save();
  }

  window.STORE = {
    state: function () { return state; },
    get: get, set: set, push: push, removeAt: removeAt,
    toggle: toggle, has: has, save: save, reset: reset, uid: uid,
    employees: employees, employeeById: employeeById, employeeName: employeeName,
    orgName: orgName, firstName: firstName, template: template, templateFor: templateFor,
    createSystem: createSystem, activeSystem: activeSystem, setActiveSystem: setActiveSystem,
    allSystems: allSystems, systemById: systemById, removeSystem: removeSystem,
    blankSystem: blankSystem
  };
})();
