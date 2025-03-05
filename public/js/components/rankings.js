// 排名组件
const Rankings = {
    // 初始化
    init() {
        this.updateRankings();
    },

    // 更新排名
    async updateRankings() {
        const games = await api.getGames();
        const players = await api.getPlayers();
        const sortType = document.getElementById('sortType').value;
        
        // 计算每个玩家的统计数据
        const stats = {};
        players.forEach(player => {
            stats[player] = {
                name: player,
                games: 0,
                totalScore: 0,
                totalRank: 0
            };
        });

        // 统计数据
        games.forEach(game => {
            game.players.forEach((player, rank) => {
                if (stats[player.name]) {
                    stats[player.name].games++;
                    stats[player.name].totalScore += player.score;
                    stats[player.name].totalRank += (rank + 1);
                }
            });
        });

        // 转换为数组并计算平均值
        let rankings = Object.values(stats).map(stat => ({
            ...stat,
            averageScore: stat.games > 0 ? Math.round(stat.totalScore / stat.games) : 0,
            averageRank: stat.games > 0 ? (stat.totalRank / stat.games).toFixed(2) : '-'
        }));

        // 排序
        rankings.sort((a, b) => {
            if (a.games === 0 && b.games === 0) return 0;
            if (a.games === 0) return 1;
            if (b.games === 0) return -1;

            if (sortType === 'average_score') {
                return b.averageScore - a.averageScore;
            } else {
                return a.averageRank - b.averageRank;
            }
        });

        // 显示排名
        const tbody = document.getElementById('rankingsBody');
        tbody.innerHTML = rankings.map(stat => `
            <tr class="${stat.games === 0 ? 'inactive-player' : ''}">
                <td>${stat.name}</td>
                <td>${stat.games}</td>
                <td>${stat.averageScore}</td>
                <td>${stat.averageRank}</td>
            </tr>
        `).join('');
    }
}; 