# CLAUDE.md

Read [AGENTS.md](AGENTS.md) first. It is the single source of truth for the project, the ways of working (four levels of work, branches, planning, tech debt, docs checklist) and the coding guidelines. This file only covers how Claude Code carries those out.

## Working with the maintainer

- **Go ahead** with anything already agreed, and with small fixes inside the current task. Don't ask permission for each step.
- **Ask "Shall I get started?"** before anything not yet discussed: a new change, file, workflow step or approach, even when it seems a natural follow-on. Describe it in a line or two and wait.
- **Answer questions first.** "Just a question" or "What do you think?" means discuss, not change anything. If an answer suggests a change, offer it; don't make it.

## Planning a feature

- Use **plan mode** (the default in `.claude/settings.json`). The output of planning is the PR description: a **Tasks** checklist, any **Manual steps** for the maintainer, and a **What to check** list for the preview. Wait for approval before creating branches or writing code.
- Branches come in a pair with the same short name: `preview/<name>` (holds the PR into `main`) and `task/<name>` off it, e.g. `preview/event-types` and `task/event-types`.

## The task loop

- Commit to `task/<name>` in small, reversible steps and push every 2–3 commits; CI builds and tests each push.
- Before every push: `git fetch` and rebase onto `origin/task/<name>`, so commits made by the maintainer (locally or in GitHub) are kept.
- Never commit directly to `preview/<name>` or `main`. Never force-push them.
- **Never merge a PR, push to `main`, or use a ruleset bypass.** Claude acts with the maintainer's full GitHub permissions, and merging deploys to production. Merging is always the maintainer's action; Claude's job ends at "ready to merge" with the checks listed.

## Promoting a task (only when the maintainer agrees)

1. Squash `task/<name>` into `preview/<name>` as one commit, with a message that says what the task delivers:
   `git checkout preview/<name> && git pull && git merge --squash task/<name> && git commit`
2. Push `preview/<name>`. This deploys to the preview slot; the workflow comments the preview URL on the PR.
3. Reset `task/<name>` to `preview/<name>` and carry on:
   `git checkout task/<name> && git reset --hard preview/<name> && git push --force-with-lease`
4. Tick the task in the PR description.

## Cloud sessions (claude.ai/code) vs local

- **Cloud sessions** can't reach `tracker.dtv.org.uk`, the preview URL or Actions log downloads (network allowlist). Check deploys through the Actions API (run, job and step status) and ask the maintainer for anything only visible in a browser or the Azure portal.
- GitHub GraphQL isn't available in cloud sessions; use the REST API (`gh api repos/gothandy/dtv-tracker-app/...`). Branch deletion isn't permitted; ask the maintainer.
- **Local Claude Code** can run `npm run dev` against live SharePoint. Same branch rules apply; the maintainer may work on the same task branch locally.

## Commits and PRs

- End commit messages and PR descriptions with the attribution lines the harness provides.
- Keep the PR description current: tick tasks as they are promoted and add anything the maintainer needs to do by hand.
