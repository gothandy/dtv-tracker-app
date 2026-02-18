#!/bin/bash
# Intercepts git commit commands and reminds Claude to update documentation first.
# Runs as a PreToolUse hook on Bash tool calls.

INPUT=$(cat)

if echo "$INPUT" | grep -q '"git commit'; then
    printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"REMINDER: Per CLAUDE.md, before committing you must review and update all relevant documentation: CLAUDE.md, docs/test-script.md, docs/progress.md, docs/permissions.md, docs/technical-debt.md, docs/todo.md, docs/sharepoint-schema.md. Only commit once docs reflect the current state of the changes."}}'
fi

exit 0
