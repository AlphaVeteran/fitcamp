# 把 FitCamp 项目发布到 GitHub（小白版）

下面按步骤教你怎么把当前这个 Cursor 项目第一次推到 GitHub 上。每一步都尽量写清楚，跟着做即可。

---

## 第一步：确认已安装 Git

1. 打开**终端**（Mac 在「应用程序」→「实用工具」→「终端」，或在 Cursor 里用集成终端）。
2. 输入下面命令并回车：
   ```bash
   git --version
   ```
3. 如果出现类似 `git version 2.x.x`，说明已经装好了，跳到**第二步**。
4. 如果提示 `command not found`，需要先安装 Git：
   - **Mac**：安装 Xcode Command Line Tools（终端里输入 `xcode-select --install` 回车，按提示完成），或到 [git-scm.com](https://git-scm.com/) 下载安装。
   - 装好后再在终端输入 `git --version` 确认。

---

## 第二步：在 GitHub 上创建一个新仓库

1. 登录 [github.com](https://github.com/)（没有账号就先注册）。
2. 点击右上角 **「+」** → **「New repository」**。
3. 填写：
   - **Repository name**：例如 `fitcamp`（或你喜欢的英文名，不要空格）。
   - **Description**（可选）：例如 `Multi-round check-in challenge DApp`。
   - **Public** 选上即可。
   - **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license"（我们本地已经有这些或会自己加）。
4. 点 **「Create repository」**。
5. 创建好后，页面上会有一个仓库地址，类似：
   ```text
   https://github.com/你的用户名/fitcamp.git
   ```
   先**复制这个地址**，后面会用到。先不要关这个页面。

---

## 第三步：在本地把项目变成 Git 仓库并做第一次提交

在终端里**进入项目根目录**（就是你放 FitCamp 代码的文件夹，例如 `Documents/cursor`）：

```bash
cd /Users/amberlu/Documents/cursor
```

（如果你的项目不在这个路径，把上面的路径改成你自己的，例如 `cd ~/Documents/cursor`。）

然后按顺序执行下面命令。

### 3.1 初始化 Git 仓库

```bash
git init
```

出现类似 `Initialized empty Git repository in ...` 就对了。这样当前文件夹就变成一个「Git 仓库」了。

### 3.2 把不想上传的文件排除掉（.gitignore）

项目根目录下已经有一个 **`.gitignore`** 文件，里面写了比如 `node_modules`、`.env`、`artifacts`、`web/addresses.json` 等，这些就不会被提交到 GitHub。  
**不需要你再改**，只要确保有这个文件即可（没有的话可以找开发者要一份）。

### 3.3 把文件加入「暂存区」

```bash
git add .
```

`.` 表示「当前目录下所有文件」（被 .gitignore 忽略的不会加进去）。执行后不会有明显输出，正常。

### 3.4 做第一次提交（commit）

```bash
git commit -m "Initial commit: FitCamp check-in DApp"
```

`-m` 后面是这次提交的说明，可以改成你喜欢的一句话。执行后会出现类似 `x files changed, xxx insertions(+)`，说明第一次提交成功了。

---

## 第四步：把本地仓库和 GitHub 上的仓库连起来并推送

### 4.1 设置默认分支名为 main（可选但推荐）

很多新仓库默认用 `main` 作为主分支名，建议一致：

```bash
git branch -M main
```

### 4.2 添加「远程仓库」地址

把下面命令里的 `你的用户名/fitcamp` 换成你在**第二步**创建的仓库地址（只换用户名和仓库名部分）：

```bash
git remote add origin https://github.com/你的用户名/fitcamp.git
```

例如你的 GitHub 用户名是 `amberlu`，仓库名是 `fitcamp`，就写：

```bash
git remote add origin https://github.com/amberlu/fitcamp.git
```

如果提示 `remote origin already exists`，说明已经加过了，可以跳过这步；若要改地址可以用：

```bash
git remote set-url origin https://github.com/你的用户名/fitcamp.git
```

### 4.3 推送到 GitHub（上传代码）

```bash
git push -u origin main
```

- 第一次推送可能会弹出浏览器或命令行窗口让你**登录 GitHub**（或输入用户名/密码、Personal Access Token），按提示完成即可。
- 若提示要密码，GitHub 现在一般要求用 **Personal Access Token** 代替密码：在 GitHub 网页 → Settings → Developer settings → Personal access tokens 里生成一个 token，在输密码的地方粘贴这个 token。

成功后，刷新你在第二步打开的 GitHub 仓库页面，就能看到所有代码和 README 了。

---

## 以后改了代码，怎么再更新到 GitHub？

在项目根目录下，每次改完代码可以按这个顺序做三件事：

1. **暂存修改**：
   ```bash
   git add .
   ```
2. **提交**（说明写清楚你改了什么）：
   ```bash
   git commit -m "这里写你做了啥改动"
   ```
3. **推到 GitHub**：
   ```bash
   git push
   ```

以后已经用 `git push -u origin main` 设过上游，直接 `git push` 就会推到 GitHub 的 `main` 分支。

---

## 常见问题

| 情况 | 处理 |
|------|------|
| `git: command not found` | 先按**第一步**安装 Git。 |
| `Permission denied (publickey)` | 说明在用 SSH，但你还没配 SSH key。可以改用 HTTPS 地址：`https://github.com/用户名/fitcamp.git`，并用上面的 `git remote add origin ...`。 |
| `Support for password authentication was removed` | GitHub 不再支持用账号密码 push，需要按提示用 **Personal Access Token** 代替密码。 |
| 不想把 `node_modules` 或 `.env` 传上去 | 确保项目根目录有 `.gitignore`，并且里面有 `node_modules` 和 `.env`，然后重新 `git add .` 和 `git commit`。 |
| 仓库已经存在一个 README，和我本地冲突 | 第一次推送前先 `git pull origin main --rebase`，再 `git push -u origin main`；若仓库是你刚建的、且没勾选 "Add a README"，一般不会冲突。 |

---

总结：**第一次** = 在 GitHub 建空仓库 → 本地 `git init` → `git add .` → `git commit` → `git remote add origin <你的仓库地址>` → `git push -u origin main`。之后每次改完代码就 `git add .` → `git commit -m "说明"` → `git push` 即可。
