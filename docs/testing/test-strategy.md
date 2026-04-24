# DTV Tracker App - Testing Strategy

## Goal
Fast, practical confidence that changes don’t break core behavior — **not** coverage chasing.

## Test Layers

1. **Backend live tests**  
   - Purpose: “Are integrations connected and data contracts still valid?”  
   - Scope: auth/connectivity, key SharePoint list shapes, key options/contracts.  
   - Notes: keep mostly read-only for safety in single-environment setup.

2. **Vitest read-only tests**
   - Purpose: “Is incoming data handled correctly in code?”  
   - Scope: Vue store mapping, derived logic, empty/error handling, role/capability logic.  
   - Notes: fast PR feedback; no live writes.
   - Run: `cd frontend && npm test`
   - Coverage: all 7 Pinia stores (groupList, groupDetail, sessionList, sessionDetail, profileList, profileDetail, entryList) — 45 tests across fetch/error/loading state, `mapSession` derived flags, `applyTag` deduplication, query string construction, 401 redirects, and AbortController cancellation.

3. **Sandbox mocked tests**  
   - Purpose: “Does the UI look and behave right?”  
   - Scope: visual states, CSS/responsive behavior, interaction flows with mocked data.

4. **Nightly edits (scheduled CRUD smoke)** #TODO
   - Purpose: exercise core `POST` / `PATCH` / `DELETE` paths.  
   - Scope: add/update/delete across main lists with strict cleanup.  
   - Notes: run during low usage; use clearly prefixed automation records.

5. **Manual smoke test** #TODO
   - Purpose: short human release confidence (10–20 mins).  
   - Scope: login/permissions sanity + one or two critical workflows.

6. **Full manual regression**  
   - Purpose: broad confidence for high-risk releases.  
   - Use for: auth/permissions changes, schema changes, major UI refactors, integration changes.

---

## Cadence

- **Every PR:** Backend live (read-focused) + Vitest + Sandbox check (if UI changed)
- **Nightly:** Backend live + scheduled CRUD smoke
- **Pre-release:** Manual smoke; full regression for high-risk releases

---

## Guardrails (Single Environment)

- Default automation should be non-destructive.
- Any write tests must be isolated, traceable, and cleaned up.
- Keep tests small, fast, and easy to run.

---

## Definition of Done (Testing)

A change is ready when:
- Relevant automated tests pass,
- UI changes are checked in Sandbox,
- No unexpected permission/data-shape regressions appear,
- Manual smoke/full regression is done when risk level requires it.