# 使用 node:latest 镜像作为基础镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app/markmap-service

# # 安装 markmap-cli
# RUN npm install -g markmap-cli

# # 安装依赖
# RUN npm install express multer

# # 复制项目文件
# COPY . .

# 暴露服务端口
EXPOSE 3000

# 启动服务
CMD ["node", "src/index.js"]