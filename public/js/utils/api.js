const API_BASE_URL = window.location.origin;

// API工具
window.api = {
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

            // 保存到本地存储
            const game = storage.addGame(players, parsedScores);
            
            // 计算PT
            const playersWithScores = players.map((name, index) => ({
                name,
                score: parsedScores[index]
            }));
            const sortedPlayers = [...playersWithScores].sort((a, b) => b.score - a.score);
            const playersWithPT = ptUtils.calculateGamePTs(sortedPlayers);

            // 更新游戏数据
            game.players = playersWithPT;
            
            return game;
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
    },

    // 删除玩家
    async deletePlayer(name) {
        const response = await fetch(`${API_BASE_URL}/api/players/${name}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || '删除玩家失败');
        }
    },

    // 删除对局
    async deleteGame(gameId) {
        const response = await fetch(`${API_BASE_URL}/api/games/${gameId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || '删除对局失败');
        }
    },

    // 更新对局时间
    async updateGameTime(gameId, newTime) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/games/${gameId}/time`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ time: newTime })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '更新时间失败' }));
                throw new Error(error.error || '更新时间失败');
            }
            
            return response.json();
        } catch (error) {
            console.error('更新时间错误:', error);
            throw error;
        }
    },

    // 获取时间安排列表
    async getSchedules() {
        const response = await fetch('/api/schedules');
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    },

    // 添加时间安排
    async addSchedule(data) {
        const response = await fetch('/api/schedules', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    },

    // 删除时间安排
    async removeSchedule(scheduleId, time) {
        const response = await fetch(`/api/schedules/${scheduleId}/${time}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error(await response.text());
        return await response.json();
    }
};

// PT计算工具
const ptUtils = {
    // 计算单个玩家的PT
    calculatePT(score, rank, sameScoreWithFirst = false) {
        // 基础分：(素点-30000)/1000
        const basePT = (score - 30000) / 1000;
        
        // 顺位分
        let rankPT = 0;
        switch(rank) {
            case 1:
                rankPT = sameScoreWithFirst ? 25 : 45; // 如果和一位同分，平分45pt
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
        
        return basePT + rankPT;
    },

    // 计算一局游戏中所有玩家的PT
    calculateGamePTs(players) {
        // 检查是否有同分情况
        const firstScore = players[0].score;
        const sameScoreWithFirst = players[1].score === firstScore;

        return players.map((player, index) => ({
            ...player,
            pt: this.calculatePT(player.score, index + 1, sameScoreWithFirst)
        }));
    }
}; 