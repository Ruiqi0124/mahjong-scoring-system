// 排名组件
const Rankings = {
    playerToDelete: null,
    deleteModal: null,
    currentSort: {
        field: 'totalPT',
        direction: 'desc'
    },
    historyPopover: null,
    currentHistoryPlayer: null,
    showMinGamesOnly: false,

    // 初始化
    async init() {
        try {
            // 检查是否在排名页面
            if (!document.getElementById('rankingsBody')) {
                return; // 如果不在排名页面，直接返回
            }

            // 初始化删除确认弹窗
            const deleteConfirmModal = document.getElementById('deleteConfirmModal');
            if (deleteConfirmModal) {
                this.deleteModal = new bootstrap.Modal(deleteConfirmModal);
            }

            // 初始化历史对局气泡框
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
        // 只有当元素不在 body 中时才添加
        if (this.historyPopover && !document.body.contains(this.historyPopover)) {
            document.body.appendChild(this.historyPopover);
        }
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
            // 检查是否为有效日期
            if (isNaN(date.getTime())) return '-';

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('日期格式化错误:', error);
            return '-';
        }
    },

    // 获取游戏时间
    getGameTime(game) {
        // 处理本地格式的时间 (2025/03/08 21:15)
        if (game.timestamp && typeof game.timestamp === 'string' && game.timestamp.match(/^\d{4}\/\d{2}\/\d{2}/)) {
            const parts = game.timestamp.split(/[\/\s:]/);
            if (parts.length >= 5) {
                const [year, month, day, hour, minute] = parts;
                // 将2025年改为2024年
                const fixedYear = year === '2025' ? '2024' : year;
                return new Date(fixedYear, month - 1, day, hour, minute).toISOString();
            }
        }

        // 优先使用 timestamp，确保其存在且有效
        if (game.timestamp && !isNaN(new Date(game.timestamp).getTime())) {
            return game.timestamp;
        }
        // 其次使用 time，确保其存在且有效
        if (game.time && !isNaN(new Date(game.time).getTime())) {
            return game.time;
        }
        return null;
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
            let playerGames = games.filter(game =>
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
                // 按日期降序排序并限制显示最近10场
                playerGames.sort((a, b) => {
                    const timeA = this.getGameTime(a);
                    const timeB = this.getGameTime(b);

                    // 如果两个时间都无效，按原顺序保持不变
                    if (!timeA && !timeB) return 0;
                    // 无效时间排在后面
                    if (!timeA) return 1;
                    if (!timeB) return -1;

                    return new Date(timeB) - new Date(timeA);
                });
                playerGames = playerGames.slice(0, 10);

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

                    // 生成对局成绩字符串，每行显示两个玩家
                    const firstRow = sortedPlayers.slice(0, 2).map(p => {
                        const isCurrentPlayer = p.name === name;
                        return `<div class="player-score ${isCurrentPlayer ? 'fw-bold text-primary' : ''}">
                            ${p.name}: ${p.score}
                        </div>`;
                    }).join('');

                    const secondRow = sortedPlayers.slice(2, 4).map(p => {
                        const isCurrentPlayer = p.name === name;
                        return `<div class="player-score ${isCurrentPlayer ? 'fw-bold text-primary' : ''}">
                            ${p.name}: ${p.score}
                        </div>`;
                    }).join('');

                    return `
                        <tr>
                            <td class="text-nowrap">${this.formatDate(this.getGameTime(game))}</td>
                            <td class="game-players">
                                <div class="game-row">${firstRow}</div>
                                <div class="game-row">${secondRow}</div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            // 显示气泡框
            this.historyPopover.style.display = 'block';
            this.historyPopover.classList.add('show');

            // 根据屏幕宽度判断是否为移动端
            if (window.innerWidth > 768) {
                // 计算位置
                const rect = event.target.getBoundingClientRect();
                const popoverWidth = Math.min(500, window.innerWidth - 40);
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
            }

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
            // 如果是新字段，根据字段类型设置默认排序方向
            this.currentSort.field = field;
            // 平均顺位是越小越好，所以默认升序
            // 其他字段（场数、得点、PT等）是越大越好，所以默认降序
            this.currentSort.direction = field === 'averageRank' ? 'asc' : 'desc';
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

    // 切换最小场数过滤器
    toggleMinGamesFilter() {
        this.showMinGamesOnly = document.getElementById('filterMinGames').checked;
        this.updateRankings();
    },

    // 更新排名
    async updateRankings() {
        try {
            const [games, players] = await Promise.all([
                api.getGames(),
                api.getPlayers()
            ]);

            // 处理游戏数据，确保每个玩家都有PT值
            const processedGames = games.map(game => {
                // 按分数排序玩家
                const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
                // 检查是否有同分情况
                const sameScoreWithFirst = sortedPlayers[1] && sortedPlayers[0].score === sortedPlayers[1].score;

                // 计算每个玩家的PT
                const playersWithPT = sortedPlayers.map((player, index) => ({
                    ...player,
                    pt: player.pt || ptUtils.calculatePT(player.score, index + 1, sameScoreWithFirst)
                }));

                return {
                    ...game,
                    players: playersWithPT
                };
            });

            // 计算每个玩家的统计数据
            const stats = {};
            players.forEach(player => {
                stats[player.name] = {
                    name: player.name,
                    games: 0,
                    totalScore: 0,
                    totalPT: 0,
                    ranks: [0, 0, 0, 0], // 一位到四位的次数
                    avgRank: 0,
                    avgScore: 0,
                    avgPT: 0,
                    recentGames: []
                };
            });

            // 统计数据
            processedGames.forEach(game => {
                game.players.forEach((player, rank) => {
                    if (stats[player.name]) {
                        stats[player.name].games++;
                        stats[player.name].totalScore += player.score;
                        stats[player.name].totalPT += player.pt;
                        stats[player.name].ranks[rank]++;
                    }
                });
            });

            // 计算平均值
            Object.values(stats).forEach(player => {
                if (player.games > 0) {
                    player.avgScore = Math.round(player.totalScore / player.games);
                    player.avgPT = player.totalPT / player.games;
                    player.avgRank = player.ranks.reduce((sum, count, index) => sum + (count * (index + 1)), 0) / player.games;
                }
            });

            // 分离"其他玩家"和普通玩家
            const otherPlayer = stats['其他玩家'];
            let normalPlayers = Object.values(stats).filter(player => player.name !== '其他玩家');

            // 应用最小场数过滤
            if (this.showMinGamesOnly) {
                normalPlayers = normalPlayers.filter(player => player.games >= 16);
            }

            // 按当前排序方式排序
            const sortedPlayers = this.sortStats(normalPlayers);

            // 如果有"其他玩家"且满足最小场数要求，将其添加到列表末尾
            if (otherPlayer && (!this.showMinGamesOnly || otherPlayer.games >= 16)) {
                sortedPlayers.push(otherPlayer);
            }

            // 渲染排名表格
            const tbody = document.getElementById('rankingsBody');
            tbody.innerHTML = sortedPlayers.map(player => {
                // 计算顺位率
                const rankRates = player.ranks.map(count =>
                    player.games > 0 ? ((count / player.games) * 100).toFixed(1) + '%' : '0%'
                );

                return `
                    <tr class="${player.games === 0 ? 'inactive-player' : ''}">
                        <td>
                            <a href="player.html?name=${encodeURIComponent(player.name)}" class="player-name-link text-decoration-none">
                                ${player.name}
                            </a>
                        </td>
                        <td>${player.games}</td>
                        <td class="text-${player.totalPT >= 0 ? 'success' : 'danger'}">${player.totalPT.toFixed(1)}</td>
                        <td class="text-${player.avgPT >= 0 ? 'success' : 'danger'}">${player.avgPT.toFixed(1)}</td>
                        <td>${player.avgRank.toFixed(2)}</td>
                        <td>${player.avgScore.toLocaleString()}</td>
                        <td>${player.ranks[0]} (${rankRates[0]})</td>
                        <td>${player.ranks[1]} (${rankRates[1]})</td>
                        <td>${player.ranks[2]} (${rankRates[2]})</td>
                        <td>${player.ranks[3]} (${rankRates[3]})</td>
                        <td>
                            <button class="btn btn-sm btn-outline-danger" 
                                    onclick="Rankings.showDeleteConfirm('${player.name}')"
                                    ${player.games > 0 ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // 更新排序图标
            this.updateSortIcons();

        } catch (error) {
            console.error('更新排名失败:', error);
            alert('更新排名失败: ' + error.message);
        }
    },

    // 计算玩家统计数据
    calculateStats(games) {
        const stats = {};

        // 初始化统计数据
        games.forEach(game => {
            game.players.forEach(player => {
                if (!stats[player.name]) {
                    stats[player.name] = {
                        name: player.name,
                        games: 0,
                        totalScore: 0,
                        totalPT: 0,
                        ranks: [0, 0, 0, 0], // 一位到四位的次数
                        avgRank: 0,
                        avgScore: 0,
                        avgPT: 0,
                        recentGames: []
                    };
                }

                const playerStats = stats[player.name];
                playerStats.games++;
                playerStats.totalScore += player.score;
                playerStats.totalPT += player.pt;

                // 计算顺位（根据分数排序后的位置）
                const rank = game.players
                    .sort((a, b) => b.score - a.score)
                    .findIndex(p => p.name === player.name);
                playerStats.ranks[rank]++;

                // 保存最近比赛记录
                if (playerStats.recentGames.length < 10) {
                    playerStats.recentGames.push({
                        time: game.time,
                        score: player.score,
                        pt: player.pt,
                        rank: rank + 1
                    });
                }
            });
        });

        // 计算平均值
        Object.values(stats).forEach(player => {
            player.avgScore = Math.round(player.totalScore / player.games);
            player.avgPT = player.totalPT / player.games;
            player.avgRank = player.ranks.reduce((sum, count, index) => sum + (count * (index + 1)), 0) / player.games;
            // 对最近比赛按时间排序
            player.recentGames.sort((a, b) => new Date(b.time) - new Date(a.time));
        });

        return Object.values(stats);
    },

    // 渲染排名表格
    renderRankings(stats) {
        const tbody = document.getElementById('rankingsBody');
        const sortedStats = this.sortStats(stats, this.currentSort);

        tbody.innerHTML = sortedStats.map(player => {
            // 计算顺位率
            const rankRates = player.ranks.map(count =>
                player.games > 0 ? ((count / player.games) * 100).toFixed(1) + '%' : '0%'
            );

            return `
                <tr class="${player.games === 0 ? 'inactive-player' : ''}">
                    <td>
                        <a href="player.html?name=${encodeURIComponent(player.name)}" class="player-name-link text-decoration-none">
                            ${player.name}
                        </a>
                    </td>
                    <td>${player.games}</td>
                    <td class="text-${player.totalPT >= 0 ? 'success' : 'danger'}">${player.totalPT.toFixed(1)}</td>
                    <td class="text-${player.avgPT >= 0 ? 'success' : 'danger'}">${player.avgPT.toFixed(1)}</td>
                    <td>${player.avgRank.toFixed(2)}</td>
                    <td>${player.avgScore.toLocaleString()}</td>
                    <td>${player.ranks[0]} (${rankRates[0]})</td>
                    <td>${player.ranks[1]} (${rankRates[1]})</td>
                    <td>${player.ranks[2]} (${rankRates[2]})</td>
                    <td>${player.ranks[3]} (${rankRates[3]})</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="Rankings.showDeleteConfirm('${player.name}')"
                                ${player.games > 0 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // 排序统计数据
    sortStats(players) {
        return [...players].sort((a, b) => {
            // 获取排序字段的值
            let aValue, bValue;
            switch (this.currentSort.field) {
                case 'games':
                    aValue = a.games;
                    bValue = b.games;
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
                case 'averageRank':
                    aValue = a.avgRank;
                    bValue = b.avgRank;
                    break;
                case 'averageScore':
                    aValue = a.avgScore;
                    bValue = b.avgScore;
                    break;
                case 'totalPT':
                    aValue = a.totalPT;
                    bValue = b.totalPT;
                    break;
                case 'avgPT':
                    aValue = a.avgPT;
                    bValue = b.avgPT;
                    break;
                default:
                    // 默认按平均顺位排序
                    aValue = a.avgRank;
                    bValue = b.avgRank;
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
    }
}; 