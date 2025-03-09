# 麻将比赛记分系统

一个简单的麻将比赛记分系统，用于记录和统计比赛成绩。

## 功能特点

- 记录四人麻将比赛成绩
- 自动计算排名和统计数据
- 支持玩家管理
- 历史记录查询
- 实时排名更新

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express
- 数据库：MongoDB
- 部署：Vercel

## 本地开发

1. 克隆仓库
```bash
git clone [repository-url]
cd mahjong-scoring-system
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env` 文件并添加以下内容：
```
MONGODB_URI=你的MongoDB连接字符串
PORT=3000
```

4. 启动开发服务器
```bash
npm run dev
```

5. 访问应用
打开浏览器访问 `http://localhost:3000`

## 部署

项目已配置为可以直接部署到 Vercel 平台。

1. 安装 Vercel CLI
```bash
npm install -g vercel
```

2. 部署到 Vercel
```bash
vercel
```

## 许可证

MIT 

## 更新日志

- 2024-03-09: 优化系统稳定性 