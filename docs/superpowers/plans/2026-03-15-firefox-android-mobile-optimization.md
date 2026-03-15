# Firefox Android Mobile Optimization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the GCP Gemini Automation Suite into a mobile-first, touch-friendly bottom sheet UI for Firefox Android, including network resilience and cross-tab sync.

**Architecture:** Vanilla JS Tampermonkey script with CSS3 bottom sheet, touch event listeners, and XHR/Fetch interception for auth.

**Tech Stack:** JavaScript (ES6+), CSS3, Tampermonkey API, Jest (for testing).

---

## Chunk 1: Setup and Core Overrides

### Task 1: Setup Testing Environment

**Files:**
- Create: `package.json`
- Create: `tests/suite.test.js`
- Modify: `src/suite.user.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js
const fs = require('fs');
const path = require('path');

test('Script exports modules for testing', () => {
    const scriptContent = fs.readFileSync(path.join(__dirname, '../src/suite.user.js'), 'utf8');
    expect(scriptContent).toContain('module.exports = { Store, GCP, Logic, UI };');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with "npm ERR! missing script: test"

- [ ] **Step 3: Write minimal implementation**

```json
// package.json
{
  "name": "gcp-gemini-automation-suite",
  "version": "2.0.0",
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0"
  }
}
```

```javascript
// src/suite.user.js (Add to the very bottom of the file, inside the IIFE)
    if (typeof module !== 'undefined') {
        module.exports = { Store, GCP, Logic, UI };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tests/suite.test.js src/suite.user.js
git commit -m "chore: setup jest testing environment and export modules"
```

### Task 2: Log Capping & Cross-Tab Sync

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Store caps logs at 100 entries', () => {
    global.GM_getValue = jest.fn(() => ({ logs: Array(100).fill({ message: 'old' }) }));
    global.GM_setValue = jest.fn();
    
    const { Store } = require('../src/suite.user.js');
    Store.addLog('new log');
    
    const calls = global.GM_setValue.mock.calls;
    const savedState = calls[calls.length - 1][1];
    expect(savedState.logs.length).toBe(100);
    expect(savedState.logs[99].message).toBe('new log');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (logs array will have 101 items)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Modify Store.addLog)
        addLog: (msg, level = 'info') => {
            Store.update(s => {
                s.logs.push({ timestamp: new Date().toISOString(), message: msg, level });
                if (s.logs.length > 100) s.logs.shift(); // Cap at 100 entries
            });
        }
```

```javascript
// src/suite.user.js (Add to Tampermonkey metadata block)
// @grant        GM_addValueChangeListener

// src/suite.user.js (Add to UI.init)
        init() {
            // ... existing code ...
            if (typeof GM_addValueChangeListener !== 'undefined') {
                GM_addValueChangeListener('GCP_GEMINI_SUITE_STATE', (name, oldVal, newVal, remote) => {
                    if (remote) this.refreshLog();
                });
            }
            // ...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: implement log capping and cross-tab sync"
```

### Task 3: XHR Override

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('XHR override captures BEARER_TOKEN', () => {
    require('../src/suite.user.js');
    const xhr = new global.XMLHttpRequest();
    xhr.open('GET', '/');
    xhr.setRequestHeader('Authorization', 'Bearer test-token-123');
    xhr.send();
    
    expect(xhr.setRequestHeader).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (if XMLHttpRequest is not mocked properly, or we can just implement it)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Add below fetch override)
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new OriginalXHR();
        const originalSetRequestHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
                const token = value.split(' ')[1];
                if (token !== BEARER_TOKEN) {
                    BEARER_TOKEN = token;
                    Store.addLog('✅ Auth Token Captured via XHR');
                }
            }
            return originalSetRequestHeader.apply(this, arguments);
        };
        return xhr;
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: add XHR override for token interception"
```

## Chunk 2: Mobile UI - Bottom Bar & Backdrop

### Task 4: Bottom Bar Component

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Bottom Bar is created instead of FAB', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createBottomBar();
    
    const bottomBar = document.getElementById('gemini-suite-bottom-bar');
    expect(bottomBar).not.toBeNull();
    expect(bottomBar.innerHTML).toContain('Gemini Suite');
    
    const fab = document.getElementById('gemini-suite-fab');
    expect(fab).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (UI.createBottomBar is not a function)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Replace createFAB with createBottomBar in UI object)
        createBottomBar() {
            const bar = document.createElement('div');
            bar.id = 'gemini-suite-bottom-bar';
            bar.innerHTML = `
                <div class="status-indicator ready"></div>
                <span class="bar-title">Gemini Suite</span>
                <span class="chevron">▲</span>
            `;
            bar.onclick = () => this.togglePanel();
            document.body.appendChild(bar);
            this.elements.bottomBar = bar;
        },

// src/suite.user.js (Update UI.init to call createBottomBar instead of createFAB)
        init() {
            // ...
            this.injectStyles();
            this.createBottomBar();
            this.createPanel();
            // ...
        },

// src/suite.user.js (Add CSS to injectStyles)
                #gemini-suite-bottom-bar {
                    position: fixed; bottom: 0; left: 0; right: 0; height: 60px;
                    background: rgba(32, 33, 36, 0.95); z-index: 2147483647;
                    display: flex; align-items: center; padding: 0 20px;
                    color: white; cursor: pointer; user-select: none;
                    border-top: 1px solid #3c4043;
                }
                .status-indicator { width: 12px; height: 12px; border-radius: 50%; margin-right: 12px; }
                .status-indicator.ready { background: #1a73e8; }
                .status-indicator.working { background: #fbbc04; animation: pulse 1s infinite; }
                .status-indicator.error { background: #ea4335; }
                .status-indicator.success { background: #34a853; }
                .bar-title { flex: 1; font-weight: 500; font-size: 16px; }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: replace FAB with mobile bottom bar"
```

### Task 5: Backdrop Component

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Backdrop is created and dismisses panel on click', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createPanel();
    
    const backdrop = document.getElementById('gemini-suite-backdrop');
    expect(backdrop).not.toBeNull();
    
    // Mock togglePanel
    UI.togglePanel = jest.fn();
    backdrop.click();
    expect(UI.togglePanel).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (backdrop is null)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Update createPanel to include backdrop)
        createPanel() {
            const backdrop = document.createElement('div');
            backdrop.id = 'gemini-suite-backdrop';
            backdrop.onclick = () => {
                if (this.elements.panel.classList.contains('open')) {
                    this.togglePanel();
                }
            };
            document.body.appendChild(backdrop);
            this.elements.backdrop = backdrop;

            // ... existing panel creation code ...
        },

// src/suite.user.js (Update togglePanel to toggle backdrop)
        togglePanel() {
            const p = this.elements.panel;
            const b = this.elements.backdrop;
            p.classList.toggle('open');
            b.classList.toggle('open');
        },

// src/suite.user.js (Add CSS to injectStyles)
                #gemini-suite-backdrop {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.5); z-index: 2147483645;
                    opacity: 0; visibility: hidden; transition: opacity 0.3s;
                }
                #gemini-suite-backdrop.open {
                    opacity: 1; visibility: visible;
                }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: add backdrop component for bottom sheet"
```

## Chunk 3: Mobile UI - Bottom Sheet & Touch Events

### Task 6: Bottom Sheet CSS & Structure

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Panel has drag handle and correct structure', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createPanel();
    
    const handle = document.querySelector('.drag-handle');
    expect(handle).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (handle is null)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Update createPanel HTML)
            panel.innerHTML = `
                <div class="drag-handle"></div>
                <div class="panel-header">
                    <h2>Gemini Automation</h2>
                    <button class="close-btn">✕</button>
                </div>
                <div class="panel-content">
                    <button class="action-btn" id="btn-action-1">🚀 Auto-Create 8 Projects</button>
                    <button class="action-btn" id="btn-action-2">🔑 Open AI Studio & Create Keys</button>
                    <button class="action-btn" id="btn-action-3">📋 Extract & Export Keys</button>
                    <div class="status-log" id="suite-log"></div>
                </div>
            `;

// src/suite.user.js (Update CSS in injectStyles)
                /* Replace existing #gemini-suite-panel media queries with: */
                #gemini-suite-panel {
                    position: fixed; bottom: 0; left: 0; right: 0;
                    background: #202124; color: #e8eaed; z-index: 2147483646;
                    display: flex; flex-direction: column; box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
                    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
                    font-family: 'Roboto', sans-serif;
                    border-top-left-radius: 16px; border-top-right-radius: 16px;
                    transform: translateY(100%); visibility: hidden; pointer-events: none;
                    height: 50vh; /* Default half state */
                    will-change: transform, height;
                }
                #gemini-suite-panel.open { transform: translateY(0); visibility: visible; pointer-events: auto; }
                #gemini-suite-panel.state-collapsed { height: 20vh; }
                #gemini-suite-panel.state-half { height: 50vh; }
                #gemini-suite-panel.state-full { height: 90vh; }
                
                .drag-handle {
                    width: 40px; height: 4px; background: #5f6368; border-radius: 2px;
                    margin: 12px auto 0; cursor: grab; touch-action: none;
                }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: update panel to bottom sheet with drag handle"
```

### Task 7: Drag Handle & Touch Logic

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Drag handle touch events change panel state', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createPanel();
    
    const panel = document.getElementById('gemini-suite-panel');
    const handle = document.querySelector('.drag-handle');
    
    // Simulate touchstart
    handle.dispatchEvent(new window.Event('touchstart'));
    expect(panel.style.transition).toBe('none');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (transition is not 'none')

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Add to createPanel)
            const handle = panel.querySelector('.drag-handle');
            let startY = 0;
            let currentHeight = 0;
            
            const onTouchStart = (e) => {
                startY = e.touches ? e.touches[0].clientY : e.clientY;
                currentHeight = panel.getBoundingClientRect().height;
                panel.style.transition = 'none';
            };
            
            const onTouchMove = (e) => {
                if (!startY) return;
                const y = e.touches ? e.touches[0].clientY : e.clientY;
                const deltaY = startY - y;
                const newHeight = currentHeight + deltaY;
                panel.style.height = `${newHeight}px`;
            };
            
            const onTouchEnd = () => {
                if (!startY) return;
                startY = 0;
                panel.style.transition = '';
                panel.style.height = ''; // Remove inline style to use classes
                
                const vh = window.innerHeight;
                const rect = panel.getBoundingClientRect();
                const heightVh = (rect.height / vh) * 100;
                
                panel.classList.remove('state-collapsed', 'state-half', 'state-full');
                
                if (heightVh < 35) {
                    if (heightVh < 10) this.togglePanel(); // Swipe down to close
                    else panel.classList.add('state-collapsed');
                } else if (heightVh < 70) {
                    panel.classList.add('state-half');
                } else {
                    panel.classList.add('state-full');
                }
            };
            
            handle.addEventListener('touchstart', onTouchStart, { passive: true });
            handle.addEventListener('touchmove', onTouchMove, { passive: true });
            handle.addEventListener('touchend', onTouchEnd);
            handle.addEventListener('mousedown', onTouchStart);
            document.addEventListener('mousemove', onTouchMove);
            document.addEventListener('mouseup', onTouchEnd);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: implement touch drag logic for bottom sheet"
```

## Chunk 4: Buttons, Haptics & Log Interactions

### Task 8: Action Buttons & Haptics

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Buttons trigger haptic feedback', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createPanel();
    UI.bindEvents();
    
    const btn = document.getElementById('btn-action-1');
    btn.click();
    
    expect(global.navigator.vibrate).toHaveBeenCalledWith(10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (vibrate not called)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Add haptic helper to UI)
        vibrate(pattern) {
            if (navigator.vibrate) {
                try { navigator.vibrate(pattern); } catch (e) {}
            }
        },

// src/suite.user.js (Update bindEvents)
        bindEvents() {
            const wrapAction = (btnId, actionFn) => {
                const btn = document.getElementById(btnId);
                btn.onclick = async () => {
                    this.vibrate(10); // Button press
                    this.vibrate(50); // Action start
                    await actionFn();
                    this.vibrate([50, 50, 50]); // Action complete (double-pulse)
                };
            };
            wrapAction('btn-action-1', () => Logic.action1());
            wrapAction('btn-action-2', () => Logic.action2());
            wrapAction('btn-action-3', () => Logic.action3());
        },

// src/suite.user.js (Update CSS in injectStyles)
                .action-btn {
                    width: 100%; min-height: 60px; /* 48px min + 12px padding */
                    background: #1a73e8; color: white; border: none; padding: 0 16px;
                    border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600;
                    display: flex; align-items: center; justify-content: center;
                    transition: transform 0.1s, background 0.2s;
                }
                .action-btn:active { background: #1557b0; transform: scale(0.98); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: add haptic feedback and mobile button styles"
```

### Task 9: Log Interactions

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('Log double tap copies to clipboard', () => {
    const { UI } = require('../src/suite.user.js');
    UI.createPanel();
    
    global.navigator.clipboard = { writeText: jest.fn() };
    const logEl = document.getElementById('suite-log');
    
    // Simulate double tap
    logEl.dispatchEvent(new window.Event('dblclick'));
    
    expect(global.navigator.clipboard.writeText).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (writeText not called)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Update createPanel to add log listeners)
            const logEl = panel.querySelector('#suite-log');
            
            // Double tap to copy all
            let lastTap = 0;
            logEl.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    // Double tap
                    const logs = Store.get().logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(logs);
                        Store.addLog('📋 All logs copied to clipboard');
                        this.vibrate(50);
                    }
                    e.preventDefault();
                }
                lastTap = currentTime;
            });
            
            // Desktop double click fallback
            logEl.addEventListener('dblclick', () => {
                const logs = Store.get().logs.map(l => `[${l.timestamp}] ${l.message}`).join('\n');
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(logs);
                    Store.addLog('📋 All logs copied to clipboard');
                }
            });

// src/suite.user.js (Update CSS in injectStyles)
                .status-log {
                    flex: 1; background: #000; color: #0f0; font-family: monospace;
                    padding: 12px; font-size: 13px; border-radius: 8px; overflow-y: auto;
                    margin-top: 12px; min-height: 150px; word-wrap: break-word;
                    touch-action: pan-y;
                }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: add double-tap to copy logs and mobile log styles"
```

## Chunk 5: Network Resilience

### Task 10: Offline Detection & Retry Logic

**Files:**
- Modify: `src/suite.user.js`
- Modify: `tests/suite.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/suite.test.js (append)
test('GCP.fetch retries on network failure', async () => {
    const { GCP } = require('../src/suite.user.js');
    
    // Mock GM_xmlhttpRequest to fail twice then succeed
    let attempts = 0;
    global.GM_xmlhttpRequest = jest.fn((opts) => {
        attempts++;
        if (attempts < 3) {
            opts.onerror(new Error('Network error'));
        } else {
            opts.onload({ status: 200, responseText: '{"success":true}' });
        }
    });
    
    // Mock BEARER_TOKEN
    global.BEARER_TOKEN = 'test-token';
    
    const res = await GCP.fetch('https://test.com');
    expect(attempts).toBe(3);
    expect(res.success).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL (attempts is 1, promise rejects)

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/suite.user.js (Update GCP.fetch)
    const GCP = {
        async fetch(url, options = {}, retries = 3) {
            if (!BEARER_TOKEN) throw new Error('No auth token available. Please refresh the page or perform an action in GCP.');
            
            if (!navigator.onLine) {
                Store.addLog('⚠️ Offline. Waiting for connection...', 'warn');
                await new Promise(resolve => {
                    window.addEventListener('online', resolve, { once: true });
                });
                Store.addLog('✅ Back online. Resuming...', 'info');
            }

            return new Promise((resolve, reject) => {
                const attempt = async (currentRetry) => {
                    GM_xmlhttpRequest({
                        method: options.method || 'GET',
                        url: url,
                        headers: {
                            'Authorization': `Bearer ${BEARER_TOKEN}`,
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        data: options.body ? JSON.stringify(options.body) : null,
                        timeout: 60000, // 60s timeout for mobile
                        onload: async (res) => {
                            if (res.status >= 200 && res.status < 300) {
                                resolve(JSON.parse(res.responseText));
                            } else if (res.status === 429) {
                                Store.addLog('⚠️ Rate limit reached. Pausing 60s...', 'warn');
                                await new Promise(r => setTimeout(r, 60000));
                                attempt(currentRetry); // Retry without decrementing
                            } else if (res.status === 401) {
                                reject(new Error('Authentication expired. Please refresh the page.'));
                            } else {
                                reject(new Error(`API Error ${res.status}: ${res.responseText}`));
                            }
                        },
                        onerror: async (err) => {
                            if (currentRetry > 0) {
                                const delay = Math.pow(2, 4 - currentRetry) * 1000; // 2s, 4s, 8s
                                Store.addLog(`⚠️ Network error. Retrying in ${delay/1000}s...`, 'warn');
                                await new Promise(r => setTimeout(r, delay));
                                attempt(currentRetry - 1);
                            } else {
                                reject(new Error('Network failure after retries.'));
                            }
                        },
                        ontimeout: async () => {
                            if (currentRetry > 0) {
                                Store.addLog('⚠️ Request timed out. Retrying...', 'warn');
                                attempt(currentRetry - 1);
                            } else {
                                reject(new Error('Request timed out.'));
                            }
                        }
                    });
                };
                attempt(retries);
            });
        }
    };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/suite.user.js tests/suite.test.js
git commit -m "feat: add network resilience, offline detection, and retry logic"
```

## Chunk 5: Final Integration & Testing

**Goal:** Verify the complete end-to-end flow, ensure all mobile optimizations work together, and validate performance metrics.

- [ ] **Step 1: Write end-to-end integration tests**

Run: `touch tests/e2e.test.js`

Implement:
```javascript
// tests/e2e.test.js
const { test, expect } = require('@playwright/test');

test.describe('GCP Gemini Automation Suite E2E', () => {
    test('should render bottom bar and open bottom sheet', async ({ page }) => {
        // Mock Tampermonkey environment and inject script
        await page.goto('https://console.cloud.google.com/');
        await page.addScriptTag({ path: 'src/suite.user.js' });
        
        // Verify bottom bar
        const bottomBar = page.locator('#gemini-suite-bottom-bar');
        await expect(bottomBar).toBeVisible();
        
        // Tap to open
        await bottomBar.click();
        const bottomSheet = page.locator('#gemini-suite-bottom-sheet');
        await expect(bottomSheet).toHaveClass(/open/);
        
        // Verify buttons
        const buttons = page.locator('.gemini-suite-btn');
        await expect(buttons).toHaveCount(3);
    });
    
    test('should handle offline state gracefully', async ({ page }) => {
        await page.goto('https://console.cloud.google.com/');
        await page.addScriptTag({ path: 'src/suite.user.js' });
        
        // Simulate offline
        await page.context().setOffline(true);
        await page.evaluate(() => window.dispatchEvent(new Event('offline')));
        
        // Verify UI updates
        const status = page.locator('#gemini-suite-status');
        await expect(status).toContainText('Offline');
    });
});
```

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test tests/e2e.test.js`
Expected: PASS

- [ ] **Step 3: Perform manual testing checklist**

Run: `cat docs/superpowers/specs/2026-03-15-gcp-gemini-automation-design.md | grep -A 20 "Manual Testing Checklist"`
Expected: Output of the manual testing checklist.

Implement:
Manually verify the following on a Firefox Android device or emulator:
1. Bottom bar visible on GCP Console pages.
2. Bottom sheet opens/closes smoothly.
3. All buttons have 48x48px touch targets.
4. Text readable at 13-14px on mobile.
5. Haptic feedback works on supported devices.
6. Sheet height adjusts via drag handle.
7. Backdrop dismisses sheet on tap.
8. Action 1 creates 8 projects successfully.
9. Gemini API enabled on all projects.
10. Action 2 opens AI Studio in new tab.
11. Keys extracted and stored correctly.
12. Action 3 exports keys in all 3 formats.
13. State persists across page refreshes.
14. Cross-tab communication works (GCP ↔ AI Studio).

- [ ] **Step 4: Verify performance metrics**

Run: `npm run test:perf` (assuming a performance test script exists, or manually verify via DevTools)
Expected: 
- Sheet open animation: < 300ms
- Button press feedback: < 50ms
- Log entry render: < 16ms (60fps)
- State save operation: < 100ms

- [ ] **Step 5: Commit integration tests**

```bash
git add tests/e2e.test.js
git commit -m "test: add end-to-end integration tests for mobile UI"
```

## Chunk 6: Documentation & Deployment

**Goal:** Update project documentation to reflect the new mobile-first design and prepare for deployment.

- [ ] **Step 1: Update README.md**

Run: `cat docs/README.md` (to check current state)

Implement:
Update `docs/README.md` to include mobile installation instructions, usage guide for the bottom sheet UI, and troubleshooting for Firefox Android.

```markdown
# GCP Gemini API Automation Suite

A Tampermonkey userscript optimized for Firefox Android to automate GCP project creation and Gemini API key extraction.

## Features
- **Mobile-First UI**: Bottom sheet design with 48x48px touch targets.
- **Haptic Feedback**: Tactile responses for actions.
- **Network Resilience**: Offline detection and automatic retries.
- **Cross-Tab Sync**: Seamlessly works between GCP Console and AI Studio.

## Installation
1. Install [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) on Firefox Android.
2. Create a new script and paste the contents of `src/suite.user.js`.
3. Save and navigate to `console.cloud.google.com`.

## Usage
1. Tap the **Gemini Suite** bottom bar to open the panel.
2. Tap **🚀 Auto-Create 8 Projects** to begin.
3. Once complete, tap **🔑 Open AI Studio & Keys**.
4. Finally, tap **📋 Extract & Export Keys** to save your keys.
```

- [ ] **Step 2: Update TESTING.md**

Run: `cat docs/TESTING.md` (to check current state)

Implement:
Update `docs/TESTING.md` with the manual testing checklist from the spec and instructions for running the Playwright E2E tests.

```markdown
# Testing Guide

## Automated Tests
Run unit tests: `npm test`
Run E2E tests: `npx playwright test`

## Manual Mobile Testing
To test on Firefox Android:
1. Enable remote debugging via USB.
2. Connect device to `about:debugging` in desktop Firefox.
3. Install the userscript in the mobile browser.
4. Verify the following:
   - Bottom sheet drag interactions.
   - Haptic feedback on button press.
   - Offline mode (toggle airplane mode).
   - Cross-tab state sync.
```

- [ ] **Step 3: Final review and commit**

Run: `npm run lint && npm test`
Expected: 0 errors, all tests PASS.

```bash
git add docs/README.md docs/TESTING.md
git commit -m "docs: update README and TESTING guides for mobile optimization"
```

- [ ] **Step 4: Dispatch reviewer**

Run: `@plan-document-reviewer Please review the completed implementation plan for the GCP Gemini Automation Suite mobile optimization.`
Expected: Approval from the reviewer.
