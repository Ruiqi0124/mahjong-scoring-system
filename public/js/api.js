const API_BASE_URL = window.location.origin + '/api';

const api = {
    // 获取所有玩家
    async getPlayers() {
        const response = await fetch(`${API_BASE_URL}/players`);
        if (!response.ok) throw new Error('获取玩家列表失败');
        return response.json();
    },

    // 添加新玩家
    async addPlayer(name) {
        const response = await fetch(`${API_BASE_URL}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '添加玩家失败');
        }
        return response.json();
    },

    // 获取所有比赛记录
    async getGames() {
        const response = await fetch(`${API_BASE_URL}/games`);
        if (!response.ok) throw new Error('获取比赛记录失败');
        return response.json();
    },

    // 添加新比赛记录
    async addGame(players, scores) {
        const response = await fetch(`${API_BASE_URL}/games`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ players, scores })
        });
        if (!response.ok) throw new Error('保存比赛记录失败');
        return response.json();
    }
}; 