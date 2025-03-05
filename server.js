const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 连接MongoDB
const connectDB = async () => {
    try {
        if (mongoose.connections[0].readyState) return;
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mahjong-system', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

// 定义模型
const playerSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const gameSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    players: [{
        name: String,
        score: Number
    }]
});

// 确保模型只被创建一次
let Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
let Game = mongoose.models.Game || mongoose.model('Game', gameSchema);

// API路由
// 获取所有玩家
app.get('/api/players', async (req, res) => {
    try {
        await connectDB();
        const players = await Player.find().sort({ name: 1 });
        res.json(players.map(p => p.name));
    } catch (err) {
        console.error('获取玩家列表错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 添加新玩家
app.post('/api/players', async (req, res) => {
    try {
        await connectDB();
        const { name } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: '玩家名称不能为空' });
        }

        // 检查玩家是否已存在
        const existingPlayer = await Player.findOne({ name: name.trim() });
        if (existingPlayer) {
            return res.status(400).json({ error: '该玩家已存在' });
        }

        const player = new Player({ name: name.trim() });
        await player.save();
        res.status(201).json({ name: player.name });
    } catch (err) {
        console.error('添加玩家错误:', err);
        if (err.code === 11000) {
            res.status(400).json({ error: '该玩家已存在' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// 获取所有比赛记录
app.get('/api/games', async (req, res) => {
    try {
        await connectDB();
        const games = await Game.find().sort({ timestamp: -1 });
        res.json(games);
    } catch (err) {
        console.error('获取比赛记录错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 添加新比赛记录
app.post('/api/games', async (req, res) => {
    try {
        await connectDB();
        const { players, scores } = req.body;

        if (!players || !scores || players.length !== 4 || scores.length !== 4) {
            return res.status(400).json({ error: '数据格式不正确' });
        }

        const game = new Game({
            players: players.map((name, index) => ({
                name,
                score: scores[index]
            }))
        });
        await game.save();
        res.status(201).json(game);
    } catch (err) {
        console.error('保存比赛记录错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 服务静态文件
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 为了支持 Vercel，我们需要导出 app
module.exports = app;

// 仅在本地开发时启动服务器
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
} 