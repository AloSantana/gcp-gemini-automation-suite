# Testing Guide: GCP Gemini API Key Automation Suite

## Prerequisites
1.  Install **Tampermonkey** on your browser (Firefox Android or Desktop).
2.  Create a new script and paste the content of `src/suite.user.js`.
3.  Ensure you are logged into your **Google Cloud Console** account.

## Verification Steps

### Action 1: Project Creation
1.  Navigate to `https://console.cloud.google.com/`.
2.  Tap/Click the **💎 FAB** in the bottom-right corner.
3.  Click **🚀 Auto-Create 8 Projects**.
4.  **Verify**: Observe the log. It should capture the Bearer token automatically and start creating 8 projects sequentially.
5.  **Verify**: Check that each project is created and the Gemini API is enabled.

### Action 2: AI Studio Automation
1.  Click **🔑 Open AI Studio & Create Keys**. A new tab will open at AI Studio.
2.  **Verify**: The script should automatically detect the pending projects from the state.
3.  **Verify**: The script should start clicking through the "Create API Key" flow for each project.
4.  **Verify**: Keys should be logged as "Captured" in the UI panel.

### Action 3: Export
1.  Click **📋 Extract & Export Keys**.
2.  **Verify**: A browser alert should show the keys, and they should be copied to your clipboard.

## Troubleshooting
- **No Token**: If the log says "No auth token", refresh the GCP console or click on any project menu item to trigger a background request.
- **AI Studio Selectors**: If the automation stops, the DOM selectors may have changed. Check the log for "Timeout waiting for..." messages.
