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
        if (mongoose.connections[0].readyState) {
            console.log('Using existing MongoDB connection');
            return;
        }
        
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(mongoUri, {
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
    console.log('Received GET request for /api/players');
    try {
        await connectDB();
        const players = await Player.find().sort({ name: 1 });
        console.log('Successfully retrieved players:', players.length);
        res.json(players.map(p => p.name));
    } catch (err) {
        console.error('获取玩家列表错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 添加新玩家
app.post('/api/players', async (req, res) => {
    console.log('Received POST request for /api/players:', req.body);
    try {
        await connectDB();
        const { name } = req.body;
        
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            console.log('Invalid player name received');
            return res.status(400).json({ error: '玩家名称不能为空' });
        }

        const trimmedName = name.trim();
        console.log('Checking if player exists:', trimmedName);
        
        // 检查玩家是否已存在
        const existingPlayer = await Player.findOne({ name: trimmedName });
        if (existingPlayer) {
            console.log('Player already exists:', trimmedName);
            return res.status(400).json({ error: '该玩家已存在' });
        }

        console.log('Creating new player:', trimmedName);
        const player = new Player({ name: trimmedName });
        await player.save();
        console.log('Player created successfully:', player);
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
    console.log('Received GET request for /api/games');
    try {
        await connectDB();
        const games = await Game.find().sort({ timestamp: -1 });
        console.log('Successfully retrieved games:', games.length);
        res.json(games);
    } catch (err) {
        console.error('获取比赛记录错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 添加新比赛记录
app.post('/api/games', async (req, res) => {
    console.log('Received POST request for /api/games:', req.body);
    try {
        await connectDB();
        const { players, scores } = req.body;

        if (!players || !scores || players.length !== 4 || scores.length !== 4) {
            console.log('Invalid game data received');
            return res.status(400).json({ error: '数据格式不正确' });
        }

        const game = new Game({
            players: players.map((name, index) => ({
                name,
                score: scores[index]
            }))
        });
        await game.save();
        console.log('Game saved successfully:', game);
        res.status(201).json(game);
    } catch (err) {
        console.error('保存比赛记录错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 删除玩家
app.delete('/api/players/:name', async (req, res) => {
    console.log('Received DELETE request for player:', req.params.name);
    try {
        await connectDB();
        const playerName = req.params.name;
        
        // 检查玩家是否存在
        const player = await Player.findOne({ name: playerName });
        if (!player) {
            console.log('Player not found:', playerName);
            return res.status(404).json({ error: '玩家不存在' });
        }

        // 检查玩家是否参与过比赛
        const games = await Game.find({ 'players.name': playerName });
        if (games.length > 0) {
            console.log('Cannot delete player with game records:', playerName);
            return res.status(400).json({ error: '无法删除已参与比赛的玩家' });
        }

        // 删除玩家
        await Player.deleteOne({ name: playerName });
        console.log('Player deleted successfully:', playerName);
        res.json({ message: '玩家删除成功' });
    } catch (err) {
        console.error('删除玩家错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
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