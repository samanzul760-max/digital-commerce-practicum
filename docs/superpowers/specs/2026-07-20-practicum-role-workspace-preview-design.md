# Digital Commerce Practicum Role Workspace Preview Design

## Purpose

Create a standalone HTML preview that demonstrates the future practicum UI without changing the Nuxt application. The current product opens on the Student workspace and switches only between Owner and Student while preserving one consistent shell.

## Product Direction

Use an original "practicum route" concept. The interface treats the curriculum as a visible route from the next activity through feedback and capability results. It must feel like a focused vocational work surface rather than a marketing page or a generic administration template.

## Information Architecture

- Persistent product navigation: workspace, plans, resources, members, reviews, data and notifications.
- Role switcher in the global header.
- Student default: next activity, plan progress, learning route, deadlines, feedback and capability results.
- Owner: room configuration, plans, members and protected operations.
- Owner: curriculum editing, review queue and progress management.
- Missing implementation remains visible as a disabled entry labeled with its target Slice and a short explanation.

## Visual System

- Ink `#19283B`: navigation and primary text.
- Teal `#087F72`: primary actions and active progress.
- Orange `#C85F24`: deadlines and emphasis.
- Cool white `#F5F7FA`: page background.
- Mist `#D9E1E8`: dividers and boundaries.
- Brick red `#B53B3B`: destructive actions only.
- Typography: Chinese UI sans serif with tabular utility figures.
- Spacing: 4/8px system; panels use 4-8px radii.
- Motion: 150-220ms for navigation, disclosure and feedback; respect reduced motion.

## Interaction Contract

- Switching between the two approved roles replaces role-specific content without changing the global shell.
- Disabled feature entries remain keyboard-readable and explain why they are unavailable.
- A demonstration risk action opens an impact summary and confirmation dialog but never mutates external data.
- Buttons expose hover, active, focus-visible and disabled states.
- Desktop uses a sidebar; mobile uses a compact top navigation and avoids horizontal scrolling.

## Safety

- Do not reproduce source branding, colors, typography, layout or assets.
- Do not include credentials, personal records, signed URLs or private API names.
- Treat create, publish, archive, delete, remove, invite, role change, application decision, submit, return, grade, export, upload, download, share and reset as protected operations.

## Verification

- Open directly as a local HTML file.
- Verify role switching, disabled-entry explanation and risk dialog.
- Verify desktop and 375px mobile screenshots.
- Verify keyboard focus and reduced-motion behavior.
