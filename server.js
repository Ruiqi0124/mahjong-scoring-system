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

// 团队模型
const teamSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    members: [{ type: String, required: true }],
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalPT: { type: Number, default: 0 },
    avgPT: { type: Number, default: 0 },
    createTime: { type: Date, default: Date.now },
    color: { type: String, default: '#000000' },
    season: { type: Number, default: 0 }
});

// 团队赛记录Schema
const teamMatchSchema = new mongoose.Schema({
    time: { type: Date, required: true },
    season: { type: Number, default: 0 },
    players: [{
        name: { type: String, required: true },
        team: { type: String, required: true },
        score: { type: Number, required: true },
        pt: { type: Number, required: true },
        chombo: { type: Boolean, default: false }
    }]
});

// 确保模型只被创建一次
let Player = mongoose.models.Player || mongoose.model('Player', playerSchema);
let Game = mongoose.models.Game || mongoose.model('Game', gameSchema);
let Schedule = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);

let TOTAL_SEASON_NUM = 2
let teams = []
let team_matches = []
for (let season = 0; season < TOTAL_SEASON_NUM; season++) {
    const name = season === 0 ? "" : `-S${season}`;
    teams[season] = mongoose.models[`Team${name}`] || mongoose.model(`Team${name}`, teamSchema);
    team_matches[season] = mongoose.models[`TeamMatch${name}`] || mongoose.model(`TeamMatch${name}`, teamMatchSchema);
}
function getTeam(season) {
    return teams[Math.min(Math.max(season, 0), TOTAL_SEASON_NUM - 1)];
}
function getTeamMatch(season) {
    return team_matches[Math.min(Math.max(season, 0), TOTAL_SEASON_NUM - 1)];
}

function auth(password) {
    const X = [98, 96, 104, 111, 105, 57, 59, 57];
    const T = X.map((v, i) => String.fromCharCode(v ^ (i + 3))).join('');
    password = String(password);
    if (password.length !== T.length) return false;
    for (let i = 0; i < password.length; i++) {
        if (password.charCodeAt(i) !== T.charCodeAt(i)) return false;
    }
    return true;
}

// API路由
// 验证管理员密码
app.get('/api/auth', async (req, res) => {
    console.log('Received GET request for /api/auth');
    try {
        const password = req.query.password || "";
        const result = auth(password);
        console.log('Successfully authenticated admin password:', result);
        res.json(result);
    } catch (err) {
        console.error('验证管理员密码错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 获取所有玩家
app.get('/api/players', async (req, res) => {
    console.log('Received GET request for /api/players');
    try {
        await connectDB();
        const season = req.query.season || 0;
        // 获取所有玩家
        const players = await Player.find().sort({ name: 1 });
        const Team = getTeam(season);
        // 获取所有团队
        const teams = await Team.find();

        // 为每个玩家添加所属团队信息
        const playersWithTeams = players.map(player => {
            const team = teams.find(t => t.members.includes(player.name));
            return {
                name: player.name,
                team: team ? team.name : null
            };
        });

        console.log('Successfully retrieved all players:', playersWithTeams.length);
        res.json(playersWithTeams);
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
            return res.status(400).json({ message: '玩家名称不能为空' });
        }

        const trimmedName = name.trim();
        console.log('Checking if player exists:', trimmedName);

        // 检查玩家是否已存在
        const existingPlayer = await Player.findOne({ name: trimmedName });
        if (existingPlayer) {
            console.log('Player already exists:', trimmedName);
            return res.status(400).json({ message: '该玩家已存在' });
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

// 删除玩家
app.delete('/api/players/:name', async (req, res) => {
    console.log('Received DELETE request for /api/players/:name', req.params);
    try {
        await connectDB();
        const name = req.params.name;
        const { adminPassword } = req.body;

        // 验证管理员密码
        if (!auth(adminPassword)) {
            return res.status(403).json({ message: '管理员密码错误' });
        }

        // 检查玩家是否存在
        const existingPlayer = await Player.findOne({ name });
        if (!existingPlayer) {
            return res.status(404).json({ error: '未找到该玩家' });
        }

        // 检查该玩家没有任何对局记录、团队赛记录
        const gameWithPlayer = await Game.findOne({ "players.name": name });
        if (gameWithPlayer) {
            return res.status(400).json({ message: '该玩家存在于比赛记录中，无法删除' });
        }
        for (let season = 0; season < TOTAL_SEASON_NUM; season++) {
            const Team = getTeam(season);
            const teamWithPlayer = await Team.findOne({ members: name });
            if (teamWithPlayer) {
                return res.status(400).json({ message: `该玩家属于第 ${season + 1} 赛季的团队 ${teamWithPlayer.name}，无法删除` });
            }
            const TeamMatch = getTeamMatch(season);
            const teamMatchWithPlayer = await TeamMatch.findOne({ "players.name": name });
            if (teamMatchWithPlayer) {
                return res.status(400).json({ message: `该玩家存在于第 ${season + 1} 赛季的团队赛记录中，无法删除` });
            }
        }

        // 删除玩家
        await Player.deleteOne({ name });
        console.log('Player deleted successfully:', name);
        res.json({ message: '玩家已删除', name });
    } catch (err) {
        console.error('删除玩家错误:', err);
        res.status(500).json({ error: err.message });
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
            return res.status(400).json({ message: '数据格式不正确' });
        }

        // 验证每个玩家的数据
        for (const player of players) {
            if (!player.name || typeof player.score !== 'number') {
                return res.status(400).json({ message: '玩家数据不完整' });
            }
        }

        // 计算PT
        const basePoints = [45, 5, -15, -35];
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        // 计算同分情况
        const scoreGroups = new Map();
        sortedPlayers.forEach((player, index) => {
            if (!scoreGroups.has(player.score)) {
                scoreGroups.set(player.score, []);
            }
            scoreGroups.get(player.score).push(index);
        });

        // 按分数从高到低排序
        const sortedScores = [...scoreGroups.keys()].sort((a, b) => b - a);

        // 计算每个位置的PT
        const positionPts = new Array(4).fill(0);
        let currentPosition = 0;

        sortedScores.forEach(score => {
            const positions = scoreGroups.get(score);
            const totalPt = positions.reduce((sum, pos) => sum + basePoints[pos], 0);
            const avgPt = totalPt / positions.length;
            positions.forEach(pos => {
                positionPts[pos] = avgPt;
            });
            currentPosition += positions.length;
        });

        // 计算最终PT
        sortedPlayers.forEach((player, index) => {
            const basePt = (player.score - 30000) / 1000;
            const positionPt = positionPts[index];
            const chombo = player.chombo ? -20 : 0;
            player.pt = basePt + positionPt + chombo;
        });

        const game = new Game({
            time: new Date(),
            players: sortedPlayers
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
            return res.status(400).json({ message: '时间戳不能为空' });
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

// 团队数据API
// 获取所有团队
app.get('/api/teams', async (req, res) => {
    try {
        await connectDB();
        const season = req.query.season || 0;
        const Team = getTeam(season);
        const teams = await Team.find().sort({ createTime: -1 });
        res.json(teams);
    } catch (err) {
        console.error('获取团队列表错误:', err);
        res.status(500).json({ message: '获取团队列表失败' });
    }
});

// 创建团队
app.post('/api/teams', async (req, res) => {
    try {
        await connectDB();
        const { name, members, color, season = 0 } = req.body;
        const Team = getTeam(season);

        // 验证团队名称
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ message: '团队名称不能为空' });
        }

        const trimmedName = name.trim();

        // 验证成员列表
        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ message: '团队必须至少包含一名成员' });
        }

        // 验证颜色
        if (!color || typeof color !== 'string' || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
            return res.status(400).json({ message: '请选择有效的颜色' });
        }

        // 验证每个成员
        for (const member of members) {
            if (!member || typeof member !== 'string' || member.trim().length === 0) {
                return res.status(400).json({ message: '成员名称不能为空' });
            }

            // 检查成员是否存在
            const playerExists = await Player.findOne({ name: member });
            if (!playerExists) {
                return res.status(400).json({ message: `成员 "${member}" 不存在` });
            }

            // 检查成员是否已经在其他团队中
            const existingTeamWithMember = await Team.findOne({ members: member });
            if (existingTeamWithMember) {
                return res.status(400).json({ message: `成员 "${member}" 已经在团队 "${existingTeamWithMember.name}" 中` });
            }
        }

        // 检查团队名是否已存在
        const existingTeam = await Team.findOne({ name: trimmedName });
        if (existingTeam) {
            return res.status(400).json({ message: '团队名称已存在' });
        }

        // 创建新团队
        const team = new Team({
            name: trimmedName,
            members,
            games: 0,
            wins: 0,
            winRate: 0,
            totalPT: 0,
            avgPT: 0,
            createTime: new Date(),
            color
        });

        await team.save();
        res.status(201).json(team);
    } catch (err) {
        console.error('创建团队错误:', err);
        res.status(500).json({ message: '创建团队失败：' + err.message });
    }
});

// 删除团队
app.delete('/api/teams/:name', async (req, res) => {
    try {
        await connectDB();
        const { adminPassword, season = 0 } = req.body;
        const Team = getTeam(season);
        const teamName = req.params.name;

        // 验证管理员密码
        if (!auth(adminPassword)) {
            return res.status(403).json({ message: '管理员密码错误' });
        }

        // 查找团队
        const team = await Team.findOne({ name: teamName });
        if (!team) {
            return res.status(404).json({ message: '团队不存在' });
        }

        // 检查团队是否有比赛记录
        if (team.games > 0) {
            return res.status(400).json({ message: '无法删除已参赛的团队' });
        }

        // 删除团队
        await Team.deleteOne({ name: teamName });
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除团队错误:', err);
        res.status(500).json({ message: '删除团队失败：' + err.message });
    }
});

// 编辑团队名称
app.patch('/api/teams/:name', async (req, res) => {
    try {
        await connectDB();
        const { name } = req.params;
        const { newName, adminPassword, color, season = 0 } = req.body;
        const Team = getTeam(season);
        const TeamMatch = getTeamMatch(season);

        // 验证管理员密码
        if (!auth(adminPassword)) {
            return res.status(403).json({ message: '管理员密码错误' });
        }

        // 验证新团队名
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            return res.status(400).json({ message: '新团队名称不能为空' });
        }

        // 验证颜色
        if (!color || typeof color !== 'string' || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
            return res.status(400).json({ message: '请选择有效的颜色' });
        }

        const trimmedNewName = newName.trim();

        // 检查新团队名是否已存在（排除当前团队）
        const existingTeam = await Team.findOne({
            name: trimmedNewName,
            _id: { $ne: (await Team.findOne({ name }))._id }
        });

        if (existingTeam) {
            return res.status(400).json({ message: '新团队名称已存在' });
        }

        // 更新团队名称和颜色
        const team = await Team.findOne({ name });
        if (!team) {
            return res.status(404).json({ message: '团队不存在' });
        }

        team.name = trimmedNewName;
        team.color = color;
        await team.save();

        // 更新所有相关的比赛记录中的团队名称
        await TeamMatch.updateMany(
            { 'players.team': name },
            { $set: { 'players.$[elem].team': trimmedNewName } },
            { arrayFilters: [{ 'elem.team': name }] }
        );

        res.json({ message: '团队名称更新成功' });
    } catch (err) {
        console.error('更新团队错误:', err);
        res.status(500).json({ message: '更新团队失败：' + err.message });
    }
});

// 记录团队赛
app.post('/api/team-matches', async (req, res) => {
    try {
        await connectDB();
        const { time, players, season = 0 } = req.body;
        const Team = getTeam(season);
        const TeamMatch = getTeamMatch(season);

        // 验证数据
        if (!time || !players || !Array.isArray(players) || players.length !== 4) {
            return res.status(400).json({ message: '数据格式错误' });
        }

        // 验证队伍是否重复
        const playerTeams = players.map(p => p.team);
        const uniqueTeams = new Set(playerTeams);
        if (uniqueTeams.size !== 4) {
            return res.status(400).json({ message: '四个玩家必须来自不同的队伍' });
        }

        // 验证得点总和
        const totalScore = players.reduce((sum, p) => sum + p.score, 0);
        if (totalScore !== 120000) {
            return res.status(400).json({ message: '得点总和必须为120,000' });
        }

        // 验证每个玩家是否属于其声称的队伍
        for (const player of players) {
            const team = await Team.findOne({ name: player.team, members: player.name });
            if (!team) {
                return res.status(400).json({ message: `玩家 ${player.name} 不属于队伍 ${player.team}` });
            }
        }

        // 计算PT
        const basePoints = [45, 5, -15, -35];
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

        // 计算同分情况
        const scoreGroups = new Map();
        sortedPlayers.forEach((player, index) => {
            if (!scoreGroups.has(player.score)) {
                scoreGroups.set(player.score, []);
            }
            scoreGroups.get(player.score).push(index);
        });

        // 按分数从高到低排序
        const sortedScores = [...scoreGroups.keys()].sort((a, b) => b - a);

        // 计算每个位置的PT
        const positionPts = new Array(4).fill(0);
        let currentPosition = 0;

        sortedScores.forEach(score => {
            const positions = scoreGroups.get(score);
            const totalPt = positions.reduce((sum, pos) => sum + basePoints[pos], 0);
            const avgPt = totalPt / positions.length;
            positions.forEach(pos => {
                positionPts[pos] = avgPt;
            });
            currentPosition += positions.length;
        });

        // 计算最终PT
        sortedPlayers.forEach((player, index) => {
            const basePt = (player.score - 30000) / 1000;
            const positionPt = positionPts[index];
            const chombo = player.chombo ? -20 : 0;
            player.pt = basePt + positionPt + chombo;
        });

        // 创建比赛记录
        const match = new TeamMatch({
            time: new Date(time),
            players: sortedPlayers.map(p => ({
                name: p.name,
                team: p.team,
                score: p.score,
                pt: p.pt,
                chombo: p.chombo
            }))
        });

        await match.save();

        // 更新团队统计
        const participatingTeams = [...new Set(players.map(p => p.team))];
        for (const teamName of participatingTeams) {
            const team = await Team.findOne({ name: teamName });
            if (team) {
                team.games = (team.games || 0) + 1;
                team.totalPT = (team.totalPT || 0) + sortedPlayers
                    .filter(p => p.team === teamName)
                    .reduce((sum, p) => sum + p.pt, 0);
                team.avgPT = team.totalPT / team.games;
                team.wins = (team.wins || 0) + (sortedPlayers[0].team === teamName ? 1 : 0);
                team.winRate = (team.wins / team.games * 100).toFixed(1);
                await team.save();
            }
        }

        res.json({ message: '比赛记录成功' });
    } catch (err) {
        console.error('记录比赛错误:', err);
        res.status(500).json({ message: '记录比赛失败：' + err.message });
    }
});

// 获取团队赛记录
app.get('/api/team-matches', async (req, res) => {
    try {
        await connectDB();
        const season = req.query.season || 0;
        const TeamMatch = getTeamMatch(season);
        const matches = await TeamMatch.find()
            .sort({ time: -1 })
            .limit(50);
        res.json(matches);
    } catch (err) {
        console.error('获取比赛记录错误:', err);
        res.status(500).json({ message: '获取比赛记录失败' });
    }
});

// 删除团队赛记录
app.delete('/api/team-matches/:id', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { adminPassword, season = 0 } = req.body;
        const Team = getTeam(season);
        const TeamMatch = getTeamMatch(season);

        // 验证管理员密码
        if (!auth(adminPassword)) {
            return res.status(403).json({ message: '管理员密码错误' });
        }

        const match = await TeamMatch.findById(id);
        if (!match) {
            return res.status(404).json({ message: '比赛记录不存在' });
        }

        // 更新团队统计
        const teams = [...new Set(match.players.map(p => p.team))];
        for (const teamName of teams) {
            const team = await Team.findOne({ name: teamName });
            if (team) {
                team.games--;
                team.totalPT -= match.players
                    .filter(p => p.team === teamName)
                    .reduce((sum, p) => sum + p.pt, 0);
                team.avgPT = team.games > 0 ? team.totalPT / team.games : 0;
                team.wins -= (match.players.sort((a, b) => b.score - a.score)[0].team === teamName ? 1 : 0);
                team.winRate = team.games > 0 ? (team.wins / team.games * 100).toFixed(1) : '0.0';
                await team.save();
            }
        }

        await TeamMatch.findByIdAndDelete(id);
        res.json({ message: '删除成功' });
    } catch (err) {
        console.error('删除比赛记录错误:', err);
        res.status(500).json({ message: '删除比赛记录失败：' + err.message });
    }
});

// 更新团队赛记录时间
app.patch('/api/team-matches/:id/time', async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        const { time, adminPassword, season = 0 } = req.body;
        const TeamMatch = getTeamMatch(season);

        // 验证管理员密码
        if (!auth(adminPassword)) {
            return res.status(403).json({ message: '管理员密码错误' });
        }

        if (!time) {
            return res.status(400).json({ message: '时间不能为空' });
        }

        const match = await TeamMatch.findById(id);
        if (!match) {
            return res.status(404).json({ message: '比赛记录不存在' });
        }

        match.time = new Date(time);
        await match.save();
        res.json({ message: '更新成功' });
    } catch (err) {
        console.error('更新比赛时间错误:', err);
        res.status(500).json({ message: '更新比赛时间失败：' + err.message });
    }
});

const TOTAL_GAMES = [
    { "default": 16 }, { "default": 50 }
]

// 获取团队赛排名数据
app.get('/api/team-rankings', async (req, res) => {
    try {
        await connectDB();
        const season = req.query.season || 0
        const Team = getTeam(season);
        const TeamMatch = getTeamMatch(season);

        // 获取所有团队和比赛数据
        const teams = await Team.find();
        const matches = await TeamMatch.find();

        // 计算团队排名
        const teamRankings = teams.map(team => {
            const total_game = TOTAL_GAMES[season][team.name] ?? TOTAL_GAMES[season]["default"];
            return {
                name: team.name,
                games: team.games,
                progress: `${team.games}/${total_game}`,
                winRate: team.winRate,
                totalPT: team.totalPT,
                avgPT: team.avgPT,
                color: team.color
            };
        }).sort((a, b) => b.avgPT - a.avgPT);

        // 计算个人排名
        const playerStats = new Map();

        // 初始化玩家数据
        teams.forEach(team => {
            team.members.forEach(playerName => {
                playerStats.set(playerName, {
                    name: playerName,
                    team: team.name,
                    teamColor: team.color,
                    games: 0,
                    wins: 0,
                    totalPT: 0,
                    avgPT: 0
                });
            });
        });

        // 统计比赛数据
        matches.forEach(match => {
            match.players.forEach(player => {
                const stats = playerStats.get(player.name);
                if (stats) {
                    stats.games++;
                    stats.totalPT += player.pt;
                    stats.avgPT = stats.totalPT / stats.games;

                    // 判断是否为一位
                    const isWinner = player.score === Math.max(...match.players.map(p => p.score));
                    if (isWinner) {
                        stats.wins++;
                    }
                }
            });
        });

        // 转换为数组并排序
        const playerRankings = Array.from(playerStats.values())
            .map(stats => ({
                ...stats,
                winRate: stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.avgPT - a.avgPT);

        res.json({
            teamRankings,
            playerRankings
        });

    } catch (error) {
        console.error('获取排名数据失败:', error);
        res.status(500).json({ error: '获取排名数据失败' });
    }
});

// 临时：清理团队数据
app.delete('/api/teams/clear-all', async (req, res) => {
    try {
        await connectDB();
        const { season = 0 } = req.body;
        const Team = getTeam(season);
        await Team.deleteMany({});
        console.log('所有团队数据已清理');
        res.json({ message: '所有团队数据已清理' });
    } catch (err) {
        console.error('清理团队数据错误:', err);
        res.status(500).json({ message: '清理团队数据失败：' + err.message });
    }
});

// 保存数据到文件
async function saveData() {
    const data = {
        players: await Player.find().exec(),
        matches: await Game.find().exec(),
        teams: [],
        teamMatches: []
    };
    for (let season = 0; season < TOTAL_SEASON_NUM; season++) {
        data.teams[season] = await getTeam(season).find().exec();
        data.teamMatches[season] = await getTeamMatch(season).find().exec()
    }
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

// 从文件加载数据
async function loadData() {
    try {
        const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        await Player.deleteMany().exec();
        await Game.deleteMany().exec();
        await Player.create(data.players);
        await Game.create(data.matches);
        for (let season = 0; season < TOTAL_SEASON_NUM; season++) {
            const Team = getTeam(season);
            const TeamMatch = getTeamMatch(season);
            await Team.deleteMany().exec();
            await TeamMatch.deleteMany().exec();
            if (data.teams[season]) await Team.create(data.teams[season]);
            if (data.teamMatches[season]) await TeamMatch.create(data.teamMatches[season]);
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 初始化时加载数据
loadData().catch(error => {
    console.error('初始化数据失败:', error);
});

// 将通配符路由移到这里，所有API路由之后
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