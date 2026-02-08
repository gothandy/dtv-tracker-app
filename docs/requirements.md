# Requirements & Constraints

## Data Ownership & GDPR Compliance

**Data Owner**: Dean Trail Volunteers

**Legal Requirement**: GDPR compliance for volunteer personal data protection

### Security Boundary

The application has a clear security boundary based on data sensitivity:

#### ✅ Safe for Unauthenticated Access (Public Reporting)
- **Groups (Crews)**: Name, description, Eventbrite links
- **Sessions (Events)**: Date, location, group name, registration counts
- **Aggregated Statistics**: Total hours, session counts, FY totals
- **Group-by Reports**: Sessions per group, hours per FY, attendance trends

*Rationale*: No personal identifiable information (PII). Groups and sessions are public activities.

#### ⚠️ Requires Authentication & Authorization (Protected)
- **Volunteer Profiles**: Names, emails, contact information, hours history
- **Individual Registrations**: Which volunteers attended which sessions
- **Check-in Records**: Individual attendance records
- **Personal Hours**: Volunteer-specific hour tracking

*Rationale*: Contains PII subject to GDPR. Requires user authentication and proper access controls.

### Current Implementation Strategy

**Phase 1: Public Reporting App (Current)**
- Focus on aggregated, anonymized data
- Groups and sessions without personal identifiers
- Safe to deploy on public-facing website
- No authentication required

**Phase 2: Authenticated Volunteer Portal (Future)**
- Implement SSO with Microsoft Entra ID
- Switch to delegated permissions
- Enable volunteer profile management
- Implement role-based access control (RBAC)

### Deployment Targets

1. **Development**: `http://localhost:3000` - Full access, app-only auth
2. **Production (Phase 1)**: `https://tracker.dtv.org.uk` - Public reporting only
3. **Production (Phase 2)**: `https://tracker.dtv.org.uk` - Authenticated portal with profiles

### Data Classification

| Data Type | Contains PII | Requires Auth | Current Status |
|-----------|--------------|---------------|----------------|
| Groups | No | No | ✅ Implemented |
| Sessions | No | No | 🔄 In Progress |
| Session Stats | No | No | 🔄 In Progress |
| Profiles | **Yes** | **Yes** | ❌ Not Implemented |
| Entries | **Yes** | **Yes** | ❌ Not Implemented |
| Regulars | **Yes** | **Yes** | ❌ Not Implemented |

### Compliance Notes

- **Phase 1** (reporting): No GDPR concerns - no PII displayed
- **Phase 2** (profiles): Must implement:
  - User authentication (SSO)
  - Access logging (audit trail)
  - Data minimization (only show relevant data)
  - Right to be forgotten (data deletion capability)
  - Secure data transmission (HTTPS)
  - Session management and timeouts

---

## Mobile & Field Usage Requirements

**Primary Use Case**: On-site outdoor work environments with volunteers

### Device Constraints

- **Target Device**: Mobile phones (smartphones)
- **Network**: Limited bandwidth in rural/outdoor locations
- **Conditions**: Outdoor use - bright sunlight, gloves, wet weather

### Design Principles

1. **Mobile-First Design**
   - Optimize all layouts for mobile devices first
   - Touch-friendly interface with adequate tap targets
   - Responsive design that works on all screen sizes

2. **Big Simple Buttons**
   - Large, easy-to-tap buttons (minimum 44x44px)
   - High contrast for outdoor visibility
   - Clear, unambiguous labels
   - Adequate spacing between interactive elements

3. **Server-Side Processing**
   - Perform aggregations, filtering, and calculations on the server
   - Minimize data transfer to client
   - Return only necessary data for current view
   - Cache static data where appropriate

4. **Progressive Disclosure**
   - Show summary/list views by default
   - Click through to see detail pages
   - Avoid showing all data on one screen
   - Lazy load additional data as needed

5. **Performance Optimization**
   - Minimize page load times
   - Reduce HTTP requests
   - Compress assets
   - Consider offline-first patterns for future

### UI Pattern: List → Detail

**Preferred Pattern**:
```
Lists Page (summary data)
  ↓ Click item
Detail Page (full data)
```

**Avoid**:
- Showing all details in expandable sections on one page
- Large tables with many columns
- Heavy JavaScript frameworks that increase bundle size

### Example Implementations

**Groups Page**: ✅ Correctly implemented
- Grid of cards with key info (Title, Description)
- Click through to see full group details (future)

**Sessions Page**: Should follow same pattern
- List view: Date, Title, Group, Hours (summary)
- Detail view: Full session info, registrations count, notes

**Dashboard**: Summary stats only
- Total counts and FY totals
- Big numbers, minimal text
- Quick scan overview

---

*Last Updated: 2026-02-08*
