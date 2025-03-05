const API_BASE_URL = window.location.origin + '/api';

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
            return storage.addGame(players, scores);
        } catch (error) {
            throw new Error('保存比赛记录失败');
        }
    }
}; 