# ImgBad - 图床管理系统

<div align="center">

🖼️ 一个基于 S3 存储的现代化图床管理系统

支持图片上传、自动重命名、无损压缩、一键复制链接

</div>

## ✨ 特性

- 🚀 **Docker 一键部署** - 使用 Docker Compose 快速部署
- ☁️ **S3 存储支持** - 兼容 AWS S3 及所有 S3 兼容存储（MinIO、阿里云 OSS、腾讯云 COS 等）
- 📤 **图片上传** - 支持拖拽上传和批量上传
- 🔄 **自动重命名** - 重名文件自动重命名，避免覆盖
- 🗜️ **无损压缩** - 自动对 JPG、PNG、WebP 格式进行无损压缩
- 📋 **一键复制链接** - 快速复制图片公开访问链接
- 🎨 **现代化界面** - 美观的响应式界面设计
- 📱 **移动端适配** - 完美支持移动设备访问

## 🛠️ 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite
- **图片处理**: Sharp (无损压缩)
- **S3 客户端**: AWS SDK v3
- **前端**: HTML + CSS + JavaScript (原生)
- **容器化**: Docker + Docker Compose

## 📦 安装部署

### 方式一：Docker Compose 部署（推荐）

1. 克隆项目
```bash
git clone <repository-url>
cd imgbad
```

2. 启动服务
```bash
docker-compose up -d
```

3. 访问应用
打开浏览器访问：`http://localhost:3000`

### 方式二：手动部署

1. 安装依赖
```bash
npm install
```

2. 启动服务
```bash
npm start
```

或开发模式：
```bash
npm run dev
```

3. 访问应用
打开浏览器访问：`http://localhost:3000`

## 📖 使用指南

### 1. 配置 S3 存储

首次使用需要配置 S3 存储：

1. 点击右上角的 **⚙️ S3 配置** 按钮
2. 填写以下信息：
   - **Endpoint**: S3 端点地址（如 `https://s3.amazonaws.com`）
   - **Region**: 区域（如 `us-east-1`）
   - **Bucket**: 存储桶名称
   - **Access Key ID**: 访问密钥 ID
   - **Secret Access Key**: 访问密钥
   - **Public URL Prefix**: （可选）CDN 域名前缀

3. 点击 **💾 保存配置**

#### S3 兼容存储配置示例

**AWS S3**
```
Endpoint: https://s3.amazonaws.com
Region: us-east-1
Bucket: my-images
```

**MinIO**
```
Endpoint: http://localhost:9000
Region: us-east-1
Bucket: images
```

**阿里云 OSS**
```
Endpoint: https://oss-cn-hangzhou.aliyuncs.com
Region: oss-cn-hangzhou
Bucket: my-bucket
```

**腾讯云 COS**
```
Endpoint: https://cos.ap-guangzhou.myqcloud.com
Region: ap-guangzhou
Bucket: my-bucket-1234567890
```

### 2. 上传图片

- **点击上传**: 点击上传区域选择图片
- **拖拽上传**: 直接拖拽图片到上传区域
- **批量上传**: 支持一次选择多张图片上传

支持的图片格式：
- JPG/JPEG
- PNG
- GIF
- WebP
- BMP

### 3. 管理图片

- 查看所有已上传的图片
- 显示图片名称、大小、上传时间
- 点击 **📋 复制** 按钮一键复制图片链接
- 点击 **🔄 刷新** 按钮重新加载图片列表

## 🔧 环境变量

可以通过环境变量配置应用：

```env
PORT=3000
NODE_ENV=production
```

## 📂 目录结构

```
imgbad/
├── server.js           # 主服务器文件
├── database.js         # 数据库配置
├── s3Service.js        # S3 服务封装
├── package.json        # 项目依赖
├── Dockerfile          # Docker 镜像配置
├── docker-compose.yml  # Docker Compose 配置
├── public/             # 前端静态文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式文件
│   └── app.js          # 前端逻辑
├── data/               # 数据库文件目录
└── uploads/            # 临时上传目录
```

## 🔒 安全建议

1. **生产环境部署**：
   - 使用 HTTPS 加密传输
   - 配置防火墙限制访问
   - 使用强密码保护 S3 访问密钥

2. **S3 存储桶**：
   - 合理配置存储桶权限
   - 启用版本控制和日志记录
   - 配置 CORS 策略允许访问

3. **应用安全**：
   - 定期更新依赖包
   - 限制上传文件大小（当前限制 50MB）
   - 考虑添加用户认证功能

## 🚀 性能优化

- 使用 Sharp 进行高效的图片处理
- 自动无损压缩减小文件大小
- 懒加载图片提升页面性能
- 支持 CDN 加速图片访问

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 💡 常见问题

### Q: 上传后图片无法显示？
A: 检查 S3 存储桶是否配置了公开读取权限，确保图片可以被公开访问。

### Q: 如何配置 CDN？
A: 在 S3 配置中填写 **Public URL Prefix** 字段，例如：`https://cdn.example.com`

### Q: 支持哪些 S3 兼容存储？
A: 支持所有兼容 S3 API 的存储服务，包括 AWS S3、MinIO、阿里云 OSS、腾讯云 COS、华为云 OBS 等。

### Q: 图片压缩会损失质量吗？
A: 不会。系统使用无损压缩技术，在减小文件大小的同时保持图片质量。

### Q: 如何备份数据？
A: 备份 `data` 目录下的数据库文件即可。图片数据存储在 S3 中。

---

<div align="center">

Made with ❤️ by ImgBad Team

</div>
