// 排名组件
const Rankings = {
    playerToDelete: null,
    deleteModal: null,
    currentSort: {
        field: 'averageRank',
        direction: 'asc'
    },
    historyPopover: null,
    currentHistoryPlayer: null,

    // 初始化
    async init() {
        try {
            this.deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            this.initHistoryPopover();
            
            // 添加排序按钮和表头点击事件监听
            document.querySelectorAll('.sortable').forEach(th => {
                const sortField = th.dataset.sort;
                // 为表头添加点击事件
                th.addEventListener('click', (e) => {
                    // 如果点击的是按钮，不处理（让按钮自己的事件处理）
                    if (e.target.closest('.sort-btn')) return;
                    this.handleSort(sortField);
                });
                // 为排序按钮添加点击事件
                const btn = th.querySelector('.sort-btn');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 阻止事件冒泡到表头
                        this.handleSort(sortField);
                    });
                }
            });

            // 添加点击空白区域关闭气泡框的事件
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#playerHistoryPopover') && 
                    !e.target.closest('.player-name-link')) {
                    this.hidePlayerHistory();
                }
            });
            
            await this.updateRankings();
        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
    },

    // 初始化历史对局气泡框
    initHistoryPopover() {
        this.historyPopover = document.getElementById('playerHistoryPopover');
        document.body.appendChild(this.historyPopover);
    },

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 显示玩家历史对局
    async showPlayerHistory(name, event) {
        event.preventDefault();
        event.stopPropagation();

        // 如果点击的是当前显示的玩家，则关闭气泡框
        if (this.currentHistoryPlayer === name) {
            this.hidePlayerHistory();
            return;
        }

        try {
            const games = await api.getGames();
            const playerGames = games.filter(game => 
                game.players.some(player => player.name === name)
            );

            // 更新标题
            document.getElementById('playerHistoryTitle').textContent = `${name} 的对局记录`;

            // 更新内容
            const tbody = document.getElementById('playerHistoryBody');
            const noHistoryMessage = document.getElementById('noHistoryMessage');

            if (playerGames.length === 0) {
                tbody.innerHTML = '';
                noHistoryMessage.style.display = 'block';
            } else {
                noHistoryMessage.style.display = 'none';
                // 按日期降序排序
                playerGames.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                tbody.innerHTML = playerGames.map(game => {
                    // 获取当前玩家的信息
                    const playerInfo = game.players.find(p => p.name === name);
                    const rank = game.players.indexOf(playerInfo) + 1;
                    
                    // 按顺位排序其他玩家
                    const sortedPlayers = [...game.players].sort((a, b) => {
                        if (a.name === name) return -1;
                        if (b.name === name) return 1;
                        return b.score - a.score;
                    });

                    // 生成对局成绩字符串
                    const gameResult = sortedPlayers.map(p => {
                        const isCurrentPlayer = p.name === name;
                        return `<div class="player-score ${isCurrentPlayer ? 'fw-bold text-primary' : ''}">
                            ${p.name}: ${p.score}
                        </div>`;
                    }).join('');

                    return `
                        <tr>
                            <td class="text-nowrap">${this.formatDate(game.date)}</td>
                            <td class="game-players">${gameResult}</td>
                        </tr>
                    `;
                }).join('');
            }

            // 显示气泡框
            this.historyPopover.style.display = 'block';
            this.historyPopover.classList.add('show');

            // 计算位置
            const rect = event.target.getBoundingClientRect();
            const popoverWidth = Math.min(500, window.innerWidth - 40); // 移动端适配
            this.historyPopover.style.width = `${popoverWidth}px`;
            
            const popoverHeight = this.historyPopover.offsetHeight;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceRight = window.innerWidth - rect.left;

            // 决定显示在上方还是下方
            let top;
            if (spaceBelow >= popoverHeight + 10 || spaceBelow >= window.innerHeight / 2) {
                top = rect.bottom + window.scrollY + 5;
                this.historyPopover.classList.remove('bs-popover-top');
                this.historyPopover.classList.add('bs-popover-bottom');
            } else {
                top = rect.top + window.scrollY - popoverHeight - 5;
                this.historyPopover.classList.remove('bs-popover-bottom');
                this.historyPopover.classList.add('bs-popover-top');
            }

            // 决定显示在左边还是右边
            let left = Math.max(20, Math.min(
                rect.left,
                window.innerWidth - popoverWidth - 20
            ));

            // 设置位置
            this.historyPopover.style.top = `${top}px`;
            this.historyPopover.style.left = `${left}px`;

            this.currentHistoryPlayer = name;
        } catch (error) {
            console.error('获取玩家历史对局失败:', error);
            alert('获取玩家历史对局失败: ' + error.message);
        }
    },

    // 隐藏玩家历史对局
    hidePlayerHistory() {
        if (this.historyPopover) {
            this.historyPopover.classList.remove('show');
            this.historyPopover.style.display = 'none';
            this.currentHistoryPlayer = null;
        }
    },

    // 处理排序
    async handleSort(field) {
        if (this.currentSort.field === field) {
            // 如果点击的是当前排序字段，则切换排序方向
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // 如果是新字段，设置为升序
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        // 更新排序图标
        this.updateSortIcons();
        await this.updateRankings();
    },

    // 更新排序图标
    updateSortIcons() {
        document.querySelectorAll('.sort-btn i').forEach(icon => {
            const button = icon.closest('.sort-btn');
            if (button.dataset.sort === this.currentSort.field) {
                icon.className = `fas fa-sort-${this.currentSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
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
            
            // 计算每个玩家的统计数据
            const stats = {};
            players.forEach(player => {
                stats[player] = {
                    name: player,
                    games: 0,
                    totalScore: 0,
                    totalRank: 0,
                    ranks: [0, 0, 0, 0]
                };
            });

            // 统计数据
            games.forEach(game => {
                game.players.forEach((player, rank) => {
                    if (stats[player.name]) {
                        stats[player.name].games++;
                        stats[player.name].totalScore += player.score;
                        stats[player.name].totalRank += (rank + 1);
                        stats[player.name].ranks[rank]++;
                    }
                });
            });

            // 转换为数组并计算平均值
            let rankings = Object.values(stats).map(stat => ({
                ...stat,
                averageScore: stat.games > 0 ? Math.round(stat.totalScore / stat.games) : 0,
                averageRank: stat.games > 0 ? parseFloat((stat.totalRank / stat.games).toFixed(2)) : 999,
                firstRate: stat.games > 0 ? parseFloat((stat.ranks[0] / stat.games * 100).toFixed(1)) : 0,
                secondRate: stat.games > 0 ? parseFloat((stat.ranks[1] / stat.games * 100).toFixed(1)) : 0,
                thirdRate: stat.games > 0 ? parseFloat((stat.ranks[2] / stat.games * 100).toFixed(1)) : 0,
                fourthRate: stat.games > 0 ? parseFloat((stat.ranks[3] / stat.games * 100).toFixed(1)) : 0
            }));

            // 分离"其他玩家"和普通玩家
            const otherPlayer = rankings.find(player => player.name === '其他玩家');
            const normalPlayers = rankings.filter(player => player.name !== '其他玩家');

            // 根据当前排序设置对普通玩家进行排序
            normalPlayers.sort((a, b) => {
                // 获取排序字段的值
                let aValue, bValue;
                switch (this.currentSort.field) {
                    case 'games':
                        aValue = a.games;
                        bValue = b.games;
                        break;
                    case 'averageScore':
                        aValue = a.averageScore;
                        bValue = b.averageScore;
                        break;
                    case 'averageRank':
                        aValue = a.averageRank;
                        bValue = b.averageRank;
                        break;
                    case 'firstPlace':
                        aValue = a.ranks[0];
                        bValue = b.ranks[0];
                        break;
                    case 'secondPlace':
                        aValue = a.ranks[1];
                        bValue = b.ranks[1];
                        break;
                    case 'thirdPlace':
                        aValue = a.ranks[2];
                        bValue = b.ranks[2];
                        break;
                    case 'fourthPlace':
                        aValue = a.ranks[3];
                        bValue = b.ranks[3];
                        break;
                    case 'firstRate':
                        aValue = a.firstRate;
                        bValue = b.firstRate;
                        break;
                    case 'secondRate':
                        aValue = a.secondRate;
                        bValue = b.secondRate;
                        break;
                    case 'thirdRate':
                        aValue = a.thirdRate;
                        bValue = b.thirdRate;
                        break;
                    case 'fourthRate':
                        aValue = a.fourthRate;
                        bValue = b.fourthRate;
                        break;
                    default:
                        aValue = a.averageRank;
                        bValue = b.averageRank;
                }

                // 无比赛记录的玩家排在后面
                if (a.games === 0 && b.games === 0) {
                    return a.name.localeCompare(b.name);
                }
                if (a.games === 0) return 1;
                if (b.games === 0) return -1;

                // 根据排序方向返回比较结果
                const compareResult = aValue - bValue;
                return this.currentSort.direction === 'asc' ? compareResult : -compareResult;
            });

            // 合并排序结果，确保"其他玩家"在最后
            rankings = otherPlayer ? [...normalPlayers, otherPlayer] : normalPlayers;

            // 显示排名
            const tbody = document.getElementById('rankingsBody');
            tbody.innerHTML = rankings.map((stat) => `
                <tr class="${stat.games === 0 ? 'inactive-player' : ''}">
                    <td>
                        <a href="#" class="player-name-link text-decoration-none" onclick="Rankings.showPlayerHistory('${stat.name}', event)">
                            ${stat.name}
                        </a>
                    </td>
                    <td>${stat.games}</td>
                    <td>${stat.averageScore}</td>
                    <td>${stat.averageRank === 999 ? '-' : stat.averageRank}</td>
                    <td>${stat.ranks[0]}</td>
                    <td>${stat.ranks[1]}</td>
                    <td>${stat.ranks[2]}</td>
                    <td>${stat.ranks[3]}</td>
                    <td>${stat.games > 0 ? stat.firstRate + '%' : '-'}</td>
                    <td>${stat.games > 0 ? stat.secondRate + '%' : '-'}</td>
                    <td>${stat.games > 0 ? stat.thirdRate + '%' : '-'}</td>
                    <td>${stat.games > 0 ? stat.fourthRate + '%' : '-'}</td>
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