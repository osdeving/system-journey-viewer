---
name: sjv-pr-and-merge-gh
description: Use when finalizing a System Journey Viewer task with the repository's tmp/ai branch workflow, validations, GitHub CLI pull request creation, check monitoring, and rebase merge with branch deletion.
---

# SJV PR And Merge (gh)

Use this skill when the user asks to open a PR and merge it using `gh`.

## Workflow (repository policy aligned)

1. Confirm work is on a `tmp/ai/*` branch.
2. Run validations relevant to touched files (see root `AGENTS.md` validation matrix).
3. Update `docs/WORKLOG.md` and `docs/AI_STATE.md` when required by repo policy.
4. Commit with a focused message.
5. Push the temporary branch.
6. Create PR with `gh pr create`:
   - include summary bullets,
   - include validation commands actually run,
   - prefer `--body-file` for multiline bodies (avoids shell quoting issues).
7. Monitor checks:
   - `gh pr checks <number>`
   - poll until required checks pass
8. Merge with:
   - `gh pr merge <number> --rebase --delete-branch`
9. Confirm:
   - PR state is `MERGED`
   - merge commit hash
   - local branch is back on target branch (usually `main`)

## Commands template

```bash
git status --short --branch
git push -u origin <tmp-branch>
gh pr create --base main --head <tmp-branch> --title "<title>" --body-file <file>
gh pr checks <pr-number>
gh pr merge <pr-number> --rebase --delete-branch
gh pr view <pr-number> --json number,state,mergedAt,mergeCommit,url
```

## Common pitfalls

- Quoting/backticks in `gh pr create --body` causing shell expansion.
- Merging before all required checks pass.
- Forgetting docs updates required by this repo's `AGENTS.md`.
- Using merge-commit strategy instead of `--rebase`.

## Final response checklist

- Mention PR URL.
- Mention merge commit hash.
- Mention validations run.
- Mention anything not validated (if applicable).
