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

// 注释掉静态资源路由，因为现在使用相对路径访问本地文件
// app.use('/markmap/libs', express.static(LIBS_DIR));

// JSON 方式：传入 Markdown 文本
app.post('/markmap/json', async (req, res) => {
    const {markdown, fileType = 'html', offline} = req.body;

    if (!markdown) {
        return res.status(400).json({error: '缺少 markdown 参数'});
    }

    // 设置离线模式（可通过请求参数覆盖环境变量）
    if (offline !== undefined) {
        process.env.MARKMAP_OFFLINE = offline ? 'true' : 'false';
    }

    await generateMarkmap(markdown, fileType, res);
});

// 文件上传方式：传入 Markdown 文件
app.post('/markmap/upload', upload.single('markdownFile'), async (req, res) => {
    const {fileType = 'html', offline} = req.body;

    if (!req.file) {
        return res.status(400).json({error: '未上传文件'});
    }

    // 设置离线模式（可通过请求参数覆盖环境变量）
    if (offline !== undefined) {
        process.env.MARKMAP_OFFLINE = offline ? 'true' : 'false';
    }

    // 直接使用上传的临时文件，不需要重复读写
    await generateMarkmapFromFile(req.file.path, fileType, res);
});

// 生成 Markmap 的逻辑（从Markdown内容）
async function generateMarkmap(markdown, fileType, res) {
    // 生成唯一的文件名
    const fileName = `markmap_${Date.now()}`;
    const tempFilePath = path.join('/tmp', `${fileName}.md`);
    const htmlFilePath = path.join(HTML_DIR, `${fileName}.html`);

    try {
        // 1. 将 Markdown 写入临时文件
        fs.writeFileSync(tempFilePath, markdown);

        // 2. 调用通用处理函数
        await processMarkmapFile(tempFilePath, htmlFilePath, fileName, fileType, res, true);
    } catch (error) {
        console.error('生成 Markmap 时出错:', error);
        res.status(500).json({error: '生成 Markmap 失败', details: error.message});
    }
}

// 生成 Markmap 的逻辑（从文件路径）
async function generateMarkmapFromFile(filePath, fileType, res) {
    // 生成唯一的文件名
    const fileName = `markmap_${Date.now()}`;
    const htmlFilePath = path.join(HTML_DIR, `${fileName}.html`);

    try {
        // 直接使用已存在的文件
        await processMarkmapFile(filePath, htmlFilePath, fileName, fileType, res, true);
    } catch (error) {
        console.error('生成 Markmap 时出错:', error);
        res.status(500).json({error: '生成 Markmap 失败', details: error.message});
    }
}

// 通用的 Markmap 文件处理函数
async function processMarkmapFile(tempFilePath, htmlFilePath, fileName, fileType, res, shouldDeleteTemp) {
    const sharedLibsDir = path.join(HTML_DIR, 'libs');

    // 1. 检查是否使用离线模式（默认启用）
    const useOfflineMode = process.env.MARKMAP_OFFLINE !== 'false'; // 环境变量控制，默认为true

    if (useOfflineMode) {
        // 离线模式：使用 --offline 参数生成完全独立的HTML文件
        console.log(`✅ 使用离线模式生成: ${fileName}.html`);
        await execPromise(`markmap ${tempFilePath} -o ${htmlFilePath} --offline`);

        // 删除临时 Markdown 文件（如果需要）
        if (shouldDeleteTemp) {
            fs.unlinkSync(tempFilePath);
        }

        res.json({
            markdown: `[查看 Markmap HTML](http://localhost/mind-html/${fileName}.html)`,
            note: `HTML文件已生成（离线模式），所有资源已内联，可以独立使用: ${htmlFilePath}`,
            mode: 'offline'
        });
        return;
    }

    // 本地资源模式：使用普通markmap命令，然后替换CDN链接
    console.log(`📦 使用本地资源模式生成: ${fileName}.html`);
    await execPromise(`markmap ${tempFilePath} -o ${htmlFilePath}`);

    // 删除临时 Markdown 文件（如果需要）
    if (shouldDeleteTemp) {
        fs.unlinkSync(tempFilePath);
    }

    // 本地资源模式的处理逻辑（备用方案）

    // 4. 确保共享的libs目录存在，并复制静态资源（只在第一次时复制）
    if (!fs.existsSync(sharedLibsDir)) {
        fs.mkdirSync(sharedLibsDir, {recursive: true});

        // 复制所有静态资源到共享libs目录
        const resourceFiles = [
            'd3.min.js',
            'markmap-view.js',
            'markmap-toolbar.js',
            'markmap-toolbar.css',
            'highlightjs-default.css'
        ];

        resourceFiles.forEach(fileName => {
            const sourceFilePath = path.join(LIBS_DIR, fileName);
            const targetFilePath = path.join(sharedLibsDir, fileName);

            if (fs.existsSync(sourceFilePath)) {
                fs.copyFileSync(sourceFilePath, targetFilePath);
                console.log(`已复制静态资源: ${fileName}`);
            } else {
                console.warn(`警告: 本地资源文件不存在: ${sourceFilePath}`);
            }
        });
    }

    // 5. 读取生成的 HTML
    let html = fs.readFileSync(htmlFilePath, 'utf8');

    // 6. 替换CDN资源为相对路径，配合动态base标签使用
    const replaceCdnWithLocal = (html, cdnUrl, localFileName) => {
        const regex = new RegExp(cdnUrl.replace(/[.*+?^${}()|[$$\$$\/\\]/g, '\\$&'), 'g');
        return html.replace(regex, `libs/${localFileName}`);
    };

    html = replaceCdnWithLocal(html, 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js', 'd3.min.js');
    html = replaceCdnWithLocal(html, 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js', 'markmap-view.js');
    html = replaceCdnWithLocal(html, 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js', 'markmap-toolbar.js');
    html = replaceCdnWithLocal(html, 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css', 'markmap-toolbar.css');
    html = replaceCdnWithLocal(html, 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/default.min.css', 'highlightjs-default.css');

    // 7. 在HTML头部添加base标签来处理相对路径
    html = html.replace('<head>', `<head>
    <script>
        // 动态设置base路径以支持不同的访问方式
        (function() {
            if (window.location.protocol === 'file:') {
                // 文件协议：使用相对路径
                document.write('<base href="' + window.location.href.replace(/[^/]*$/, '') + '">');
            } else {
                // HTTP协议：使用绝对路径
                document.write('<base href="/mind-html/">');
            }
        })();
    </script>`);

    // 8. 写回修改后的 HTML
    fs.writeFileSync(htmlFilePath, html);

    res.json({
        markdown: `[查看 Markmap HTML](http://localhost/mind-html/${fileName}.html)`,
        note: `HTML文件已生成，使用共享的静态资源，可以直接在浏览器中打开: ${htmlFilePath}`,
        mode: 'local-resources'
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