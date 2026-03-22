# /plan-feature

Use this workflow when the task is to plan a new feature or a non-trivial change in this repository.

## Objectives

- Identify which surfaces are affected: `admin`, `api`, `realtime-gateway`, `docs`
- Preserve existing contracts and architecture boundaries
- Produce an implementation plan before coding

## Steps

1. Restate the requested feature briefly in repository terms.

2. Inspect the relevant code and docs first:
   - root `AGENTS.md`
   - directory-specific `AGENTS.md`
   - `.windsurf/rules/reference-docs.md` references if the task is cross-stack or architectural

3. Identify impact by surface:
   - frontend routes, views, stores, API modules
   - API handlers, services, repositories, docs
   - realtime publishers, consumers, event contracts
   - documentation that should change

4. List constraints and contracts that must remain compatible.

5. Produce a phased implementation plan with:
   - ordered steps
   - risks or decisions to watch
   - validation commands for each affected surface

6. End with a concise recommendation for the safest first implementation slice.
