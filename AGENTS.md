# AGENTS.md

Guidance for AI coding agents working on Total.js Flow.

## Project

Total.js Flow v11 is a FlowStream-based visual automation and IoT application built on Total.js v5.

Package name: `flow`
Main entry: `index.js`
Runtime dependency: `total5`
Default port: `8000`
License: MIT

## Repository Layout

- `index.js` starts Total.js v5 and calls `F.run(options)`.
- `config` contains application configuration, API prefix, cookies, proxy timeout, and FlowStream settings.
- `definitions/` contains app bootstrap, authentication, and FlowStream initialization.
- `controllers/` contains HTTP, WebSocket, login, designer, update, private file, and notify routes.
- `actions/` contains Total.js v5 actions for Flow API features such as streams, settings, auth, console, CDN, and variables.
- `modules/` contains integration modules such as CDN and OpenPlatform.
- `views/`, `public/`, `public/forms/`, and `public/parts/` contain the web UI.
- `--components--/` contains FlowStream web component definitions.
- `--extensions--/` contains editor extensions; extension files are copied to `/extensions/`.
- `plugins/` contains built-in Flow plugins.
- `--bundles--/` contains generated/bundled app and plugin bundles used by Docker or bundled deployment.
- `flowstream/` may be created at runtime to store FlowStream data when no custom `CONF.directory` is configured.

## Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run start
```

Equivalent direct command:

```bash
node index.js 8000
```

Run in release mode:

```bash
node index.js 8000 --release
```

Run in service mode:

```bash
node index.js 8000 --service
```

Check JavaScript syntax for changed files:

```bash
node --check path/to/file.js
```

There is no test script in `package.json`; do not claim that `npm test` validates this project.

## Bundles and Docker

- `bundle.sh` is a Node.js bundle compiler script that writes `--bundles--/app.bundle` and plugin bundles.
- The Dockerfile copies `index.js`, `config`, `package.json`, and bundles from `--bundles--/`.
- Treat files in `--bundles--/` as generated deployment artifacts. Update them only when the task is specifically about bundled/Docker output.
- Do not manually edit bundle files when the source file can be changed instead.

## Coding Style

- Follow the existing Total.js v5 style in nearby files.
- Use framework globals already present in the codebase, such as `ROUTE`, `NEWACTION`, `AUTH`, `ON`, `EMIT`, `CONF`, `PREF`, `Flow`, `PATH`, `TRANSFORM`, and `OpenPlatform`.
- Prefer the existing callback style and object shapes over introducing new abstractions.
- Keep route declarations compact and aligned with existing `controllers/default.js` patterns.
- Avoid broad formatting-only changes.
- Do not add third-party dependencies unless the change explicitly requires them.

## Total.js v5 Rules

- Verify framework behavior in the local Total.js v5 source or existing Flow code before changing APIs or examples.
- Do not assume Total.js v4 APIs exist here.
- Use `NEWACTION()` patterns from `actions/`.
- Use `ROUTE()` patterns from `controllers/`.
- Keep authentication behavior aligned with `definitions/auth.js`.
- Keep startup/bootstrap behavior aligned with `definitions/init.js` and `definitions/flowstream.js`.

## FlowStream Rules

- `Flow.db` stores FlowStream definitions and `Flow.instances` stores loaded instances.
- Runtime FlowStream data is saved to `database.json` under `CONF.directory` or `PATH.root('flowstream')`.
- `definitions/flowstream.js` removes runtime-only properties such as `unixsocket`, `env`, `import`, `importscript`, `worker`, and `asfiles` when saving.
- New or updated streams should continue to use `extensions.js` as the import file unless the task explicitly changes this behavior.
- Be careful with `proxypath`: reserved paths include `/`, `/cdn/`, `/fapi/`, `/private/`, `/flows/`, `/designer/`, `/parts/`, `/forms/`, `/css/`, `/js/`, `/fonts/`, and `/panels/`.
- Do not treat runtime FlowStream database files as normal source unless the task is explicitly about data migration or defaults.

## UI and Components

- Preserve the existing jComponent/Total.js UI approach; do not replace the frontend stack.
- UI components are loaded through `COMPONENTATOR()` in `definitions/init.js`.
- FlowStream web components live in `--components--/`.
- Forms and page parts live under `public/forms/` and `public/parts/`.
- Editor extensions belong in `--extensions--/` and are copied to `/extensions/` for use.

## Security and Auth

- Authentication supports either OpenPlatform tokens or local cookie/session auth.
- Do not weaken `AUTH()` behavior or blacklist/session checks.
- Private file access requires `PREF.token` and validates the `token` query parameter.
- Preserve route size limits such as `<8MB`, `<10MB`, and `<1MB` unless the task explicitly changes upload/message limits.

## Validation Expectations

- For changed JavaScript files, run `node --check` on each changed file.
- For server behavior changes, start the app with `npm run start` or `node index.js 8000` and verify the affected route or UI flow when practical.
- For Docker or bundled deployment changes, rebuild bundles with `bundle.sh` and check the Dockerfile assumptions.
- If a validation step cannot be run, report exactly what was skipped and why.

## Contribution Notes

- Keep changes focused and reviewable.
- Preserve generated assets and runtime data unless the task asks to update them.
- Do not overwrite unrelated local changes.
- When changing public behavior, update the relevant README, UI text, or docs if they are affected.

