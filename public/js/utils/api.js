const API_BASE_URL = window.location.origin;

const api = {
    // 获取所有玩家
    async getPlayers() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/players`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '获取玩家列表失败' }));
                throw new Error(error.error || '获取玩家列表失败');
            }
            return response.json();
        } catch (error) {
            console.error('获取玩家列表错误:', error);
            throw error;
        }
    },

    // 添加新玩家
    async addPlayer(name) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/players`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '添加玩家失败' }));
                throw new Error(error.error || '添加玩家失败');
            }
            
            return response.json();
        } catch (error) {
            console.error('添加玩家错误:', error);
            throw error;
        }
    },

    // 获取所有比赛记录
    async getGames() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/games`);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '获取比赛记录失败' }));
                throw new Error(error.error || '获取比赛记录失败');
            }
            return response.json();
        } catch (error) {
            console.error('获取比赛记录错误:', error);
            throw error;
        }
    },

    // 添加新比赛记录
    async saveGame(players) {
        try {
            // 确保每个玩家都有PT值
            const playersWithPT = ptUtils.calculateGamePTs(players);
            
            const response = await fetch(`${API_BASE_URL}/api/games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ players: playersWithPT })
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: '保存比赛记录失败' }));
                throw new Error(error.error || '保存比赛记录失败');
            }
            
            return response.json();
        } catch (error) {
            console.error('保存比赛记录错误:', error);
            throw error;
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