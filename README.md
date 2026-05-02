# Mythos Ready — AI Security Framework Explorer

A local web application for browsing and cross-referencing AI security risk codes and mitigations drawn from four industry frameworks: **OWASP Top 10 for LLM Applications 2025**, **OWASP Top 10 for Agentic Applications 2026**, **MITRE ATLAS**, and **NIST Cybersecurity Framework 2.0**.

---

## Overview

| | |
|---|---|
| **Schema version** | 1.2.0 |
| **Source document** | csamythosreadyv92 |
| **Frameworks** | 4 |
| **Risk codes** | 34 |
| **Mitigations** | 171 |

The application reads `mythos_framework_codes.json` — a harmonised registry of framework codes, descriptions, and deduplicated mitigation controls — and presents them as an interactive, searchable single-page web app. No internet connection is required after the initial setup.

---

## Frameworks Covered

| Framework | Version | Code Prefix | Scope |
|---|---|---|---|
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/resource/owasp-top-10-for-llm-applications-2025/) | 2025 | `LLMxx` | Risks in LLMs used as application components |
| [OWASP Top 10 for Agentic Applications](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | 2026 | `ASIxx` | Risks in autonomous AI systems that plan and act |
| [MITRE ATLAS](https://atlas.mitre.org/) | Current | `AML.Txxxx` | Adversarial techniques targeting AI/ML systems |
| [NIST Cybersecurity Framework](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf) | 2.0 | `XX.xx` | Cybersecurity risk management across governance, identification, protection, detection, and response |

---

## Getting Started

### Prerequisites

- macOS (tested on macOS 14+)
- Python 3 (pre-installed on macOS — verify with `python3 --version`)

### Run locally

```bash
# Clone the repository
git clone https://github.com/ashhandle/mythos_ready_web_app.git
cd mythos_ready_web_app

# Launch the app
./web_app/start.sh
```

The script starts a local HTTP server on port **8080** and opens the app in your default browser at `http://localhost:8080`.

To stop the server press `Ctrl+C` in the terminal.

### Manual start (alternative)

```bash
cd web_app
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

---

## Project Structure

```
mythos_ready_web_app/
│
├── mythos_framework_codes.json   # Source data — framework codes & mitigations
│
└── web_app/
    ├── index.html                # SPA shell
    ├── start.sh                  # One-command launcher
    │
    ├── css/
    │   └── styles.css            # Dark cybersecurity theme (CSS variables, no framework)
    │
    ├── js/
    │   └── app.js                # Full SPA logic — routing, rendering, search, filtering
    │
    └── data/
        └── mythos_framework_codes.json   # Data served to the browser
```

---

## Features

### Homepage
- **Stats bar** showing total framework, code, and mitigation counts sourced live from the JSON
- **Four framework cards** colour-coded by framework — orange (OWASP LLM), purple (OWASP Agentic), blue (MITRE ATLAS), green (NIST CSF) — each showing scope, code prefix, and code count
- **Recent codes** preview linking to the full code list

### Framework Detail
- Filtered view of all codes belonging to a single framework
- Inline keyword filter to narrow codes within the framework
- Link to the official framework resource

### All Codes
- Complete list of all 34 risk codes across all frameworks
- **Framework filter chips** to show/hide codes by framework
- **Keyword search** filtering by code identifier, name, or description simultaneously

### Code Detail Modal
- Opens on clicking any code row
- Displays full description, risk context classification, rank (where applicable), tactic/category/sub-technique metadata
- Expanded list of all linked mitigations with full mitigation text
- Link to the official code reference

### Mitigations Browser
- All 171 deduplicated mitigations in a searchable card grid
- Each card shows the mitigation ID (`MIT-001` … `MIT-171`) and full control description

### Global Search
- Header search bar queries code identifiers, names, descriptions, and risk context in real time across all frameworks
- `Escape` clears the search and returns to the previous view

---

## Data Structure

The application is driven entirely by `mythos_framework_codes.json`. The schema has three top-level arrays:

### `frameworks`
Defines the four source frameworks.

```json
{
  "framework_id": "OWASP_LLM_2025",
  "name": "OWASP Top 10 for LLM Applications",
  "version": "2025",
  "code_prefix": "LLMxx",
  "scope": "Risks in LLMs used as application components",
  "url": "https://genai.owasp.org/..."
}
```

### `mitigations`
A deduplicated registry of control descriptions referenced by ID.

```json
{
  "mitigation_id": "MIT-001",
  "description": "Constrain model behaviour by defining a strict role in the system prompt..."
}
```

### `codes`
Each risk code with full metadata and references to mitigations by ID.

```json
{
  "code": "LLM01",
  "name": "Prompt Injection",
  "framework_id": "OWASP_LLM_2025",
  "framework_name": "OWASP Top 10 for LLM Applications 2025",
  "rank": 1,
  "description": "...",
  "risk_context": "Application component risk",
  "url": "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
  "mitigations": ["MIT-001", "MIT-002", "MIT-003", "MIT-004", "MIT-005", "MIT-006"]
}
```

MITRE ATLAS codes include additional fields: `tactic`, `category`, `is_subtechnique`, and `technique_parent`.  
NIST CSF codes include a `function` field (Govern, Identify, Protect, Detect, Respond).

---

## Technology

| | |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **Dependencies** | None — no npm, no CDN, no build step |
| **Server** | Python 3 built-in `http.server` |
| **Routing** | Hash-based SPA (`#/`, `#/framework/:id`, `#/codes`, `#/mitigations`) |
| **Data** | Static JSON loaded via `fetch()` |

The app is intentionally dependency-free so it runs fully offline with no installation beyond Python 3.

---

## Version History

| Version | Date | Notes |
|---|---|---|
| v1.0.0 | 2026-05-02 | Initial release — all four frameworks, search, filtering, code modals, mitigations browser |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: description"`
4. Push to your fork: `git push origin feat/your-feature`
5. Open a pull request against `main`

---

## Licence

This project is released for internal use within the Mythos Ready programme. Framework content remains subject to the terms of the respective standards bodies (OWASP, MITRE, NIST).
