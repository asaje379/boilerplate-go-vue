---
trigger: always_on
---

# Boilerplate Go Vue Project Basics

- This workspace contains `admin`, `api`, `realtime-gateway`, and `docs`
- Preserve contracts between frontend, API, and realtime transport when making changes
- Prefer small, targeted edits that extend existing patterns before introducing new abstractions
- Do not commit secrets, `.env` files, generated binaries, or local artifacts
- Update nearby documentation when a shared contract, workflow, or architectural pattern changes

## Change strategy

- If a change affects both producer and consumer, verify both sides
- Prefer repository scripts and standard toolchain commands already used in the project
- Treat `docs/fullstack-foundation-conventions-steps-1-to-5.md` as the main reference for application foundation patterns
- Treat `docs/design-system-foundation-checklist.md` as the main reference for UI and app-shell consistency
