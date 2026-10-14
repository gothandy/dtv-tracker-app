# DTV Tracker App

A volunteer hours tracking and registration system for Dean Trail Volunteers: volunteer crews, sessions, profiles, check-in and hours. Data lives in SharePoint; bookings sync from Eventbrite.

- **Production:** https://tracker.dtv.org.uk
- **Preview** (pre-production, a copy of live data): https://preview.tracker.dtv.org.uk

## Getting started

Changes are made **prompt-driven**: you describe what you want, a coding agent (Claude) plans and builds it, and you test it on the preview before it goes live. You don't need a local copy or a code editor.

### What you need

- Access to this GitHub repository
- [Claude](https://claude.ai/code) with GitHub connected, and the Claude GitHub App installed on this repository
- Azure portal access only for hosting or billing changes

### How a change happens

1. **Ask.** Describe the change, or point at an issue.
2. **Plan.** The agent writes the plan into a pull request: a checklist of tasks and a *What to check* list. You approve it.
3. **Build.** Work happens on a `task/…` branch in small commits; each push runs the build and tests.
4. **Preview.** When you say *promote*, the task is squashed into the PR and deployed to the preview site. Test it there.
5. **Release.** When it's right, **Squash and merge** the PR. That deploys to production.

The detail, including the rules agents follow, is in [AGENTS.md → How we work](AGENTS.md#how-we-work). To run the app yourself, see [docs/local-development.md](docs/local-development.md).

### Where to look

- [Issues and milestones](https://github.com/gothandy/dtv-tracker-app/milestones): what's planned, in roadmap order
- [Pull requests](https://github.com/gothandy/dtv-tracker-app/pulls): work in progress, its task checklist, and the preview link
- [Actions](https://github.com/gothandy/dtv-tracker-app/actions): builds, tests and deploys

---

## Documentation

| Doc | When to read |
|-----|-------------|
| [AGENTS.md](AGENTS.md) | **Start here**: ways of working, project context, coding guidelines |
| [docs/local-development.md](docs/local-development.md) | Running the app on your own machine |
| [docs/configuration.md](docs/configuration.md) | The eight settings, naming, and what to do when one is missing |
| [docs/api.md](docs/api.md) | All API endpoints and pages |
| [docs/permissions.md](docs/permissions.md) | Roles and what each can do |
| [docs/sharepoint-schema.md](docs/sharepoint-schema.md) | Data model — list structure and field names |
| [docs/sharepoint-setup.md](docs/sharepoint-setup.md) | First-time SharePoint/Entra ID setup (admin only) |
| [docs/azure-app-service.md](docs/azure-app-service.md) | Hosting: production, preview slot, CI/CD, scheduled sync |
| [docs/access.md](docs/access.md) | Every identity that can reach the tracker, what it can do and why; checked with `scripts/access-report.ps1` |
| [docs/features/](docs/features/) | Feature inventory by area (auth, frontend, backend, media, taxonomy) |
| [docs/app-dev-guidelines.md](docs/app-dev-guidelines.md) | Building Vue features — layering, components, stats pattern |
| [docs/testing/test-strategy.md](docs/testing/test-strategy.md) | Testing approach and layers |
| [docs/testing/full-regression.md](docs/testing/full-regression.md) | Manual test checklist before release |
| [docs/design/](docs/design/) | Product vision, UX flows, visual guidelines |

---

## Troubleshooting

Local setup problems: see [docs/local-development.md](docs/local-development.md#troubleshooting). Preview deploy problems: see [docs/azure-app-service.md](docs/azure-app-service.md).

### "Entra ID secret needs updating, see readme."

The app registration client secret (`TRACKER_ENTRA_CLIENT_SECRET`) has expired or is invalid.

1. In [Entra ID → App registrations](https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps), open **DTV Volunteer Tracker**
2. **Certificates & secrets** → create a new client secret (copy the **Value** immediately)
3. Update `TRACKER_ENTRA_CLIENT_SECRET` in Azure on **both** DTVTrackerApp and its `preview` slot (*Environment variables*; the slot keeps its own copy), and in any local `.env`
4. Save; the app restarts. Reload the page

Full steps: [docs/sharepoint-setup.md](docs/sharepoint-setup.md) (Create Client Secret / Ongoing Maintenance).
