# GCP Gemini API Automation Suite - Firefox Android Optimization

**Date:** 2026-03-15  
**Version:** 2.0 (Mobile-First)  
**Status:** Design Approved  
**Target Platform:** Firefox Android (Tampermonkey)

---

## Executive Summary

This design optimizes the existing GCP Gemini API Key Automation Suite for Firefox Android by implementing a mobile-first UI while preserving all core automation functionality. The redesign focuses on touch interactions, responsive layouts, and network resilience for mobile environments.

---

## 1. Architecture Overview

### 1.1 System Layers

The architecture maintains the existing three-layer separation with an optimized presentation layer:

**Core Layers (Unchanged):**
- **State Layer**: Persistent storage via `GM_setValue`/`GM_getValue` for cross-session state
- **API Layer**: OAuth2 token interception + `GM_xmlhttpRequest` for GCP REST API calls
- **Logic Layer**: Automated project creation, Gemini API enabling, and key extraction

**Presentation Layer (Mobile-Optimized):**
- Bottom sheet UI pattern (native mobile interaction model)
- Touch-first design with 48x48px minimum touch targets
- Responsive typography and spacing for small screens
- Haptic feedback via `navigator.vibrate()` for tactile confirmation

### 1.2 Technology Stack

- **Runtime**: Tampermonkey on Firefox Android
- **Language**: Vanilla JavaScript ES6+ (no external dependencies)
- **Storage**: Greasemonkey Storage API (`GM_setValue`, `GM_getValue`)
- **Network**: `GM_xmlhttpRequest` for CORS-enabled API calls
- **UI**: Pure CSS3 with CSS Grid and Flexbox
- **Animation**: CSS transitions and transforms (GPU-accelerated)

---

## 2. User Interface Design

### 2.1 Bottom Bar Component

**Purpose**: Persistent trigger for opening the automation panel

**Specifications:**
- **Position**: Fixed at bottom of viewport, full width
- **Height**: 60px (comfortable thumb reach on mobile)
- **Background**: Semi-transparent dark (`rgba(32, 33, 36, 0.95)`)
- **Content**: Status indicator + "Gemini Suite" label + chevron icon
- **Behavior**: Single tap opens bottom sheet to half height

**Visual States:**
- **Idle**: Blue accent color, "Ready" status
- **Working**: Animated spinner, "Processing..." status
- **Error**: Red accent, "Error" status with tap-to-view details
- **Success**: Green checkmark, "Complete" status

### 2.2 Bottom Sheet Panel

**Purpose**: Main interaction surface for all automation actions

**Height States:**
- **Collapsed (20%)**: Shows header + action buttons only
- **Half (50%)**: Shows header + buttons + partial log (default open state)
- **Full (90%)**: Shows all content with full log visibility

**Interaction Model:**
- Tap bottom bar → Open to half height
- Drag handle up/down → Adjust height between states
- Swipe down on backdrop → Close sheet
- Tap backdrop → Close sheet

**Layout Structure:**
```
┌─────────────────────────────┐
│ ═══ Drag Handle ═══         │ ← 40px header
│ Gemini Automation Suite  ✕  │
├─────────────────────────────┤
│ 🚀 Auto-Create 8 Projects   │ ← 60px button
│ 🔑 Open AI Studio & Keys    │ ← 60px button
│ 📋 Extract & Export Keys    │ ← 60px button
├─────────────────────────────┤
│ [Status Log - Scrollable]   │ ← Flexible height
│ [16:15:23] ✅ Project 1/8   │
│ [16:15:26] ✨ API enabled   │
│ ...                         │
└─────────────────────────────┘
```

### 2.3 Action Buttons

**Design Specifications:**
- **Size**: 100% width × 60px height (48px minimum + 12px padding)
- **Typography**: 14px font, 600 weight, icon + text label
- **Spacing**: 12px vertical gap between buttons
- **Touch Target**: Full button area (no dead zones)

**Visual States:**
- **Default**: Blue background (`#1a73e8`), white text
- **Pressed**: Darker blue (`#1557b0`), scale(0.98) transform
- **Disabled**: Gray background (`#3c4043`), reduced opacity
- **Loading**: Spinner replaces icon, "Processing..." text

**Haptic Feedback:**
- Button press: 10ms pulse
- Action start: 50ms pulse
- Action complete: 100ms double-pulse

### 2.4 Status Log

**Purpose**: Real-time feedback on automation progress and errors

**Specifications:**
- **Font**: Monospace, 13px (readable on mobile)
- **Background**: Black (`#000`)
- **Text Color**: Color-coded by level
  - Info: Green (`#0f0`)
  - Warning: Yellow (`#ff0`)
  - Error: Red (`#f00`)
- **Behavior**: Auto-scroll to latest entry, tap entry to expand details

**Log Entry Format:**
```
[HH:MM:SS] {icon} {message}
```

**Interaction:**
- Tap entry → Expand to show full details (if truncated)
- Long-press entry → Copy to clipboard
- Double-tap log area → Copy all logs to clipboard

---

## 3. Core Automation Logic

### 3.1 Action 1: Auto-Create 8 Projects + Enable Gemini API

**Workflow:**
1. Retrieve authenticated Bearer token from active browser session
2. Loop 8 times (sequential execution with delays):
   - Generate unique project ID: `gemini-auto-{random}-{4digits}`
   - POST to Cloud Resource Manager v3 API to create project
   - Poll operation status every 2s (max 30s timeout)
   - Enable `generativelanguage.googleapis.com` via Service Usage API
   - Store project metadata in state
   - Log progress after each project
   - Wait 3s before next iteration (rate limit protection)
3. Display summary: "✅ X/8 projects created, Y/8 APIs enabled"

**API Endpoints:**
- Create: `POST https://cloudresourcemanager.googleapis.com/v3/projects`
- Poll: `GET https://cloudresourcemanager.googleapis.com/v3/operations/{id}`
- Enable: `POST https://serviceusage.googleapis.com/v1/projects/{id}/services/generativelanguage.googleapis.com:enable`

**Error Handling:**
- Network failure → Retry up to 3 times with exponential backoff
- 401 Unauthorized → Prompt user to refresh page
- 429 Rate Limit → Pause automation, show countdown, auto-resume
- Operation timeout → Log error, continue to next project

### 3.2 Action 2: Open AI Studio & Create API Keys

**Workflow:**
1. Read list of projects from state (created in Action 1)
2. Open `https://aistudio.google.com/app/apikey` in new tab
3. For each project (automation runs in AI Studio tab context):
   - Wait for page load (max 10s)
   - Click "Create API Key" button via DOM selector
   - Select project from dropdown by matching display name
   - Wait for key generation (max 10s)
   - Scrape API key value from DOM
   - Store key in state mapped to project ID
   - Log: `Project: {id} → Key: AIza...xxxx` (masked)
   - Close modal/reset UI for next project
   - Wait 2s before next iteration
4. After all keys captured → Show completion message

**DOM Selectors (AI Studio):**
- Create button: `[data-testid="create-api-key-button"]` or `button:contains("Create API key")`
- Project dropdown: `.project-selection-dropdown` or `[role="listbox"]`
- Project option: `.project-option:contains("{projectId}")` or `[role="option"]:contains("{projectId}")`
- Key display: `.api-key-value` or `[data-testid="api-key-display"]`
- Close button: `.modal-close-btn` or `button:contains("Close")`

**Error Handling:**
- Selector not found → Wait up to 10s, then fail gracefully
- Invalid key format → Log error, skip to next project
- Page structure changed → Abort automation, show manual instructions

### 3.3 Action 3: Extract & Export All Gemini API Keys

**Workflow:**
1. Collect all keys from state (`apiKeys` object)
2. Format output:
   ```
   # Gemini API Keys — Exported {ISO timestamp}
   gemini-auto-xxxx-1234: AIzaSy...
   gemini-auto-yyyy-5678: AIzaSy...
   ...
   ```
3. Provide export options via modal:
   - **📥 Download .txt**: Trigger `GM_download` with filename `gemini-keys-{date}.txt`
   - **📋 Copy to Clipboard**: Use `navigator.clipboard.writeText()`, show toast confirmation
   - **🪟 Show in Modal**: Render overlay with selectable text + close button

**Security:**
- Full keys only visible in export modal (explicit user action required)
- No keys logged to console or error messages
- Clipboard auto-clears after 60s (optional feature)

---

## 4. State Management

### 4.1 State Schema

```javascript
{
  projects: [
    { id: "gemini-auto-xxxx-1234", name: "gemini-auto-xxxx-1234", number: "123456789" }
  ],
  apiKeys: {
    "gemini-auto-xxxx-1234": "AIzaSy..."
  },
  logs: [
    { timestamp: "2026-03-15T16:15:23.456Z", message: "✅ Project 1/8 created", level: "info" }
  ]
}
```

### 4.2 State Operations

**Read:**
```javascript
const state = GM_getValue('GCP_GEMINI_SUITE_STATE', { projects: [], apiKeys: {}, logs: [] });
```

**Update:**
```javascript
Store.update(state => {
  state.projects.push({ id, name, number });
  state.logs.push({ timestamp: new Date().toISOString(), message, level });
});
```

**Persistence:**
- State saved to `GM_setValue` after every mutation
- Survives page refreshes and browser restarts
- Shared across GCP Console and AI Studio tabs

### 4.3 Cross-Tab Communication

**Scenario**: Main tab (GCP Console) triggers Action 2, AI Studio tab performs automation

**Mechanism:**
- AI Studio tab reads state via `GM_getValue` on page load
- AI Studio writes keys back via `GM_setValue` after each extraction
- Main tab polls for updates every 2s while Action 2 is active
- UI refreshes automatically when new keys detected

---

## 5. Authentication & Security

### 5.1 Token Interception

**Method**: Override `window.fetch` to capture Authorization headers

```javascript
const OriginalFetch = window.fetch;
window.fetch = async function(...args) {
  const options = args[1] || {};
  const authHeader = options.headers?.Authorization;
  if (authHeader?.startsWith('Bearer ')) {
    BEARER_TOKEN = authHeader.split(' ')[1];
  }
  return OriginalFetch.apply(this, args);
};
```

**Token Lifecycle:**
- Captured on first GCP API call in browser session
- Stored in memory only (never persisted to `GM_setValue`)
- Refreshed automatically if new token detected
- Cleared on page unload

### 5.2 Security Measures

**Token Protection:**
- Never log full tokens (mask to first 10 chars: `ya29.a0Aa...`)
- No token persistence across sessions
- Token cleared from memory on page unload

**API Key Protection:**
- Keys masked in UI: `AIza...xxxx` (first 4 + last 4 chars)
- Full keys only visible in export modal with explicit user action
- No keys in `console.log()` or error messages
- Clipboard export includes warning about sensitive data

**CORS & Permissions:**
- Explicitly declare all API domains in `@connect` directive
- Use `GM_xmlhttpRequest` for all cross-origin calls (bypasses CORS)
- No `eval()` or dynamic script injection
- Content Security Policy compliant

---

## 6. Error Handling & Recovery

### 6.1 Network Errors

**Strategy**: Retry with exponential backoff

**Implementation:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s
- Attempt 3: Wait 2s
- Attempt 4: Wait 4s
- After 4 failures: Show error, allow manual retry

**User Feedback:**
- Show "Network issue, retrying..." in log
- Display retry countdown in button text
- Provide "Retry Now" button to skip countdown

### 6.2 API Errors

**401 Unauthorized:**
- Message: "Authentication expired. Please refresh the page."
- Action: Disable all buttons, show refresh prompt

**429 Rate Limit:**
- Message: "Rate limit reached. Pausing for 60s..."
- Action: Show countdown timer, auto-resume when complete

**403 Forbidden:**
- Message: "Permission denied. Check IAM roles."
- Action: Show help link to GCP IAM documentation

**500 Server Error:**
- Message: "GCP server error. Try again later."
- Action: Log full error details, allow manual retry

### 6.3 DOM Automation Failures

**Selector Not Found:**
- Wait up to 10s with 500ms polling interval
- If still not found: Log error, show manual fallback instructions

**Unexpected Page Structure:**
- Detect via try-catch around DOM operations
- Log error with page URL and expected selector
- Abort automation to prevent infinite loops

**Manual Fallback:**
- Show step-by-step instructions in log
- Provide direct link to AI Studio API Keys page
- Offer to retry automation after user confirms page is ready

### 6.4 State Corruption

**Detection:**
- Validate state schema on load (check required keys exist)
- Verify data types (arrays are arrays, objects are objects)

**Recovery:**
- If invalid: Show confirmation dialog
- Export corrupted state to clipboard (for debugging)
- Reset to empty state: `{ projects: [], apiKeys: {}, logs: [] }`
- Log recovery action for user awareness

---

## 7. Mobile-Specific Optimizations

### 7.1 Touch Interactions

**Gesture Support:**
- Tap: Primary action (open sheet, press button)
- Long-press: Secondary action (show tooltip, copy log entry)
- Swipe down: Dismiss sheet
- Drag: Adjust sheet height
- Double-tap: Copy all logs

**Touch Feedback:**
- Visual: Ripple effect on tap, scale transform on press
- Haptic: 10ms pulse on button press, 50ms on sheet open/close
- Audio: Optional click sound (disabled by default)

### 7.2 Performance

**Rendering Optimizations:**
- Use `will-change: transform` on animated elements
- Debounce scroll events (300ms)
- Virtualize log list for 100+ entries (render only visible items)
- Use CSS transforms instead of position changes (GPU-accelerated)

**Network Optimizations:**
- Batch API calls where possible (not applicable for sequential project creation)
- Cache API responses for 5 minutes (operation status polling)
- Compress state before saving to `GM_setValue` (JSON.stringify)

### 7.3 Accessibility

**ARIA Attributes:**
- Bottom sheet: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="sheet-title"`
- Action buttons: `aria-label="Auto-create 8 projects and enable Gemini API"`
- Status log: `role="log"`, `aria-live="polite"`, `aria-atomic="false"`

**Keyboard Support:**
- Tab: Navigate between buttons
- Enter/Space: Activate focused button
- Escape: Close bottom sheet
- Arrow keys: Scroll log (when focused)

**Focus Management:**
- Trap focus within sheet when open
- Restore focus to bottom bar when sheet closes
- Visible focus indicators (2px blue outline)

### 7.4 Network Resilience

**Offline Detection:**
- Listen to `online`/`offline` events
- Show offline indicator in bottom bar
- Queue operations when offline, execute when back online

**Slow Connection Handling:**
- Show timeout warning after 5s (e.g., "Slow connection detected...")
- Increase timeout limits for mobile (30s → 60s)
- Allow user to cancel long-running operations

**Connection Quality Indicators:**
- Fast (< 1s response): Green indicator
- Moderate (1-3s): Yellow indicator
- Slow (> 3s): Red indicator + warning

---

## 8. Testing Strategy

### 8.1 Manual Testing Checklist

**UI/UX:**
- [ ] Bottom bar visible on GCP Console pages
- [ ] Bottom sheet opens/closes smoothly
- [ ] All buttons have 48x48px touch targets
- [ ] Text readable at 13-14px on mobile
- [ ] Haptic feedback works on supported devices
- [ ] Sheet height adjusts via drag handle
- [ ] Backdrop dismisses sheet on tap

**Functionality:**
- [ ] Action 1 creates 8 projects successfully
- [ ] Gemini API enabled on all projects
- [ ] Action 2 opens AI Studio in new tab
- [ ] Keys extracted and stored correctly
- [ ] Action 3 exports keys in all 3 formats
- [ ] State persists across page refreshes
- [ ] Cross-tab communication works (GCP ↔ AI Studio)

**Error Handling:**
- [ ] Network failure triggers retry logic
- [ ] 401 error shows refresh prompt
- [ ] 429 error pauses with countdown
- [ ] DOM selector failure shows manual instructions
- [ ] State corruption triggers recovery flow

**Security:**
- [ ] Tokens never logged in full
- [ ] Keys masked in UI (AIza...xxxx)
- [ ] No sensitive data in console
- [ ] Export modal requires explicit user action

### 8.2 Browser Compatibility

**Target**: Firefox Android 120+

**Known Limitations:**
- `navigator.vibrate()` may not work on all devices (graceful degradation)
- `GM_download` may require user confirmation on some Android versions
- Clipboard API requires HTTPS context (works on GCP Console)

### 8.3 Performance Benchmarks

**Target Metrics:**
- Sheet open animation: < 300ms
- Button press feedback: < 50ms
- Log entry render: < 16ms (60fps)
- State save operation: < 100ms
- API call latency: < 2s (network dependent)

---

## 9. Implementation Notes

### 9.1 File Structure

```
gcp-gemini-automation-suite/
├── src/
│   └── suite.user.js          # Main userscript (mobile-optimized)
├── docs/
│   ├── README.md              # User guide
│   ├── TESTING.md             # Testing instructions
│   └── superpowers/
│       └── specs/
│           └── 2026-03-15-gcp-gemini-automation-design.md  # This document
└── AGENTS.md                  # Multi-agent system roles
```

### 9.2 Code Organization

**Module Structure:**
- `Store`: State management (get, update, addLog)
- `GCP`: API client (fetch wrapper with auth)
- `Logic`: Automation workflows (action1, action2, action3)
- `UI`: Interface components (init, createBottomBar, createSheet)

**Naming Conventions:**
- Functions: camelCase (`createProject`, `enableAPI`)
- Constants: UPPER_SNAKE_CASE (`BEARER_TOKEN`, `API_BASE_URL`)
- CSS classes: kebab-case with prefix (`gemini-suite-panel`, `gemini-suite-btn`)

### 9.3 Dependencies

**None** - Pure vanilla JavaScript and CSS

**Tampermonkey APIs Used:**
- `GM_setValue` / `GM_getValue`: State persistence
- `GM_addStyle`: CSS injection
- `GM_xmlhttpRequest`: Cross-origin API calls
- `GM_download`: File export (Action 3)

### 9.4 Browser Permissions

**Tampermonkey Metadata:**
```javascript
// @match        https://console.cloud.google.com/*
// @match        https://aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      cloudresourcemanager.googleapis.com
// @connect      serviceusage.googleapis.com
// @run-at       document-start
```

---

## 10. Future Enhancements

### 10.1 Potential Features (Out of Scope for v2.0)

- **Batch Operations**: Create 16/32 projects in parallel
- **Project Templates**: Pre-configure project settings (billing, labels)
- **Key Rotation**: Auto-rotate keys on schedule
- **Usage Monitoring**: Track API quota consumption per project
- **Multi-Account Support**: Switch between GCP accounts
- **Dark/Light Theme**: User-selectable color schemes
- **Export Formats**: JSON, CSV, environment variables
- **Backup/Restore**: Export/import full state

### 10.2 Known Limitations

- **AI Studio Automation**: Fragile due to reliance on DOM selectors (Google may change UI)
- **Rate Limits**: GCP free tier limits project creation (5-10 per minute)
- **Mobile Performance**: Large log files (1000+ entries) may cause lag
- **Offline Mode**: Queued operations not implemented in v2.0

---

## 11. Acceptance Criteria

### 11.1 Functional Requirements

- [ ] Bottom bar appears within 1s on any `console.cloud.google.com` URL
- [ ] All 3 action buttons functional with clear loading states
- [ ] Projects created with valid, unique IDs following naming pattern
- [ ] Gemini API successfully enabled on each project
- [ ] API keys captured and all 3 export methods work
- [ ] Script survives page refreshes via `GM_setValue` state persistence
- [ ] Zero hardcoded credentials or tokens in source code

### 11.2 Mobile UX Requirements

- [ ] All touch targets minimum 48x48px
- [ ] Text readable at 13-14px on mobile screens
- [ ] Bottom sheet opens/closes with smooth animation (< 300ms)
- [ ] Haptic feedback on button press (if device supports)
- [ ] Sheet height adjustable via drag handle
- [ ] Backdrop dismisses sheet on tap/swipe

### 11.3 Performance Requirements

- [ ] Sheet animation maintains 60fps
- [ ] Button press feedback < 50ms
- [ ] State save operation < 100ms
- [ ] Log renders 100+ entries without lag (virtualized)

### 11.4 Security Requirements

- [ ] Tokens never logged in full (masked to 10 chars)
- [ ] Keys masked in UI (AIza...xxxx format)
- [ ] No sensitive data in console.log
- [ ] Export requires explicit user action

---

## 12. Revision History

| Version | Date       | Author          | Changes                                      |
|---------|------------|-----------------|----------------------------------------------|
| 1.0     | 2026-03-15 | Sisyphus/Claude | Initial desktop implementation               |
| 2.0     | 2026-03-15 | Sisyphus/Claude | Mobile-first redesign for Firefox Android    |

---

## 13. References

- [Google Cloud Resource Manager API v3](https://cloud.google.com/resource-manager/reference/rest/v3/projects)
- [Google Service Usage API](https://cloud.google.com/service-usage/docs/reference/rest)
- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
- [Material Design - Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview)
- [WCAG 2.1 Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
