# Skill Roadmap Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a self-contained desktop HTML that explains the master Skill, Slice 1-6, expected UI results and final product outcome.

**Architecture:** One semantic HTML file contains the report content, approved design tokens, responsive layout and minimal JavaScript for Slice accordions and role tabs. It reads no remote data and starts no server.

**Tech Stack:** HTML5, CSS custom properties, vanilla JavaScript, Microsoft Edge verification.

## Global Constraints

- Output: `C:\Users\29053\Desktop\数字商贸实训工作台-Skill路线图.html`.
- Do not modify `C:\Users\29053\Desktop\szmy2`.
- Use the approved practicum UI contract and natural Chinese copy.
- No remote assets, credentials, signed URLs or source-site UI.

---

### Task 1: Build and verify the report

**Files:**
- Create: `C:\Users\29053\Desktop\数字商贸实训工作台-Skill路线图.html`

**Interfaces:**
- Consumes: project master Skill, UI contract, completion matrix and Slice 1-6.
- Produces: one directly openable HTML report.

- [x] **Step 1: Create the semantic report**

Add the overview, master Skill, Slice roadmap, role workflow and final blueprint sections.

- [x] **Step 2: Add responsive approved styling**

Use the practicum tokens, stable layout constraints, visible focus and reduced-motion support.

- [x] **Step 3: Add minimal interactions**

Implement Slice expand/collapse and role-tab switching with correct ARIA states.

- [x] **Step 4: Verify in Edge**

Open with Playwright `channel: 'msedge'`; exercise interactions, inspect console output and assert no horizontal overflow at 1440px and 375px.

- [x] **Step 5: Capture evidence**

Save desktop and mobile screenshots beside the HTML and visually check hierarchy, text fit and interaction state.
