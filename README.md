# dsh-pick

Point at a UI element. Give DeepSeek Harness the context to change it.

在网页上点选元素，把「改这里」连同元素信息、页面状态和源码位置一起交给 DeepSeek Harness。

**当前状态：工程初始化（0.0.1）。** 已提供可安装的 Cordis bundle、TypeScript 构建、元素上下文类型和 CI。安装后会输出加载日志；尚未实现点选界面、浏览器连接、源码定位、截图或发送到会话。

## 目标体验

1. 在本地开发页面开启点选，选中需要修改的元素。
2. 输入反馈，例如「这个菜单在手机上溢出，请修复并验证键盘操作」。
3. 预览将要发送的元素信息、视口、相关样式和可用的源码位置。
4. 将这份上下文交给当前 DSH 会话，修复后回到相同页面状态验证。

第一阶段聚焦本地 React 开发项目。详细范围与验收条件见 [开发路线图](docs/roadmap.md)。

## 开发

建议使用 Node.js 24 和 pnpm 10.30.3；包声明的 Node.js 下限为 22.18。

```sh
git clone https://github.com/gaoachao/dsh-pick.git
cd dsh-pick
pnpm install
pnpm check
```

`pnpm check` 执行类型检查、编译，以及真实 Cordis 上下文中的加载与卸载检查。持续编译使用 `pnpm dev`。

### 在隔离的 DSH 环境中加载

验证基线为 DSH **0.1.3-alpha.2** / Cordis **4.0.2**。以下命令将开发配置放在仓库内被 Git 忽略的 `.dsh-dev/`：

```sh
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 plugin --profile web add "$PWD"
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 --profile web --dump-config
DSH_HOME="$PWD/.dsh-dev" npx --yes @deepseek-ai/dsh@0.1.3-alpha.2 web
```

配置中应包含 `id: dsh-pick`，Web UI 应能正常启动。入口通过 Cordis logger 记录加载状态；当前不会出现点选按钮。

## 从 GitHub 安装

使用上述版本基线的 DSH：

```sh
dsh plugin --profile web add github:gaoachao/dsh-pick
```

Git 安装通过 `prepare` 编译 TypeScript。若 pnpm 阻止构建，按 CLI 给出的精确包标识在对应 profile 的 `pnpm-workspace.yaml` 中允许本包构建，然后重试；无需全局放开依赖构建。可使用 `github:gaoachao/dsh-pick#<commit>` 固定提交。

也可以先在本地构建并安装 tarball：

```sh
pnpm pack --pack-destination .artifacts
dsh plugin --profile web add "$PWD/.artifacts/dsh-pick-0.0.1.tgz"
```

本仓库尚未发布到 npm，请使用 GitHub 或本地包。

## 目录

```text
src/
  index.ts              Cordis host 入口
  shared/types.ts       PickContext v1 草案
examples/
  pick-context.ts       经过类型检查的手写示例
scripts/
  smoke.mjs             真实 Cordis 加载与卸载检查
docs/
  development.md        官方文档、架构边界与打包约定
  roadmap.md            功能里程碑与验收条件
cordis.patch.yml        插件配置层
```

## 官方文档依据

初始化依据 [第一个插件](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)、[打包与安装](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish) 和 [客户端模块](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules)。文档与源码基线记录在 [开发说明](docs/development.md)。

## Model Experience

当前不注册模型工具、不注入提示词，也不采集或发送网页内容。`PickContext` 仅为待实现功能的 TypeScript 协议草案，示例不是实际浏览器观测结果。

## Known Limitations and Deferred Work

- 当前是可加载的开发骨架，完整点选流程见路线图。
- `PickContext` 尚无运行时验证器，不能直接用作浏览器消息的可信边界。
- 当前未声明 `dsh.client`；接入浏览器入口时需一起实现官方客户端打包与注册协议。
- DSH 仍在预览阶段，兼容性以已验证版本为准。

## License

[MIT](LICENSE)
