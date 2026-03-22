# /run-fullstack-check

Use this workflow after making changes to verify the affected parts of the repository.

## Objectives

- Run the smallest relevant checks for each changed surface
- Avoid unnecessary commands when only one area changed
- Summarize what passed, failed, or still needs manual verification

## Steps

1. Determine which areas changed:
   - `admin`
   - `api`
   - `realtime-gateway`
   - `docs`

2. For `admin`, choose the smallest relevant checks:
   - `pnpm lint`
   - `pnpm build`
   - `pnpm test:unit`
   - `pnpm test:e2e`

3. For `api`, choose the smallest relevant checks:
   - targeted `go test` or `go test ./...`
   - `go run . serve` when startup, wiring, or config changed

4. For `realtime-gateway`, choose the smallest relevant checks:
   - targeted `go test` or `go test ./...`
   - boot verification when startup or transport wiring changed

5. For `docs`-only changes:
   - verify referenced paths, commands, and contracts still match the codebase

6. Summarize results in three groups:
   - passed
   - failed and why
   - not run, with reason
