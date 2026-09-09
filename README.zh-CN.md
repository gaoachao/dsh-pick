# dsh-pick

[English](README.md) | 简体中文

在网页上点选元素，把「改这里」的上下文交给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。

**当前状态：浏览器预览版（M1 进行中）。** 已实现 Vite 开发期接入、元素点选、有限上下文采集和跨窗口通信。DSH 会话接入、源码定位与截图仍待实现；仅安装 DSH host bundle 暂时不会出现点选按钮。

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

`pnpm check` 执行类型检查、编译、Cordis 加载及协议/Vite 测试；`pnpm dev` 持续编译。

运行 `pnpm demo`，打开输出的预览地址，依次点击 **Open target → Pick an element**，在新窗口中的 React 示例页面选择元素，即可查看采集结果。适配器接入和浏览器测试见 [浏览器预览指南（English）](docs/browser-preview.md)。

## 文档

- [浏览器预览指南（English）](docs/browser-preview.md)：本地演示、Vite 接入和测试。
- [设计文档](docs/design.md)：范围、架构、协议和验收标准。
- [开发说明](docs/development.md)：环境、打包和已核对的 DSH 文档。
- [开发路线图](docs/roadmap.md)：功能里程碑。

## 许可证

[MIT](LICENSE)
