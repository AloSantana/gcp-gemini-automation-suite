// ==UserScript==
// @name         GCP Gemini API Key Automation Suite
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automates project creation and Gemini API key extraction for GCP/AI Studio.
// @author       Sisyphus/Claude
// @match        *://*.console.cloud.google.com/*
// @match        *://*.aistudio.google.com/*
// @match        *://console.cloud.google.com/*
// @match        *://aistudio.google.com/*
// @include      *://console.cloud.google.com/*
// @include      *://aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @connect      cloudresourcemanager.googleapis.com
// @connect      serviceusage.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- State Management ---
    const Store = {
        get: () => GM_getValue('GCP_GEMINI_SUITE_STATE', { projects: [], apiKeys: {}, logs: [] }),
        update: (fn) => {
            const state = Store.get();
            fn(state);
            GM_setValue('GCP_GEMINI_SUITE_STATE', state);
            UI.refreshLog();
        },
        addLog: (msg, level = 'info') => {
            Store.update(s => s.logs.push({ timestamp: new Date().toISOString(), message: msg, level }));
        }
    };

    // --- Auth Interception ---
    let BEARER_TOKEN = null;
    const OriginalFetch = window.fetch;
    window.fetch = async function(...args) {
        const url = args[0]?.toString() || '';
        const options = args[1] || {};
        
        const authHeader = options.headers?.Authorization || options.headers?.get?.('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token !== BEARER_TOKEN) {
                BEARER_TOKEN = token;
                Store.addLog('✅ Auth Token Captured/Refreshed');
            }
        }
        return OriginalFetch.apply(this, args);
    };

    // --- API Client ---
    const GCP = {
        async fetch(url, options = {}) {
            if (!BEARER_TOKEN) throw new Error('No auth token available. Please refresh the page or perform an action in GCP.');
            
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    data: options.body ? JSON.stringify(options.body) : null,
                    onload: (res) => {
                        if (res.status >= 200 && res.status < 300) {
                            resolve(JSON.parse(res.responseText));
                        } else {
                            reject(new Error(`API Error ${res.status}: ${res.responseText}`));
                        }
                    },
                    onerror: (err) => reject(err)
                });
            });
        }
    };

    // --- Automation Logic ---
    const Logic = {
        async action1() {
            UI.setLoading('btn-action-1', true);
            Store.addLog('🚀 Starting Action 1: Create 8 Projects');
            
            try {
                for (let i = 1; i <= 8; i++) {
                    const randomId = Math.random().toString(36).substring(2, 6);
                    const projectId = `gemini-auto-${randomId}-${Math.floor(1000 + Math.random() * 9000)}`;
                    const displayName = projectId;

                    Store.addLog(`Creating project ${i}/8: ${projectId}...`);
                    
                    const createRes = await GCP.fetch('https://cloudresourcemanager.googleapis.com/v3/projects', {
                        method: 'POST',
                        body: { projectId, displayName }
                    });

                    const operationId = createRes.name;
                    await this.pollOperation(operationId);
                    
                    Store.addLog(`✅ Project ${projectId} created. Enabling Gemini API...`);
                    
                    await GCP.fetch(`https://serviceusage.googleapis.com/v1/projects/${projectId}/services/generativelanguage.googleapis.com:enable`, {
                        method: 'POST'
                    });

                    Store.update(s => s.projects.push({ id: projectId, name: displayName }));
                    Store.addLog(`✨ Project ${i}/8 Complete.`);
                    
                    await new Promise(r => setTimeout(r, 3000));
                }
                Store.addLog('🎉 Action 1 Finished Successfully!');
            } catch (err) {
                Store.addLog(`❌ Action 1 Failed: ${err.message}`, 'error');
            } finally {
                UI.setLoading('btn-action-1', false);
            }
        },

        async pollOperation(name) {
            let done = false;
            let attempts = 0;
            while (!done && attempts < 15) {
                const res = await GCP.fetch(`https://cloudresourcemanager.googleapis.com/v3/${name}`);
                if (res.done) {
                    if (res.error) throw new Error(res.error.message);
                    done = true;
                } else {
                    attempts++;
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            if (!done) throw new Error('Project creation timed out.');
        },

        action2() {
            Store.addLog('🔑 Opening AI Studio...');
            window.open('https://aistudio.google.com/app/apikey', '_blank');
        },

        async action3() {
            const state = Store.get();
            const keys = Object.entries(state.apiKeys);
            if (keys.length === 0) {
                Store.addLog('⚠️ No keys found to export.', 'warn');
                return;
            }

            const output = `# Gemini API Keys — Exported ${new Date().toISOString()}\n` + 
                           keys.map(([id, key]) => `${id}: ${key}`).join('\n');
            
            try {
                await navigator.clipboard.writeText(output);
                Store.addLog('📋 Keys copied to clipboard!');
                alert('Keys copied to clipboard:\n\n' + output);
            } catch (err) {
                Store.addLog('❌ Clipboard failed. Showing in log.', 'error');
                console.log(output);
            }
        }
    };

    // --- UI Implementation (Shadow DOM Enhanced) ---
    const UI = {
        root: null,
        shadow: null,
        elements: {},
        
        init() {
            // Very aggressive body check
            const inject = () => {
                if (document.getElementById('gemini-suite-root')) return;
                if (!document.body) {
                    requestAnimationFrame(inject);
                    return;
                }
                
                this.createRoot();
                this.injectStyles();
                this.createFAB();
                this.createPanel();
                this.bindEvents();
                Store.addLog('Suite Initialized');
                
                // Always auto-open on console.cloud.google.com
                if (location.host.includes('console.cloud.google.com')) {
                    setTimeout(() => this.togglePanel(), 500);
                }

                if (location.host === 'aistudio.google.com') {
                    this.handleAIStudio();
                }
            };
            inject();
        },

        createRoot() {
            const root = document.createElement('div');
            root.id = 'gemini-suite-root';
            document.body.appendChild(root);
            this.root = root;
            this.shadow = root.attachShadow({ mode: 'open' });
        },

        bindEvents() {
            this.shadow.getElementById('btn-action-1').onclick = () => Logic.action1();
            this.shadow.getElementById('btn-action-2').onclick = () => Logic.action2();
            this.shadow.getElementById('btn-action-3').onclick = () => Logic.action3();
        },

        setLoading(btnId, isLoading) {
            const btn = this.shadow.getElementById(btnId);
            if (btn) {
                btn.disabled = isLoading;
                btn.innerText = isLoading ? '⏳ Processing...' : btn.getAttribute('data-original-text') || btn.innerText;
                if (!btn.getAttribute('data-original-text')) btn.setAttribute('data-original-text', btn.innerText);
            }
        },

        async handleAIStudio() {
            const state = Store.get();
            const pending = state.projects.filter(p => !state.apiKeys[p.id]);
            if (pending.length === 0) return;

            Store.addLog(`🤖 AI Studio: Found ${pending.length} pending projects. Starting automation...`);
            
            for (const project of pending) {
                try {
                    Store.addLog(`🔑 Creating key for ${project.id}...`);
                    
                    const createBtn = await this.waitForElement('[data-testid="create-api-key-button"], button:contains("Create API key")');
                    createBtn.click();
                    
                    const dropdown = await this.waitForElement('.project-selection-dropdown, [role="listbox"]');
                    dropdown.click();
                    
                    const projectOption = await this.waitForElement(`.project-option:contains("${project.id}"), [role="option"]:contains("${project.id}")`);
                    projectOption.click();
                    
                    const keyElement = await this.waitForElement('.api-key-value, [data-testid="api-key-display"]', 10000);
                    const apiKey = keyElement.innerText.trim();
                    
                    if (apiKey.startsWith('AIza')) {
                        Store.update(s => s.apiKeys[project.id] = apiKey);
                        Store.addLog(`✅ Key captured for ${project.id}`);
                    } else {
                        throw new Error('Invalid key format detected.');
                    }
                    
                    const closeBtn = document.querySelector('.modal-close-btn, button:contains("Close")');
                    if (closeBtn) closeBtn.click();
                    
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    Store.addLog(`❌ AI Studio Error (${project.id}): ${err.message}`, 'error');
                    break;
                }
            }
            Store.addLog('🏁 AI Studio Automation Finished.');
        },

        async waitForElement(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const check = () => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    
                    if (selector.includes(':contains')) {
                        const [base, text] = selector.split(':contains("');
                        const cleanText = text.replace('")', '');
                        const candidates = document.querySelectorAll(base || '*');
                        for (const c of candidates) {
                            if (c.innerText.includes(cleanText)) return resolve(c);
                        }
                    }

                    if (Date.now() - start > timeout) reject(new Error(`Timeout waiting for ${selector}`));
                    else requestAnimationFrame(check);
                };
                check();
            });
        },

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #gemini-suite-fab {
                    position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
                    background: #1a73e8; border-radius: 50%; display: flex; align-items: center;
                    justify-content: center; color: white; cursor: pointer; z-index: 2147483647;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 24px; user-select: none;
                    touch-action: none; transition: transform 0.2s;
                }
                #gemini-suite-fab:active { transform: scale(0.95); }
                
                #gemini-suite-panel {
                    position: fixed; background: #202124; color: #e8eaed; z-index: 2147483646;
                    display: flex; flex-direction: column; box-shadow: 0 -4px 20px rgba(0,0,0,0.5);
                    transition: transform 0.3s ease-in-out; font-family: 'Roboto', sans-serif;
                    visibility: hidden; pointer-events: none;
                }
                
                @media (max-width: 768px) {
                    #gemini-suite-panel {
                        bottom: 0; left: 0; right: 0; height: 70vh;
                        border-top-left-radius: 16px; border-top-right-radius: 16px;
                        transform: translateY(100%);
                    }
                    #gemini-suite-panel.open { transform: translateY(0); visibility: visible; pointer-events: auto; }
                }
                
                @media (min-width: 769px) {
                    #gemini-suite-panel {
                        top: 0; right: 0; bottom: 0; width: 400px;
                        border-left: 1px solid #3c4043;
                        transform: translateX(100%);
                    }
                    #gemini-suite-panel.open { transform: translateX(0); visibility: visible; pointer-events: auto; }
                }
                
                .panel-header { padding: 16px; border-bottom: 1px solid #3c4043; display: flex; justify-content: space-between; align-items: center; }
                .panel-header h2 { margin: 0; font-size: 18px; color: #fff; }
                .panel-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
                .status-log { flex: 1; background: #000; color: #0f0; font-family: monospace; padding: 8px; font-size: 12px; border-radius: 4px; overflow-y: auto; margin-top: 12px; min-height: 150px; word-wrap: break-word; line-height: 1.4; }
                .action-btn { background: #1a73e8; color: white; border: none; padding: 0 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; min-height: 48px; display: flex; align-items: center; justify-content: center; }
                .action-btn:active { background: #1557b0; }
                .action-btn:disabled { background: #3c4043; cursor: not-allowed; }
                .close-btn { cursor: pointer; font-size: 24px; min-width: 48px; min-height: 48px; display: flex; align-items: center; justify-content: center; background: none; border: none; color: #e8eaed; }
            `;
            this.shadow.appendChild(style);
        },

        createFAB() {
            const fab = document.createElement('div');
            fab.id = 'gemini-suite-fab';
            fab.innerHTML = '💎';
            
            let isDragging = false;
            let isMoved = false;
            let startX, startY, initialLeft, initialTop;

            const dragStart = (e) => {
                if (e.target !== fab) return;
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
                
                const rect = fab.getBoundingClientRect();
                startX = clientX;
                startY = clientY;
                initialLeft = rect.left;
                initialTop = rect.top;
                isDragging = true;
                isMoved = false;
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                fab.style.left = initialLeft + 'px';
                fab.style.top = initialTop + 'px';
            };

            const dragEnd = () => {
                if (!isDragging) return;
                isDragging = false;
                if (!isMoved) {
                    this.togglePanel();
                }
            };

            const drag = (e) => {
                if (!isDragging) return;
                const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                
                const dx = clientX - startX;
                const dy = clientY - startY;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    isMoved = true;
                }
                if (isMoved) {
                    e.preventDefault();
                    const x = Math.min(Math.max(0, initialLeft + dx), window.innerWidth - 56);
                    const y = Math.min(Math.max(0, initialTop + dy), window.innerHeight - 56);
                    fab.style.left = x + 'px';
                    fab.style.top = y + 'px';
                }
            };

            fab.addEventListener('touchstart', dragStart, { passive: false });
            fab.addEventListener('touchend', dragEnd, { passive: false });
            fab.addEventListener('touchmove', drag, { passive: false });
            fab.addEventListener('mousedown', dragStart, { passive: false });
            window.addEventListener('mouseup', dragEnd, { passive: false });
            window.addEventListener('mousemove', drag, { passive: false });
            
            this.shadow.appendChild(fab);
            this.elements.fab = fab;
        },

        createPanel() {
            const panel = document.createElement('div');
            panel.id = 'gemini-suite-panel';
            panel.innerHTML = `
                <div class="panel-header">
                    <h2>Gemini Automation</h2>
                    <button class="close-btn" id="panel-close-btn">✕</button>
                </div>
                <div class="panel-content">
                    <button class="action-btn" id="btn-action-1">🚀 Auto-Create 8 Projects</button>
                    <button class="action-btn" id="btn-action-2">🔑 Open AI Studio & Create Keys</button>
                    <button class="action-btn" id="btn-action-3">📋 Extract & Export Keys</button>
                    <div class="status-log" id="suite-log"></div>
                </div>
            `;
            this.shadow.appendChild(panel);
            this.elements.panel = panel;
            
            this.shadow.getElementById('panel-close-btn').onclick = () => this.togglePanel();
            this.refreshLog();
        },

        togglePanel() {
            const p = this.elements.panel;
            p.classList.toggle('open');
        },

        refreshLog() {
            const logEl = this.shadow.getElementById('suite-log');
            if (logEl) {
                const logs = Store.get().logs;
                logEl.innerHTML = logs.map(l => `[${l.timestamp.split('T')[1].split('.')[0]}] ${l.message}`).join('<br>');
                logEl.scrollTop = logEl.scrollHeight;
            }
        }
    };

    UI.init();

})();
