// 存储工具
window.storage = {
    // 初始化：确保数据格式正确
    init() {
        // 检查并迁移旧数据
        const oldGames = localStorage.getItem('mahjongGames');
        const currentGames = localStorage.getItem('games');
        
        if (oldGames && !currentGames) {
            // 迁移旧格式数据
            try {
                const parsedOldGames = JSON.parse(oldGames);
                const migratedGames = parsedOldGames.map(game => ({
                    id: game.timestamp || Date.now().toString(),
                    timestamp: game.timestamp || new Date().toISOString(),
                    players: game.players
                }));
                localStorage.setItem('games', JSON.stringify(migratedGames));
            } catch (error) {
                console.error('迁移旧数据失败:', error);
            }
        }

        // 确保有初始数据结构
        if (!localStorage.getItem('players')) {
            localStorage.setItem('players', JSON.stringify([]));
        }
        if (!localStorage.getItem('games')) {
            localStorage.setItem('games', JSON.stringify([]));
        }

        // 确保所有游戏记录都有ID
        const games = this.getGames();
        const updatedGames = games.map(game => ({
            ...game,
            id: game.id || Date.now().toString()
        }));
        localStorage.setItem('games', JSON.stringify(updatedGames));
    },

    // 获取所有玩家
    getPlayers() {
        const players = localStorage.getItem('players');
        return players ? JSON.parse(players) : [];
    },

    // 添加新玩家
    addPlayer(name) {
        const players = this.getPlayers();
        if (players.includes(name)) {
            throw new Error('该玩家已存在');
        }
        players.push(name);
        localStorage.setItem('players', JSON.stringify(players));
        return { name };
    },

    // 获取所有比赛记录
    getGames() {
        const games = localStorage.getItem('games');
        return games ? JSON.parse(games) : [];
    },

    // 添加新比赛记录
    addGame(players, scores) {
        if (!Array.isArray(players) || !Array.isArray(scores)) {
            throw new Error('玩家和分数必须是数组');
        }

        if (players.length !== 4 || scores.length !== 4) {
            throw new Error('必须有4个玩家和4个分数');
        }

        if (!scores.every(score => !isNaN(parseInt(score)))) {
            throw new Error('所有分数必须是数字');
        }

        // 转换分数为整数
        const parsedScores = scores.map(score => parseInt(score));
        
        // 验证总分
        const totalScore = parsedScores.reduce((sum, score) => sum + score, 0);
        if (totalScore !== 120000) {
            throw new Error('得点总和必须为120,000');
        }

        // 获取现有游戏记录
        const games = this.getGames();

        // 创建新游戏记录
        const game = {
            id: Date.now().toString(), // 使用时间戳作为ID
            timestamp: new Date().toISOString(),
            players: players.map((name, index) => ({
                name,
                score: parsedScores[index]
            }))
        };

        // 添加到开头
        games.unshift(game);
        
        // 保存到本地存储
        localStorage.setItem('games', JSON.stringify(games));
        
        return game;
    },

    // 删除比赛记录
    deleteGame(gameId) {
        const games = this.getGames();
        const index = games.findIndex(game => game.id === gameId);
        
        if (index === -1) {
            throw new Error('找不到指定的比赛记录');
        }

        games.splice(index, 1);
        localStorage.setItem('games', JSON.stringify(games));
    },

    // 更新比赛时间
    updateGameTime(gameId, newTime) {
        const games = this.getGames();
        const game = games.find(game => game.id === gameId);
        
        if (!game) {
            throw new Error('找不到指定的比赛记录');
        }

        game.timestamp = newTime;
        localStorage.setItem('games', JSON.stringify(games));
        return game;
    }
}; 