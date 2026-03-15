# GCP Gemini API Key Automation Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tampermonkey userscript to automate GCP project creation, Gemini API enabling, and AI Studio key extraction. Optimized for Firefox Android and Desktop.

**Architecture:** Single class `AutomationSuite` with a responsive UI, `Proxy`-based auth interception, and `GM_storage` persistence.

**Tech Stack:** Vanilla JS, Tampermonkey API, GCP REST APIs.

---

### Chunk 1: Foundation & Mobile UI

**Files:**
- Create: `src/suite.user.js`
- Create: `src/styles.css`

- [ ] **Step 1: Write UserScript Header & Metadata**
  Include all `@grant` and `@match` rules. Ensure `run-at document-start` for interception.

- [ ] **Step 2: Implement Mobile-First UI (FAB + Bottom Sheet)**
  Create a draggable FAB (`id="gemini-fab"`) that opens a slide-up panel on mobile and a fixed side-panel on desktop.

- [ ] **Step 3: Implement State Management**
  Create a `Store` object utilizing `GM_getValue`/`GM_setValue` to persist `projects`, `apiKeys`, and `logs` across domains.

- [ ] **Step 4: Commit Foundation**
  `git add . && git commit -m "feat: mobile-responsive foundation and state store"`

---

### Chunk 2: Auth Interception & Project Creation (Action 1)

**Files:**
- Modify: `src/suite.user.js`

- [ ] **Step 1: Implement Token Interceptor**
  Use `window.fetch` Proxy to capture `Authorization: Bearer` tokens from GCP background requests. Store in memory.

- [ ] **Step 2: Implement Action 1 Logic**
  Loop 8 times:
  1. Generate unique ID.
  2. `POST https://cloudresourcemanager.googleapis.com/v3/projects`.
  3. Poll operation status.
  4. `POST https://serviceusage.googleapis.com/v1/...:enable`.
  Add 2s delay between iterations.

- [ ] **Step 3: Commit Action 1**
  `git commit -am "feat: implement auth sniffing and project automation"`

---

### Chunk 3: AI Studio Workflow & Export (Action 2 & 3)

**Files:**
- Modify: `src/suite.user.js`

- [ ] **Step 1: Implement AI Studio Domain Handler**
  Logic for `aistudio.google.com`: 
  1. Detect "Create Key" state.
  2. Automate dropdown selection of projects from `Store`.
  3. Scrape key string and update `Store.apiKeys`.

- [ ] **Step 2: Implement Action 3 Export**
  Implement Text format, `GM_download`, and `navigator.clipboard` copy with toast notification.

- [ ] **Step 3: Final Verification & Commit**
  Run `lsp_diagnostics` and commit final script.
  `git commit -am "feat: finalize automation and export"`
