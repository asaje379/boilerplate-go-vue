---
description: Prepare a pull request with diff summary, description, and checklist
---

1. Get the current branch name and diff against main:
// turbo
```bash
git branch --show-current
```

2. List all commits on this branch not in main:
// turbo
```bash
git log main..HEAD --oneline --no-decorate
```

3. Show the full diff stats:
// turbo
```bash
git diff main..HEAD --stat
```

4. Generate a PR description in this format:

```markdown
## What

[One-sentence summary of what this PR does]

## Why

[Brief motivation — what problem it solves or what feature it adds]

## Changes

- [Bullet list of key changes, grouped by service if cross-stack]

## Checklist

- [ ] API: Swagger annotations updated if endpoints changed
- [ ] API: Domain errors used (no raw GORM errors in services)
- [ ] Admin: All strings use i18n `t()` calls
- [ ] Admin: Route has `meta.title` set
- [ ] Admin: Both EN and FR locale keys added
- [ ] Cross-stack: TypeScript types match API response DTOs
- [ ] Tests: Relevant tests added or updated
```

5. Present the PR description for user review and approval.
