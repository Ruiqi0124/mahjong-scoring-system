const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const fs = require('fs');

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
        score: Number,
        pt: Number
    }]
});

const scheduleSchema = new mongoose.Schema({
    playerName: { type: String, required: true },
    date: { type: Date, required: true },
    times: [{ type: String, enum: ['afternoon', 'evening', 'night'] }],
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
        const games = await Game.find().sort({ time: -1 });
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
        const { players } = req.body;

        if (!players || !Array.isArray(players) || players.length !== 4) {
            console.log('Invalid game data received');
            return res.status(400).json({ error: '数据格式不正确' });
        }

        // 验证每个玩家的数据
        for (const player of players) {
            if (!player.name || typeof player.score !== 'number') {
                return res.status(400).json({ error: '玩家数据不完整' });
            }
        }

        // 计算PT
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const firstScore = sortedPlayers[0].score;
        const sameScoreWithFirst = sortedPlayers[1].score === firstScore;

        const playersWithPT = sortedPlayers.map((player, index) => {
            const basePT = (player.score - 30000) / 1000;
            let rankPT = 0;
            switch(index + 1) {
                case 1:
                    rankPT = sameScoreWithFirst ? 25 : 45;
                    break;
                case 2:
                    rankPT = sameScoreWithFirst ? 25 : 5;
                    break;
                case 3:
                    rankPT = -15;
                    break;
                case 4:
                    rankPT = -35;
                    break;
            }
            return {
                ...player,
                pt: basePT + rankPT
            };
        });

        const game = new Game({
            time: new Date(),
            players: playersWithPT
        });

        await game.save();
        console.log('Game saved successfully:', game);
        res.status(201).json(game);
    } catch (err) {
        console.error('保存比赛记录错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 删除比赛记录
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

// 更新比赛时间
app.patch('/api/games/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { timestamp } = req.body;
        
        if (!timestamp) {
            return res.status(400).json({ error: '时间戳不能为空' });
        }

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ error: '找不到该对局记录' });
        }

        game.time = new Date(timestamp);
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

// 添加时间安排
app.post('/api/schedules', async (req, res) => {
    console.log('Received POST request for /api/schedules:', req.body);
    try {
        await connectDB();
        const schedule = new Schedule(req.body);
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

// 团队数据
const teams = [];
const teamMatches = [];

// 获取所有团队
app.get('/api/teams', (req, res) => {
    res.json(teams);
});

// 创建团队
app.post('/api/teams', async (req, res) => {
    const { name, members } = req.body;

    // 检查团队名是否已存在
    if (teams.some(team => team.name === name)) {
        return res.status(400).json({ error: '团队名称已存在' });
    }

    // 创建新团队
    const newTeam = {
        name,
        members,
        games: 0,
        wins: 0,
        winRate: 0,
        totalPT: 0,
        avgPT: 0,
        createTime: new Date().toISOString()
    };

    teams.push(newTeam);
    await saveData();
    res.json(newTeam);
});

// 删除团队
app.delete('/api/teams/:name', async (req, res) => {
    const teamName = req.params.name;
    const teamIndex = teams.findIndex(team => team.name === teamName);

    if (teamIndex === -1) {
        return res.status(404).json({ error: '团队不存在' });
    }

    // 检查团队是否有比赛记录
    if (teams[teamIndex].games > 0) {
        return res.status(400).json({ error: '无法删除已参赛的团队' });
    }

    teams.splice(teamIndex, 1);
    await saveData();
    res.json({ success: true });
});

// 获取团队比赛记录
app.get('/api/team-matches', (req, res) => {
    res.json(teamMatches);
});

// 记录团队比赛
app.post('/api/team-matches', async (req, res) => {
    const { time, teams: matchTeams } = req.body;

    // 验证参赛团队
    for (const matchTeam of matchTeams) {
        const team = teams.find(t => t.name === matchTeam.name);
        if (!team) {
            return res.status(400).json({ error: `团队"${matchTeam.name}"不存在` });
        }
    }

    // 记录比赛
    const match = {
        time,
        teams: matchTeams,
        id: Date.now().toString()
    };

    // 更新团队统计数据
    matchTeams.forEach((matchTeam, index) => {
        const team = teams.find(t => t.name === matchTeam.name);
        team.games++;
        team.totalPT += matchTeam.pt;
        team.avgPT = team.totalPT / team.games;
        if (index === 0) {
            team.wins++;
        }
        team.winRate = team.wins / team.games;
    });

    teamMatches.push(match);
    await saveData();
    res.json(match);
});

// 保存数据到文件
async function saveData() {
    const data = {
        players: await Player.find().exec(),
        matches: await Game.find().exec(),
        teams,
        teamMatches
    };
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// 从文件加载数据
async function loadData() {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        await Player.deleteMany().exec();
        await Game.deleteMany().exec();
        teams.length = 0;
        teamMatches.length = 0;
        await Player.create(data.players);
        await Game.create(data.matches);
        if (data.teams) teams.push(...data.teams);
        if (data.teamMatches) teamMatches.push(...data.teamMatches);
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 初始化时加载数据
loadData().catch(error => {
    console.error('初始化数据失败:', error);
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