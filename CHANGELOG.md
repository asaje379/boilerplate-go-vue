# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Created CHANGELOG to track project evolution

## [0.3.8] - 2025-05-02

### Added

- CLI to scaffold, configure, and run the Go + Vue boilerplate
- Railway management commands (setup, update, deploy)
- Railway environment variable synchronization
- `doctor` command to diagnose project configuration

### Changed

- Improved interactive prompts with @clack/prompts

## [0.3.0] - 2025-04-XX

### Added

- Initial boilerplate structure with 3 services:
  - `api/` — Go HTTP API (clean architecture)
  - `admin/` — Vue 3 + Vite admin frontend
  - `realtime-gateway/` — Go realtime transport (SSE + WebSocket via RabbitMQ)
- Docker Compose for local development
- Base PWA
- Landing page
- Makefile with standardized commands

[Unreleased]: https://github.com/asaje379/boilerplate-go-vue/compare/v0.3.8...HEAD
[0.3.8]: https://github.com/asaje379/boilerplate-go-vue/compare/v0.3.0...v0.3.8
[0.3.0]: https://github.com/asaje379/boilerplate-go-vue/releases/tag/v0.3.0
