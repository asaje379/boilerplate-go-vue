---
description: Create a conventional commit with staged changes summary
---

1. Check staged files:
// turbo
```bash
git diff --cached --stat
```

2. Show the actual diff for context:
// turbo
```bash
git diff --cached --no-color
```

3. Based on the diff, generate a commit message following Conventional Commits format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code restructuring
   - `style:` for formatting/whitespace
   - `docs:` for documentation
   - `chore:` for maintenance tasks
   - `test:` for test additions/changes
   - Use scope when changes are limited to one service: `feat(admin):`, `fix(api):`, `refactor(realtime):`
   - Keep subject line under 72 characters
   - Add body with bullet points if multiple logical changes

4. Present the commit message to the user for approval before running `git commit`.
