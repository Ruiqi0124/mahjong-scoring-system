// 历史记录组件
const History = {
    games: [],
    deleteModal: null,
    gameToDelete: null,

    // 初始化
    async init() {
        try {
            this.deleteModal = new bootstrap.Modal(document.getElementById('deleteGameModal'));
            await this.updateHistory();
        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
    },

    // 显示删除确认弹窗
    async showDeleteConfirm(gameId) {
        try {
            // 验证管理员权限
            const isAdmin = await auth.verifyAdmin();
            if (!isAdmin) {
                alert('密码错误，无权执行此操作！');
                return;
            }

            this.gameToDelete = gameId;
            this.deleteModal.show();
        } catch (error) {
            console.error('验证失败:', error);
            alert('验证失败: ' + error.message);
        }
    },

    // 确认删除对局
    async confirmDeleteGame() {
        if (!this.gameToDelete) return;

        try {
            await api.deleteGame(this.gameToDelete);
            this.deleteModal.hide();
            await this.updateHistory();
            alert('删除成功！');
        } catch (error) {
            console.error('删除对局失败:', error);
            alert(error.message || '删除对局失败');
        } finally {
            this.gameToDelete = null;
        }
    },

    // 更新历史记录
    async updateHistory() {
        try {
            this.games = await api.getGames();
            const tbody = document.getElementById('historyBody');
            
            tbody.innerHTML = this.games.map(game => {
                const time = new Date(game.time).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });

                const players = game.players.map(p => 
                    `${p.name}<br><small class="text-muted">${p.score.toLocaleString()}</small>`
                );

                return `
                    <tr>
                        <td>${time}</td>
                        <td>${players[0]}</td>
                        <td>${players[1]}</td>
                        <td>${players[2]}</td>
                        <td>${players[3]}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger" onclick="History.showDeleteConfirm('${game._id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('更新历史记录失败:', error);
            alert('更新历史记录失败: ' + error.message);
        }
    }
}; 