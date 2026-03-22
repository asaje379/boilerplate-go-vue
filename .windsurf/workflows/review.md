---
description: Review code changes for bugs, security issues, and improvements
---

1. Get the diff to review. If on a branch, diff against main; otherwise review staged changes:
// turbo
```bash
git diff main..HEAD --no-color 2>/dev/null || git diff --cached --no-color
```

2. For each changed file, analyze:
   - **Bugs**: Logic errors, off-by-one, nil/undefined access, race conditions
   - **Security**: Hardcoded secrets, SQL injection, XSS, improper auth checks, exposed stack traces
   - **Performance**: N+1 queries, unnecessary re-renders, missing indexes, unbounded loops
   - **Conventions**: Violations of project rules (see AGENTS.md and .windsurf/rules/)
   - **i18n**: Hardcoded user-facing strings that should use `t()`
   - **Types**: Missing or overly broad TypeScript types, untyped Go interfaces

3. Rate each finding:
   - 🔴 **Critical** — must fix before merge (security, data loss, crash)
   - 🟡 **Warning** — should fix (bugs, performance, convention violations)
   - 🟢 **Suggestion** — nice to have (style, readability, minor improvements)

4. Output a structured report:

```markdown
## Review Summary

**Files reviewed**: [count]
**Findings**: 🔴 [n] critical · 🟡 [n] warnings · 🟢 [n] suggestions

### Findings

#### [filename]
- [🔴/🟡/🟢] **[title]**: [description] (line [n])
  - Suggestion: [how to fix]
```

5. If no issues found, confirm the changes look good with a brief summary of what was reviewed.
