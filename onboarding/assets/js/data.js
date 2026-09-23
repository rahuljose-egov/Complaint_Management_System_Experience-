/* ============================================================
   data.js — seed content. Edit here to change options, templates,
   roles or operational area. No other file needs touching.
   ============================================================ */
(function () {
  'use strict';

  var LANGUAGES = [
    { id: 'en',    label: 'English',  note: 'Default for all services' },
    { id: 'sw',    label: 'Kiswahili', note: 'Lugha ya taifa' },
    { id: 'fr',    label: 'French',   note: 'Français' },
    { id: 'am',    label: 'Amharic',  note: 'አማርኛ' },
    { id: 'ar',    label: 'Arabic',   note: 'العربية' }
  ];

  var ORG_TYPES = [
    { id: 'county',      label: 'County government',   desc: 'A devolved county or regional authority.', hue: 'lilac',  icon: 'building' },
    { id: 'municipal',   label: 'Municipality or city', desc: 'A city, town or urban council.',          hue: 'sky',    icon: 'city' },
    { id: 'agency',      label: 'Public agency',       desc: 'A national body, parastatal or authority.', hue: 'mint',  icon: 'shield' },
    { id: 'utility',     label: 'Utility provider',    desc: 'Water, power, waste or sanitation services.', hue: 'peach', icon: 'drop' },
    { id: 'ngo',         label: 'NGO or non-profit',   desc: 'A civil-society or development organisation.', hue: 'butter', icon: 'heart' },
    { id: 'other',       label: 'Something else',      desc: 'Tell us more later.',                      hue: 'blush',  icon: 'dots' }
  ];

  /* ---- Boundaries: Country → State/Province → District → City → Ward
     Five levels, nested. Every boundary question is multi-select, so
     selections are arrays at every level and the options for a level
     are the children of whatever is selected above it. ---------- */
  var LEVELS = [
    { id: 'country',  key: 'countries',  label: 'Country',          plural: 'countries' },
    { id: 'state',    key: 'states',     label: 'State / Province', plural: 'states' },
    { id: 'district', key: 'districts',  label: 'District',         plural: 'districts' },
    { id: 'city',     key: 'cities',     label: 'City',             plural: 'cities' },
    { id: 'ward',     key: 'wards',      label: 'Ward',             plural: 'wards' }
  ];

  var GEO = {
    'Kenya': {
      'Nairobi Province': {
        'Westlands District': {
          'Westlands': ['Parklands', 'Kangemi', 'Mountain View'],
          'Kilimani':  ['Kilimani Central', 'Kawangware', 'Gatina']
        },
        'Embakasi District': {
          'Embakasi East':  ['Umoja', 'Utawala', 'Mihango'],
          'Embakasi South': ['Kariobangi South', 'Pipeline', 'Kwa Njenga']
        }
      },
      'Coast Province': {
        'Mombasa District': {
          'Mvita': ['Tononoka', 'Majengo', 'Tudor'],
          'Nyali': ['Frere Town', 'Kongowea', 'Mkomani']
        },
        'Kilifi District': {
          'Kilifi Town': ['Mnarani', 'Sokoni', 'Tezo'],
          'Malindi':     ['Shella', 'Ganda', 'Malindi Town']
        }
      }
    },
    'India': {
      'Maharashtra': {
        'Pune District': {
          'Pune City':         ['Kothrud', 'Shivajinagar', 'Aundh'],
          'Pimpri-Chinchwad':  ['Akurdi', 'Nigdi', 'Chinchwad']
        },
        'Mumbai Suburban District': {
          'Andheri':  ['Andheri East', 'Andheri West', 'Jogeshwari'],
          'Borivali': ['Borivali East', 'Borivali West', 'Dahisar']
        }
      },
      'Karnataka': {
        'Bengaluru Urban District': {
          'Bengaluru': ['Koramangala', 'Indiranagar', 'Jayanagar'],
          'Yelahanka': ['Attur', 'Vidyaranyapura', 'Jakkur']
        },
        'Mysuru District': {
          'Mysuru':   ['Nazarbad', 'Jayalakshmipuram', 'Kuvempunagar'],
          'Nanjangud': ['Hosahalli', 'Badanavalu', 'Kalale']
        }
      }
    }
  };

  /* Every leaf path through the tree, one object per ward. Small
     enough (a few dozen) that filtering it beats bespoke walkers. */
  var GEO_PATHS = (function () {
    var out = [];
    Object.keys(GEO).forEach(function (country) {
      Object.keys(GEO[country]).forEach(function (state) {
        Object.keys(GEO[country][state]).forEach(function (district) {
          Object.keys(GEO[country][state][district]).forEach(function (city) {
            GEO[country][state][district][city].forEach(function (ward) {
              out.push({ country: country, state: state, district: district, city: city, ward: ward });
            });
          });
        });
      });
    });
    return out;
  })();

  /* An organisation can keep several boundary hierarchies — one for
     administration, another for how its field teams are organised —
     and works in one of them at a time. */
  function pluralise(word) {
    var w = String(word).toLowerCase();
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    if (/(s|x|z|ch|sh)$/.test(w)) return w + 'es';
    return w + 's';
  }

  function hierarchies() {
    return (window.STORE && window.STORE.get('org.hierarchies', [])) || [];
  }
  function activeHierarchy() {
    var list = hierarchies();
    if (!list.length) return null;
    var id = window.STORE.get('org.activeHierarchyId', '');
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }
  function defaultLevels() {
    return LEVELS.map(function (lv) { return { id: lv.id, label: lv.label }; });
  }

  /* The levels of the hierarchy they are working in. We ship the five
     above and they confirm them; renaming, dropping and adding is all
     allowed. A level they invent has no geography behind it, so its
     values are typed in rather than chosen — that is what `custom`
     marks. */
  function boundaryLevels() { return levelsOf(activeHierarchy()); }

  function levelsOf(hier) {
    var saved = (hier && hier.levels) || null;
    if (!saved || !saved.length) return LEVELS.slice();
    return saved.map(function (lv) {
      var base = null;
      for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === lv.id) base = LEVELS[i];
      var label = lv.label || (base ? base.label : lv.id);
      /* renaming a level renames its plural too — "2 provinces", not
         "2 states", once they have called it a Province */
      var plural = (base && base.label === label) ? base.plural : pluralise(label);
      return {
        id: lv.id,
        key: base ? base.key : lv.id,
        label: label,
        plural: plural,
        custom: !base
      };
    });
  }
  function builtInLevels(hier) {
    return (arguments.length ? levelsOf(hier) : boundaryLevels())
      .filter(function (lv) { return !lv.custom; });
  }

  function levelById(id) {
    var conf = boundaryLevels();
    for (var i = 0; i < conf.length; i++) if (conf[i].id === id) return conf[i];
    for (var j = 0; j < LEVELS.length; j++) if (LEVELS[j].id === id) return LEVELS[j];
    return null;
  }
  function levelLabel(id) {
    var l = levelById(id);
    return l ? l.label : id;
  }
  function levelIndex(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i;
    return -1;
  }

  /* A selection is { countries: [], states: [], districts: [], cities: [], wards: [] }.
     Paths are kept only if they match every ANCESTOR level that has a
     selection; an empty level means "no constraint yet". */
  function matchingPaths(sel, upToLevel) {
    sel = sel || {};
    var stop = upToLevel === undefined ? LEVELS.length : levelIndex(upToLevel);
    return GEO_PATHS.filter(function (p) {
      for (var i = 0; i < stop; i++) {
        var lv = LEVELS[i];
        var chosen = sel[lv.key];
        if (chosen && chosen.length && chosen.indexOf(p[lv.id]) === -1) return false;
      }
      return true;
    });
  }

  /* The options to offer at `level`, given what is selected above it. */
  function optionsForLevel(level, sel) {
    var seen = {}, out = [];
    matchingPaths(sel, level).forEach(function (p) {
      if (!seen[p[level]]) { seen[p[level]] = true; out.push(p[level]); }
    });
    return out;
  }

  /* What is actually in scope at `level` — the explicit selection if
     there is one, otherwise everything the ancestors allow. */
  function scopeAtLevel(level, sel) {
    var lv = levelById(level);
    var chosen = (sel && sel[lv.key]) || [];
    if (chosen.length) {
      var allowed = optionsForLevel(level, sel);
      return chosen.filter(function (x) { return allowed.indexOf(x) !== -1; });
    }
    return optionsForLevel(level, sel);
  }

  /* Drop selections that no longer exist once an ancestor changes. */
  function pruneSelection(sel) {
    LEVELS.forEach(function (lv, i) {
      if (i === 0) return;
      var allowed = optionsForLevel(lv.id, sel);
      sel[lv.key] = (sel[lv.key] || []).filter(function (x) { return allowed.indexOf(x) !== -1; });
    });
    return sel;
  }

  /* A one-line summary of a selection, e.g.
     "Kenya · 1 state / province · 6 wards" */
  function scopeSummary(sel, levels) {
    var bits = [];
    (levels || builtInLevels()).forEach(function (lv) {
      var n = scopeAtLevel(lv.id, sel).length;
      if (!n) return;
      if (n === 1) bits.push(scopeAtLevel(lv.id, sel)[0]);
      else bits.push(n + ' ' + lv.plural);
    });
    return bits.join(' · ') || 'Nothing selected';
  }

  function emptySelection() {
    var sel = {};
    LEVELS.forEach(function (lv) { sel[lv.key] = []; });
    return sel;
  }

  /* The areas in scope, as a selection object. They belong to the
     hierarchy in use — switching to another shows what is in that one.
     A hierarchy with nothing of its own falls back to the organisation
     record, which is what a fresh demo and the seeds fill in. */
  function orgScope() {
    var hier = activeHierarchy();
    var oa = (hier && hier.scope) ||
             (window.STORE && window.STORE.get('org.operationalArea', {})) || {};
    var sel = emptySelection();
    LEVELS.forEach(function (lv) { sel[lv.key] = (oa[lv.key] || []).slice(); });
    return sel;
  }

  /* Assignment routes by one of these levels. */
  function locationLevels() {
    var levels = builtInLevels();
    var deepest = levels.length ? levels[levels.length - 1].id : null;
    return levels.map(function (lv) {
      return {
        id: lv.id, label: lv.label,
        desc: lv.id === deepest
          ? 'The most granular — an assignee per ' + lv.label.toLowerCase() + '.'
          : 'An assignee per ' + lv.label.toLowerCase() + '.'
      };
    });
  }

  /* The rows to map assignees onto, for the chosen level, limited to
     the organisation's operational area. */
  function locationsForLevel(level) {
    if (!levelById(level)) return [];
    return scopeAtLevel(level, orgScope());
  }

  /* Example employees. Pre-seeded so role mapping later in the flow
     has people to assign — every one of them is removable. */
  var SEED_EMPLOYEES = [
    { id: 'emp-anita',  name: 'Anita Wanjiru',  email: 'anita.wanjiru@example.go.ke',  seeded: true },
    { id: 'emp-john',   name: 'John Otieno',    email: 'john.otieno@example.go.ke',    seeded: true },
    { id: 'emp-mary',   name: 'Mary Chebet',    email: 'mary.chebet@example.go.ke',    seeded: true },
    { id: 'emp-david',  name: 'David Kimani',   email: 'david.kimani@example.go.ke',   seeded: true },
    { id: 'emp-fatuma', name: 'Fatuma Hassan',  email: 'fatuma.hassan@example.go.ke',  seeded: true }
  ];

  /* ---- Bulk employee upload --------------------------------
     Accepts "Name, Email" per line, with or without a header row.
     Reports what it skipped and why rather than failing silently. */
  function parseEmployeeCsv(text) {
    var added = [], skipped = [], seen = {};

    String(text || '').split(/\r?\n/).forEach(function (raw, i) {
      var line = raw.trim();
      if (!line) return;

      var cols = line.split(/[,;\t]/).map(function (c) { return c.trim().replace(/^"|"$/g, ''); });

      /* a header row names the columns rather than a person */
      if (i === 0 && /^(name|full ?name)$/i.test(cols[0] || '')) return;

      var name = cols[0] || '';
      var email = cols[1] || '';

      if (!name)  { skipped.push({ line: line, reason: 'no name' }); return; }
      if (!email) { skipped.push({ line: line, reason: 'no email' }); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        skipped.push({ line: line, reason: 'invalid email' }); return;
      }
      var key = email.toLowerCase();
      if (seen[key]) { skipped.push({ line: line, reason: 'duplicate' }); return; }

      seen[key] = true;
      added.push({ name: name, email: email });
    });

    return { added: added, skipped: skipped };
  }

  /* ---- Sample data for a bulk upload ------------------------
     This is a prototype: any file the user picks brings in a
     plausible set rather than parsing their real one. */
  var DUMMY_DEPARTMENTS = [
    { name: 'Roads and Infrastructure', desc: 'Roads, drainage and street lighting' },
    { name: 'Environment and Sanitation', desc: 'Waste, pollution and public cleanliness' },
    { name: 'Water Services', desc: 'Supply, leaks and billing' },
    { name: 'Public Health', desc: 'Inspections, outbreaks and food safety' },
    { name: 'Housing and Planning', desc: 'Permits, zoning and enforcement' },
    { name: 'Transport and Licensing', desc: 'Public transport and operator licences' }
  ];

  var DUMMY_EMPLOYEES = [
    { name: 'Grace Njeri',    email: 'grace.njeri@example.go.ke' },
    { name: 'Brian Omondi',   email: 'brian.omondi@example.go.ke' },
    { name: 'Halima Yusuf',   email: 'halima.yusuf@example.go.ke' },
    { name: 'Dennis Mutua',   email: 'dennis.mutua@example.go.ke' },
    { name: 'Caroline Akinyi',email: 'caroline.akinyi@example.go.ke' },
    { name: 'Ibrahim Noor',   email: 'ibrahim.noor@example.go.ke' },
    { name: 'Lucy Wairimu',   email: 'lucy.wairimu@example.go.ke' },
    { name: 'Samuel Kiptoo',  email: 'samuel.kiptoo@example.go.ke' },
    { name: 'Beatrice Auma',  email: 'beatrice.auma@example.go.ke' },
    { name: 'Kevin Macharia', email: 'kevin.macharia@example.go.ke' }
  ];

  /* A ready-made operational area, for the bulk path on that screen. */
  function dummyOperationalArea() {
    var country = Object.keys(GEO)[0];
    var state = Object.keys(GEO[country])[0];
    var districts = Object.keys(GEO[country][state]);
    var cities = [], wards = [];
    districts.forEach(function (d) {
      Object.keys(GEO[country][state][d]).forEach(function (c) {
        cities.push(c);
        GEO[country][state][d][c].forEach(function (wd) { wards.push(wd); });
      });
    });
    return { countries: [country], states: [state], districts: districts, cities: cities, wards: wards };
  }

  var CHANNELS = [
    { id: 'email',    label: 'Email',    desc: 'Updates and receipts by email.',       hue: 'sky',   icon: 'mail' },
    { id: 'sms',      label: 'SMS',      desc: 'Short text updates to any phone.',     hue: 'mint',  icon: 'sms' },
    { id: 'whatsapp', label: 'WhatsApp', desc: 'Conversational updates and replies.',  hue: 'peach', icon: 'chat' }
  ];

  /* Choosing a channel is not the same as being able to send on it —
     each one needs an account behind it. These are the credentials we
     ask for; a channel with every required one filled in is connected. */
  var CHANNEL_SETUP = {
    email: {
      note: 'We send through your own mail server, so messages come from your domain.',
      fields: [
        { id: 'from',     label: 'From address',   placeholder: 'complaints@county.go.ke' },
        { id: 'sender',   label: 'Sender name',    placeholder: 'Nairobi County' },
        { id: 'host',     label: 'SMTP host',      placeholder: 'smtp.county.go.ke' },
        { id: 'port',     label: 'SMTP port',      placeholder: '587' },
        { id: 'username', label: 'Username',       placeholder: 'complaints@county.go.ke' },
        { id: 'password', label: 'Password',       placeholder: '••••••••', secret: true }
      ]
    },
    sms: {
      note: 'Texts go out through your SMS provider, under your own sender ID.',
      fields: [
        { id: 'provider', label: 'Provider',       placeholder: 'Africa’s Talking' },
        { id: 'senderId', label: 'Sender ID',      placeholder: 'COUNTY' },
        { id: 'apiKey',   label: 'API key',        placeholder: '••••••••', secret: true }
      ]
    },
    whatsapp: {
      note: 'Replies come back into your workspace, so this needs a Business account.',
      fields: [
        { id: 'number',   label: 'Business number', placeholder: '+254 700 000000' },
        { id: 'accountId', label: 'Business account ID', placeholder: '1234567890' },
        { id: 'token',    label: 'Access token',   placeholder: '••••••••', secret: true }
      ]
    }
  };

  function channelSetup(id) { return CHANNEL_SETUP[id] || { note: '', fields: [] }; }

  function channelConfig(id) {
    var all = (window.STORE && window.STORE.get('org.channelConfig', {})) || {};
    return all[id] || {};
  }
  function channelConnected(id) {
    var cfg = channelConfig(id);
    var fields = channelSetup(id).fields;
    if (!fields.length) return true;
    return fields.every(function (f) { return String(cfg[f.id] || '').trim() !== ''; });
  }
  /* the chosen channels that cannot send yet */
  function channelsNeedingSetup() {
    return ((window.STORE && window.STORE.get('org.channels', [])) || [])
      .filter(function (id) { return !channelConnected(id); });
  }

  var ACCENTS = ['lilac', 'sky', 'mint', 'peach', 'butter', 'blush'];

  /* ---- Templates ------------------------------------------- */
  /* Every template arrives fully configured. The flow never asks
     the user to build these — only to adapt them. */
  var COMPONENTS = [
    { id: 'forms',         label: 'Forms',         icon: 'form',   hue: 'lilac' },
    { id: 'workflow',      label: 'Workflow',      icon: 'flow',   hue: 'sky' },
    { id: 'roles',         label: 'Roles',         icon: 'people', hue: 'mint' },
    { id: 'notifications', label: 'Notifications', icon: 'bell',   hue: 'peach' },
    { id: 'dashboard',     label: 'Dashboard',     icon: 'chart',  hue: 'butter' }
  ];

  var STD_ROLES = [
    { id: 'officer',    label: 'Complaint Officer',    desc: 'Receives and resolves complaints day to day.' },
    { id: 'supervisor', label: 'Complaint Supervisor', desc: 'Oversees officers and unblocks stuck complaints.' },
    { id: 'manager',    label: 'Department Manager',   desc: 'Accountable for the service. Notified on escalation.' }
  ];

  var TEMPLATES = [
    {
      id: 'governance',
      name: 'Local Governance',
      desc: 'Manage complaints about civic services, permits and local administration.',
      hue: 'lilac', icon: 'building',
      roles: STD_ROLES,
      formFields: ['Complaint type', 'Ward or locality', 'Supporting document', 'Description', 'Reporter contact'],
      workflow:   ['Submitted', 'Assigned', 'Reviewed', 'Action taken', 'Resolved'],
      metrics:    ['Open complaints', 'Overdue complaints', 'Complaints by location', 'Resolution time']
    },
    {
      id: 'water',
      name: 'Water and Sanitation',
      desc: 'Manage complaints about water supply, drainage, waste and sanitation.',
      hue: 'sky', icon: 'drop',
      roles: STD_ROLES,
      formFields: ['Issue category', 'Location', 'Ongoing or one-off?', 'Photo evidence', 'Reporter contact'],
      workflow:   ['Submitted', 'Assigned', 'Inspected', 'Works scheduled', 'Resolved'],
      metrics:    ['Open complaints', 'Overdue complaints', 'Complaints by location', 'Resolution time']
    }
  ];

  /* ---- Service-level intake, collected right after a template is
     adopted and before the workspace opens ------------------- */




  /* Every template arrives knowing what it takes reports about: a
     handful of types, each with its own subtypes. Adopting one is
     where they narrow that down. */
  var COMPLAINT_TYPES = {
    road: [
      { id: 'surface',  label: 'Road surface',
        subtypes: ['Pothole', 'Cracked surface', 'Subsidence', 'Loose gravel'] },
      { id: 'lighting', label: 'Street lighting',
        subtypes: ['Light not working', 'Flickering light', 'Damaged pole'] },
      { id: 'drainage', label: 'Drainage',
        subtypes: ['Blocked drain', 'Flooding', 'Missing drain cover'] },
      { id: 'signage',  label: 'Signs and markings',
        subtypes: ['Faded road markings', 'Damaged sign', 'Missing sign'] },
      { id: 'works',    label: 'Construction works',
        subtypes: ['Unsafe site', 'Works overrunning', 'Noise from works'] }
    ],
    animal: [
      { id: 'stray',    label: 'Stray animals',
        subtypes: ['Stray dog', 'Stray cattle', 'Animal on the road'] },
      { id: 'welfare',  label: 'Animal welfare',
        subtypes: ['Neglect', 'Injured animal', 'Overcrowding'] },
      { id: 'danger',   label: 'Danger to the public',
        subtypes: ['Aggressive animal', 'Bite or attack', 'Snake sighting'] },
      { id: 'carcass',  label: 'Dead animals',
        subtypes: ['Carcass on the road', 'Carcass in a drain'] }
    ],
    environment: [
      { id: 'waste',    label: 'Waste and dumping',
        subtypes: ['Illegal dumping', 'Missed collection', 'Overflowing bin'] },
      { id: 'water',    label: 'Water pollution',
        subtypes: ['Discoloured water', 'Sewage leak', 'Contaminated borehole'] },
      { id: 'air',      label: 'Air and noise',
        subtypes: ['Burning waste', 'Dust from works', 'Persistent noise'] },
      { id: 'green',    label: 'Trees and green space',
        subtypes: ['Fallen tree', 'Illegal felling', 'Overgrown space'] }
    ]
  };

  var GENERIC_TYPES = [
    { id: 'service',  label: 'Service delivery',
      subtypes: ['Service not delivered', 'Delay', 'Poor quality'] },
    { id: 'staff',    label: 'Staff conduct',
      subtypes: ['Rudeness', 'Unavailable staff', 'Misconduct'] },
    { id: 'facility', label: 'Facilities',
      subtypes: ['Damaged facility', 'Closed without notice', 'Cleanliness'] }
  ];

  /* Imported and "something else" templates fall back to the generic
     set, so every template can answer the question. */
  function complaintTypes(templateId) {
    return COMPLAINT_TYPES[templateId] || GENERIC_TYPES;
  }
  function subtypeCount(templateId) {
    return complaintTypes(templateId).reduce(function (n, t) { return n + t.subtypes.length; }, 0);
  }

  /* A service takes reports about some of them. Nothing chosen yet
     means all of them — the template arrives complete. */
  function serviceTypeIds(templateId) {
    var picked = (window.STORE && window.STORE.get('system.types', null)) || null;
    var all = complaintTypes(templateId).map(function (t) { return t.id; });
    if (!picked || !picked.length) return all;
    return all.filter(function (id) { return picked.indexOf(id) !== -1; });
  }
  function serviceSubtypes(templateId) {
    var picked = (window.STORE && window.STORE.get('system.subtypes', null)) || null;
    var out = [];
    complaintTypes(templateId).forEach(function (t) {
      if (serviceTypeIds(templateId).indexOf(t.id) === -1) return;
      t.subtypes.forEach(function (sub) {
        var key = t.id + ':' + sub;
        if (!picked || !picked.length || picked.indexOf(key) !== -1) out.push(key);
      });
    });
    return out;
  }

  /* The notifications a template arrives with, one per point in the
     workflow. The same set goes out on every channel they turn on —
     the wording differs, the moments do not. */
  var NOTIFICATION_EVENTS = [
    { id: 'received', state: 'Submitted', name: 'Complaint received',
      desc: 'Goes to the person who reported it, the moment they submit, with the reference number they can quote later.' },
    { id: 'assigned', state: 'Assigned', name: 'Assigned to an officer',
      desc: 'Tells the reporter someone now owns it, and tells that officer a complaint is waiting for them.' },
    { id: 'progress', state: 'In progress', name: 'Work under way',
      desc: 'Sent when the complaint moves on — inspected, scheduled, or being worked on — so nobody has to chase it.' },
    { id: 'overdue', state: 'Overdue', name: 'Running late',
      desc: 'Sent once the resolution time passes, to whoever your escalation rule names.' },
    { id: 'resolved', state: 'Resolved', name: 'Complaint resolved',
      desc: 'Closes the loop with the reporter: what was done, when, and how to reopen it if it was not enough.' }
  ];

  var RESOLUTION_PRESETS = [
    { id: '1d',     label: '1 day',    desc: 'Urgent services with same-day turnaround.' },
    { id: '3d',     label: '3 days',   desc: 'A common default for most complaints.' },
    { id: '1w',     label: '1 week',   desc: 'Complaints needing a site visit or works.' },
    { id: '2w',     label: '2 weeks',  desc: 'Complex cases involving several departments.' },
    { id: 'custom', label: 'Custom',   desc: 'Set your own period.' }
  ];

  /* `sentence` is the summary phrasing used on the review page, where
     the option needs to read as a statement of fact rather than a
     choice. `desc` stays the wording used when choosing. */
  var OVERDUE_ACTIONS = [
    { id: 'remind',        label: 'Remind the assigned employee',
      desc: 'Send a reminder to the person handling the complaint.', hue: 'sky',
      sentence: 'The assigned employee is reminded.' },
    { id: 'remind-then',   label: 'Remind them, then notify their manager',
      desc: 'Remind the person handling the complaint first. If it remains unresolved, notify their manager.', hue: 'mint',
      sentence: 'The assigned employee is reminded, then the manager is notified.' },
    { id: 'manager-now',   label: 'Notify the manager immediately',
      desc: 'Notify the manager as soon as the complaint becomes overdue.', hue: 'peach',
      sentence: 'The manager is notified immediately.' },
    { id: 'none',          label: 'Take no action',
      desc: 'No additional notification is sent.', hue: 'blush',
      sentence: 'No additional notification is sent.' }
  ];

  var ASSIGNMENT_MODES = [
    { id: 'role',     label: 'To the assigned role',
      desc: 'Complaints are assigned to the employee mapped to the relevant role.', hue: 'lilac', icon: 'people' },
    { id: 'role-location', label: 'By role and location',
      desc: 'Complaints are assigned based on the relevant role and where the complaint was reported.',
      hue: 'sky', icon: 'flow' }
  ];

  /* Both location-aware modes need the level and the mapping screens. */
  function usesLocation(mode) { return mode === 'location' || mode === 'role-location'; }

  /* ---- Personalised view after publish ----------------------
     The view a person gets is derived from the role they gave at
     sign-up (§1.6), so it is genuinely theirs rather than generic. */
  var PERSONAS = {
    officer: {
      id: 'officer', label: 'Complaint Officer',
      lead: 'Here is what is waiting on you.',
      panel: 'Assigned to you'
    },
    supervisor: {
      id: 'supervisor', label: 'Service Manager',
      lead: 'Here is where work is getting stuck.',
      panel: 'Needs reassigning'
    },
    manager: {
      id: 'manager', label: 'Department Manager',
      lead: 'Here is what has been escalated to you.',
      panel: 'Escalated to you'
    },
    admin: {
      id: 'admin', label: 'Administrator',
      lead: 'Your service is live. Here is how it is set up.',
      panel: 'Service health'
    }
  };

  /* Nothing asks the signed-in person which role they hold, so the
     personalised view defaults to the administrator's and the
     "Viewing as" select switches it. */
  var DEFAULT_PERSONA = 'admin';

  /* Placeholder figures for the KPI tiles. Replace with real data. */
  var KPI_MOCK = {
    'Open complaints': '128',
    'Overdue complaints': '9',
    'Complaints by location': '14 wards',
    'Resolution time': '2.4 days'
  };


  /* ---- The four phases every complaint goes through ---------
     Shown as a chain on both the template workspace and the
     post-customisation "ready" screen, so it lives here once. */
  var CHAIN_STEPS = [
    ['Complaint submitted', 'sky'],
    ['Complaint assigned',  'lilac'],
    ['Complaint handled',   'mint'],
    ['Resolved',            'butter']
  ];

  /* ---- The configurable parts of a service -----------------
     One card per part, on both the template workspace and the
     post-customisation "ready" screen, so the copy cannot drift.

       edit    the FIRST question screen for this part. Editing a part
               walks only that part's questions (see `part` on the
               cust-* screens) and then returns where it came from.
       link    the read-only drill-in label.
       manage  what the CTA says once setup is done.

     Forms has no `edit` — the guided flow never changes the form, so
     it stays preview-only. ------------------------------------- */
  /* The five parts of a service. `cta` is what the button says on a
     draft, `manage` what it says once the questions are answered.
     Roles is a view, not an edit: who is in which role is decided by
     the mapping questions, not on that card. */
  var SERVICE_PARTS = [
    { key: 'forms', title: 'Forms', icon: 'form', hue: 'sky',
      desc: 'The forms used to submit and manage complaints.',
      cta: 'Edit forms', link: 'Preview forms', manage: 'Manage forms', edit: null },

    { key: 'workflow', title: 'Workflow', icon: 'flow', hue: 'lilac',
      desc: 'How a complaint moves: who it goes to, how long it has, and what happens when it runs late.',
      cta: 'Edit workflow', link: 'View detailed workflow', manage: 'Manage workflow',
      edit: 'cust-assignment' },

    { key: 'assignments', title: 'Roles', icon: 'people', hue: 'mint',
      desc: 'The roles handling complaints, and which employees are mapped to each.',
      cta: 'View Roles', link: 'View assignments', manage: 'Manage employees',
      edit: 'cust-roles', viewOnly: true },

    { key: 'notifications', title: 'Notifications', icon: 'bell', hue: 'peach',
      desc: 'See what notifications are sent, when they are sent, and who receives them.',
      cta: 'Edit notifications', link: 'Preview notifications', manage: 'Manage notifications',
      edit: 'cust-updates-who' },

    { key: 'dashboard', title: 'Dashboard', icon: 'chart', hue: 'butter',
      desc: 'The dashboard employees use to monitor complaints and track performance.',
      cta: 'Edit dashboard', link: 'Preview dashboard', manage: 'Manage dashboard',
      edit: 'cust-dashboard' }
  ];

  function partByKey(k) {
    for (var i = 0; i < SERVICE_PARTS.length; i++) if (SERVICE_PARTS[i].key === k) return SERVICE_PARTS[i];
    return null;
  }

  /* ---- What customising a template actually involves --------
     Drives the "Before you begin" screen. `mins` is summed for the
     estimate, so adding a question here updates the promise. The
     location step only applies if they route by location, so it is
     marked conditional and excluded from the base total. */
  var CUST_STEPS = [
    { id: 'assignment', label: 'How complaints are assigned', mins: 1, icon: 'flow', hue: 'lilac',
      need: 'A decision on whether complaints go by role, by location, or both' },

    { id: 'location', label: 'Location routing', mins: 2, icon: 'pin', hue: 'mint', conditional: true,
      need: 'Only if you route by location — which level, and who covers each area' },

    { id: 'roles', label: 'Who handles complaints', mins: 2, icon: 'people', hue: 'sky',
      need: 'The employees to put in each role the template already defines' },

    { id: 'resolution', label: 'Resolution time', mins: 1, icon: 'clock', hue: 'butter',
      need: 'How long a complaint should take to resolve' },

    { id: 'overdue', label: 'When it runs late', mins: 1, icon: 'bell', hue: 'peach',
      need: 'Who to remind or notify once a complaint is overdue' },

    { id: 'updates', label: 'Updates', mins: 1, icon: 'mail', hue: 'blush',
      need: 'Who should hear about changes, and on which channels' },

    { id: 'kpis', label: 'Dashboard KPIs', mins: 1, icon: 'chart', hue: 'butter',
      need: 'Which numbers your organisation actually acts on' }
  ];

  /* base estimate excludes the conditional step */
  function custMins(includeConditional) {
    return CUST_STEPS.reduce(function (n, s) {
      return n + ((s.conditional && !includeConditional) ? 0 : s.mins);
    }, 0);
  }

  /* ---- Preview: experiencing a template through a role ------
     A concrete example complaint per template, so the narration is
     specific rather than "a complaint was submitted". */
  var EXAMPLES = {
    road: {
      complaint: 'a deep pothole swallowing half the lane',
      place: 'Waiyaki Way, Parklands', reporter: 'Grace Mwangi'
    },
    animal: {
      complaint: 'a stray dog behaving aggressively outside a school gate',
      place: 'Kangemi', reporter: 'Peter Njoroge'
    },
    environment: {
      complaint: 'untreated effluent draining into the river',
      place: 'Kawangware', reporter: 'Alice Wambui'
    },
    other: {
      complaint: 'a street light that has been dark for three weeks',
      place: 'Karura', reporter: 'Samuel Kiptoo'
    }
  };

  /* The extra perspective that is not a template role. */
  /* Plain labels — the card carries an "Explore" CTA of its own. */
  var CITIZEN_ROLE = {
    id: 'citizen', label: 'Citizen',
    desc: 'See what the person reporting a complaint experiences.',
    icon: 'people', hue: 'sky'
  };

  function previewRoles(templateId) {
    var t = templateById(templateId);
    var roles = t ? t.roles : STD_ROLES;
    var hues = ['lilac', 'mint', 'peach'];
    var icons = ['people', 'flow', 'shield'];
    return [CITIZEN_ROLE].concat(roles.map(function (r, i) {
      return {
        id: r.id, label: r.label, desc: r.desc,
        icon: icons[i % icons.length], hue: hues[i % hues.length]
      };
    }));
  }

  function sla() {
    var active = window.STORE && window.STORE.activeSystem();
    return active && window.STORE.get('system.resolution.preset') ? resolutionLabel() : '3 days';
  }

  /* Beats are revealed one at a time with a pause between them, so
     the user arrives at the preview already knowing why they are
     looking at it. `wait` is the pause AFTER that beat, in ms. */
  function storyFor(templateId, roleId) {
    var ex = EXAMPLES[templateId] || EXAMPLES.other;
    var t = templateById(templateId);
    var name = t ? t.name : 'this complaint system';

    var STORIES = {
      citizen: [
        { icon: 'eye',    hue: 'sky',    wait: 2600,
          text: 'You have spotted ' + ex.complaint + ' in ' + ex.place + '.',
          note: 'Right now your only option is to phone an office and hope someone writes it down.' },
        { icon: 'form',   hue: 'lilac',  wait: 2600,
          text: 'You open the complaint service and fill in a short form.',
          note: 'Category, location, a photo, and how to reach you. Nothing else.' },
        { icon: 'check',  hue: 'mint',   wait: 2400,
          text: 'You get a reference number straight away.',
          note: 'Plus a confirmation on your chosen channel.' },
        { icon: 'clock',  hue: 'butter', wait: 0,
          text: 'From here you can follow it yourself — no phone calls.',
          note: 'This is what you are about to see.' }
      ],
      officer: [
        { icon: 'bell',   hue: 'sky',    wait: 2800,
          text: ex.reporter + ' has reported ' + ex.complaint + ' in ' + ex.place + '.',
          note: 'Submitted through the citizen form, with a photo attached.' },
        { icon: 'check',  hue: 'mint',   wait: 2600,
          text: 'It has been verified as a legitimate complaint.',
          note: 'Duplicates and false reports are filtered out before they ever reach you.' },
        { icon: 'people', hue: 'lilac',  wait: 2600,
          text: 'It is now assigned to you.',
          note: 'Because you hold the Complaint Officer role for that area.' },
        { icon: 'clock',  hue: 'butter', wait: 0,
          text: 'The clock is running — ' + sla() + ' to resolve it. Time to take action.',
          note: 'This is what you are about to see.' }
      ],
      supervisor: [
        { icon: 'chart',  hue: 'sky',    wait: 2800,
          text: 'Four complaints in ' + ex.place + ' are approaching their deadline.',
          note: 'Including ' + ex.complaint + ', reported by ' + ex.reporter + '.' },
        { icon: 'people', hue: 'peach',  wait: 2600,
          text: 'One officer is carrying more than they can clear.',
          note: 'Two others have capacity today.' },
        { icon: 'bell',   hue: 'butter', wait: 2600,
          text: 'Nobody has escalated anything yet, so it is still quiet.',
          note: 'Which is exactly when it is cheap to fix.' },
        { icon: 'flow',   hue: 'lilac',  wait: 0,
          text: 'You need to see where work is stuck and move it.',
          note: 'This is what you are about to see.' }
      ],
      manager: [
        { icon: 'clock',  hue: 'butter', wait: 2800,
          text: ex.complaint.charAt(0).toUpperCase() + ex.complaint.slice(1) +
                ' in ' + ex.place + ' has passed its ' + sla() + ' deadline.',
          note: 'Reported by ' + ex.reporter + '.' },
        { icon: 'bell',   hue: 'peach',  wait: 2600,
          text: 'The assigned officer was reminded automatically. It is still open.',
          note: 'Exactly the escalation rule your organisation configured.' },
        { icon: 'people', hue: 'blush',  wait: 2600,
          text: 'So it has come to you.',
          note: 'You are accountable for this service.' },
        { icon: 'chart',  hue: 'lilac',  wait: 0,
          text: 'You need the whole picture, not one complaint.',
          note: 'This is what you are about to see.' }
      ]
    };

    return STORIES[roleId] || STORIES.officer;
  }

  function previewRoleLabel(templateId, roleId) {
    if (roleId === 'citizen') return 'Citizen';
    var t = templateById(templateId);
    var roles = t ? t.roles : STD_ROLES;
    for (var i = 0; i < roles.length; i++) if (roles[i].id === roleId) return roles[i].label;
    return roleId;
  }

  /* Built-in templates plus anything the organisation imported. */
  function allTemplates() {
    var custom = (window.STORE && window.STORE.get('templates.custom', [])) || [];
    return TEMPLATES.concat(custom);
  }

  function templateById(id) {
    var all = allTemplates();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  /* ---- Importing a template --------------------------------
     Accepts a JSON definition. Reports what is wrong rather than
     failing silently, and fills in sensible defaults for the parts
     a template does not have to declare. */
  function parseTemplateImport(text) {
    var errors = [];
    var raw;
    try {
      raw = JSON.parse(String(text || ''));
    } catch (e) {
      return { template: null, errors: ['That is not valid JSON.'] };
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { template: null, errors: ['Expected a single template object.'] };
    }

    var name = String(raw.name || '').trim();
    if (!name) errors.push('A "name" is required.');

    var fields = Array.isArray(raw.formFields) ? raw.formFields.filter(Boolean) : [];
    if (!fields.length) errors.push('"formFields" must list at least one field.');

    var flow = Array.isArray(raw.workflow) ? raw.workflow.filter(Boolean) : [];
    if (flow.length < 2) errors.push('"workflow" needs at least two stages.');

    var taken = allTemplates().map(function (t) { return t.name.toLowerCase(); });
    if (name && taken.indexOf(name.toLowerCase()) !== -1) {
      errors.push('A template called "' + name + '" already exists.');
    }

    if (errors.length) return { template: null, errors: errors };

    var hues = ['lilac', 'mint', 'sky', 'peach', 'butter', 'blush'];
    return {
      errors: [],
      template: {
        id: 'tpl-' + Math.random().toString(36).slice(2, 9),
        name: name,
        desc: String(raw.desc || raw.description || 'An imported complaint template.').trim(),
        hue: hues[allTemplates().length % hues.length],
        icon: 'form',
        imported: true,
        roles: Array.isArray(raw.roles) && raw.roles.length ? raw.roles : STD_ROLES,
        formFields: fields.map(String),
        workflow: flow.map(String),
        metrics: Array.isArray(raw.metrics) && raw.metrics.length
          ? raw.metrics.map(String)
          : ['Open complaints', 'Overdue complaints', 'Complaints by location', 'Resolution time']
      }
    };
  }


  /* ---- one canonical wording per configured rule ------------
     These were duplicated across screens and drifted apart, so the
     review and the live view described the same setup differently.
     Every screen must read them from here. */

  /* lowercase, so it can be dropped into a sentence */
  function assignmentPhrase() {
    var a = (window.STORE && window.STORE.get('system.assignment', {})) || {};
    var lvl = a.level ? levelLabel(a.level).toLowerCase() : 'location';
    if (a.mode === 'role-location') return 'by role, within the ' + lvl + ' it was reported in';
    if (a.mode === 'location')      return 'by ' + lvl;
    if (a.mode === 'role')          return 'to the employee mapped to the relevant role';
    return 'no assignment rule set';
  }

  /* capitalised, for standalone display */
  function assignmentLabel() {
    var p = assignmentPhrase();
    return p.charAt(0).toUpperCase() + p.slice(1);
  }

  function overdueLabel() {
    var id = window.STORE && window.STORE.get('system.overdue');
    for (var i = 0; i < OVERDUE_ACTIONS.length; i++) {
      if (OVERDUE_ACTIONS[i].id === id) return OVERDUE_ACTIONS[i].label;
    }
    return 'No escalation set';
  }

  /* the same rule stated as a fact, for summary screens */
  function overdueSentence() {
    var id = window.STORE && window.STORE.get('system.overdue');
    for (var i = 0; i < OVERDUE_ACTIONS.length; i++) {
      if (OVERDUE_ACTIONS[i].id === id) return OVERDUE_ACTIONS[i].sentence;
    }
    return 'No escalation configured yet.';
  }

  function channelLabel(id) {
    for (var i = 0; i < CHANNELS.length; i++) if (CHANNELS[i].id === id) return CHANNELS[i].label;
    return id;
  }

  function channelsLabel() {
    var how = (window.STORE && window.STORE.get('system.updates.how', [])) || [];
    return how.map(channelLabel).join(', ') || 'None chosen';
  }

  function resolutionLabel() {
    var r = window.STORE.get('system.resolution', {});
    if (r.preset === 'custom') return r.value + ' ' + r.unit;
    var p = null;
    for (var i = 0; i < RESOLUTION_PRESETS.length; i++) {
      if (RESOLUTION_PRESETS[i].id === r.preset) p = RESOLUTION_PRESETS[i];
    }
    return p ? p.label : 'not set';
  }

  window.DATA = {
    LANGUAGES: LANGUAGES, ORG_TYPES: ORG_TYPES,
    SEED_EMPLOYEES: SEED_EMPLOYEES, CHANNELS: CHANNELS, ACCENTS: ACCENTS,
    DUMMY_DEPARTMENTS: DUMMY_DEPARTMENTS, DUMMY_EMPLOYEES: DUMMY_EMPLOYEES,
    dummyOperationalArea: dummyOperationalArea,
    parseEmployeeCsv: parseEmployeeCsv,
    COMPONENTS: COMPONENTS, TEMPLATES: TEMPLATES, STD_ROLES: STD_ROLES,
    RESOLUTION_PRESETS: RESOLUTION_PRESETS, OVERDUE_ACTIONS: OVERDUE_ACTIONS,
    NOTIFICATION_EVENTS: NOTIFICATION_EVENTS,
    complaintTypes: complaintTypes, subtypeCount: subtypeCount,
    serviceTypeIds: serviceTypeIds, serviceSubtypes: serviceSubtypes,
    ASSIGNMENT_MODES: ASSIGNMENT_MODES, locationLevels: locationLevels,
    EXAMPLES: EXAMPLES, CITIZEN_ROLE: CITIZEN_ROLE,
    CUST_STEPS: CUST_STEPS, custMins: custMins,
    CHAIN_STEPS: CHAIN_STEPS, SERVICE_PARTS: SERVICE_PARTS, partByKey: partByKey,
    templateById: templateById, allTemplates: allTemplates,
    parseTemplateImport: parseTemplateImport,
    locationsForLevel: locationsForLevel,
    resolutionLabel: resolutionLabel,
    LEVELS: LEVELS, GEO: GEO, GEO_PATHS: GEO_PATHS,
    boundaryLevels: boundaryLevels, builtInLevels: builtInLevels,
    hierarchies: hierarchies, activeHierarchy: activeHierarchy,
    defaultLevels: defaultLevels, levelsOf: levelsOf,
    levelById: levelById, levelLabel: levelLabel, levelIndex: levelIndex,
    optionsForLevel: optionsForLevel, scopeAtLevel: scopeAtLevel,
    pruneSelection: pruneSelection, scopeSummary: scopeSummary,
    emptySelection: emptySelection, orgScope: orgScope,
    previewRoles: previewRoles, storyFor: storyFor, previewRoleLabel: previewRoleLabel,
    usesLocation: usesLocation,
    PERSONAS: PERSONAS, DEFAULT_PERSONA: DEFAULT_PERSONA, KPI_MOCK: KPI_MOCK,
    assignmentPhrase: assignmentPhrase, assignmentLabel: assignmentLabel,
    overdueLabel: overdueLabel, overdueSentence: overdueSentence,
    channelLabel: channelLabel, channelsLabel: channelsLabel,
    CHANNEL_SETUP: CHANNEL_SETUP, channelSetup: channelSetup,
    channelConfig: channelConfig, channelConnected: channelConnected,
    channelsNeedingSetup: channelsNeedingSetup
  };
})();
