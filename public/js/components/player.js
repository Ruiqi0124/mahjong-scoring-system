// 玩家资料组件
const Player = {
    stats: null, // 添加stats属性
    currentPage: 1,
    pageSize: 10,
    currentSort: {
        field: 'pt',
        direction: 'desc'
    },
    ruleSelect: null,
    rankPieChart: null,
    trendChart: null,
    playerName: null,

    // 初始化
    async init() {
        try {
            const params = new URLSearchParams(window.location.search);
            const rule = params.get('rule') ?? "M";
            this.ruleSelect = document.getElementById("ruleSelect");
            this.ruleSelect.value = rule;
            this.ruleSelect.addEventListener("change", () => {
                this.updateDisplay();
            });

            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                new bootstrap.Tooltip(el);
            });

            // 从URL获取玩家名称
            const playerName = params.get('name');
            if (!playerName) {
                alert('未指定玩家！');
                window.location.href = '/rankings.html';
                return;
            }
            this.playerName = playerName;

            // 设置页面标题
            document.title = `${playerName} 的资料 - 巢计分系统`;
            document.getElementById('playerName').textContent = playerName;

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

            await this.updateDisplay();
        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
    },

    async updateDisplay() {
        const headersDependingOnRule = document.querySelectorAll('th[data-rule]');
        headersDependingOnRule.forEach(header => {
            header.style.display = header.dataset.rule === this.ruleSelect.value ? 'table-cell' : 'none';
        });
        if (this.ruleSelect.value === "M") {
            if (!document.getElementById("rateCol")) {
                const col = document.createElement("col");
                col.id = "rateCol";
                col.style.width = "10%";
                document.getElementById("recentGamesColgroup").appendChild(col);
            }
            document.getElementById("showRateToggle").style.display = "block";
        } else {
            document.getElementById("rateCol")?.remove();
            document.getElementById("showRateToggle").style.display = "none";
        }
        const url = new URL(window.location.href);
        url.searchParams.set('rule', this.ruleSelect.value);
        window.history.pushState({}, '', url);

        // 获取数据
        const players = await api.getPlayers();
        const games = await api.getGames(this.ruleSelect.value);
        console.log(`[${new Date().toISOString()}] 更新了所有游戏`, games.length);
        ptCalc.addRateChangeToGames(players, games);

        // 处理玩家数据
        this.stats = this.calculatePlayerStats(games, this.playerName);

        // 更新基本信息
        this.updateBasicInfo(this.stats);

        // 更新顺位统计
        this.updateRankStats(this.stats);

        // 绘制顺位比率饼图
        this.drawRankPieChart(this.stats);

        // 绘制最近对局走势图
        this.drawTrendChart(this.stats.recentGames);

        // 绘制相对pt表
        this.showMinGamesOnly = document.getElementById('filterMinGames').checked;
        this.drawRelativePtChart(this.stats.relativePt);

        // 更新最近对局记录
        this.showRateDetails = document.getElementById('showRateDetails').checked;
        this.updateRecentGames(this.stats.recentGames);

        // 更新排序图标
        this.updateSortIcons();
    },

    // 计算玩家统计数据
    calculatePlayerStats(games, playerName) {
        const stats = {
            name: playerName,
            games: 0,
            totalScore: 0,
            totalPT: 0,
            ranks: [0, 0, 0, 0], // 一位到四位的次数
            avgPlacement: 0,
            avgScore: 0,
            avgPT: 0,
            recentGames: [],
            relativePt: []
        };

        // 过滤并处理该玩家的所有对局
        let playerGames = games.filter(game =>
            game.players.some(p => p.name === playerName)
        );

        // 按时间降序排序所有比赛
        playerGames.sort((a, b) => new Date(b.time || b.timestamp) - new Date(a.time || a.timestamp));

        relativePt = {};
        playerGames.forEach(game => {
            // 获取玩家在本场比赛的信息
            const playerInfo = game.players.find(p => p.name === playerName);
            const rank = game.players.findIndex(p => p.name === playerName);

            // 更新统计数据
            stats.games++;
            stats.totalScore += playerInfo.score;
            stats.totalPT += playerInfo.pt;
            stats.ranks[rank]++;

            // 保存对局记录（包含完整的玩家数据）
            stats.recentGames.push({
                time: game.time || game.timestamp,
                rank: rank + 1,
                score: playerInfo.score,
                pt: playerInfo.pt,
                players: game.players  // 保存带PT的玩家数据
            });

            // 计算相对PT
            for (const opponent of game.players) {
                if (opponent.name !== playerName && opponent.name !== '其他玩家') {
                    if (!relativePt[opponent.name]) {
                        relativePt[opponent.name] = {
                            relative_pt: 0,
                            game_count: 0,
                            total_placement: 0
                        };
                    }
                    relativePt[opponent.name].relative_pt += playerInfo.pt - opponent.pt;
                    relativePt[opponent.name].game_count += 1;
                    relativePt[opponent.name].total_placement += rank + 1;
                }
            }
        });
        stats.relativePt = Object.entries(relativePt)
            .map(([opponent_name, data]) => ({
                opponent_name,
                relative_pt: data.relative_pt,
                game_count: data.game_count,
                average_placement: data.total_placement / data.game_count
            }))
            .sort((a, b) => b.relative_pt - a.relative_pt);

        // 计算平均值
        if (stats.games > 0) {
            stats.avgScore = Math.round(stats.totalScore / stats.games);
            stats.avgPT = stats.totalPT / stats.games;
            stats.avgPlacement = stats.ranks.reduce((sum, count, index) =>
                sum + (count * (index + 1)), 0) / stats.games;
        }

        return stats;
    },

    // 更新基本信息
    updateBasicInfo(stats) {
        document.getElementById('totalGames').textContent = stats.games;
        document.getElementById('averageRank').textContent = stats.avgPlacement.toFixed(2);
        document.getElementById('averageScore').textContent = stats.avgScore.toLocaleString();
        document.getElementById('totalPT').textContent = stats.totalPT.toFixed(1);
        document.getElementById('averagePT').textContent = stats.avgPT.toFixed(1);

        // 设置PT的颜色
        const totalPTElement = document.getElementById('totalPT');
        const avgPTElement = document.getElementById('averagePT');
        totalPTElement.className = `h4 mb-0 text-${stats.totalPT >= 0 ? 'success' : 'danger'}`;
        avgPTElement.className = `h4 mb-0 text-${stats.avgPT >= 0 ? 'success' : 'danger'}`;
    },

    // 更新顺位统计
    updateRankStats(stats) {
        const rankNames = ['一', '二', '三', '四'];
        rankNames.forEach((rank, index) => {
            const count = stats.ranks[index];
            const rate = stats.games > 0 ? (count / stats.games * 100) : 0;

            document.getElementById(`rank${index + 1}Count`).textContent = count;
            document.getElementById(`rank${index + 1}Rate`).textContent =
                `${rate.toFixed(1)}%`;
        });
    },

    // 绘制顺位比率饼图
    drawRankPieChart(stats) {
        if (this.rankPieChart) {
            this.rankPieChart.destroy();
        }
        const ctx = document.getElementById('rankPieChart').getContext('2d');
        const data = {
            labels: ['一位', '二位', '三位', '四位'],
            datasets: [{
                data: stats.ranks,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)', // 蓝色
                    'rgba(75, 192, 192, 0.8)', // 绿色
                    'rgba(255, 206, 86, 0.8)', // 黄色
                    'rgba(255, 99, 132, 0.8)'  // 红色
                ],
                borderWidth: 1
            }]
        };

        this.rankPieChart = new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                const total = stats.games;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value}次 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // 绘制最近对局走势图
    drawTrendChart(recentGames) {
        if (this.trendChart) {
            this.trendChart.destroy();
        }
        const ctx = document.getElementById('trendChart').getContext('2d');

        // 先按时间排序所有对局并计算总累计PT
        const allGamesWithPT = recentGames
            .sort((a, b) => new Date(a.time) - new Date(b.time))
            .reduce((acc, game) => {
                const lastPT = acc.length > 0 ? acc[acc.length - 1].cumulativePT : 0;
                acc.push({
                    ...game,
                    cumulativePT: lastPT + game.pt
                });
                return acc;
            }, []);

        // 获取最新的20场对局
        const latestGames = allGamesWithPT.slice(-20);

        // 创建固定长度的数组，未使用的部分填充null
        const maxGames = 20;
        const paddedData = Array(maxGames).fill(null);

        // 从后向前填充数据，确保最新的数据在右侧
        latestGames.forEach((game, index) => {
            paddedData[maxGames - latestGames.length + index] = game;
        });

        const data = {
            labels: paddedData.map(() => ''),
            datasets: [
                {
                    label: '顺位走势',
                    data: paddedData.map(game => game ? game.rank : null),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgb(75, 192, 192)',
                    tension: 0,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    borderWidth: 2,
                    yAxisID: 'y-rank',
                    spanGaps: false
                },
                {
                    label: '累计PT走势',
                    data: paddedData.map(game => game ? game.cumulativePT : null),
                    borderColor: 'rgb(128, 128, 128)',
                    backgroundColor: 'rgb(128, 128, 128)',
                    tension: 0,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 1,
                    yAxisID: 'y-pt',
                    spanGaps: false
                }
            ]
        };

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    },
                    'y-rank': {
                        position: 'left',
                        reverse: true,
                        min: 0.8,
                        max: 4.2,
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    },
                    'y-pt': {
                        position: 'right',
                        grid: {
                            display: false
                        },
                        ticks: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            filter: function (item) {
                                return item.text === '顺位走势';
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function (context) {
                                const game = paddedData[context[0].dataIndex];
                                return game ? Player.formatDate(game.time) : '';
                            },
                            label: function (context) {
                                const game = paddedData[context.dataIndex];
                                if (game && context.dataset.label === '顺位走势') {
                                    return [
                                        `顺位: ${game.rank}`,
                                        `当局PT: ${game.pt.toFixed(1)}`,
                                        `累计PT: ${game.cumulativePT.toFixed(1)}`
                                    ];
                                }
                                return null;
                            }
                        },
                        filter: function (tooltipItem) {
                            return paddedData[tooltipItem.dataIndex] !== null;
                        }
                    }
                }
            }
        });
    },

    drawRelativePtChart(relativePt) {
        const tbody = document.getElementById('relativePt');
        if (this.showMinGamesOnly) {
            relativePt = relativePt.filter(a => a.game_count >= 16);
        }
        const sortedRelativePt = this.sortRelativePt(relativePt, this.currentSort);

        // 渲染表格内容
        tbody.innerHTML = sortedRelativePt.map(opponent => `
        <tr>
            <td>
                <a href="?name=${encodeURIComponent(opponent.opponent_name)}&rule=${this.ruleSelect.value}" class="text-decoration-none">
                    ${opponent.opponent_name}
                </a>
            </td>
            <td>
                <span class="text-${opponent.relative_pt >= 0 ? 'success' : 'danger'}">
                    ${opponent.relative_pt.toFixed(1)}
                </span>
            </td>
            <td>
                <span class="text-${opponent.relative_pt >= 0 ? 'success' : 'danger'}">
                    ${(opponent.relative_pt / opponent.game_count).toFixed(1)}
                </span>
            </td>
            <td>${opponent.average_placement.toFixed(2)}</td>
            <td>${opponent.game_count}</td>
        </tr>
    `).join('');
    },

    // 更新最近对局记录
    updateRecentGames(recentGames) {
        const tbody = document.getElementById('recentGames');
        const paginationDiv = document.getElementById('historyPagination');

        // 计算总页数
        const totalPages = Math.ceil(recentGames.length / this.pageSize);

        // 确保当前页面在有效范围内
        if (this.currentPage < 1) this.currentPage = 1;
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        // 计算当前页的数据范围（从最新的记录开始）
        const endIndex = recentGames.length - (this.currentPage - 1) * this.pageSize;
        const startIndex = Math.max(0, endIndex - this.pageSize);
        const currentPageGames = recentGames.slice(startIndex, endIndex);

        // 渲染表格内容
        tbody.innerHTML = currentPageGames.reverse().map(game => {
            const time = new Date(game.time).toLocaleString('zh-CN', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            // 按分数排序玩家
            const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

            const rateInItalics = (rate, prefix = "") => `<a class="text-secondary text-decoration-none small fst-italic"> ${prefix}R${rate.toFixed(0)}</a>`;

            // 生成玩家名字的HTML，当前玩家高亮显示
            const playersHtml = sortedPlayers.map(player =>
                `<a href="?name=${encodeURIComponent(player.name)}&rule=${this.ruleSelect.value}" class="text-decoration-none${player.name === this.stats.name ? ' fw-bold text-primary' : ''}">${player.name}</a>
                ${this.showRateDetails ? rateInItalics(player.previousRate) : ""}
                <br>
                <small class="text-muted">
                    ${player.score.toLocaleString()}<br>
                    <span class="text-${player.pt >= 0 ? 'success' : 'danger'}">
                        ${player.pt.toFixed(1)}pt
                    </span>
                </small>`
            );

            const currentPlayer = sortedPlayers.find((player) => player.name === this.stats.name);
            const rateHtml = `<div class="text-decoration-none">${currentPlayer.rate.toFixed(0)}</div>
            <small class="text-muted">
                <span class="text-${currentPlayer.rateChange > 0 ? 'success' : (currentPlayer.rateChange === 0 ? 'muted' : 'danger')}">
                    ${currentPlayer.rateChange > 0 ? "+" : (currentPlayer.rateChange === 0 ? "±" : "")}${currentPlayer.rateChange}
                </span>
            </small>
            `;

            return `
                <tr>
                    <td style="background-color:white;">${time}
                    ${this.showRateDetails ? rateInItalics(sortedPlayers.map((player) => player.previousRate).reduce((acc, r) => acc + r, 0) / 4, "桌均") : ""}</td>
                    <td>${playersHtml[0]}</td>
                    <td>${playersHtml[1]}</td>
                    <td>${playersHtml[2]}</td>
                    <td>${playersHtml[3]}</td>
                    ${this.ruleSelect.value === "M" ? `<td>${rateHtml}</td>` : ""}
                </tr>
            `;
        }).join('');

        // 渲染分页控件
        paginationDiv.innerHTML = this.renderPagination(totalPages);

        // 显示当前页码信息
        document.getElementById('pageInfo').textContent =
            `第 ${this.currentPage} 页 / 共 ${totalPages} 页（共 ${recentGames.length} 条记录）`;
    },

    // 渲染分页控件
    renderPagination(totalPages) {
        if (totalPages <= 1) return '';

        let buttons = [];

        // 上一页按钮
        buttons.push(`
            <button class="btn btn-outline-primary ${this.currentPage === 1 ? 'disabled' : ''}"
                    onclick="Player.goToPage(${this.currentPage - 1})"
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
                <button class="btn btn-outline-primary" onclick="Player.goToPage(1)">1</button>
            `);
            if (startPage > 2) {
                buttons.push('<span class="btn btn-outline-primary disabled">...</span>');
            }
        }

        // 页码按钮
        for (let i = startPage; i <= endPage; i++) {
            buttons.push(`
                <button class="btn btn-outline-primary ${i === this.currentPage ? 'active' : ''}"
                        onclick="Player.goToPage(${i})">
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
                <button class="btn btn-outline-primary" onclick="Player.goToPage(${totalPages})">
                    ${totalPages}
                </button>
            `);
        }

        // 下一页按钮
        buttons.push(`
            <button class="btn btn-outline-primary ${this.currentPage === totalPages ? 'disabled' : ''}"
                    onclick="Player.goToPage(${this.currentPage + 1})"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `);

        return buttons.join('');
    },

    // 跳转到指定页
    goToPage(page) {
        this.currentPage = page;
        this.updateRecentGames(this.stats.recentGames);
    },

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '-';

        try {
            const date = new Date(dateString);
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
            this.currentSort.direction = field === 'avgPlacement' ? 'asc' : 'desc';
        }

        // 更新排序图标
        this.updateSortIcons();
        this.drawRelativePtChart(this.stats.relativePt);
    },

    // 切换最小场数过滤器
    toggleMinGamesFilter() {
        this.showMinGamesOnly = document.getElementById('filterMinGames').checked;
        this.drawRelativePtChart(this.stats.relativePt);
    },

    toggleShowRateDetails() {
        this.showRateDetails = document.getElementById('showRateDetails').checked;
        this.updateRecentGames(this.stats.recentGames);
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

    // 排序统计数据
    sortRelativePt(relativePt) {
        return relativePt.sort((a, b) => {
            // 获取排序字段的值
            let aValue, bValue;
            switch (this.currentSort.field) {
                case 'pt':
                    aValue = a.relative_pt;
                    bValue = b.relative_pt;
                    break;
                case 'avgPt':
                    aValue = a.relative_pt / a.game_count;
                    bValue = b.relative_pt / b.game_count
                    break;
                case 'gameCount':
                    aValue = a.game_count;
                    bValue = b.game_count;
                    break;
                case 'avgPlacement':
                default:
                    // 默认按平均顺位排序
                    aValue = a.average_placement;
                    bValue = b.average_placement;
            }
            // 根据排序方向返回比较结果
            const compareResult = aValue - bValue;
            return this.currentSort.direction === 'asc' ? compareResult : -compareResult;
        });
    }

}; 