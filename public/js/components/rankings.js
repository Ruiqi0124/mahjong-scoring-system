// 排名组件
const Rankings = {
    playerToDelete: null,
    deleteModal: null,

    // 初始化
    async init() {
        try {
            this.deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            await this.updateRankings();
        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
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
            await this.updateRankings();
            alert('添加成功！');
        } catch (error) {
            console.error('添加玩家失败:', error);
            alert(error.message || '添加玩家失败');
        }
    },

    // 显示删除确认弹窗
    showDeleteConfirm(name) {
        this.playerToDelete = name;
        document.getElementById('playerToDelete').textContent = name;
        this.deleteModal.show();
    },

    // 确认删除玩家
    async confirmDelete() {
        if (!this.playerToDelete) return;

        try {
            await api.deletePlayer(this.playerToDelete);
            this.deleteModal.hide();
            await this.updateRankings();
            alert('删除成功！');
        } catch (error) {
            console.error('删除玩家失败:', error);
            alert(error.message || '删除玩家失败');
        } finally {
            this.playerToDelete = null;
        }
    },

    // 更新排名
    async updateRankings() {
        try {
            const [games, players] = await Promise.all([
                api.getGames(),
                api.getPlayers()
            ]);
            
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
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="Rankings.showDeleteConfirm('${stat.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('更新排名失败:', error);
            alert('更新排名失败: ' + error.message);
        }
    }
}; 