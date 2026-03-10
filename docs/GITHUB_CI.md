# 在 GitHub 上跑 npm run test

本文档说明如何在 GitHub 上自动运行 `npm run test`（配置与步骤）。

---

## 1. 配置（已就绪）

项目已包含 GitHub Actions 工作流：

- **文件位置**：`.github/workflows/test.yml`
- **触发条件**：向 `main` 或 `master` 分支的 **push** 或 **pull_request**
- **执行步骤**：检出代码 → 安装 Node 20 → `npm ci` → `npm run compile` → `npm run test`

### 工作流内容摘要

```yaml
name: Test
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run compile
      - run: npm run test
```

- **`npm ci`**：按 `package-lock.json` 安装依赖，保证与本地一致。
- **先 compile 再 test**：与本地流程一致，避免漏编就测。

---

## 2. 使用步骤

### 2.1 确保仓库在 GitHub 上

- 在 [GitHub](https://github.com/new) 创建仓库（若尚未创建）。
- 本地已配置 `origin` 并推过代码：

```bash
git remote -v
git push -u origin main
```

（若默认分支是 `master`，把上面命令里的 `main` 换成 `master`。）

### 2.2 推送包含工作流的代码

工作流文件已在 `.github/workflows/test.yml`，提交并推送即可：

```bash
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions to run npm run test"
git push origin main
```

### 2.3 查看运行结果

1. 打开 GitHub 上的项目页面。
2. 顶部点击 **Actions**。
3. 左侧选择 **Test**（或 All workflows）。
4. 点击某次 **Run**（由你的 push 或 PR 触发）查看详情。
5. 若全部为绿色勾，表示 `npm run compile` 和 `npm run test` 均通过。

### 2.4 通过 Pull Request 触发

- 从分支发起 PR 到 `main`（或 `master`）时，也会自动跑同一套测试。
- 在 PR 页面可以看到「Checks」和 Test 工作流状态，合并前可确认测试通过。

---

## 3. 常见问题

| 情况 | 处理 |
|------|------|
| 本地 `npm run test` 通过，GitHub 上失败 | 在 Actions 里点进该次 Run，看具体报错（编译错误或某个测试失败）。常见原因：依赖版本不一致（已用 `npm ci` 可缓解）、Node 版本不同（工作流里固定为 20）。 |
| 想用其他 Node 版本 | 在 `.github/workflows/test.yml` 里把 `node-version: "20"` 改为 `"18"` 等。 |
| 想增加分支或事件 | 在 `on.push.branches` / `on.pull_request.branches` 里增加分支名，或在 `on` 下加 `workflow_dispatch` 等。 |

---

## 4. 小结

- **配置**：已用 `.github/workflows/test.yml` 在 push/PR 时跑 `npm run compile` 和 `npm run test`。
- **步骤**：把包含该文件的代码推到 GitHub 的 `main`/`master`，在 **Actions** 页查看 Test 工作流即可。
