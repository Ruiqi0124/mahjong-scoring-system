// 排名组件
const Rankings = {
    // 初始化
    init() {
        this.updateRankings();
    },

    // 添加新玩家
    async addNewPlayer() {
        const input = document.getElementById('newPlayerName');
        const name = input.value.trim();
        
        if (!name) {
            alert('请输入玩家名称！');
            return;
        }

        try {
            await api.addPlayer(name);
            input.value = '';
            this.updateRankings();
            alert('添加成功！');
        } catch (error) {
            alert(error.message);
        }
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
                totalRank: 0,
                ranks: [0, 0, 0, 0] // 记录各个顺位的次数 [一位,二位,三位,四位]
            };
        });

        // 统计数据
        games.forEach(game => {
            game.players.forEach((player, rank) => {
                if (stats[player.name]) {
                    stats[player.name].games++;
                    stats[player.name].totalScore += player.score;
                    stats[player.name].totalRank += (rank + 1);
                    stats[player.name].ranks[rank]++; // 记录顺位次数
                }
            });
        });

        // 转换为数组并计算平均值
        let rankings = Object.values(stats).map(stat => ({
            ...stat,
            averageScore: stat.games > 0 ? Math.round(stat.totalScore / stat.games) : 0,
            averageRank: stat.games > 0 ? (stat.totalRank / stat.games).toFixed(2) : '-',
            firstRate: stat.games > 0 ? ((stat.ranks[0] / stat.games) * 100).toFixed(1) + '%' : '-' // 计算一位率
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
                <td>${stat.ranks[0]}</td>
                <td>${stat.ranks[1]}</td>
                <td>${stat.ranks[2]}</td>
                <td>${stat.ranks[3]}</td>
                <td>${stat.firstRate}</td>
            </tr>
        `).join('');
    }
}; 