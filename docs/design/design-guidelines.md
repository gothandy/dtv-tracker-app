# DTV App Design Guidelines

## Overview

These guidelines are for the app UI rather than the public website.

The app should feel like the same organisation as the website, but with a different job. It should feel more practical, more personal and more operational.

Use this principle throughout:

**Same brand, less shouty, more useful.**

## Colour

### Core colour roles

- **Green** = main brand colour
- **Charcoal / near-black** = anchor, structure and dark panels
- **Off-white / stone** = page background and light surfaces
- **Oxide / clay** = single key CTA colour, used sparingly
- **System red / amber** = warnings, errors and problem states only

### Text colour

Keep text very high contrast.

- dark text should stay close to black
- light text should stay close to white

Do not soften text much.

### Surface colour

Do soften backgrounds and panels slightly.

- avoid pure white everywhere
- avoid pure black everywhere
- use softened off-white and charcoal for most app surfaces

Rule:

**Hard text, softer surfaces.**

### CTA colour

Use the earthy red from the logo family as the colour for the single main CTA on a page.

Typical uses:

- Log in
- Register
- Book your spot
- Confirm your place
- Upload photos
- Find your next dig

Do not use this colour for:

- errors
- warnings
- destructive actions
- cancellations
- random decoration

If a page has more than one action, the clay CTA should be reserved for the main one.

## Typography

Use two modes only.

### 1. Display / brand type

This is the rugged, distressed brand type.

Use it only for:

- large page titles
- section banners
- short hero labels
- occasional public-facing emphasis

Do not use it for:

- body text
- small labels
- metadata
- forms
- buttons
- dates and times
- anything users need to scan quickly

Rule:

**Keep display type large, short and sparing.**

### 2. Clean sans-serif UI type

Use the clean sans-serif for everything functional:

- body copy
- buttons
- labels
- cards
- forms
- stats
- metadata
- helper text
- calendar UI
- profile pages
- booking pages

Rule:

**If the user needs to read, compare, scan or act on it, use the clean sans.**

### Font weight guidance

Keep weights simple:

- **Regular** = body copy and most metadata
- **Semibold** = labels, buttons, card titles and small headings
- **Bold** = key headings and major stats

Avoid:

- overly light text
- bold body paragraphs
- distressed text at small sizes
- using bold to compensate for poor contrast

## Readability

Clarity comes first.

If text is hard to read, fix it in this order:

1. contrast
2. size
3. spacing
4. font choice
5. weight

Do not try to solve readability by making everything bold.

Specific rules:

- small white text on green needs careful contrast checking
- helper text must not be too faint
- date, time and location content must be easy to scan
- calendar text must prioritise function
- display type must not be used for practical UI information

## Layout

The app should feel like a practical self-service tool, not a collection of styled promo pages.

General rules:

- clear hierarchy
- strong grouping
- consistent spacing
- no floating random panels
- one obvious next step
- make state and status clear

## Main page families

### 1. Public landing pages

Examples:

- homepage
- dig landing pages
- post-event pages

Purpose:

- attract interest
- explain activity
- show credibility and momentum
- move people toward login, registration or first booking

### 2. Action pages

Examples:

- booking
- confirm place
- cancel
- upload photos
- complete profile

Purpose:

- help users complete a task with minimal friction
- reduce need for manual intervention

Pattern:

- information left
- action block right
- one clear main CTA
- supportive guidance beneath

### 3. Utility pages

Examples:

- calendar
- profile
- attendance history
- milestones
- benefits

Purpose:

- support repeat self-service use
- make repeat volunteers easier to manage without admin overhead

These pages should be more app-like, with stronger use of cards, chips, filters and structured content.

## Components

### Buttons

- one main CTA per page in oxide / clay tone
- secondary buttons in green, charcoal or outline
- destructive actions use proper system colours, not the brand CTA colour

### Cards

Cards should feel sturdy and useful.

Use:

- softened surfaces
- consistent spacing
- clear padding
- simple borders or tonal separation
- strong headings

### Tags / chips

Useful for volunteer states such as:

- Booked
- First time
- Regular
- Cancelled
- Full
- CSR
- Completed

These should be functional and easy to scan.

### Stats

The app should make good use of stats and progress markers.

Examples:

- hours volunteered
- sessions attended
- trails worked on
- places left
- milestone progress

Use large clear numbers in the clean sans-serif.

## Photography

Use real volunteer photography, especially on public-facing pages.

Photography should:

- reinforce authenticity
- show activity
- make the space feel alive
- support trust and momentum

Do not place critical text over busy imagery without strong contrast handling.

## Accessibility and usability

Build with strong readability and practical use in mind:

- maintain strong contrast
- avoid faint helper text
- ensure buttons are clearly interactive
- keep focus states obvious
- make dates, times and locations easy to scan
- never use decorative type for critical information
- design for repeated use, not just screenshot appeal

## Tone of implementation

This should not feel like:

- a startup dashboard
- a generic events platform
- a polished corporate portal
- a charity CRM

It should feel like:

- a practical self-service volunteer tool
- part of the DTV world
- welcoming at the front
- useful once inside
- built to reduce hidden admin effort
