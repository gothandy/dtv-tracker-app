# DTV Tracker Wiki Staging

This folder is the staging area for governance-facing and high-level project documentation before it is promoted to the GitHub Wiki.

## Purpose

The Tracker App is intended to increase charity capability while limiting long-term charity burden.

This staging area is for material that helps Trustees, contributors, and future maintainers understand:

- what the Tracker is for
- how it fits into the wider DTV IT landscape
- what milestones are being proposed and why
- what architectural principles are guiding decisions

## How to use this folder

- Draft and refine pages here first
- Review them in context with the codebase and issue backlog
- Promote agreed pages to the live GitHub Wiki when ready
- Keep implementation-heavy material in `docs/`, not here

## What belongs here

Examples:

- milestone one-pagers
- system overview pages
- website/app/data boundary notes
- architecture principles written in plain English
- decision summaries for Trustees or Steering Group

## What does not belong here

Keep these in the main `docs/` area instead:

- API contracts
- route/module structure notes
- deploy/setup instructions
- low-level implementation detail
- code migration notes
- test setup details

## Current pages

### Milestones

- [V2.1 Self-Service Booking, Cancellation and Spaces](milestones/v2.1-self-service-booking-cancellation-and-spaces.md)
- [Milestone Template](milestones/milestone-template.md)

## Working principle

The main planning lens for the Tracker is:

**high charity value weighed against long-term charity burden**

That means features and changes should be judged not only by what they add, but by what they ask the charity to carry afterwards in maintenance, complexity, dependency, and operational risk.
