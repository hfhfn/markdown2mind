const express = require('express');
const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
const multer = require('multer');

const app = express();
const port = 3000;

// 挂载目录路径
const MOUNT_DIR = '/app/output/markmap';
const HTML_DIR = path.join(MOUNT_DIR, 'html');
// const LIBS_DIR = path.join(MOUNT_DIR, 'libs'); // 新增：本地资源目录
const LIBS_DIR = path.join(__dirname, 'libs'); // 当前文件目录下的libs 目录

// 确保目录存在
fs.mkdirSync(HTML_DIR, {recursive: true});
fs.mkdirSync(LIBS_DIR, {recursive: true}); // 创建 libs 目录

// 配置 multer 用于文件上传
const upload = multer({dest: '/tmp/uploads/'});

app.use(express.json());

// 新增：静态资源路由（用于提供本地化的 JS 文件）
app.use('/markmap/libs', express.static(LIBS_DIR));

// JSON 方式：传入 Markdown 文本
app.post('/markmap/json', async (req, res) => {
    const {markdown, fileType = 'html'} = req.body;

    if (!markdown) {
        return res.status(400).json({error: '缺少 markdown 参数'});
    }

    await generateMarkmap(markdown, fileType, res);
});

// 文件上传方式：传入 Markdown 文件
app.post('/markmap/upload', upload.single('markdownFile'), async (req, res) => {
    const {fileType = 'html'} = req.body;

    if (!req.file) {
        return res.status(400).json({error: '未上传文件'});
    }

    // 读取上传的 Markdown 文件内容
    const markdown = fs.readFileSync(req.file.path, 'utf8');

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    await generateMarkmap(markdown, fileType, res);
});

// 生成 Markmap 的逻辑（修改后）
async function generateMarkmap(markdown, fileType, res) {
    // 生成唯一的文件名
    const fileName = `markmap_${Date.now()}`;
    const tempFilePath = path.join('/tmp', `${fileName}.md`);
    const htmlFilePath = path.join(HTML_DIR, `${fileName}.html`);

    // 1. 将 Markdown 写入临时文件
    fs.writeFileSync(tempFilePath, markdown);

    // 2. 使用 markmap-cli 生成原始 HTML
    await execPromise(`markmap ${tempFilePath} -o ${htmlFilePath}`);
    // 删除临时 Markdown 文件
    fs.unlinkSync(tempFilePath);

    // 3. 读取生成的 HTML
    let html = fs.readFileSync(htmlFilePath, 'utf8');

    // 4. 判断本地是否存在对应资源， 从而替换 CDN 资源为本地路径
    const replaceResource = (html, cdnUrl, localPath) => {
        const localFullPath = path.join(LIBS_DIR, localPath);
        if (fs.existsSync(localFullPath)) {
            // 本地存在资源，替换为本地路径
            const regex = new RegExp(cdnUrl.replace(/[.*+?^${}()|[$$\$$\/\\]/g, '\\$&'), 'g');
            return html.replace(regex, `/markmap/libs/${localPath}`);
        } else {
            // 本地不存在资源，保留 CDN 路径
            return html;
        }
    };

    html = replaceResource(html, 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', 'd3.min.js');
    html = replaceResource(html, 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js', 'markmap-view.js');
    html = replaceResource(html, 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js', 'markmap-toolbar.js');
    html = replaceResource(html, 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css', 'markmap-toolbar.css');
    html = replaceResource(html, 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/default.min.css', 'highlightjs-default.css');

    // // 5. 移除被 CSP 拦截的非必要资源（如 Toolbar CSS），这里全部替换本地资源，不做移除
    // html = html.replace(/<link[^>]*markmap-toolbar[^>]*>/, '');
    // html = html.replace(/<link[^>]*highlightjs[^>]*>/, '');

    // 6. 写回修改后的 HTML
    fs.writeFileSync(htmlFilePath, html);

    res.json({
        markdown: `[查看 Markmap HTML](http://localhost/mind-html/${fileName}.html)`
    });
}

// 封装 exec 为 Promise
function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error) => error ? reject(error) : resolve());
    });
}

app.listen(port, () => {
    console.log(`服务已启动，访问 http://localhost/markmap/json 或 http://localhost/markmap/upload`);
});