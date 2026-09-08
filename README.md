# dsh-pick

English | [简体中文](README.zh-CN.md)

Point at a UI element. Give [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) the context to change it.

**Status: scaffold (0.0.1).** The installable Cordis bundle, TypeScript context types, build, and CI are in place. Element picking, browser connection, source mapping, screenshots, and conversation integration are not implemented yet. The plugin currently logs its activation and collects no page data.

## Planned workflow

Select an element in a local React development app, describe the change, review the captured context, and add it to a selected DSH conversation's draft. Source locations and before/after comparisons follow in later milestones.

## Install

Validated scaffold baseline: DSH **0.1.3-alpha.2** / Cordis **4.0.2**.

```sh
dsh plugin --profile web add github:gaoachao/dsh-pick
```

Not published to npm yet. Git installation builds from source; if pnpm blocks the build, follow the CLI's package-specific approval instructions. See the [development guide (中文)](docs/development.md) for isolated local setup and tarball installation.

## Develop

Use Node.js 24 and pnpm 10.30.3.

```sh
git clone https://github.com/gaoachao/dsh-pick.git
cd dsh-pick
pnpm install
pnpm check
```

`pnpm check` runs type checking, compilation, and a Cordis load/unload smoke check. Use `pnpm dev` to watch for changes.

## Documentation

- [Design (中文)](docs/design.md) — scope, architecture, protocol, and acceptance criteria.
- [Development (中文)](docs/development.md) — setup, packaging, and verified DSH references.
- [Roadmap (中文)](docs/roadmap.md) — implementation milestones.

## License

[MIT](LICENSE)
