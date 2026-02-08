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

### 2. SharePoint-Side Filtering
**Status**: Not Implemented
**Priority**: Medium (premature optimization)
**Impact**: High as data grows

**Issue**:
- `getEntries()` fetches ALL entries from SharePoint (grows continuously)
- Filtering by Financial Year happens in Node.js after fetching
- Unnecessary network transfer and memory usage

**Current Behavior**:
```javascript
// Fetches ALL entries, then filters in JavaScript
const entries = await sharepoint.getEntries(); // ← Gets everything
const entriesFY = entries.filter(entry => { ... }); // ← Filters in Node
```

**Potential Solutions**:
1. Add OData `$filter` to `getListItems()` calls
2. Create specialized methods like `getEntriesForFinancialYear(fyYear)`
3. Filter on Sessions.FinancialYearFlow field at SharePoint level

**Example**:
```javascript
// Filter at source instead of after fetch
await sharepoint.getListItems(
    listGuid,
    'ID,Event,Hours,...',
    'fields/FinancialYearFlow eq \'FY2025\'' // ← OData filter
);
```

**Files**: `services/sharepoint.js`, `routes/api.js:107-126`

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
