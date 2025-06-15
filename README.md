## 离线显示html（若没有离线文件则会加载CDN文件，需要联网才能正常显示）
### 在服务启动前检查 `src/libs`下资源是否存在；
```json
{
  url: 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',
  file: 'd3.min.js'
}
{
  url: 'https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js',
  file: 'markmap-view.js'
}
{
  url: 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js',
  file: 'markmap-toolbar.js'
}
{
  url: 'https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css',
  file: 'markmap-toolbar.css'
}
{
  url: 'https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/default.min.css',
  file: 'highlightjs-default.css'
}
```
### 若不存在需要使用以下命令下载
```shell
wget https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js -O d3.min.js
wget https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js -O markmap-view.js
wget https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/index.js -O markmap-toolbar.js
wget https://cdn.jsdelivr.net/npm/markmap-toolbar@0.18.12/dist/style.css -O markmap-toolbar.css
wget https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.11.1/styles/default.min.css -O highlightjs-default.css
```