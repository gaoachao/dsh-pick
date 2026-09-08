# dsh-pick

[English](README.md) | 简体中文

在网页上点选元素，把「改这里」的上下文交给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

**当前状态：工程骨架（0.0.1）。** 已有可安装的 Cordis bundle、TypeScript 上下文类型、构建和 CI。点选、浏览器连接、源码定位、截图和会话集成尚未实现；插件目前只记录加载日志，不采集页面数据。

## 目标体验

在本地 React 开发页面选中元素，描述修改需求，预览采集的上下文，再加入选定 DSH 会话的草稿。后续支持源码位置和修复前后对比。

## 安装

骨架已验证的版本基线：DSH **0.1.3-alpha.2** / Cordis **4.0.2**。

```sh
dsh plugin --profile web add github:gaoachao/dsh-pick
```

尚未发布到 npm。Git 安装会从源码构建；若 pnpm 阻止构建，按 CLI 提示允许对应包执行构建。隔离环境、本地安装和 tarball 用法见 [开发说明](docs/development.md)。

## 开发

使用 Node.js 24 和 pnpm 10.30.3。

```sh
git clone https://github.com/gaoachao/dsh-pick.git
cd dsh-pick
pnpm install
pnpm check
```

`pnpm check` 执行类型检查、编译及 Cordis 加载与卸载检查；`pnpm dev` 持续编译。

## 文档

- [设计文档](docs/design.md)：范围、架构、协议和验收标准。
- [开发说明](docs/development.md)：环境、打包和已核对的 DSH 文档。
- [开发路线图](docs/roadmap.md)：功能里程碑。

## 许可证

[MIT](LICENSE)
