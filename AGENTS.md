# Multi-Agent System: GCP Gemini Automation Suite

This document defines the roles and responsibilities of the multi-agent system orchestrating the development of the GCP Gemini API Key Automation Suite.

## Roles

### 1. Orchestrator Agent
**Role:** Project Manager & Workflow Controller
**Responsibilities:**
- Decomposes the main objective into actionable, atomic tasks.
- Assigns tasks to the appropriate sub-agents (Implementation, Research, QA).
- Validates the output from sub-agents against the project specification.
- Manages the overall workflow, ensuring dependencies are met before proceeding.
- Maintains the project state and coordinates handoffs between agents.

### 2. Implementation Agent
**Role:** Lead Developer
**Responsibilities:**
- Writes all Tampermonkey and JavaScript code.
- Builds the floating UI panel using modern, vanilla JavaScript/CSS.
- Implements the GCP REST API calls (Resource Manager v3, Service Usage v1).
- Develops the DOM automation logic for Google AI Studio.
- Integrates `GM_setValue` and `GM_getValue` for state persistence.

### 3. Research Agent
**Role:** Technical Investigator & Documentarian
**Responsibilities:**
- Looks up and verifies Google Cloud Resource Manager REST API v3 endpoints and payloads.
- Researches Google Service Usage API for enabling the Gemini API.
- Investigates and identifies robust DOM selectors for Google AI Studio automation.
- Finds best practices for Tampermonkey script development and cross-origin requests.
- Provides code snippets and documentation references to the Implementation Agent.

### 4. QA Agent
**Role:** Security & Quality Assurance Reviewer
**Responsibilities:**
- Reviews all code for security vulnerabilities (e.g., ensuring zero hardcoded credentials).
- Verifies that all logging is properly masked to prevent token/key leakage.
- Tests the implementation for edge cases (e.g., network failures, DOM changes, rate limits).
- Ensures the script adheres strictly to the technical constraints.
- Provides feedback and required fixes to the Implementation Agent before final approval.

## Workflow
1. **Orchestrator** defines the plan and requests API details from **Research**.
2. **Research** provides API specs and DOM strategies.
3. **Orchestrator** assigns coding tasks to **Implementation**.
4. **Implementation** writes the code and submits it for review.
5. **QA** reviews the code for security and edge cases.
6. **Orchestrator** finalizes the module once **QA** approves.
