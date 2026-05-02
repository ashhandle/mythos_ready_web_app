'use strict';

const App = {
  data: null,
  mitMap: {},
  fwCodeCounts: {},

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
          <p style="color:#f97316">&#9888; Failed to load framework data. Make sure you are running via a local web server.</p>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">Run: <code style="color:var(--accent)">python3 -m http.server 8080</code> inside the <code>web_app/</code> folder</p>
        </div>`;
    }
  },

  buildIndices() {
    this.data.mitigations.forEach(m => { this.mitMap[m.mitigation_id] = m.description; });
    this.data.frameworks.forEach(fw => {
      this.fwCodeCounts[fw.framework_id] = this.data.codes.filter(c => c.framework_id === fw.framework_id).length;
    });
  },

  route() {
    const hash = window.location.hash || '#/';
    const root = document.getElementById('app-root');

    this.updateNavActive(hash);

    if (hash === '#/' || hash === '') {
      root.innerHTML = this.viewHome();
    } else if (hash.startsWith('#/framework/')) {
      const fwId = decodeURIComponent(hash.replace('#/framework/', ''));
      root.innerHTML = this.viewFramework(fwId);
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

  // ── Home ─────────────────────────────────────────────────────────────────

  viewHome() {
    const d = this.data;
    return `
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-badge">&#9679; v${d.schema_version} &nbsp;&#x2022;&nbsp; ${d.generated_date}</div>
          <h1>AI Security<br><span>Framework Explorer</span></h1>
          <p>${d.description.split('.')[0]}.</p>
          <div class="stats-bar">
            <div class="stat"><div class="stat-num">${d.frameworks.length}</div><div class="stat-label">Frameworks</div></div>
            <div class="stat"><div class="stat-num">${d.codes.length}</div><div class="stat-label">Risk Codes</div></div>
            <div class="stat"><div class="stat-num">${d.mitigations.length}</div><div class="stat-label">Mitigations</div></div>
          </div>
        </div>
      </div>
      <div class="page-section">
        <div class="section-heading">
          <h2>Security Frameworks</h2>
          <span class="count">${d.frameworks.length}</span>
        </div>
        <div class="framework-grid">
          ${d.frameworks.map(fw => this.renderFwCard(fw)).join('')}
        </div>
        <div class="section-heading">
          <h2>Recent Codes</h2>
          <span class="count">${d.codes.length} total &mdash; <a href="#/codes">view all</a></span>
        </div>
        <div class="codes-list">
          ${d.codes.slice(0, 8).map(c => this.renderCodeRow(c)).join('')}
        </div>
      </div>`;
  },

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
        ${fw.code_prefix.split('x')[0].replace(/x+/g,'').trim() || fw.framework_id.split('_')[0]}
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
      const text = card.textContent.toLowerCase();
      card.style.display = !q || text.includes(q) ? '' : 'none';
    });
  },

  // ── Code row (shared) ─────────────────────────────────────────────────────

  renderCodeRow(c) {
    const desc = c.description.length > 120 ? c.description.slice(0, 120) + '…' : c.description;
    const rank = c.rank ? `<span class="mit-count">#${c.rank}</span>` : '';
    return `
      <div class="code-row" data-fw="${c.framework_id}" data-code="${c.code}" onclick="App.openCode('${c.code}')">
        <span class="code-badge fw-${c.framework_id}">${c.code}</span>
        <div class="code-row-body">
          <div class="code-row-name">${c.name}</div>
          <div class="code-row-desc">${desc}</div>
        </div>
        <div class="code-row-meta">
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

    const mits = c.mitigations.map(id => {
      const desc = this.mitMap[id] || 'Description unavailable';
      return `
        <div class="modal-mit-item">
          <span class="modal-mit-id">${id}</span>
          <span class="modal-mit-text">${desc}</span>
        </div>`;
    }).join('');

    const rankBadge = c.rank ? `<span class="modal-tag">Rank #${c.rank}</span>` : '';
    const categoryTag = c.category ? `<span class="modal-tag">${c.category}</span>` : '';
    const tacticTag = c.tactic ? `<span class="modal-tag">Tactic: ${c.tactic}</span>` : '';
    const subTag = c.is_subtechnique ? `<span class="modal-tag">Sub-technique of ${c.technique_parent}</span>` : '';
    const nistFn = c.function ? `<span class="modal-tag">Function: ${c.function}</span>` : '';

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
          <div class="modal-section-label">Description</div>
          <p class="modal-description">${c.description}</p>
        </div>

        <div class="modal-section">
          <div class="modal-section-label">Classification</div>
          <div class="modal-tags">
            <span class="modal-tag">${c.risk_context}</span>
            ${rankBadge}${categoryTag}${tacticTag}${subTag}${nistFn}
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

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
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

    const root = document.getElementById('app-root');
    root.innerHTML = `
      <div class="page-section">
        <div class="search-results-header">
          <h2>&#128269; Results for &ldquo;${this.escHtml(q)}&rdquo; &mdash; ${matches.length} found</h2>
          <button onclick="document.getElementById('global-search').value=''; App.route()">Clear &#x2715;</button>
        </div>
        <div class="codes-list">
          ${matches.length
            ? matches.map(c => this.renderCodeRow(c)).join('')
            : '<div class="empty-state"><h3>No codes match your search</h3><p>Try a different keyword or browse frameworks above.</p></div>'
          }
        </div>
      </div>`;

    this.bindPageEvents();
  },

  // ── Filter helpers ────────────────────────────────────────────────────────

  toggleFwFilter(btn, fwId) {
    btn.classList.toggle('active');
    this.applyCodeListFilter();
  },

  applyCodeListFilter() {
    const activeChips = [...document.querySelectorAll('.filter-chip.active')].map(b => b.dataset.fw);
    const query = (document.getElementById('codes-filter')?.value || '').toLowerCase();

    document.querySelectorAll('#all-codes-list .code-row').forEach(row => {
      const fw = row.dataset.fw;
      const text = row.textContent.toLowerCase();
      const fwOk = activeChips.length === 0 || activeChips.includes(fw);
      const qOk = !query || text.includes(query);
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
    if (codesFilter) {
      codesFilter.addEventListener('input', () => this.applyCodeListFilter());
    }

    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) closeBtn.onclick = () => this.closeModal();
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeModal();
    }, { once: true });
  },

  navigate(hash) {
    window.location.hash = hash;
  },

  escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
