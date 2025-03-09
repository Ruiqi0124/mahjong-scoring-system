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
    time: { type: Date, default: Date.now },
    players: [{
        name: String,
        score: Number
    }]
});

const scheduleSchema = new mongoose.Schema({
    playerName: { type: String, required: true },
    date: { type: Date, required: true },
    times: [{ type: String, enum: ['morning', 'afternoon', 'evening'] }],
    repeatMode: { type: String, enum: ['once', 'weekly'], default: 'once' },
    note: String
});

// 确保模型只被创建一次
let Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
let Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
let Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

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
            time: new Date(),
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

// 删除对局
app.delete('/api/games/:id', async (req, res) => {
    console.log('Received DELETE request for game:', req.params.id);
    try {
        await connectDB();
        const gameId = req.params.id;
        
        // 检查对局是否存在
        const game = await Game.findById(gameId);
        if (!game) {
            console.log('Game not found:', gameId);
            return res.status(404).json({ error: '对局不存在' });
        }

        // 删除对局
        await Game.findByIdAndDelete(gameId);
        console.log('Game deleted successfully:', gameId);
        res.json({ message: '对局删除成功' });
    } catch (err) {
        console.error('删除对局错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 更新对局时间
app.put('/api/games/:id/time', async (req, res) => {
    try {
        const { id } = req.params;
        const { time } = req.body;

        if (!time) {
            return res.status(400).json({ error: '时间不能为空' });
        }

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: '找不到该对局记录' });
        }

        game.time = new Date(time);
        await game.save();

        res.json(game);
    } catch (error) {
        console.error('更新时间失败:', error);
        res.status(500).json({ error: '更新时间失败' });
    }
});

// 获取时间安排列表
app.get('/api/schedules', async (req, res) => {
    console.log('Received GET request for /api/schedules');
    try {
        await connectDB();
        const schedules = await Schedule.find();
        console.log('Successfully retrieved schedules:', schedules.length);
        res.json(schedules);
    } catch (err) {
        console.error('获取时间安排错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 添加新时间安排
app.post('/api/schedules', async (req, res) => {
    console.log('Received POST request for /api/schedules:', req.body);
    try {
        await connectDB();
        const { playerName, date, times, repeatMode, note } = req.body;

        if (!playerName || !date || !times || times.length === 0) {
            console.log('Invalid schedule data received');
            return res.status(400).json({ error: '数据格式不正确' });
        }

        const schedule = new Schedule({
            playerName,
            date: new Date(date),
            times,
            repeatMode,
            note
        });
        await schedule.save();
        console.log('Schedule saved successfully:', schedule);
        res.status(201).json(schedule);
    } catch (err) {
        console.error('保存时间安排错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 删除时间安排
app.delete('/api/schedules/:id/:time', async (req, res) => {
    console.log('Received DELETE request for /api/schedules');
    try {
        await connectDB();
        const { id, time } = req.params;

        const schedule = await Schedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ error: '找不到该时间安排' });
        }

        // 从时间列表中移除指定时间
        schedule.times = schedule.times.filter(t => t !== time);

        // 如果没有剩余时间，删除整个记录
        if (schedule.times.length === 0) {
            await Schedule.findByIdAndDelete(id);
        } else {
            await schedule.save();
        }

        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除时间安排错误:', err);
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