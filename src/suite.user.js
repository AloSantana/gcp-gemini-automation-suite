// ==UserScript==
// @name         GCP Gemini API Key Automation Suite
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Automates project creation and Gemini API key extraction for GCP/AI Studio.
// @author       Sisyphus/Claude
// @match        *://*.console.cloud.google.com/*
// @match        *://*.aistudio.google.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_registerMenuCommand
// @connect      cloudresourcemanager.googleapis.com
// @connect      serviceusage.googleapis.com
// @run-at       document-idle
// ==/UserScript==

(function () {
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
    window.fetch = async function (...args) {
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

    // --- UI Implementation (Mirrors Reference Script Exactly) ---
    const UI = {
        initFloatingButtons() {
            if (document.getElementById('gemini-suite-panel')) return;

            const panel = document.createElement('div');
            panel.id = 'gemini-suite-panel';
            Object.assign(panel.style, {
                position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483647',
                display: 'flex', flexDirection: 'column', gap: '8px',
                background: 'rgba(32, 33, 36, 0.95)', padding: '15px',
                borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                fontFamily: 'Arial, sans-serif', color: '#fff', width: '280px',
                border: '1px solid #3c4043'
            });

            const header = document.createElement('div');
            Object.assign(header.style, { fontSize: '16px', fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' });
            header.textContent = '💎 Gemini Automation';
            panel.appendChild(header);

            const btnStyle = {
                padding: '12px', fontSize: '14px', cursor: 'pointer',
                border: 'none', background: '#1a73e8', color: '#fff',
                borderRadius: '6px', fontWeight: 'bold', textAlign: 'center'
            };

            const btn1 = document.createElement('button');
            btn1.id = 'btn-action-1';
            btn1.textContent = '🚀 1. Auto-Create 8 Projects';
            Object.assign(btn1.style, btnStyle);
            btn1.onclick = () => Logic.action1();
            panel.appendChild(btn1);

            const btn2 = document.createElement('button');
            btn2.id = 'btn-action-2';
            btn2.textContent = '🔑 2. Open AI Studio & Keys';
            Object.assign(btn2.style, btnStyle);
            btn2.onclick = () => Logic.action2();
            panel.appendChild(btn2);

            const btn3 = document.createElement('button');
            btn3.id = 'btn-action-3';
            btn3.textContent = '📋 3. Extract & Export Keys';
            Object.assign(btn3.style, btnStyle);
            btn3.onclick = () => Logic.action3();
            panel.appendChild(btn3);

            const logBox = document.createElement('div');
            logBox.id = 'suite-log';
            Object.assign(logBox.style, {
                background: '#000', color: '#0f0', fontFamily: 'monospace',
                padding: '8px', fontSize: '11px', borderRadius: '4px',
                marginTop: '5px', height: '120px', overflowY: 'auto',
                wordWrap: 'break-word', lineHeight: '1.4'
            });
            panel.appendChild(logBox);

            document.body.appendChild(panel);
            this.refreshLog();
        },

        setLoading(btnId, isLoading) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = isLoading;
                btn.style.background = isLoading ? '#5f6368' : '#1a73e8';
                btn.innerText = isLoading ? '⏳ Processing...' : btn.getAttribute('data-original-text') || btn.innerText;
                if (!btn.getAttribute('data-original-text')) btn.setAttribute('data-original-text', btn.innerText);
            }
        },

        refreshLog() {
            const logEl = document.getElementById('suite-log');
            if (logEl) {
                const logs = Store.get().logs;
                logEl.innerHTML = logs.map(l => `[${l.timestamp.split('T')[1].split('.')[0]}] ${l.message}`).join('<br>');
                logEl.scrollTop = logEl.scrollHeight;
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

                    const closeBtn = document.querySelector('.modal-close-btn, button:contains("Close"), button[iconname="close"]');
                    if (closeBtn) closeBtn.click();

                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    Store.addLog(`❌ AI Studio Error (${project.id}): ${err.message}`, 'error');
                    break;
                }
            }
            Store.addLog('🏁 AI Studio Automation Finished.');
        },

        async waitForElement(selector, timeout = 15000) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const check = async () => {
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

                    if (Date.now() - start > timeout) {
                        reject(new Error(`Timeout waiting for ${selector}`));
                    } else {
                        await new Promise(r => setTimeout(r, 250));
                        check();
                    }
                };
                check();
            });
        }
    };

    // --- Script Initialization ---
    function init() {
        if (!document.body) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => UI.initFloatingButtons());
            } else {
                setTimeout(init, 100);
            }
            return;
        }

        UI.initFloatingButtons();

        // MutationObserver to keep the UI alive during SPA navigation
        const observer = new MutationObserver(() => {
            if (!document.getElementById('gemini-suite-panel')) {
                UI.initFloatingButtons();
            }
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

        // Auto-check for AI Studio automation
        if (location.host.includes('aistudio.google.com')) {
            setTimeout(() => UI.handleAIStudio(), 2000);
        }
    }

    try {
        GM_registerMenuCommand("Show Gemini Automation Panel", () => UI.initFloatingButtons());
    } catch (e) {}

    init();

})();