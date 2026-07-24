# Practicum Role Workspace Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update Slice requirements with newly observed functions and deliver a standalone role-switchable HTML UI preview on the desktop.

**Architecture:** Keep project implementation untouched. Update project-local Slice Skill documents as the requirements source, then build one self-contained HTML file with semantic markup, CSS tokens and small JavaScript state transitions.

**Tech Stack:** Markdown Skill files, HTML5, CSS, vanilla JavaScript, Playwright with Microsoft Edge.

---

### Task 1: Update Slice Requirement Coverage

**Files:**
- Modify: `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-2-curriculum-editor\SKILL.md`
- Modify: `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-3-student-activities\SKILL.md`
- Modify: the Slice 4 review Skill
- Modify: `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-5-progress-notifications\SKILL.md`
- Modify: `C:\Users\29053\Desktop\智能体\.claude\skills\practicum-slice-6-quality-release\SKILL.md`

- [ ] Run a keyword coverage scan and confirm the newly observed functions are absent.
- [ ] Add only verified functional structure and clearly label prototype-only behavior.
- [ ] Add protected-action rules to the Slice that owns each operation.
- [ ] Validate each Skill folder with `quick_validate.py` before moving to the next Skill.
- [ ] Re-run the keyword coverage scan and confirm the expected terms are present.

### Task 2: Build the Standalone Preview

**Files:**
- Create: `C:\Users\29053\Desktop\数字商贸实训工作台-预期界面.html`

- [ ] Build the shared shell with Student selected by default.
- [ ] Add role switching for Owner and Student.
- [ ] Add visible disabled entries for planned features with Slice labels.
- [ ] Add a local-only protected-action confirmation demonstration.
- [ ] Add desktop and mobile responsive behavior, focus states and reduced-motion handling.

### Task 3: Verify the Preview

**Files:**
- Inspect: `C:\Users\29053\Desktop\数字商贸实训工作台-预期界面.html`

- [ ] Open the local file in Microsoft Edge through Playwright.
- [ ] Verify role switching and protected-action dialog behavior.
- [ ] Capture desktop and 375px screenshots.
- [ ] Check browser console output and correct any errors.
- [ ] Confirm the file contains no credentials, signed URLs, source branding or private API references.
