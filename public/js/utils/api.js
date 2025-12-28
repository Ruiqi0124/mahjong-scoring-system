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
    async getGames(rule = null) {
        try {
            const response = await fetch(`/api/games${rule ? `?rule=${rule}` : ""}`);
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

        const parsedScores = scores.map(score => parseInt(score));
        return parsedScores;
    },

    // 添加新比赛记录
    async addGame(players, scores, rule = "M") {
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
                    })),
                    rule
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

const shared = {
    getRuleName(ruleAcronym) {
        if (ruleAcronym === "A") {
            return "A规";
        } else {
            return "";
        }
    },

    safeDivide(a, b) {
        if (b === 0) return -1;
        else return a / b;
    },

    safeDividePct(a, b, dp = 1) {
        if (b === 0) return "";
        else return `${(a / b * 100).toFixed(dp)}%`
    },
};