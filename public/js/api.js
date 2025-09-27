const api = {
    // 获取所有玩家
    async getPlayers() {
        return storage.getPlayers();
    },

    // 添加新玩家
    async addPlayer(name) {
        try {
            return storage.addPlayer(name);
        } catch (error) {
            throw new Error(error.message || '添加玩家失败');
        }
    },

    // 获取所有比赛记录
    async getGames() {
        return storage.getGames();
    },

    // 添加新比赛记录
    async addGame(players, scores) {
        try {
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

            return storage.addGame(players, parsedScores);
        } catch (error) {
            console.error('保存比赛记录失败:', error);
            throw new Error(error.message || '保存比赛记录失败');
        }
    },

    // 保存比赛记录
    async saveGame(gameData) {
        try {
            const { players, scores } = gameData;
            return this.addGame(players, scores);
        } catch (error) {
            console.error('保存比赛记录失败:', error);
            throw new Error(error.message || '保存比赛记录失败');
        }
    }
}; 