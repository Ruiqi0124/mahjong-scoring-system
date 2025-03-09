const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR);
    }
}

// 读取JSON文件
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// 写入JSON文件
async function writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// 中间件
app.use(express.json());
app.use(express.static('public'));

// API路由
// 获取所有玩家
app.get('/api/players', async (req, res) => {
    try {
        const players = await readJsonFile(PLAYERS_FILE);
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: '获取玩家列表失败' });
    }
});

// 添加新玩家
app.post('/api/players', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: '玩家名称不能为空' });
        }

        const players = await readJsonFile(PLAYERS_FILE);
        if (players.includes(name)) {
            return res.status(400).json({ error: '该玩家已存在' });
        }

        players.push(name);
        await writeJsonFile(PLAYERS_FILE, players);
        res.json({ name });
    } catch (error) {
        res.status(500).json({ error: '添加玩家失败' });
    }
});

// 获取所有比赛记录
app.get('/api/games', async (req, res) => {
    try {
        const games = await readJsonFile(GAMES_FILE);
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: '获取比赛记录失败' });
    }
});

// 添加新比赛记录
app.post('/api/games', async (req, res) => {
    try {
        const { players } = req.body;
        if (!players || !Array.isArray(players) || players.length !== 4) {
            return res.status(400).json({ error: '玩家数据格式不正确' });
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

        const game = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            players: playersWithPT
        };

        const games = await readJsonFile(GAMES_FILE);
        games.unshift(game);
        await writeJsonFile(GAMES_FILE, games);

        res.json(game);
    } catch (error) {
        console.error('添加比赛记录失败:', error);
        res.status(500).json({ error: '添加比赛记录失败' });
    }
});

// 删除比赛记录
app.delete('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const games = await readJsonFile(GAMES_FILE);
        const index = games.findIndex(game => game.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: '找不到指定的比赛记录' });
        }

        games.splice(index, 1);
        await writeJsonFile(GAMES_FILE, games);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除比赛记录失败' });
    }
});

// 更新比赛时间
app.patch('/api/games/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { timestamp } = req.body;
        
        if (!timestamp) {
            return res.status(400).json({ error: '时间戳不能为空' });
        }

        const games = await readJsonFile(GAMES_FILE);
        const game = games.find(game => game.id === id);
        
        if (!game) {
            return res.status(404).json({ error: '找不到指定的比赛记录' });
        }

        game.timestamp = timestamp;
        await writeJsonFile(GAMES_FILE, games);
        res.json(game);
    } catch (error) {
        res.status(500).json({ error: '更新比赛时间失败' });
    }
});

// 获取时间安排列表
app.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await readJsonFile(SCHEDULES_FILE);
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: '获取时间安排失败' });
    }
});

// 添加时间安排
app.post('/api/schedules', async (req, res) => {
    try {
        const schedule = req.body;
        const schedules = await readJsonFile(SCHEDULES_FILE);
        schedules.push(schedule);
        await writeJsonFile(SCHEDULES_FILE, schedules);
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ error: '添加时间安排失败' });
    }
});

// 删除时间安排
app.delete('/api/schedules/:id/:time', async (req, res) => {
    try {
        const { id, time } = req.params;
        const schedules = await readJsonFile(SCHEDULES_FILE);
        const index = schedules.findIndex(s => s.id === id && s.time === time);
        
        if (index === -1) {
            return res.status(404).json({ error: '找不到指定的时间安排' });
        }

        schedules.splice(index, 1);
        await writeJsonFile(SCHEDULES_FILE, schedules);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '删除时间安排失败' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await ensureDataDir();
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 