# Technical Debt & Future Optimizations

This document tracks known performance issues, optimization opportunities, and technical debt that can be addressed when they become priorities.

## Performance Optimizations

### 1. SharePoint Data Caching
**Status**: Not Implemented
**Priority**: Medium (premature optimization)
**Impact**: High on scale

**Issue**:
- All SharePoint data is fetched on every API request
- No caching layer for Groups, Sessions, Entries, or Profiles
- `/api/stats` endpoint fetches all three lists on every dashboard load

**Current Behavior**:
```javascript
// Every API call triggers fresh SharePoint requests
GET /api/stats → fetches ALL groups, sessions, entries (3 API calls)
GET /api/groups → fetches ALL groups
GET /api/sessions → fetches ALL sessions
GET /api/profiles → fetches ALL profiles
```

**Potential Solutions**:
1. Add in-memory caching with TTL (e.g., 5-10 minutes)
2. Implement cache invalidation on data changes
3. Use Redis or similar for distributed caching

**Files**: `services/sharepoint.js`, `routes/api.js`

---

### 2. SharePoint-Side Filtering (Hybrid Approach)
**Status**: ✅ Partially Implemented (2026-02-08)
**Priority**: Medium
**Impact**: Medium (helps with Sessions, neutral for Entries)

**Solution Implemented**:
Hybrid filtering approach:
1. **Sessions**: Filtered at SharePoint by FY (works well - simple filter)
2. **Entries**: Fetch all, filter in Node.js (complex OData filter was slower)

**Current Behavior**:
```javascript
// Sessions: Filter at SharePoint (103 of 517 - significant reduction)
const sessionsFY = await sharepoint.getSessionsByFY('FY2025');

// Entries: Fetch all, filter in Node.js (faster than complex OData OR)
const entries = await sharepoint.getEntries();
const entriesFY = entries.filter(e => sessionIdsFY.has(e.EventLookupId));
```

**Why This Approach**:
- Sessions filter: Simple OData filter `FinancialYearFlow eq 'FY2025'` - fast ✓
- Entries filter: Complex OR with 103 IDs (3,081 chars) - slow ✗
- Filtering entries in Node.js is actually faster than complex SharePoint query

**Performance**:
- Sessions: Reduced from 517 to 103 (80% reduction)
- Entries: Fetched all (no reduction yet)
- Response time: ~2.6s (same as before filtering attempt)

**Future Optimization**:
Add `FinancialYearFlow` column to Entries list to enable simple SharePoint filtering (see section 3 below)

**Files**: `services/sharepoint.js:299-309`, `routes/api.js:64-110`

---

### 3. Add Filter Columns to Entries List (SharePoint Schema)
**Status**: Not Implemented (Requires SharePoint changes)
**Priority**: Medium (for future scale)
**Impact**: High query performance improvement

**Issue**:
Current approach filters Entries by joining through Sessions, which creates massive OData OR filters. Adding denormalized filter columns would enable direct, efficient filtering.

**Proposed Changes**:

1. **Add `FinancialYearFlow` Column to Entries List**
   - Type: Single line of text
   - Index: Yes
   - Populate: Via Power Automate trigger on create (copy from related Session)

2. **Optional: Add `SessionDate` Column**
   - Type: Date
   - For date-range queries if needed

**Benefits**:
```javascript
// Before: Complex OR filter (3000+ chars, slow)
fields/EventLookupId eq 1 or fields/EventLookupId eq 2 or ... (103 times)

// After: Simple indexed filter (fast)
fields/FinancialYearFlow eq 'FY2025'
```

**Implementation Steps**:
1. Add column to Entries list in SharePoint
2. Create Power Automate flow to populate on new entries
3. Backfill existing entries with SQL/PowerShell script
4. Update `sharepoint.js` to use new filter
5. Remove `getEntriesBySessionIds()` method

**Files**: SharePoint schema, Power Automate, `services/sharepoint.js`

---

### 4. Use Title Field for Date-Based Filtering
**Status**: ❌ Tested - No Performance Benefit (2026-02-08)
**Priority**: Low
**Impact**: None (no performance improvement)

**Issue**:
Investigated using Title field (contains "yyyy-mm-dd" dates) for filtering Entries at SharePoint instead of complex EventLookupId OR filters or fetching all entries.

**Test Results**:
- Implemented `getEntriesByFYTitle()` with 12 `startswith` conditions (vs 103 EventLookupId OR conditions)
- Performance: 2.7s (worse than 2.6s baseline)
- Likely cause: Title field is not indexed in SharePoint
- Conclusion: No advantage over fetching all entries and filtering in Node.js

**Current Approach (Best)**:
Fetch all entries and filter in Node.js - simple and performs just as well as SharePoint-side filtering attempts.

**For Future Reference**:
- Sessions: Filter at SharePoint by `FinancialYearFlow` (works well)
- Entries: Fetch all, filter in Node.js (simplest and fastest option)
- Title-based filtering only helps if Title field is indexed

**Files**: `services/sharepoint.js:342-372`, `routes/api.js:64-110`

---

## Code Organization

_(Reserved for future architectural improvements)_

---

## Security

_(Reserved for security-related technical debt)_

---

## Notes

- Items marked "premature optimization" should only be implemented when:
  - Performance becomes measurably slow
  - Data volume causes real issues
  - User experience is impacted

- Prioritize based on actual metrics and user feedback, not theoretical concerns

---

*Last Updated: 2026-02-08*
