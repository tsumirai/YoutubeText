# YouTube 视频字幕 AI 重写工具

这是一个部署在 Cloudflare Pages 上的项目，能够自动获取 YouTube 视频字幕，结合 Google Gemini AI 将字幕内容整理为结构化的 HTML 文章，并以流式方式输出到 Web 页面。

## 功能特性
- 自动获取 YouTube 视频的字幕（无需手动下载）
- 利用 Google Gemini AI 将原始字幕重写为可读性强的深度文章
- 流式输出生成结果，页面实时显示内容
- 简洁的 Web 界面，支持 Gemini API 密钥和 YouTube URL 输入

## 项目结构
```
YoutubeText/
├── functions/
│   └── api/
│       └── generate.js   # Cloudflare Pages 函数，处理字幕获取和 AI 生成逻辑
├── index.html            # 前端页面，用户交互界面
├── package.json         # 项目依赖和脚本配置
```

## 快速开始
### 1. 安装依赖
```bash
npm install
```

### 2. 配置
需要准备：
- Google Gemini API 密钥（可在 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取）
- Cloudflare Pages 账号（用于部署）

### 3. 本地开发
使用 Wrangler 启动本地开发服务器：
```bash
npm run dev
```
访问 `http://localhost:8788` 即可使用项目。

### 4. 部署到 Cloudflare Pages
```bash
npm run deploy
```
部署完成后，通过 Cloudflare 分配的域名访问项目。

## 使用说明
1. 打开项目页面
2. 填写 `Gemini API Key`（需要有效的 API 密钥）
3. 粘贴要处理的 YouTube 视频 URL
4. 点击「开始生成」按钮
5. 页面将实时显示 AI 生成的结构化文章，生成完成后会自动停止

## 技术栈
- **前端**: HTML5 + Tailwind CSS
- **后端**: Cloudflare Pages Functions (Serverless)
- **AI 模型**: Google Gemini 2.5 Flash
- **字幕获取**: youtube-transcript 库
- **流式通信**: Server-Sent Events (SSE)

## 注意事项
- 需要确保 YouTube 视频有公开可用的字幕
- Gemini API 密钥需要有足够的调用额度
- Cloudflare 地域限制可能会影响部分功能使用" 


