'use strict';

const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Not Assessed'];
const RISK_META = {
  'Critical':     { dot: '🔴', cls: 'risk-critical' },
  'High':         { dot: '🟠', cls: 'risk-high'     },
  'Medium':       { dot: '🟡', cls: 'risk-medium'   },
  'Not Assessed': { dot: '⚪', cls: 'risk-none'     },
};

const IMPL_OPTIONS = ['Effective', 'Not Effective', 'Alternate Control', 'Not Implemented', 'Not Assessed', 'Not Applicable'];
const IMPL_META = {
  'Effective':         { cls: 'impl-effective'       },
  'Not Effective':     { cls: 'impl-not-effective'   },
  'Alternate Control': { cls: 'impl-alternate'       },
  'Not Implemented':   { cls: 'impl-not-implemented' },
  'Not Assessed':      { cls: 'impl-not-assessed'    },
  'Not Applicable':    { cls: 'impl-not-applicable'  },
};
const MIT_CONTROLS_KEY = 'mythos_mit_controls';

const App = {
  data: null,
  mitMap: {},
  fwCodeCounts: {},

  // ── Computed risk engine ──────────────────────────────────────────────────
  // Risk level is derived from mitigation control implementation status.
  // "Not Assessed" and "Not Applicable" are treated as null and excluded.
  // Remaining active mitigations:
  //   all Effective / Alternate Control   → Medium
  //   all Not Effective / Not Implemented → Critical
  //   mixed                               → High
  //   none active                         → Not Assessed

  computeCodeRisk(code) {
    const c = this.data.codes.find(x => x.code === code);
    if (!c) return { level: 'Not Assessed', basis: 'Code not found.' };

    const controls = this.getMitControls();
    const GOOD = new Set(['Effective', 'Alternate Control']);
    const BAD  = new Set(['Not Effective', 'Not Implemented']);

    const active = c.mitigations.filter(id => {
      const impl = controls[id]?.implementation || 'Not Assessed';
      return impl !== 'Not Assessed' && impl !== 'Not Applicable';
    });

    if (active.length === 0) {
      return {
        level: 'Not Assessed',
        basis: 'No mitigations assessed — set Control Implementation values below to calculate risk.',
      };
    }

    const good = active.filter(id => GOOD.has(controls[id].implementation));
    const bad  = active.filter(id => BAD.has(controls[id].implementation));
    const n    = active.length;
    const pl   = n === 1 ? '' : 's';

    if (bad.length === 0) {
      return {
        level: 'Medium',
        basis: `All ${n} assessed mitigation${pl} are effective or have alternate controls.`,
      };
    }
    if (good.length === 0) {
      return {
        level: 'Critical',
        basis: `All ${n} assessed mitigation${pl} are not effective or not implemented.`,
      };
    }
    return {
      level: 'High',
      basis: `${good.length} of ${n} assessed mitigations effective; ${bad.length} not effective or not implemented.`,
    };
  },

  getCodeRiskLevel(code) {
    return this.computeCodeRisk(code).level;
  },

  getRiskCounts() {
    const counts = { 'Critical': 0, 'High': 0, 'Medium': 0, 'Not Assessed': 0 };
    this.data.codes.forEach(c => { counts[this.getCodeRiskLevel(c.code)]++; });
    return counts;
  },

  // ── Mitigation control persistence ───────────────────────────────────────

  getMitControls() {
    try { return JSON.parse(localStorage.getItem(MIT_CONTROLS_KEY) || '{}'); }
    catch { return {}; }
  },

  getMitControl(mitId) {
    return this.getMitControls()[mitId] || { implementation: 'Not Assessed', justification: '' };
  },

  saveMitImpl(mitId, value, selectEl) {
    const controls = this.getMitControls();
    if (!controls[mitId]) controls[mitId] = { implementation: 'Not Assessed', justification: '' };
    controls[mitId].implementation = value;
    localStorage.setItem(MIT_CONTROLS_KEY, JSON.stringify(controls));
    const allCls = Object.values(IMPL_META).map(m => m.cls);
    selectEl.classList.remove(...allCls);
    selectEl.classList.add(IMPL_META[value].cls);
    // Risk is derived from control status — refresh displays after every change
    this.refreshModalRisk();
    this.refreshCodeRowBadge(this._currentModalCode);
  },

  refreshModalRisk() {
    const display = document.getElementById('modal-computed-risk');
    if (!display || !this._currentModalCode) return;
    const { level, basis } = this.computeCodeRisk(this._currentModalCode);
    const meta = RISK_META[level];
    display.innerHTML = `
      <div class="computed-risk-level">
        <span class="risk-dot ${meta.cls}"></span>
        <span class="computed-level-text ${meta.cls}">${level}</span>
        <span class="computed-label">auto-calculated</span>
      </div>
      <p class="computed-risk-basis">${basis}</p>`;
  },

  refreshCodeRowBadge(code) {
    if (!code) return;
    const metaEl = document.querySelector(`.code-row[data-code="${code}"] .code-row-meta`);
    if (!metaEl) return;
    const existing = metaEl.querySelector('.risk-level-badge');
    if (existing) existing.remove();
    const level = this.getCodeRiskLevel(code);
    if (level !== 'Not Assessed') {
      const badge = document.createElement('span');
      badge.className = `risk-level-badge ${RISK_META[level].cls}`;
      badge.textContent = level;
      metaEl.insertBefore(badge, metaEl.firstChild);
    }
  },

  saveMitJustification(mitId, value, textarea) {
    const controls = this.getMitControls();
    if (!controls[mitId]) controls[mitId] = { implementation: 'Not Assessed', justification: '' };
    controls[mitId].justification = value;
    localStorage.setItem(MIT_CONTROLS_KEY, JSON.stringify(controls));
    const counter = textarea.parentElement.querySelector('.char-current');
    if (counter) counter.textContent = value.length;
  },

  renderModalMitItem(mitId) {
    const desc    = this.mitMap[mitId] || 'Description unavailable';
    const control = this.getMitControl(mitId);
    const implCls = IMPL_META[control.implementation]?.cls || 'impl-not-assessed';
    const jLen    = control.justification.length;

    const options = IMPL_OPTIONS.map(o =>
      `<option value="${o}" ${o === control.implementation ? 'selected' : ''}>${o}</option>`
    ).join('');

    const safeJustification = control.justification
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    return `
      <div class="modal-mit-item">
        <div class="mit-top">
          <span class="modal-mit-id">${mitId}</span>
          <span class="modal-mit-text">${desc}</span>
        </div>
        <div class="mit-assessment">
          <div class="mit-assessment-field">
            <label class="mit-field-label">Control Implementation</label>
            <select class="mit-impl-select ${implCls}"
              onchange="App.saveMitImpl('${mitId}', this.value, this)">
              ${options}
            </select>
          </div>
          <div class="mit-assessment-field">
            <label class="mit-field-label">Control Justification</label>
            <textarea class="mit-justification" maxlength="1500"
              placeholder="Describe implementation details, evidence, or rationale…"
              oninput="App.saveMitJustification('${mitId}', this.value, this)">${safeJustification}</textarea>
            <div class="mit-char-counter"><span class="char-current">${jLen}</span> / 1500</div>
          </div>
        </div>
      </div>`;
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  async init() {
    try {
      const res = await fetch('data/mythos_framework_codes.json');
      this.data = await res.json();
      this.buildIndices();
      this.setupGlobalSearch();
      window.addEventListener('hashchange', () => this.route());
      this.route();
    } catch (e) {
      document.getElementById('app-root').innerHTML = `
        <div class="loading-state">
          <p style="color:#f97316">&#9888; Failed to load data. Ensure you are running via a local web server.</p>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">
            Run: <code style="color:var(--accent)">python3 -m http.server 8080</code> inside the <code>web_app/</code> folder
          </p>
        </div>`;
    }
  },

  buildIndices() {
    this.data.mitigations.forEach(m => { this.mitMap[m.mitigation_id] = m.description; });
    this.data.frameworks.forEach(fw => {
      this.fwCodeCounts[fw.framework_id] = this.data.codes.filter(c => c.framework_id === fw.framework_id).length;
    });
  },

  // ── Router ────────────────────────────────────────────────────────────────

  route() {
    const hash = window.location.hash || '#/';
    const root = document.getElementById('app-root');
    this.updateNavActive(hash);

    if (hash === '#/' || hash === '') {
      root.innerHTML = this.viewHome();
    } else if (hash.startsWith('#/framework/')) {
      root.innerHTML = this.viewFramework(decodeURIComponent(hash.replace('#/framework/', '')));
    } else if (hash.startsWith('#/risk/')) {
      root.innerHTML = this.viewRiskLevel(decodeURIComponent(hash.replace('#/risk/', '')));
    } else if (hash === '#/codes') {
      root.innerHTML = this.viewAllCodes();
    } else if (hash === '#/mitigations') {
      root.innerHTML = this.viewMitigations();
    } else {
      root.innerHTML = this.viewHome();
    }

    this.bindPageEvents();
  },

  updateNavActive(hash) {
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.remove('active');
      const href = a.getAttribute('href');
      if (href === hash || (hash === '#/' && href === '#/')) a.classList.add('active');
    });
  },

  // ── Home ──────────────────────────────────────────────────────────────────

  viewHome() {
    const d = this.data;
    return `
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-badge">&#9679; v${d.schema_version} &nbsp;&#x2022;&nbsp; ${d.generated_date}</div>
          <h1>AI Security<br><span>Control Readiness</span></h1>
          <p>${d.description.split('.')[0]}.</p>
          <div class="stats-bar">
            <div class="stat"><div class="stat-num">${d.frameworks.length}</div><div class="stat-label">Frameworks</div></div>
            <div class="stat"><div class="stat-num">${d.codes.length}</div><div class="stat-label">Risk Codes</div></div>
            <div class="stat"><div class="stat-num">${d.mitigations.length}</div><div class="stat-label">Mitigations</div></div>
          </div>
        </div>
      </div>
      <div class="page-section">
        ${this.renderRiskPanel()}
        <div class="section-heading">
          <h2>Security Frameworks</h2>
          <span class="count">${d.frameworks.length}</span>
        </div>
        <div class="framework-grid">
          ${d.frameworks.map(fw => this.renderFwCard(fw)).join('')}
        </div>
        <div class="section-heading" style="margin-top:40px">
          <h2>Recent Codes</h2>
          <span class="count">${d.codes.length} total &mdash; <a href="#/codes">view all</a></span>
        </div>
        <div class="codes-list">
          ${d.codes.slice(0, 8).map(c => this.renderCodeRow(c)).join('')}
        </div>
      </div>`;
  },

  // ── Risk panel (full-width) ───────────────────────────────────────────────

  renderRiskPanel() {
    const counts = this.getRiskCounts();
    const total = this.data.codes.length;
    const assessed = total - counts['Not Assessed'];
    const pct = Math.round((assessed / total) * 100);

    const cards = RISK_LEVELS.map(level => {
      const meta = RISK_META[level];
      const count = counts[level];
      return `
        <a class="risk-panel-card ${meta.cls}" href="#/risk/${encodeURIComponent(level)}">
          <span class="risk-dot ${meta.cls} risk-dot-lg"></span>
          <span class="risk-card-count">${count}</span>
          <span class="risk-card-label">${level}</span>
          <span class="risk-card-sub">${count === 1 ? 'code' : 'codes'}</span>
          <span class="risk-card-arrow">&#x2192;</span>
        </a>`;
    }).join('');

    const resetBtn = assessed > 0
      ? `<div class="risk-panel-footer">
           <button class="risk-reset-btn" onclick="App.resetAllControls()">Reset all control assessments</button>
         </div>`
      : '';

    return `
      <div class="risk-panel">
        <div class="risk-panel-header">
          <div class="risk-panel-title-group">
            <div class="risk-panel-title"><span class="risk-widget-icon">&#x26A0;</span> Risk Assessment</div>
            <div class="risk-panel-sub">Derived from control implementation status</div>
          </div>
          <div class="risk-panel-progress-wrap">
            <div class="risk-progress-bar">
              <div class="risk-progress-fill" style="width:${pct}%"></div>
            </div>
            <span class="risk-progress-label">${assessed} / ${total} assessed</span>
          </div>
        </div>
        <div class="risk-panel-cards">${cards}</div>
        ${resetBtn}
      </div>`;
  },

  // ── Risk widget (kept for other pages if needed) ──────────────────────────

  renderRiskWidget() {
    const counts = this.getRiskCounts();
    const total = this.data.codes.length;
    const assessed = total - counts['Not Assessed'];
    const pct = Math.round((assessed / total) * 100);

    const items = RISK_LEVELS.map(level => {
      const meta = RISK_META[level];
      const count = counts[level];
      return `
        <a class="risk-level-item risk-item-${meta.cls}" href="#/risk/${encodeURIComponent(level)}">
          <span class="risk-dot ${meta.cls}"></span>
          <span class="risk-level-name">${level}</span>
          <span class="risk-level-count">${count} <span class="risk-level-word">${count === 1 ? 'code' : 'codes'}</span></span>
          <span class="risk-item-arrow">&#x2192;</span>
        </a>`;
    }).join('');

    const resetBtn = assessed > 0
      ? `<button class="risk-reset-btn" onclick="App.resetAllControls()">Reset all control assessments</button>`
      : '';

    return `
      <div class="risk-widget">
        <div class="risk-widget-header">
          <div class="risk-widget-title"><span class="risk-widget-icon">&#x26A0;</span> Risk Assessment</div>
          <span class="risk-widget-sub">Derived from control implementation status</span>
        </div>
        <div class="risk-progress-wrap">
          <div class="risk-progress-bar">
            <div class="risk-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="risk-progress-label">${assessed} / ${total} assessed</span>
        </div>
        <div class="risk-levels-list">${items}</div>
        ${resetBtn}
      </div>`;
  },

  resetAllControls() {
    if (confirm('Reset all control implementation assessments and justifications? This cannot be undone.')) {
      localStorage.removeItem(MIT_CONTROLS_KEY);
      this.route();
    }
  },

  // ── Risk level detail page ────────────────────────────────────────────────

  viewRiskLevel(level) {
    if (!RISK_LEVELS.includes(level)) return '<div class="loading-state"><p>Unknown risk level.</p></div>';
    const meta  = RISK_META[level];
    const codes = this.data.codes.filter(c => this.getCodeRiskLevel(c.code) === level);

    const navChips = RISK_LEVELS.map(l => {
      const m = RISK_META[l];
      const isActive = l === level;
      return `<a class="risk-nav-chip ${isActive ? 'active risk-item-' + m.cls : ''}" href="#/risk/${encodeURIComponent(l)}">${m.dot} ${l}</a>`;
    }).join('');

    const emptyMsg = level === 'Not Assessed'
      ? { h: 'All codes have a computed risk level', p: 'Every code has at least one active mitigation assessment.' }
      : { h: `No codes currently at ${level} risk`, p: `Risk levels are calculated automatically from the Control Implementation values on each code's mitigations.` };

    return `
      <div class="risk-detail-header risk-header-${meta.cls}">
        <div class="fw-detail-inner">
          <a class="back-link" href="#/">&#x2190; Home</a>
          <div class="risk-detail-title-row">
            <span class="risk-dot ${meta.cls} risk-dot-lg"></span>
            <h1>${level} Risk</h1>
          </div>
          <p>${codes.length} ${codes.length === 1 ? 'code' : 'codes'} — risk derived from mitigation control status</p>
          <div class="fw-meta-row" style="margin-top:16px">${navChips}</div>
        </div>
      </div>
      <div class="page-section">
        <div class="codes-list" id="risk-codes-list">
          ${codes.length
            ? codes.map(c => this.renderCodeRow(c)).join('')
            : `<div class="empty-state"><h3>${emptyMsg.h}</h3><p>${emptyMsg.p}</p></div>`
          }
        </div>
      </div>`;
  },

  // ── Framework card ────────────────────────────────────────────────────────

  renderFwCard(fw) {
    const icons = {
      OWASP_LLM_2025: '&#x1F6E1;',
      OWASP_AGENTIC_2026: '&#x1F916;',
      MITRE_ATLAS: '&#x1F3AF;',
      NIST_CSF_2: '&#x1F4CB;',
    };
    const count = this.fwCodeCounts[fw.framework_id] || 0;
    return `
      <div class="fw-card" data-fw="${fw.framework_id}" onclick="App.navigate('#/framework/${fw.framework_id}')">
        <div class="fw-card-header">
          <div class="fw-icon">${icons[fw.framework_id] || '&#x1F4C4;'}</div>
          <span class="fw-version">${fw.version}</span>
        </div>
        <div>
          <h3>${fw.name}</h3>
          <div class="fw-scope" style="margin-top:8px">${fw.scope}</div>
        </div>
        <div class="fw-card-footer">
          <div>
            <span class="fw-prefix-tag">${fw.code_prefix}</span>
            <div class="fw-code-count" style="margin-top:6px"><strong>${count}</strong> codes</div>
          </div>
          <span class="fw-arrow">&#x2192;</span>
        </div>
      </div>`;
  },

  // ── Framework detail ──────────────────────────────────────────────────────

  viewFramework(fwId) {
    const fw = this.data.frameworks.find(f => f.framework_id === fwId);
    if (!fw) return '<div class="loading-state"><p>Framework not found.</p></div>';
    const codes = this.data.codes.filter(c => c.framework_id === fwId);
    return `
      <div class="fw-detail-header" data-fw="${fwId}">
        <div class="fw-detail-inner">
          <a class="back-link" href="#/">&#x2190; All Frameworks</a>
          <h1>${fw.name}</h1>
          <p>${fw.scope}</p>
          <div class="fw-meta-row">
            <span class="fw-meta-pill">Version ${fw.version}</span>
            <span class="fw-meta-pill">Prefix: <code style="color:var(--accent);margin-left:4px">${fw.code_prefix}</code></span>
            <span class="fw-meta-pill">${codes.length} codes</span>
            <span class="fw-meta-pill"><a href="${fw.url}" target="_blank" rel="noopener">Official resource &#x2197;</a></span>
          </div>
        </div>
      </div>
      <div class="page-section">
        <div class="filter-bar">
          <input type="search" class="filter-input" id="fw-filter" placeholder="Filter codes in this framework..." autocomplete="off">
        </div>
        <div class="codes-list" id="fw-codes-list">
          ${codes.map(c => this.renderCodeRow(c)).join('')}
        </div>
      </div>`;
  },

  // ── All codes ─────────────────────────────────────────────────────────────

  viewAllCodes() {
    const fwChips = this.data.frameworks.map(fw => `
      <button class="filter-chip" data-fw="${fw.framework_id}" onclick="App.toggleFwFilter(this, '${fw.framework_id}')">
        ${fw.code_prefix.split('x')[0].replace(/x+/g, '').trim() || fw.framework_id.split('_')[0]}
      </button>`).join('');
    return `
      <div class="page-section">
        <div class="section-heading">
          <h2>All Risk Codes</h2>
          <span class="count">${this.data.codes.length}</span>
        </div>
        <div class="filter-bar">
          <input type="search" class="filter-input" id="codes-filter" placeholder="Search by code, name, or description..." autocomplete="off">
          ${fwChips}
        </div>
        <div class="codes-list" id="all-codes-list">
          ${this.data.codes.map(c => this.renderCodeRow(c)).join('')}
        </div>
      </div>`;
  },

  // ── Mitigations ───────────────────────────────────────────────────────────

  viewMitigations() {
    const items = this.data.mitigations.map(m => `
      <div class="mit-card">
        <span class="mit-id">${m.mitigation_id}</span>
        <span class="mit-text">${m.description}</span>
      </div>`).join('');
    return `
      <div class="page-section">
        <div class="section-heading">
          <h2>All Mitigations</h2>
          <span class="count">${this.data.mitigations.length}</span>
        </div>
        <div class="filter-bar">
          <input type="search" class="filter-input" id="mit-filter" placeholder="Search mitigations..." autocomplete="off" oninput="App.filterMitigations(this.value)">
        </div>
        <div class="mit-grid" id="mit-grid">${items}</div>
      </div>`;
  },

  filterMitigations(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#mit-grid .mit-card').forEach(card => {
      card.style.display = !q || card.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  },

  // ── Code row (shared) ─────────────────────────────────────────────────────

  renderCodeRow(c) {
    const desc = c.description.length > 120 ? c.description.slice(0, 120) + '…' : c.description;
    const rank = c.rank ? `<span class="mit-count">#${c.rank}</span>` : '';
    const level = this.getCodeRiskLevel(c.code);
    const riskBadge = level !== 'Not Assessed'
      ? `<span class="risk-level-badge ${RISK_META[level].cls}">${level}</span>`
      : '';
    return `
      <div class="code-row" data-fw="${c.framework_id}" data-code="${c.code}" onclick="App.openCode('${c.code}')">
        <span class="code-badge fw-${c.framework_id}">${c.code}</span>
        <div class="code-row-body">
          <div class="code-row-name">${c.name}</div>
          <div class="code-row-desc">${desc}</div>
        </div>
        <div class="code-row-meta">
          ${riskBadge}
          <span class="risk-tag">${c.risk_context}</span>
          <span class="mit-count">${c.mitigations.length} mitigations</span>
          ${rank}
        </div>
      </div>`;
  },

  // ── Code modal ────────────────────────────────────────────────────────────

  openCode(code) {
    const c = this.data.codes.find(x => x.code === code);
    if (!c) return;

    this._currentModalCode = c.code;
    const mits = c.mitigations.map(id => this.renderModalMitItem(id)).join('');

    const rankBadge  = c.rank           ? `<span class="modal-tag">Rank #${c.rank}</span>`                        : '';
    const catTag     = c.category       ? `<span class="modal-tag">${c.category}</span>`                          : '';
    const tacticTag  = c.tactic         ? `<span class="modal-tag">Tactic: ${c.tactic}</span>`                    : '';
    const subTag     = c.is_subtechnique? `<span class="modal-tag">Sub-technique of ${c.technique_parent}</span>` : '';
    const nistFn     = c.function       ? `<span class="modal-tag">Function: ${c.function}</span>`                : '';

    const { level: computedLevel, basis: computedBasis } = this.computeCodeRisk(c.code);
    const riskMeta = RISK_META[computedLevel];

    document.getElementById('modal-body').innerHTML = `
      <div class="modal-body">
        <div class="modal-code-header">
          <span class="modal-badge fw-${c.framework_id}">${c.code}</span>
          <div>
            <div class="modal-title">${c.name}</div>
            <div class="modal-fw-name">${c.framework_name}</div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">
            Risk Level <span class="computed-label">auto-calculated</span>
          </div>
          <div class="computed-risk-display" id="modal-computed-risk">
            <div class="computed-risk-level">
              <span class="risk-dot ${riskMeta.cls}"></span>
              <span class="computed-level-text ${riskMeta.cls}">${computedLevel}</span>
            </div>
            <p class="computed-risk-basis">${computedBasis}</p>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">Description</div>
          <p class="modal-description">${c.description}</p>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">Classification</div>
          <div class="modal-tags">
            <span class="modal-tag">${c.risk_context}</span>
            ${rankBadge}${catTag}${tacticTag}${subTag}${nistFn}
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">Mitigations (${c.mitigations.length})</div>
          <div class="modal-mitigations">${mits}</div>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">Reference</div>
          <a class="modal-ext-link" href="${c.url}" target="_blank" rel="noopener">Official documentation</a>
        </div>
      </div>`;

    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
  },

  // ── Global search ─────────────────────────────────────────────────────────

  setupGlobalSearch() {
    const input = document.getElementById('global-search');
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (q.length > 1) this.showSearchResults(q);
      else if (!q) this.route();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; this.route(); }
    });
  },

  showSearchResults(q) {
    const ql = q.toLowerCase();
    const matches = this.data.codes.filter(c =>
      c.code.toLowerCase().includes(ql) ||
      c.name.toLowerCase().includes(ql) ||
      c.description.toLowerCase().includes(ql) ||
      c.risk_context.toLowerCase().includes(ql)
    );
    document.getElementById('app-root').innerHTML = `
      <div class="page-section">
        <div class="search-results-header">
          <h2>&#128269; Results for &ldquo;${this.escHtml(q)}&rdquo; &mdash; ${matches.length} found</h2>
          <button onclick="document.getElementById('global-search').value=''; App.route()">Clear &#x2715;</button>
        </div>
        <div class="codes-list">
          ${matches.length
            ? matches.map(c => this.renderCodeRow(c)).join('')
            : '<div class="empty-state"><h3>No codes match your search</h3><p>Try a different keyword or browse frameworks.</p></div>'
          }
        </div>
      </div>`;
    this.bindPageEvents();
  },

  // ── Filter helpers ────────────────────────────────────────────────────────

  toggleFwFilter(btn) {
    btn.classList.toggle('active');
    this.applyCodeListFilter();
  },

  applyCodeListFilter() {
    const active = [...document.querySelectorAll('.filter-chip.active')].map(b => b.dataset.fw);
    const query  = (document.getElementById('codes-filter')?.value || '').toLowerCase();
    document.querySelectorAll('#all-codes-list .code-row').forEach(row => {
      const fwOk = active.length === 0 || active.includes(row.dataset.fw);
      const qOk  = !query || row.textContent.toLowerCase().includes(query);
      row.style.display = fwOk && qOk ? '' : 'none';
    });
  },

  // ── Bind per-page events ──────────────────────────────────────────────────

  bindPageEvents() {
    const fwFilter = document.getElementById('fw-filter');
    if (fwFilter) {
      fwFilter.addEventListener('input', () => {
        const q = fwFilter.value.toLowerCase();
        document.querySelectorAll('#fw-codes-list .code-row').forEach(row => {
          row.style.display = !q || row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }

    const codesFilter = document.getElementById('codes-filter');
    if (codesFilter) codesFilter.addEventListener('input', () => this.applyCodeListFilter());

    const overlay  = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    if (overlay)  overlay.addEventListener('click', e => { if (e.target === overlay) this.closeModal(); });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.closeModal(); }, { once: true });
  },

  navigate(hash) { window.location.hash = hash; },

  escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
