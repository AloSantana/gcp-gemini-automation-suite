# GCP Gemini API Key Automation Suite

## Objective
Create a Tampermonkey userscript that injects a persistent floating UI panel on any `https://console.cloud.google.com/*` URL. The script will automate project creation, Gemini API enabling, and API key extraction from AI Studio.

## Technical Constraints
* **Auth**: Reuse active OAuth2 Bearer token from the GCP browser session.
* **API**: Use GCP REST APIs (Resource Manager v3, Service Usage v1).
* **Automation**: Use DOM automation for AI Studio key creation.
* **Persistence**: Use `GM_setValue` and `GM_getValue` for state management across navigations.
* **Security**: Zero hardcoded credentials. Mask all logging.

## Actions
1. Auto-Create 8 Projects and Enable Gemini API.
2. Open AI Studio and Create API Keys.
3. Extract and Export All Gemini API Keys.
