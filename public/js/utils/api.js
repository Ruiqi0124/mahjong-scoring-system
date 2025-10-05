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
    async addPlayer(name, engName) {
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, engName })
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
    async getGames(getLastNGames = null) {
        try {
            const str = `/api/games${getLastNGames ? `?last=${getLastNGames}` : ''}`;
            const response = await fetch(str);
            if (!response.ok) {
                throw new Error('获取比赛记录失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取比赛记录失败:', error);
            return [];
        }
    },

    // 验证玩家数据
    validatePlayers(players) {
        if (!Array.isArray(players)) {
            throw new Error('玩家必须是数组');
        }
        if (players.length !== 4) {
            throw new Error('必须有4个玩家');
        }
        return true;
    },

    // 验证分数数据
    validateScores(scores) {
        if (!Array.isArray(scores)) {
            throw new Error('分数必须是数组');
        }

        if (scores.length !== 4) {
            throw new Error('必须有4个分数');
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

        return parsedScores;
    },

    // 添加新比赛记录
    async addGame(players, scores) {
        // 验证数据
        this.validatePlayers(players);
        const parsedScores = this.validateScores(scores);

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
    },

    // 获取团队列表
    async getTeams(season = null) {
        try {
            const url = season !== null ? `/api/teams?season=${season}` : '/api/teams';
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('获取团队列表失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取团队列表失败:', error);
            return [];
        }
    }
};
