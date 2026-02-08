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

*Last Updated: 2026-02-08*
