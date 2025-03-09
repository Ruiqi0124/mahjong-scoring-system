// 历史记录组件
const History = {
    games: [],
    deleteModal: null,
    editTimeModal: null,
    gameToDelete: null,
    gameToEdit: null,

    // 初始化
    async init() {
        try {
            this.deleteModal = new bootstrap.Modal(document.getElementById('deleteGameModal'));
            this.editTimeModal = new bootstrap.Modal(document.getElementById('editTimeModal'));
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

    // 显示修改时间弹窗
    async showEditTime(gameId) {
        try {
            // 验证管理员权限
            const isAdmin = await auth.verifyAdmin();
            if (!isAdmin) {
                alert('密码错误，无权执行此操作！');
                return;
            }

            const game = this.games.find(g => g._id === gameId);
            if (!game) {
                alert('找不到该对局记录！');
                return;
            }

            this.gameToEdit = gameId;
            // 设置当前时间到输入框
            const currentTime = new Date(game.time);
            const timeString = currentTime.toISOString().slice(0, 16); // 格式：YYYY-MM-DDThh:mm
            document.getElementById('editGameTime').value = timeString;
            this.editTimeModal.show();
        } catch (error) {
            console.error('验证失败:', error);
            alert('验证失败: ' + error.message);
        }
    },

    // 确认修改时间
    async confirmEditTime() {
        if (!this.gameToEdit) return;

        try {
            const newTime = document.getElementById('editGameTime').value;
            if (!newTime) {
                alert('请选择时间！');
                return;
            }

            await api.updateGameTime(this.gameToEdit, new Date(newTime).toISOString());
            this.editTimeModal.hide();
            await this.updateHistory();
            alert('修改成功！');
        } catch (error) {
            console.error('修改时间失败:', error);
            alert(error.message || '修改时间失败');
        } finally {
            this.gameToEdit = null;
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
            
            // 按时间降序排序
            this.games.sort((a, b) => new Date(b.time) - new Date(a.time));
            
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
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" onclick="History.showEditTime('${game._id}')">
                                    <i class="fas fa-clock"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="History.showDeleteConfirm('${game._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
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