# Markmap Service

一个基于 Express.js 的思维导图生成服务，可以将 Markdown 文本转换为交互式的思维导图 HTML 文件。

## 功能特性

- 📝 支持 Markdown 文本转思维导图
- 📁 支持文件上传方式
- 🌐 生成独立的 HTML 文件，可离线使用
- 🎨 支持语法高亮和工具栏
- 🐳 Docker 容器化部署
- 🔄 智能静态资源管理

## 快速开始

### 使用 Docker Compose（推荐）

1. 克隆项目
```bash
git clone <repository-url>
cd markmap-service
```

2. 启动服务
```bash
docker-compose up --build
```

3. 服务将在端口 3000 启动

### 本地开发

1. 安装依赖
```bash
npm install
```

2. 准备静态资源（见下方说明）

3. 启动服务
```bash
npm start
```

## API 接口

### 1. JSON 方式提交

**POST** `/markmap/json`

**参数说明：**
- `markdown`: Markdown 文本内容（必需）
- `fileType`: 输出格式，默认 "html"
- `offline`: 是否使用离线模式，默认 `true`（可选）

```bash
# 默认离线模式（推荐）- 生成完全独立的HTML文件
curl -X POST http://localhost:3000/markmap/json \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 我的思维导图\n\n## 第一章节\n- 要点1\n- 要点2\n\n## 第二章节\n- 功能A\n- 功能B",
    "fileType": "html"
  }'

# 显式控制模式
curl -X POST http://localhost:3000/markmap/json \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 我的思维导图\n\n## 第一章节\n- 要点1\n- 要点2\n\n## 第二章节\n- 功能A\n- 功能B",
    "fileType": "html",
    "offline": false
  }'
```

### 2. 文件上传方式

**POST** `/markmap/upload`

**参数说明：**
- `markdownFile`: Markdown 文件（必需）
- `fileType`: 输出格式，默认 "html"
- `offline`: 是否使用离线模式，默认 `true`（可选）

```bash
# 默认离线模式
curl -X POST http://localhost:3000/markmap/upload \
  -F "markdownFile=@example.md" \
  -F "fileType=html"

# 指定使用本地资源模式
curl -X POST http://localhost:3000/markmap/upload \
  -F "markdownFile=@example.md" \
  -F "fileType=html" \
  -F "offline=false"
```

## 生成模式说明

### 🚀 离线模式（默认，推荐）

**特点：**
- 使用 `markmap --offline` 参数
- 所有CSS和JavaScript资源内联到HTML文件中
- 生成完全独立的单个HTML文件
- 无需外部依赖，可直接分发使用

**优势：**
- ✅ 单文件分发，便于共享
- ✅ 完全离线使用
- ✅ 加载速度快（无网络请求）
- ✅ 文件自包含，不依赖服务器

**适用场景：**
- 文档分发和共享
- 离线演示
- 邮件附件
- 单独使用的思维导图

### 📦 本地资源模式（备用）

**特点：**
- 使用共享的 `libs` 目录存储静态资源
- HTML文件引用相对路径的外部资源
- 支持动态base路径，兼容文件和HTTP访问

**优势：**
- ✅ 多个HTML文件共享资源，节省空间
- ✅ 可自定义静态资源
- ✅ 支持nginx代理访问
- ✅ 便于批量生成和管理

**适用场景：**
- 服务器部署
- 批量生成大量文件
- 需要自定义资源的场景

### 模式控制

**环境变量：**
```bash
# 默认启用离线模式
MARKMAP_OFFLINE=true

# 禁用离线模式，使用本地资源
MARKMAP_OFFLINE=false
```

**API参数：**
```json
{
  "markdown": "# 内容",
  "offline": true   // true=离线模式, false=本地资源模式
}
```

## 静态资源配置（本地资源模式）

### 自动资源管理

当使用本地资源模式时，服务会自动管理静态资源：
- 首次生成时，自动将 `src/libs/` 下的资源复制到 `output/markmap/html/libs/`
- 所有生成的 HTML 文件共享同一个 `libs` 目录
- 生成的 HTML 文件使用相对路径，配合动态base标签支持多种访问方式

### 必需的静态资源文件

在 `src/libs/` 目录下需要以下文件：

| 文件名 | 来源 | 用途 |
|--------|------|------|
| `d3.min.js` | D3.js 库 | 数据可视化核心库 |
| `markmap-view.js` | Markmap 视图库 | 思维导图渲染 |
| `markmap-toolbar.js` | Markmap 工具栏 | 交互工具栏 |
| `markmap-toolbar.css` | 工具栏样式 | 工具栏样式 |
| `highlightjs-default.css` | 代码高亮样式 | 语法高亮 |

### 下载静态资源

如果 `src/libs/` 目录下缺少资源文件，请使用以下命令下载：

```bash
# 进入 libs 目录
cd src/libs/

# 下载所需资源
wget https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js -O d3.min.js
wget https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js -O markmap-view.js
wget https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js -O markmap-toolbar.js
wget https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css -O markmap-toolbar.css
wget https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/default.min.css -O highlightjs-default.css
```

## Nginx 配置

如果使用 Nginx 代理，建议使用以下配置：

```nginx
# 思维导图文件访问
location /mind-html/ {
    alias /usr/share/nginx/html/output/markmap/html/;
    expires 1y;
    try_files $uri $uri/ =404;
}
```

**路径说明**：
- 宿主机路径：`app/output/markmap/html/` （与markmap-service同级）
- 容器内路径：`/app/output/markmap/html/`
- Nginx路径：`/usr/share/nginx/html/output/markmap/html/` （通过卷映射）

## 文件结构

```
app/
├── markmap-service/      # 项目主目录
│   ├── src/
│   │   ├── index.js      # 主服务文件
│   │   └── libs/         # 静态资源目录
│   │       ├── d3.min.js
│   │       ├── markmap-view.js
│   │       ├── markmap-toolbar.js
│   │       ├── markmap-toolbar.css
│   │       └── highlightjs-default.css
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
└── output/               # 输出目录（与markmap-service同级）
    └── markmap/
        └── html/         # 生成的HTML文件
            ├── libs/     # 共享静态资源
            ├── markmap_xxx.html
            └── markmap_yyy.html
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `HTML_DIR` | `/app/output/markmap/html` | HTML输出目录（容器内路径） |
| `LIBS_DIR` | `./src/libs` | 静态资源目录（相对于app目录） |

**注意**：在实际部署中，`output` 目录与 `markmap-service` 目录是同级的（都在app目录下），容器通过卷映射将宿主机的 `app/output` 目录挂载到容器内的 `/app/output`。

## 故障排除

### 1. 静态资源加载失败

**问题**：浏览器控制台显示 MIME 类型错误
```
Refused to apply style from '...' because its MIME type ('text/html') is not a supported stylesheet MIME type
```

**解决方案**：
- 检查 `src/libs/` 目录下是否有所需的静态资源文件
- 确保 Nginx 配置正确设置了 MIME 类型
- 重启服务以重新复制静态资源

### 2. Docker 构建失败

**问题**：网络连接问题导致构建失败

**解决方案**：
- 检查网络连接
- 使用国内 Docker 镜像源
- 重试构建命令

### 3. 生成的 HTML 文件无法正常显示

**问题**：思维导图不显示或功能异常

**解决方案**：
- 检查静态资源文件是否完整
- 确保 HTML 文件和 libs 目录在同一层级
- 检查浏览器控制台的错误信息

## 开发说明

### 技术栈

- **后端**：Node.js + Express.js
- **思维导图**：markmap-cli
- **容器化**：Docker + Docker Compose
- **文件处理**：multer

### 核心逻辑

1. 接收 Markdown 内容（JSON 或文件上传）
2. 使用 markmap-cli 生成基础 HTML
3. 替换 CDN 资源链接为本地路径
4. 复制静态资源到共享目录（首次）
5. 返回生成的 HTML 文件路径

## 许可证

[MIT License](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！