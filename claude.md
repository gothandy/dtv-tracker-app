# DTV Tracker App

See [AGENTS.md](AGENTS.md) for full project context, data model, dev guidelines, and file structure.

## Claude Code Workflow

- **Always plan first**: Use plan mode before implementing any non-trivial change. Explore the codebase, understand existing patterns, and get approval before writing code.

- **Documentation review after every change**:
  - [AGENTS.md](AGENTS.md) — project context, file structure, features list
  - [docs/test-script.md](docs/test-script.md) — add/update test cases
  - [docs/permissions.md](docs/permissions.md) — if roles or endpoint access change
  - [GitHub Issues](https://github.com/gothandy/dtv-tracker-app/issues) — bugs, features, tech debt
  - [docs/progress.md](docs/progress.md) — development session notes
  - [docs/sharepoint-schema.md](docs/sharepoint-schema.md) — if SharePoint fields change
  - [readme.md](readme.md) — if dependencies or configuration change

- **Archive outdated docs**: Move superseded documentation to `docs/legacy/` rather than deleting it.
