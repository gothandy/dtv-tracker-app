# App Development Guidelines

This note sets out the preferred frontend architecture and development principles for the DTV Tracker App.

It is written as a general guide for the whole app. The Entry editing work is included at the end as a short example of how these principles shape implementation decisions.

---

## Purpose

The app is growing in complexity:

- public and logged-in views differ
- some data is safe and cacheable, some is sensitive and fast-changing
- the same concepts appear in different contexts such as Sessions, Profiles, Groups, and Entries
- components need to stay reusable without becoming over-generic

These guidelines aim to keep the app:

- easier to reason about
- easier to extend
- clearer about where logic belongs
- safer in terms of privacy and permissions
- more consistent across features

---

## Core principles

### 1. Separate app context from page content
The logged-in user's own context is different from the content of the page they are viewing.

Examples of **app context**:

- who the logged-in user is
- what permissions or capabilities they have
- which profiles they manage
- general state used across the app

Examples of **page content**:

- a specific session
- a specific profile
- a group page
- a list of entries for the current page

This distinction helps stop page components becoming overloaded with mixed responsibilities.

### 2. Split stable public data from dynamic logged-in data
Where useful, separate page loading into:

- **public page data**: safe, cache-friendly, page-specific content
- **logged-in page data**: sensitive, user-specific, or fast-changing content

This improves caching, keeps GDPR-sensitive data better isolated, and avoids one hot-changing dataset spoiling a more cacheable one.

### 3. Pages and stores own data reads and writes
Fetching, updating, deleting, refreshing, and mapping API responses should be owned by the page or Pinia store.

Components should not make API calls unless there is a very strong reason.

The default assumption is:

- **page/store owns data**
- **component owns presentation and local UI flow**

### 4. Components receive shaped data
Components should receive data already shaped for their job.

Do not expect a presentational component to understand raw API responses, route context, or backend relationships.

A component should be able to say:

> "Here is the data I need to render this UI."

rather than:

> "Let me work out what this response means."

### 5. Pass capabilities, not roles
Where possible, pass simple booleans or small permissions objects to components instead of raw role models.

Good examples:

- `allowEdit`
- `canToggleCheckin`
- `canSetHours`



This keeps components focused on what they may do, not on wider app policy.

### 6. Keep data flow one-way
The normal flow should be:

- page/store loads data
- page/store maps data for components
- component emits user intent upward
- page/store performs the write
- state updates and flows back down

This keeps behaviour easier to follow and debug.

### 7. Prefer composition over overloading one component
Shared building blocks are good. Forcing too many contexts into one over-smart component is not.

Prefer:

- smaller reusable field and UI pieces
- shared cards and forms where sensible
- separate context-specific list or workflow components when the experience really differs

---

## Preferred frontend layering

### App context layer
Usually Pinia-backed and loaded through auth.

Owns:

- logged-in user data
- user capabilities
- managed profile relationships
- app-wide state

### Page data layer
Usually page or store logic tied to the current route.

Owns:

- page fetches
- mapping API responses
- update flows
- refresh strategy
- error handling
- loading state

### Context-specific workflow layer
Components that coordinate the experience for a particular context.

Examples:

- `SessionEntryList`
- `ProfileEntryList`

These components can manage:

- which modal is open
- which row is selected
- how local actions are routed upward

But they do not own API calls.

### Reusable UI layer
Lower-level components focused on display or a single interaction surface.

Examples:

- `EntryCard`
- `EditEntryModal`
- `AddEntryModal`
- `EntryTagPicker`

These components should stay as independent as practical.

---

## Component padding and background

Each component owns its own horizontal padding. This is because background colours must extend edge-to-edge with the viewport (or their containing column) — a parent cannot clip them.

The rule:

- **Background fills the full width** of the component's container
- **Content is inset by `px-6` (1.5rem)** on left and right — text, cards, buttons all respect this margin
- **This padding is set once, on the component itself**, not on any parent wrapper
- **No responsive override needed** — `px-6` applies at all screen sizes

`LayoutColumns` and `DefaultLayout` add no horizontal padding, so there is no double-padding risk. The component is the sole owner of its horizontal spacing.

---

## Modals and forms

The preferred default is:

- modals are **stateless forms**
- they receive state through props
- they manage only temporary local form state
- they emit `save`, `delete`, `close`, or similar
- they make no API calls

This keeps them reusable and avoids hidden data flows.

---

## Where logic should live

### Put logic in the page or store when it:
- fetches data
- updates server data
- maps API responses
- knows route context
- decides refresh strategy
- applies permissions policy

### Put logic in a context-specific list/workflow component when it:
- opens and closes modals
- tracks the active item
- coordinates UI interactions across sibling components
- passes user intent upward

### Put logic in a card, modal, or small field component when it:
- renders a single item
- manages temporary local input state
- emits a clear user action

---

## Caching and privacy guideline

When designing endpoints and frontend loading behaviour, prefer to think in three buckets:

### 1. Logged-in user data
Loaded through auth / app context and reused across the app.

### 2. Public page data
Heavily cached, safe, and tailored to the current page.

### 3. Logged-in page data
Additional data only available once signed in, often more dynamic and more sensitive.

This pattern is particularly useful where:

- public users should see the page shell
- logged-in users may see extra list data
- operational or self-service views differ in scope
- entries change often while session/profile details are relatively stable

---

## Named patterns this aligns with

These guidelines fit well with established frontend patterns:

- **Container / Presentational Components**
- **Controlled Components**
- **Unidirectional Data Flow**
- **Single Responsibility Principle**
- **Composition over Inheritance**
- **Capabilities over Roles**
- **Smart Page, Dumb Component**

These labels are useful shorthand, but the main goal is practical clarity, not pattern purity.

---

## Worked example: Entry editing

The Entry editing refactor is a good example of how these principles apply.

### The problem
Originally, Session entry editing was at risk of mixing too many responsibilities into one place:

- fetching entries
- deciding permissions
- rendering the list
- opening modals
- making API updates
- shaping row data

That made the boundaries between component, page, and modal less clear.

### The pattern applied
The preferred shape became:

- **Pinia / page** owns fetching entries, mapping data, and performing updates
- **SessionEntryList** owns the local UI workflow for entries on the Session page
- **EntryCard** renders a row and emits user actions
- **EditEntryModal** and **AddEntryModal** act as stateless forms
- **IconPicker** remains an independent low-level control

### What this means in practice
For Session entry editing:

- the page fetches the entries
- the page passes shaped `EntryItem[]` into `SessionEntryList`
- `SessionEntryList` decides which entry is currently being edited and which modal is open
- `EntryCard` emits actions such as title click or quick edits
- the modal emits save/delete/close
- the page performs the actual write and updates state

### Why this is better
This gives:

- clearer responsibilities
- easier mocking and sandbox work
- simpler testing
- less hidden API behaviour
- better reuse when creating `ProfileEntryList` (now built, same pattern)

### Important lesson
The key decision was not "make one smart Entry component do everything".

It was:

> keep shared UI pieces reusable, but let context-specific list components coordinate the experience, and let the page/store own the data.

That is the preferred pattern for similar features elsewhere in the app.

---

## Icons

All icons must come from `/icons/`. This is the single source of truth for the app's visual icon language, equivalent in status to the brand colour palette and typeface.

Using SVG files means icons can be updated in one place and the change propagates everywhere automatically — swap in a better arrow set by replacing two files, not hunting down characters scattered across components. Unicode symbols fail this test: they can't be restyled or replaced centrally, and they render inconsistently across platforms (confirmed broken on Android for several Unicode ranges).

**Never use:**
- Unicode symbols as icons (e.g. `×`, `✓`, `▲`, `▼`, `←`, `→`)
- Emoji as icons (e.g. `🞀`, `🞂`)
- HTML entities as icons (e.g. `&#8592;`, `&times;`)

**Always use:**
```html
<img src="/icons/close.svg"          width="16" height="16" alt="">
<img src="/icons/arrows/left.svg"    width="16" height="16" alt="Previous">
<img src="/icons/arrows/right.svg"   width="16" height="16" alt="Next">
<img src="/icons/tick.svg"           width="16" height="16" alt="">
<img src="/icons/status/warning.svg" width="16" height="16" alt="">
```

**Folder structure:** Icons are organised into subfolders when a group of related icons belongs together:
- `arrows/` — directional navigation (down, left, right, up)
- `status/` — feedback states (error, info, warning)
- Root — everything else

If the icon you need doesn't exist in `/icons/`, add it there rather than substituting a Unicode character.

Icons used as pure decoration (e.g. next to a labelled button) should have `alt=""`. Icons used as the sole content of a button must either have descriptive `alt` text or the button must have `aria-label`.

**In Vue components**, `AppButton` handles icon rendering via the `icon` prop — prefer it over raw `<img>` for interactive controls:
```html
<AppButton label="Delete" icon="delete" />
```

Use raw `<img src="/icons/...">` for non-button icon usages (status indicators, decorative labels, info bars).

---

## No legacy fallbacks

The v2 frontend and its API route handlers must not carry legacy fallback code paths from v1. Fallbacks exist to paper over old data or old callers — in v2 they hide bugs and create hidden risk, particularly around privacy.

**The rule:** if input does not meet the expected format, fail immediately with a clear error. Do not guess, coerce, or fall back to a looser resolution.

**Why this matters for profile slugs specifically:** Profile slugs must include the numeric ID suffix (e.g. `alice-bowen-42`). A fallback that resolves by name alone can silently return the wrong profile if two volunteers share a name — exposing one volunteer's data to another viewer. Even if middleware currently blocks the path for self-service users, the fallback must not exist.

**The pattern:**
```typescript
// Good — fail early
const profileId = profileIdFromSlug(slug);
if (profileId === undefined) {
  res.status(404).json({ error: 'Invalid profile slug' });
  return;
}

// Bad — legacy fallback, do not use
const profileId = profileIdFromSlug(slug);
const profile = profileId !== undefined
  ? profiles.find(p => p.ID === profileId)
  : profiles.find(p => nameToSlug(p.Title) === slug); // silent privacy risk
```

This applies to all entity resolution — slugs, IDs, keys. If the caller supplies something malformed, the right response is a 404, not a creative attempt to find a match.

---

## Quick test for future work

When designing a new feature, ask:

### Data
- Is this app-wide user context, public page content, or logged-in page content?

### Ownership
- Should this read/write happen in the page/store rather than inside the component?

### Component boundary
- Is this component receiving data already shaped for its job?

### Permissions
- Can I pass a capability boolean instead of exposing a wider role model?

### Reuse
- Am I reusing a sensible building block, or am I trying to force unlike contexts into one component?

If these answers are clear, the implementation is usually heading in the right direction.
