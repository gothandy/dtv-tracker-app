# SharePoint Refactoring Todo List

This document tracks legacy columns and naming inconsistencies in the SharePoint lists that need to be addressed.

---

## Issues Identified

### 1. Groups List - Title vs Name Field Confusion

**Problem**: The schema documentation says Title is the "Group title" and Name is the "Short unique name", but in actual data it's reversed:
- `Title` field contains shorthand (e.g., "Sat")
- `Name` field contains full name (e.g., "Saturday Dig")

**Current State**:
- Display Name: "Title" → Internal Name: "Title" → Contains: "Sat" (shorthand)
- Display Name: "Name" → Internal Name: "Name" → Contains: "Saturday Dig" (full name)

**Recommendation**:
- [ ] Update [docs/sharepoint-schema.md](sharepoint-schema.md) to reflect actual usage
- [ ] OR rename SharePoint columns to match intended purpose
- [ ] Decision: Which field should be the primary display name in UI? (Currently using Name)

**Affected Code**:
- [public/groups.html](../public/groups.html) - displays `group.Name`
- [public/group-detail.html](../public/group-detail.html) - displays `group.Name`

---

### 2. Sessions List - Inconsistent Column Naming

**Problem**: Display names don't match internal names, causing confusion:

| Display Name | Internal Name | Issue |
|--------------|---------------|-------|
| Group | Crew | UI says "Group", code uses "Crew" |
| Count | Registrations | Ambiguous purpose |
| Notes | Description | Different terminology |

**Current State**:
- Lookup field to Groups list uses internal name "Crew" but displayed as "Group"
- Sessions have both "Count (Registrations)" and "Hours" fields
- "Notes" column internally called "Description"

**Recommendation**:
- [ ] Decide on consistent terminology: "Group" vs "Crew"
- [ ] Rename "Count" to be more specific (e.g., "RegistrationCount"?)
- [ ] Align "Notes" and "Description" naming

**Note**: Internal name "Crew" must remain unchanged in SharePoint due to lookup dependencies. Only display names can be updated.

---

### 3. Entries List - Session vs Event, Profile vs Volunteer

**Problem**: Display names don't match internal names:

| Display Name | Internal Name | Issue |
|--------------|---------------|-------|
| Session | Event | Inconsistent with Sessions list |
| Profile | Volunteer | Inconsistent with Profiles list |
| Check | Checked | Minor naming difference |

**Current State**:
- Lookup to "Sessions" list uses internal name "Event"
- Lookup to "Profiles" list uses internal name "Volunteer"

**Recommendation**:
- [ ] Decide: Use "Session" everywhere or "Event" everywhere?
- [ ] Decide: Use "Profile" everywhere or "Volunteer" everywhere?
- [ ] Update display names to match terminology

**Note**: Internal names cannot be changed due to API dependencies, but display names can be updated.

---

### 4. Financial Year Field - Cleanup Required

**Problem**: `FinancialYearFlow` field exists on both Sessions and Entries lists, but only Sessions version is maintained.

**Current State** (as of 2026-02-08):
- **Sessions list**: FinancialYearFlow field is populated and should be used
  - Display Name: "Financial Year"
  - Internal Name: "FinancialYearFlow"
  - Format: "FY2025" (string)
- **Entries list**: FinancialYearFlow field is NOT updated anymore and should be deleted

**Decision**:
- ✓ Keep FinancialYearFlow on Sessions list (authoritative source)
- ✓ Delete FinancialYearFlow from Entries list (no longer maintained)
- ✓ Join Entries → Sessions to get FinancialYear for filtering

**Recommendation**:
- [x] Use Sessions.FinancialYearFlow via lookup for FY-based filtering
- [ ] Delete FinancialYearFlow column from Entries list
- [ ] Update any Power Automate flows that try to populate Entries.FinancialYearFlow

**Affected Code**:
- [app.js](../app.js) lines 88-118 - Use session.FinancialYearFlow via lookup
- [services/sharepoint.js](../services/sharepoint.js) - Sessions query includes FinancialYearFlow

---

### 5. Hours Calculation - Session vs Entry Level

**Problem**: Hours exist at two levels causing confusion about which to aggregate:
- `Sessions.Hours` - Event-level total hours (e.g., 50 hours for a day-long event)
- `Entries.Hours` - Individual volunteer hours (e.g., 5 hours per volunteer)

**Current State**:
- Dashboard was incorrectly summing `Sessions.Hours` (776 hours)
- Should sum `Entries.Hours` for individual volunteer hours (2826.5 hours expected)

**Use Cases**:
- **Dashboard "Total Hours"**: Should sum `Entries.Hours` (individual volunteer hours)
- **Session Detail Page**: Could show both `Sessions.Hours` (event duration) and sum of related `Entries.Hours` (total volunteer hours)

**Recommendation**:
- [ ] Document purpose of Sessions.Hours vs Entries.Hours in schema
- [ ] Update dashboard to sum Entries.Hours
- [ ] Consider renaming Sessions.Hours to "EventDuration" for clarity?

**Affected Code**:
- [app.js](../app.js) lines 95-98 - Currently sums Sessions.Hours (incorrect)
- Needs to query Entries list and sum individual Hours field

---

### 6. Regulars List - Crew Field

**Problem**: Regulars list uses "Crew" internally but UI uses "Group" terminology.

**Current State**:
- Regulars.Crew lookup field points to Groups list
- Display name is "Crew" but Groups are called "Groups" in UI

**Recommendation**:
- [ ] Align terminology: Either "Groups" everywhere or "Crews" everywhere
- [ ] Update display name to match chosen terminology

---

## Terminology Decision Needed

**Question**: Should we standardize on "Group" or "Crew"?

**Current Usage**:
- SharePoint internal names: "Crew" (cannot change)
- SharePoint display names: Mix of both
- UI (HTML pages): "Group" (recently updated)
- Code comments: "Crew" or "Group" interchangeably

**Recommendation**:
- [ ] Choose primary term for **user-facing UI**: "Group" OR "Crew"
- [ ] Update all SharePoint display names to match
- [ ] Update all UI text and labels to match
- [ ] Keep code comments noting internal name is "Crew" where relevant

---

## Data Population Issues

### Financial Year Filtering (RESOLVED)

**Solution**: Join Entries to Sessions and use Sessions.FinancialYearFlow field.

**Implementation**:
- Entries list does NOT need its own date or FY field
- Join via EventLookupId to Sessions list
- Use Sessions.FinancialYearFlow for FY-based filtering
- Use Sessions.Date for date-based filtering if needed

**Status**: ✓ Approach confirmed

### Hours Calculation Discrepancy

**Problem**: Total hours calculation doesn't match expected value.

**Current State** (as of 2026-02-08):
- Entries list: 200 items total
- Total hours (all entries): 746.5 hours
- FY 2025-2026 (Apr 1, 2025 - Mar 31, 2026): 23 entries, 67.5 hours
- Expected: 2826.5 hours since April 2025

**Discrepancy**: 2826.5 expected vs 746.5 actual = ~3.8x difference

**Possible Causes**:
- [ ] Not all entries have been imported from Eventbrite yet
- [ ] Hours field not being populated correctly
- [ ] Data source confusion (different list or view?)
- [ ] API not returning all entries (pagination issue?)
- [ ] Multiple entries per person per session not being counted?

**Needs Clarification**:
- Where does the 2826.5 hours figure come from?
- Is it from Entries list, Sessions list, or a SharePoint view?
- Are there missing entries that need to be imported?

---

## Priority Actions

### High Priority
1. [ ] Fix hours calculation to use Entries.Hours instead of Sessions.Hours
2. [ ] Fix or replace FinancialYearFlow field (Power Automate or calculated column)
3. [ ] Update [docs/sharepoint-schema.md](sharepoint-schema.md) to reflect actual Title/Name usage

### Medium Priority
4. [ ] Decide on Group vs Crew terminology
5. [ ] Update SharePoint display names for consistency
6. [ ] Document Sessions.Hours vs Entries.Hours purposes

### Low Priority
7. [ ] Align Notes/Description naming
8. [ ] Align Check/Checked naming
9. [ ] Consider renaming Sessions.Hours to EventDuration

---

## Related Documentation

- [sharepoint-schema.md](sharepoint-schema.md) - Current schema documentation (needs updates)
- [progress.md](progress.md) - Development session notes
- [CLAUDE.md](../CLAUDE.md) - Project context

---

*Created: 2026-02-08*
*Last Updated: 2026-02-08*
