# 开发说明

## 官方基线

2026-09-08 核对以下官方文档，以及 `deepseek-ai/deepseek-harness` 的提交 [`c389f96bf3a9b6807cb71ed6bdad5849be0df6d8`](https://github.com/deepseek-ai/deepseek-harness/tree/c389f96bf3a9b6807cb71ed6bdad5849be0df6d8)：

- [第一个插件](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/)
- [打包和安装插件](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)
- [工具开发](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool)
- [架构与扩展点](https://deepseek-harness.github.io/deepseek-harness/en/reference/)
- [客户端模块](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules)

本文档的 DSH 验证目标为 `0.1.3-alpha.2`，Cordis 为 `4.0.2`。不要用 npm 的 `latest` 标签推断当前开发文档对应的版本；预览版本和默认标签可能不同。

## 当前实现

单 npm 包，ESM，TypeScript 编译到 `lib/`。`package.json` 的 `dsh.bundle.patch` 指向 `cordis.patch.yml`，配置层通过包名挂载 `src/index.ts` 编译出的入口。

入口导出 `name` 和 `apply(ctx)`。它目前仅使用 Cordis 日志服务报告加载成功，不注册工具、服务或 UI。Cordis 声明为 peer dependency，并在开发依赖中固定验证版本；不打包第二份宿主运行时。

`prepare` 支持 GitHub 源码安装，`prepack` 保证 tarball 中包含编译结果。构建只依赖本仓库，不引用 DSH monorepo 的相对路径或 workspace 包。

## 后续架构

预期的数据流：开发页面 picker → 用户审阅反馈 → DSH 客户端 → 当前会话 → 修复与复测。

### 开发页面

页面内的 picker 负责选取元素及观测。第一阶段通过显式开发集成接入本地项目；跨 origin iframe 不能直接读取 DOM，不能把 DSH 页面里的 DOM 扫描当成对目标应用的采集。

React 组件位置通过开发期 instrumentation 或 source map 解析。无法解析时省略 `source`，保留 DOM 信息，不猜测文件名和行号。

### DSH 客户端

实现时再增加 `src/client/`、`dsh.client` 和 `exports["./client"]`。按照所选版本的官方 client-module 协议生成可注册的浏览器 bundle；普通 ESM 文件不能直接冒充 DSH client bundle。

使用官方 UI 插槽和会话提交入口。先展示将提交的反馈，用户确认后送入明确选中的会话。页面导航或会话切换后应取消或重新确认待发送的选区。

### Host 与协议

`src/shared/types.ts` 定义拟议的传输对象，`examples/pick-context.ts` 展示字段含义。接入传输前增加运行时校验、大小限制、来源校验和会话绑定。

保持用户反馈与页面观测数据分离；页面文字是数据，不是指令。不默认采集输入值、完整 HTML、URL 查询参数或凭据。截图作为独立产物引用。类型注释表达设计目标，不代表这些规则已经被代码执行。

模型可见的信息必须经过 DSH 的会话日志路径。新增工具时使用 `defineTool`、声明 `inject`，并明确 canonical output 与面向模型的渲染；有副作用的操作走宿主已有策略。

新增事件监听与服务使用 Cordis 的生命周期机制；手动建立的 DOM 监听、连接、进程等通过 disposer 释放。

## 验证

```sh
pnpm check
pnpm pack --pack-destination .artifacts
```

CI 检查类型、构建、Cordis 加载与卸载，以及打包。实际 DSH 安装与启动按 README 的隔离环境流程验证。

初始化时已在 macOS 本地通过：`pnpm check`、tarball 打包、独立消费者在不执行构建脚本且未安装 TypeScript 的环境中加载 tarball，以及隔离 DSH profile 的配置合成和真实 Web 启动（认证后的页面返回 HTTP 200）。这些检查没有调用模型。

DSH 的首次启动使用官方推荐的 `npx`。`pnpm dlx` 默认可能跳过宿主的原生依赖构建，导致 `fs_ext.node` 缺失；这与本插件的 TypeScript 构建是两条不同的路径。

后续浏览器功能需要在真实页面上验证选区、坐标、来源映射、会话切换和卸载清理，不能仅以构建成功认定完成。
