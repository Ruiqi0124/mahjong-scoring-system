const storage = {
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
        const games = this.getGames();
        const game = {
            timestamp: new Date().toISOString(),
            players: players.map((name, index) => ({
                name,
                score: parseInt(scores[index])
            }))
        };
        games.unshift(game); // 添加到开头
        localStorage.setItem('games', JSON.stringify(games));
        return game;
    }
}; 