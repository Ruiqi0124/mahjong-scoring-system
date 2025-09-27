// API工具
window.api = {
    // 获取所有玩家
    async getPlayers() {
        try {
            const response = await fetch('/api/players');
            if (!response.ok) {
                throw new Error('获取玩家列表失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取玩家列表失败:', error);
            return [];
        }
    },

    // 添加新玩家
    async addPlayer(name) {
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });
            if (!response.ok) {
                throw new Error('添加玩家失败');
            }
            return await response.json();
        } catch (error) {
            console.error('添加玩家失败:', error);
            throw error;
        }
    },

    // 获取所有比赛记录
    async getGames() {
        try {
            const response = await fetch('/api/games');
            if (!response.ok) {
                throw new Error('获取比赛记录失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取比赛记录失败:', error);
            return [];
        }
    },

    // 添加新比赛记录
    async addGame(players, scores) {
        // 验证数据
        storage.validatePlayers(players);
        const parsedScores = storage.validateScores(scores);

        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    players: players.map((name, index) => ({
                        name,
                        score: parsedScores[index]
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('添加比赛记录失败');
            }

            return await response.json();
        } catch (error) {
            console.error('添加比赛记录失败:', error);
            throw error;
        }
    },

    // 删除比赛记录
    async deleteGame(gameId) {
        try {
            const response = await fetch(`/api/games/${gameId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('删除比赛记录失败');
            }
            return true;
        } catch (error) {
            console.error('删除比赛记录失败:', error);
            throw error;
        }
    },

    // 更新比赛时间
    async updateGameTime(gameId, newTime) {
        try {
            const response = await fetch(`/api/games/${gameId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ timestamp: newTime })
            });
            if (!response.ok) {
                throw new Error('更新比赛时间失败');
            }
            return await response.json();
        } catch (error) {
            console.error('更新比赛时间失败:', error);
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