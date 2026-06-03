<p align="center">
    <img src="doc/demo/logo.png" width="80px" />
    <h1 align="center">Cloud Mail</h1>
    <p align="center">基于 Cloudflare 的简约响应式邮箱服务，支持邮件发送、附件收发 🎉</p> 
    <p align="center">
        简体中文 | <a href="/README-en.md" style="margin-left: 5px">English </a>
    </p>
    <p align="center">
        <a href="https://github.com/maillab/cloud-mail/tree/main?tab=MIT-1-ov-file" target="_blank" >
            <img src="https://img.shields.io/badge/license-MIT-green" />
        </a>    
        <a href="https://github.com/maillab/cloud-mail/releases" target="_blank" >
            <img src="https://img.shields.io/github/v/release/maillab/cloud-mail" alt="releases" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/issues" >
            <img src="https://img.shields.io/github/issues/maillab/cloud-mail" alt="issues" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/stargazers" target="_blank">
            <img src="https://img.shields.io/github/stars/maillab/cloud-mail" alt="stargazers" />
        </a>  
        <a href="https://github.com/maillab/cloud-mail/forks" target="_blank" >
            <img src="https://img.shields.io/github/forks/maillab/cloud-mail" alt="forks" />
        </a>
    </p>
    <p align="center">
        <a href="https://trendshift.io/repositories/20459" target="_blank" >
            <img src="https://trendshift.io/api/badge/repositories/20459" alt="trendshift" >
        </a>
    </p>
</p>


## 项目简介

只需要一个域名，就可以创建多个不同的邮箱，类似各大邮箱平台，本项目支持部署到 Cloudflare Workers ，降低服务器成本，搭建自己的邮箱服务

## 项目展示

- [在线演示](https://skymail.ink)<br>
- [部署文档](https://doc.skymail.ink)<br>

| ![](/doc/demo/demo1.png) | ![](/doc/demo/demo2.png) |
|-----------------------|-----------------------|
| ![](/doc/demo/demo3.png) | ![](/doc/demo/demo4.png) |




## 功能介绍

- **💰 低成本使用**： 可部署到 Cloudflare Workers 降低服务器成本

- **💻 响应式设计**：响应式布局自动适配PC和大部分手机端浏览器

- **📧 邮件发送**：集成Resend发送邮件，支持群发，内嵌图片和附件发送，发送状态查看

- **🛡️ 管理员功能**：可以对用户，邮件进行管理，RABC权限控制对功能及使用资源限制

- **📦 附件收发**：支持收发附件，使用R2对象存储保存和下载文件

- **🔔 邮件推送**：接收邮件后可以转发到TG机器人或其他服务商邮箱

- **📡 开放API**：支持使用API批量生成用户，多条件查询邮件 

- **🔢 验证码识别**：使用Workers AI，自动识别邮件验证码 

- **📈 数据可视化**：使用ECharts对系统数据详情，用户邮件增长可视化显示

- **🎨 个性化设置**：可以自定义网站标题，登录背景，透明度

- **🤖 人机验证**：集成Turnstile人机验证，防止人机批量注册

- **📜 更多功能**：正在开发中...



## 技术栈

- **平台**：[Cloudflare Workers](https://developers.cloudflare.com/workers/)

- **Web框架**：[Hono](https://hono.dev/)

- **ORM：**[Drizzle](https://orm.drizzle.team/)

- **前端框架**：[React](https://react.dev/) 

- **UI框架**：[HeroUI](https://www.heroui.com/) 

- **邮件推送：** [Resend](https://resend.com/)

- **缓存**：[Cloudflare KV](https://developers.cloudflare.com/kv/)

- **数据库**：[Cloudflare D1](https://developers.cloudflare.com/d1/)

- **文件存储**：[Cloudflare R2](https://developers.cloudflare.com/r2/)

## 目录结构

```
cloud-mail
├── mail-worker				    # worker后端项目
│   ├── src                  
│   │   ├── api	 			    # api接口层			
│   │   ├── const  			    # 项目常量
│   │   ├── dao                 # 数据访问层
│   │   ├── email			    # 邮件处理接收
│   │   ├── entity			    # 数据库实体
│   │   ├── error			    # 自定义异常
│   │   ├── hono			    # web框架配置、拦截器、全局异常等
│   │   ├── i18n			    # 语言国际化
│   │   ├── init			    # 数据库缓存初始化
│   │   ├── model			    # 响应体数据封装
│   │   ├── security			# 身份权限认证
│   │   ├── service			    # 业务服务层
│   │   ├── template			# 消息模板
│   │   ├── utils			    # 工具类
│   │   └── index.js			# 入口文件
│   ├── package.json			# 项目依赖
│   └── wrangler.toml			# 项目配置
│
└── mail-web				    # React 前端项目
    ├── src
    │   ├── api 			    # api接口
    │   ├── components			# 自定义组件
    │   ├── i18n			    # 语言国际化
    │   ├── lib			    # 请求、权限、工具类
    │   ├── pages			    # 页面组件
    │   ├── store			    # 全局状态管理
    │   ├── App.tsx			    # 入口组件
    │   ├── main.tsx			    # 入口 tsx
    │   └── styles.css			# 全局css
    ├── package.json			# 项目依赖
    └── .env.release			# 发布环境配置
```

## 本地调试

### 环境准备

本项目分为两个独立目录：`mail-web` 是 React + HeroUI 前端，`mail-worker` 是 Cloudflare Workers 后端。建议使用 Node.js 20+ 和 pnpm。

如果本机还没有 pnpm，可以先启用 Corepack：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

首次拉取项目后分别安装依赖：

```bash
pnpm --prefix mail-web install
pnpm --prefix mail-worker install
```

复制本地 Wrangler 配置模板，再填入自己的 Cloudflare 资源 ID、域名、管理员邮箱和 `jwt_secret`：

```bash
cp mail-worker/wrangler-dev.example.toml mail-worker/wrangler-dev.toml
cp mail-worker/wrangler.example.toml mail-worker/wrangler.toml
cp mail-worker/wrangler-test.example.toml mail-worker/wrangler-test.toml
```

`mail-worker/wrangler.toml`、`mail-worker/wrangler-dev.toml`、`mail-worker/wrangler-test.toml` 是本地私有配置，已经被 `.gitignore` 忽略，不会影响本地 `dev`、`deploy`、`deploy:test` 命令。

### 前端热更新调试

前端开发环境读取 `mail-web/.env.dev`，默认把接口请求转发到 `http://127.0.0.1:8787/api`。因此本地调试时建议开两个终端：

```bash
pnpm --prefix mail-worker run dev
```

```bash
pnpm --prefix mail-web run dev
```

打开：

```text
http://localhost:3001
```

如果是第一次启动本地 Worker，需要先初始化 D1 表结构。`<jwt_secret>` 使用 `mail-worker/wrangler-dev.toml` 里的 `[vars].jwt_secret`：

```bash
curl http://127.0.0.1:8787/init/<jwt_secret>
```

返回 `success` 后再打开前端登录页。管理员账号由 `wrangler-dev.toml` 的 `[vars].admin` 决定。

### Worker 一体化预览

如果想预览“Worker + 静态资源”的真实部署形态，先构建前端。`mail-web/.env.release` 已经把 `VITE_OUT_DIR` 指向 `../mail-worker/dist`：

```bash
pnpm --prefix mail-web run build
pnpm --prefix mail-worker run dev
```

打开：

```text
http://127.0.0.1:8787
```

这时前端和 `/api` 会从同一个 Worker 地址访问，更接近 Cloudflare 上的生产环境。

### 常用前端命令

```bash
# 本地开发，接口默认指向 127.0.0.1:8787/api
pnpm --prefix mail-web run dev

# 使用 mail-web/.env.remote，接口默认指向远程服务
pnpm --prefix mail-web run remote

# 生产构建，默认输出到 mail-worker/dist
pnpm --prefix mail-web run build

# 预览 Vite 构建产物
pnpm --prefix mail-web run preview
```

## 部署到 Cloudflare

### 1. 登录 Cloudflare

```bash
pnpm --prefix mail-worker exec wrangler login
```

### 2. 创建 Cloudflare 资源

根据你的项目需要创建 D1、KV、R2。命令里的资源名可以改成自己的名字，创建后把 Wrangler 返回的 ID 填到 `mail-worker/wrangler.toml`。

```bash
pnpm --prefix mail-worker exec wrangler d1 create cloud-mail
pnpm --prefix mail-worker exec wrangler kv namespace create kv
pnpm --prefix mail-worker exec wrangler r2 bucket create cloud-mail
```

如果暂时不需要附件存储，可以先不配置 R2；需要 Workers AI 验证码识别时保留 `[ai] binding = "ai"`。

### 3. 配置 `mail-worker/wrangler.toml`

`mail-worker/wrangler.toml` 从 `mail-worker/wrangler.example.toml` 复制而来，本地保留即可，不要提交真实配置。部署前至少检查这些配置：

- `name`：Worker 名称。
- `[[d1_databases]]`：`database_name` 和 `database_id` 填 Cloudflare D1 返回值，`binding = "db"` 不要改。
- `[[kv_namespaces]]`：`id` 填 KV namespace ID，`binding = "kv"` 不要改。
- `[[r2_buckets]]`：`bucket_name` 填 R2 bucket 名，`binding = "r2"` 不要改。
- `[vars].domain`：你的收信域名数组，例如 `["example.com"]`。
- `[vars].admin`：初始化后的管理员邮箱，例如 `admin@example.com`。
- `[vars].jwt_secret`：初始化接口和登录签名使用的密钥，请换成足够长的随机字符串。
- `[assets]`：保持 `directory = "./dist"`；部署时会自动把前端构建到这里。

如果使用 API Token 部署，Wrangler 可能无法自动读取账号列表。这时需要二选一补上 Cloudflare Account ID：

```bash
CLOUDFLARE_ACCOUNT_ID=你的账号ID pnpm --prefix mail-worker run deploy
```

或者在对应的 `wrangler.toml` / `wrangler-test.toml` 顶层增加：

```toml
account_id = "你的账号ID"
```

如需绑定自定义域名，可以在 `wrangler.toml` 中增加：

```toml
[[routes]]
pattern = "mail.example.com"
custom_domain = true
```

### 4. 部署

`mail-worker/wrangler.toml` 里的 `[build]` 会自动执行前端构建：

```toml
[build]
command = "pnpm --prefix ../mail-web install && pnpm --prefix ../mail-web run build"
```

所以生产部署只需要在 Worker 目录执行：

```bash
pnpm --prefix mail-worker install
pnpm --prefix mail-worker run deploy
```

如果要部署测试配置，可以使用 `deploy:test`。`test` 脚本也保留为兼容别名，它同样会执行测试环境部署，不是单元测试：

```bash
pnpm --prefix mail-worker run deploy:test
```

### 5. 初始化数据库

首次部署成功后访问初始化接口，`<jwt_secret>` 必须和 `wrangler.toml` 里的 `[vars].jwt_secret` 一致：

```bash
curl https://你的域名/api/init/<jwt_secret>
```

返回 `success` 表示 D1 表结构、默认设置、权限和管理员账号已经初始化完成。

### 6. 配置邮件接收

Cloud Mail 的 Worker 暴露了 `email` 处理函数。要接收邮件，需要在 Cloudflare 控制台为你的域名开启 Email Routing，并把需要接收的地址或 Catch-all 规则转发到这个 Worker。

完成后即可使用 `wrangler.toml` 里 `[vars].admin` 对应的邮箱登录后台，再在“设置 / 系统设置”里继续配置发信、附件、推送、验证码识别等功能。

## 赞助

<a href="https://doc.skymail.ink/support.html" >
<img width="170px" src="./doc/images/support.png" alt="">
</a>

## 许可证

本项目采用 [MIT](LICENSE) 许可证	


## 交流

[Telegram](https://t.me/cloud_mail_tg)
