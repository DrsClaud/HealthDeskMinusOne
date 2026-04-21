# Engineering guide (HealthDesk)

This document is the human-readable source of truth for patterns we want across the codebase. Cursor rules under `.cursor/rules/` summarize parts of this for the AI; keep them in sync when you change conventions.

## UI / MUI

- **Theme:** `src/config/theme.js` (`muiTheme`) defines palette, typography, and **component default props** (`Button`, `Card`, `TextField`, `Select`).
- **Defaults:** Prefer **omitting** `variant` on those components when the theme default is correct. Add `variant` (e.g. `contained`, `outlined` buttons) only when the control is **secondary** or needs emphasis.
- **Text fields:** Default is **outlined** via the theme—do not repeat `variant="outlined"` everywhere.
- **Cards:** Default is **outlined** for consistent dashboard/list surfaces. For a **raised** card, set `variant="elevation"` and `elevation` explicitly (or use `Paper`).
- **`sx`:** Use for layout, spacing, and responsive behavior. Avoid one-off colors; use theme palette and typography variants (e.g. `color="text.secondary"`).
- **Large tappable choices** (account type, MFA method, facility type, etc.): use **`src/components/common/SelectableChoiceCard.jsx`** — **`Paper` `variant="outlined"`** + **`ListItemButton`** (`selected`, hover from the theme) + **`ListItemText`**. Avoid one-off border/`alpha` recipes.

## Loading and async feedback

- **Buttons:** Use **`LoadingButton`** from `@mui/lab` when the trigger is a button—show progress on the control, not separate “Loading…” copy.
- **Other in-place loading:** Use **`CircularProgress`** alone (no loading sentence next to it) when a button is not the right anchor.
- **Full-page / route blocking load:** Use **`src/components/Loading.js`** with **`page`** (fixed full-viewport spinner). Prefer this over ad hoc full-screen `CircularProgress` wrappers. For compact inline or search-adjacent spinners, use **`Loading.js`** with **`search`** or default as already implemented there.
- **Do not** add **loading text** (e.g. “Loading…”, “Please wait”) as the primary pattern—let the spinner or `LoadingButton` state carry the affordance.

## Destructive actions

- Any **destructive** or hard-to-undo action (delete, remove access, cancel subscription, etc.) must go through **`src/components/common/ConfirmDialog.jsx`**. Use **`confirmColor="error"`** for destructive confirms. Wire **`loading`** to the async confirm handler so the confirm action uses `LoadingButton` inside the dialog.

## Success after mutations

- After a **completed** async save/delete/update on the **same page**, show a **closable inline `Alert`** with **`severity="success"`** and **`onClose`** (dismiss clears state). Keep the message short; **do not** pair it with separate “loading…” text.
- **Snackbar** (optionally wrapping `Alert`) is fine for **transient global** feedback or **after navigation** where inline space is gone; the app currently mixes both—**prefer inline dismissible `Alert` for page-level CRUD** so success stays consistent and accessible until the user dismisses it.

## Forms

- Use **react-hook-form** for new forms and when touching legacy forms in a meaningful way.
- Prefer colocating validation with the form and reusing existing field components where they exist.

## Dates and time

- Use **date-fns** for formatting, parsing, and calendar math.
- Avoid bespoke date string parsing or manual timezone logic when shared utilities or date-fns cover the case.

## Icons

- Default to **@mui/icons-material** unless a feature area already uses a different set consistently.

## Collaboration

1. **Change the theme** when the default for a component should change app-wide.
2. **Update this doc** when you add a new “always do this” rule.
3. **Update `.cursor/rules/`** if the AI should follow the new rule automatically (keep rule files short; one concern per file when possible).

**Cursor rules** are not a substitute for theme, lint, or review, but they **do** nudge humans and the agent toward the same defaults—worth keeping **short** and **in sync** with this file so drift is obvious.

## Cursor rules behavior (quick reference)

- Rules with **`alwaysApply: true`** are eligible to be included in **every** chat (subject to Cursor’s own limits).
- Rules with **`globs`** apply when files matching those patterns are **in context** (e.g. open or referenced)—they are **not** all loaded on every message by default.

So: **no**, Cursor does not necessarily read every rules file every time; it depends on `alwaysApply`, `globs`, and what files are in the conversation.
