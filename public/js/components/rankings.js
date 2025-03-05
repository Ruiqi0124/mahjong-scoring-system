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
    async showDeleteConfirm(name) {
        try {
            // 验证管理员权限
            const isAdmin = await auth.verifyAdmin();
            if (!isAdmin) {
                alert('密码错误，无权执行此操作！');
                return;
            }

            this.playerToDelete = name;
            document.getElementById('playerToDelete').textContent = name;
            this.deleteModal.show();
        } catch (error) {
            console.error('验证失败:', error);
            alert('验证失败: ' + error.message);
        }
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
                firstRate: stat.games > 0 ? ((stat.ranks[0] / stat.games) * 100).toFixed(1) + '%' : '-', // 一位率
                secondRate: stat.games > 0 ? ((stat.ranks[1] / stat.games) * 100).toFixed(1) + '%' : '-', // 二位率
                thirdRate: stat.games > 0 ? ((stat.ranks[2] / stat.games) * 100).toFixed(1) + '%' : '-', // 三位率
                fourthRate: stat.games > 0 ? ((stat.ranks[3] / stat.games) * 100).toFixed(1) + '%' : '-' // 四位率
            }));

            // 分离"其他玩家"和普通玩家
            const otherPlayer = rankings.find(player => player.name === '其他玩家');
            const normalPlayers = rankings.filter(player => player.name !== '其他玩家');

            // 对普通玩家进行排序
            normalPlayers.sort((a, b) => {
                if (a.games === 0 && b.games === 0) {
                    return a.name.localeCompare(b.name); // 无比赛记录的玩家按名字排序
                }
                if (a.games === 0) return 1;
                if (b.games === 0) return -1;

                if (sortType === 'average_score') {
                    return b.averageScore - a.averageScore;
                } else {
                    return a.averageRank - b.averageRank;
                }
            });

            // 合并排序结果，确保"其他玩家"在最后
            rankings = otherPlayer ? [...normalPlayers, otherPlayer] : normalPlayers;

            // 显示排名
            const tbody = document.getElementById('rankingsBody');
            tbody.innerHTML = rankings.map((stat, index) => `
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
                    <td>${stat.secondRate}</td>
                    <td>${stat.thirdRate}</td>
                    <td>${stat.fourthRate}</td>
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