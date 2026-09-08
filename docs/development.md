# 开发说明

[English README](../README.md) · [中文 README](../README.zh-CN.md) · [设计文档](design.md) · [路线图](roadmap.md)

## 环境与官方基线

建议使用 Node.js 24 和 pnpm 10.30.3；包声明的 Node.js 下限为 22.18.0。骨架的 DSH 验证目标为 `0.1.3-alpha.2`，Cordis 为 `4.0.2`。

2026-09-08 核对了以下官方文档，以及 `deepseek-ai/deepseek-harness` 的提交 [`c389f96bf3a9b6807cb71ed6bdad5849be0df6d8`](https://github.com/deepseek-ai/deepseek-harness/tree/c389f96bf3a9b6807cb71ed6bdad5849be0df6d8)：

- [第一个插件](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)
- [打包和安装插件](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
- [工具开发](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)
- [架构与扩展点](https://deepseek-harness.github.io/deepseek-harness/en/reference/)
- [客户端模块](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules)

源码提交用于核对开发契约，不代表其全部客户端 API 已在上述 npm 版本通过集成验证。不要用 npm 的 `latest` 标签推断开发文档对应的版本；浏览器功能实施时须重新固定并验证客户端基线。

## 本地开发

```sh
git clone https://github.com/gaoachao/dsh-pick.git
cd dsh-pick
pnpm install
pnpm check
```

`pnpm check` 执行类型检查、编译，以及真实 Cordis 上下文中的加载与卸载检查。持续编译使用 `pnpm dev`。

### 在隔离的 DSH 环境中加载

先在仓库目录完成构建，再运行以下命令。开发配置放在被 Git 忽略的 `.dsh-dev/`，不会使用日常 DSH profile：

```sh
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 plugin --profile web add "$PWD"
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 --profile web --dump-config
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 web
```

配置中应包含 `id: dsh-pick`，Web UI 应能正常启动。入口通过 Cordis logger 记录加载状态；当前不会出现点选按钮。

DSH 首次启动使用官方推荐的 `npx`。`pnpm dlx` 默认可能跳过宿主的原生依赖构建，导致 `fs_ext.node` 缺失；这与本插件的 TypeScript 构建是两条不同的路径。

## 安装与分发

使用上述版本基线的 DSH 从 GitHub 安装：

```sh
dsh plugin --profile web add github:gaoachao/dsh-pick
```

Git 安装通过 `prepare` 编译 TypeScript。若 pnpm 阻止构建，按 CLI 给出的精确包标识在对应 profile 的 `pnpm-workspace.yaml` 中允许本包构建，然后重试。可使用 `github:gaoachao/dsh-pick#<commit>` 固定提交。

也可以在仓库内先打包，再安装 tarball：

```sh
pnpm pack --pack-destination .artifacts
dsh plugin --profile web add "$PWD/.artifacts/dsh-pick-0.0.1.tgz"
```

本仓库尚未发布到 npm，请使用 GitHub 或本地包。

## 当前工程结构

```text
src/
  index.ts              Cordis host 入口
  shared/types.ts       PickContext v1 草案
examples/
  pick-context.ts       经过类型检查的手写示例
scripts/
  smoke.mjs             真实 Cordis 加载与卸载检查
docs/
  design.md             产品与技术设计
  development.md        开发和分发说明
  roadmap.md            功能里程碑与验收条件
cordis.patch.yml        插件配置层
```

当前采用单 npm 包、ESM，TypeScript 编译到 `lib/`。`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，配置层通过包名挂载 `src/index.ts` 编译出的入口。

入口导出 `name` 和 `apply(ctx)`，目前只使用 Cordis 日志服务，不注册工具、服务或 UI。Cordis 声明为 peer dependency，并在开发依赖中固定验证版本。`prepare` 支持 GitHub 源码安装，`prepack` 保证 tarball 包含编译结果；构建不引用 DSH monorepo 的相对路径或 workspace 包。

目前未声明 `dsh.client`。浏览器 bundle、开发页面适配器和运行时协议校验均属于后续实现，设计见 [设计文档](design.md)。`PickContext` 的类型注释表达设计目标，手写示例不是浏览器观测结果。

## 验证

```sh
pnpm check
pnpm pack --pack-destination .artifacts
```

CI 检查类型、构建、Cordis 加载与卸载，以及打包。实际 DSH 安装与启动按本文的隔离环境流程验证。

初始化时已在 macOS 本地通过：`pnpm check`、tarball 打包、独立消费者在不执行构建脚本且未安装 TypeScript 的环境中加载 tarball，以及隔离 DSH profile 的配置合成和真实 Web 启动（认证后的页面返回 HTTP 200）。这些检查没有调用模型，也没有验证尚未实现的客户端功能。

后续浏览器功能需要按设计文档的验收矩阵验证选区、坐标、来源映射、草稿保留、会话切换和卸载清理，不能仅以构建成功认定完成。
