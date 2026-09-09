# dsh-pick

English | [简体中文](README.zh-CN.md)

Point at a UI element. Give [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) the context to change it.

**Status: browser preview (M1 in progress).** Development-only Vite integration, element picking, bounded context capture, and a cross-window bridge are available. DSH conversation integration, source mapping, and screenshots are still pending; installing the DSH host bundle alone does not add a picker button.

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

`pnpm check` runs type checking, compilation, Cordis loading, and protocol/Vite tests. Use `pnpm dev` to watch for changes.

Run `pnpm demo`, open the printed preview URL, and click **Open target → Pick an element**. The React sample opens in a separate window; selected context appears in the preview. See the [browser preview guide](docs/browser-preview.md) for adapter setup and browser tests.

## Documentation

- [Browser preview](docs/browser-preview.md) — try the demo and integrate the Vite adapter.
- [Design (中文)](docs/design.md) — scope, architecture, protocol, and acceptance criteria.
- [Development (中文)](docs/development.md) — setup, packaging, and verified DSH references.
- [Roadmap (中文)](docs/roadmap.md) — implementation milestones.

## License

[MIT](LICENSE)
