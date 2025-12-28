// 历史记录组件
const History = {
    games: [],
    deleteModal: null,
    editTimeModal: null,
    gameToDelete: null,
    gameToEdit: null,
    currentPage: 1,
    pageSize: 10,

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
            let games = await api.getGames();
            // 按时间降序排序
            games.sort((a, b) => new Date(b.time) - new Date(a.time));
            console.log(`[${new Date().toISOString()}] 更新了所有游戏`, games.length);
            this.games = games;
            this.renderCurrentPage(games);
        } catch (error) {
            console.error('更新历史记录失败:', error);
            alert('更新历史记录失败: ' + error.message);
        }
    },

    // 渲染当前页面
    renderCurrentPage(games) {
        console.log(`[${new Date().toISOString()}] ${games.length} ${games[0]}`);
        const tbody = document.getElementById('historyBody');
        const paginationDiv = document.getElementById('historyPagination');

        // 计算总页数
        const totalPages = Math.ceil(games.length / this.pageSize);

        // 确保当前页面在有效范围内
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        // 计算当前页的数据范围
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, games.length);
        const currentPageGames = games.slice(startIndex, endIndex);

        // 渲染表格内容
        tbody.innerHTML = currentPageGames.map(game => {
            const time = new Date(game.time).toLocaleString('zh-CN', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            let ruleName = shared.getRuleName(game.rule);
            if (ruleName !== "") {
                ruleName = `（${ruleName}）`;
            }

            const players = game.players.map(p =>
                `<a href="/player.html?name=${encodeURIComponent(p.name)}" class="text-decoration-none">${p.name}</a><br>
                <small class="text-muted">
                    ${p.score.toLocaleString()}<br>
                    <span class="text-${p.pt >= 0 ? 'success' : 'danger'}">
                        ${p.pt.toFixed(1)}pt
                    </span>
                </small>`
            );

            return `
                <tr>
                    <td>${time}${ruleName}</td>
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

        // 渲染分页控件
        paginationDiv.innerHTML = this.renderPagination(totalPages);

        // 显示当前页码信息
        document.getElementById('pageInfo').textContent =
            `第 ${this.currentPage} 页 / 共 ${totalPages} 页（共 ${games.length} 条记录）`;
    },

    // 渲染分页控件
    renderPagination(totalPages) {
        if (totalPages <= 1) return '';

        let buttons = [];

        // 上一页按钮
        buttons.push(`
            <button class="btn btn-outline-primary ${this.currentPage === 1 ? 'disabled' : ''}"
                    onclick="History.goToPage(${this.currentPage - 1})"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `);

        // 页码按钮
        let startPage = Math.max(1, this.currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        // 调整startPage确保显示5个按钮
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        // 第一页
        if (startPage > 1) {
            buttons.push(`
                <button class="btn btn-outline-primary" onclick="History.goToPage(1)">1</button>
            `);
            if (startPage > 2) {
                buttons.push('<span class="btn btn-outline-primary disabled">...</span>');
            }
        }

        // 页码按钮
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(`
                <button class="btn btn-outline-primary ${i === this.currentPage ? 'active' : ''}"
                        onclick="History.goToPage(${i})">
                    ${i}
                </button>
            `);
        }

        // 最后一页
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons.push('<span class="btn btn-outline-primary disabled">...</span>');
            }
            buttons.push(`
                <button class="btn btn-outline-primary" onclick="History.goToPage(${totalPages})">
                    ${totalPages}
                </button>
            `);
        }

        // 下一页按钮
        buttons.push(`
            <button class="btn btn-outline-primary ${this.currentPage === totalPages ? 'disabled' : ''}"
                    onclick="History.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `);

        return buttons.join('');
    },

    // 跳转到指定页
    goToPage(page) {
        this.currentPage = page;
        (async () => {
            this.renderCurrentPage(this.games);
        })();
    }

}; 