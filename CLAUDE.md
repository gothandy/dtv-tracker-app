# CLAUDE.md

Read [AGENTS.md](AGENTS.md) first. It is the single source of truth for the project, the ways of working (four levels of work, branches, planning, tech debt, docs checklist) and the coding guidelines. This file only covers how Claude Code carries those out.

## Planning a feature

- Use **plan mode** (the default in `.claude/settings.json`). The output of planning is the PR description: a **Tasks** checklist, any **Manual steps** for the maintainer, and a **What to check** list for the preview. Wait for approval before creating branches or writing code.
- Name branches after the feature: `feature/<name>` (with the PR into `main`) and `task/<name>` off it.

## The task loop

- Commit to `task/<name>` in small, reversible steps and push every 2–3 commits; CI builds and tests each push.
- Before every push: `git fetch` and rebase onto `origin/task/<name>`, so commits made by the maintainer (locally or in GitHub) are kept.
- Never commit directly to `feature/<name>` or `main`. Never force-push them.

## Promoting a task (only when the maintainer agrees)

1. Squash the task branch into the feature branch as one commit, with a message that says what the task delivers:
   `git checkout feature/<name> && git pull && git merge --squash task/<name> && git commit`
2. Push the feature branch. This deploys to preview; the workflow comments the preview URL on the PR.
3. Reset the task branch to the feature branch and carry on:
   `git checkout task/<name> && git reset --hard feature/<name> && git push --force-with-lease`
4. Tick the task in the PR description.

## Cloud sessions (claude.ai/code) vs local

- **Cloud sessions** can't reach `tracker.dtv.org.uk`, the preview URL or Actions log downloads (network allowlist). Check deploys through the Actions API (run, job and step status) and ask the maintainer for anything only visible in a browser or the Azure portal.
- GitHub GraphQL isn't available in cloud sessions; use the REST API (`gh api repos/gothandy/dtv-tracker-app/...`). Branch deletion isn't permitted; ask the maintainer.
- **Local Claude Code** can run `npm run dev` against live SharePoint. Same branch rules apply; the maintainer may work on the same task branch locally.

## Commits and PRs

- End commit messages and PR descriptions with the attribution lines the harness provides.
- Keep the PR description current: tick tasks as they are promoted and add anything the maintainer needs to do by hand.
