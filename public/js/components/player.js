// 玩家资料组件
const Player = {
    stats: null, // 添加stats属性

    // 初始化
    async init() {
        try {
            // 从URL获取玩家名称
            const params = new URLSearchParams(window.location.search);
            const playerName = params.get('name');
            
            if (!playerName) {
                alert('未指定玩家！');
                window.location.href = '/rankings.html';
                return;
            }

            // 设置页面标题
            document.title = `${playerName} 的资料 - 巢计分系统`;
            document.getElementById('playerName').textContent = playerName;

            // 获取数据
            const [games, players] = await Promise.all([
                api.getGames(),
                api.getPlayers()
            ]);

            // 处理玩家数据
            this.stats = this.calculatePlayerStats(games, playerName);
            
            // 更新基本信息
            this.updateBasicInfo(this.stats);
            
            // 更新顺位统计
            this.updateRankStats(this.stats);
            
            // 绘制顺位比率饼图
            this.drawRankPieChart(this.stats);
            
            // 绘制最近对局走势图
            this.drawTrendChart(this.stats.recentGames);
            
            // 更新最近对局记录
            this.updateRecentGames(this.stats.recentGames);

        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
    },

    // 计算玩家统计数据
    calculatePlayerStats(games, playerName) {
        const stats = {
            name: playerName,
            games: 0,
            totalScore: 0,
            totalPT: 0,
            ranks: [0, 0, 0, 0], // 一位到四位的次数
            avgRank: 0,
            avgScore: 0,
            avgPT: 0,
            recentGames: []
        };

        // 过滤并处理该玩家的所有对局
        const playerGames = games.filter(game => 
            game.players.some(p => p.name === playerName)
        );

        playerGames.forEach(game => {
            // 按分数排序玩家
            const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
            // 检查是否有同分情况
            const sameScoreWithFirst = sortedPlayers[1] && sortedPlayers[0].score === sortedPlayers[1].score;
            
            // 获取玩家在本场比赛的信息
            const playerInfo = game.players.find(p => p.name === playerName);
            const rank = sortedPlayers.findIndex(p => p.name === playerName);

            // 计算PT（如果没有现成的PT值）
            const pt = playerInfo.pt || ptUtils.calculatePT(playerInfo.score, rank + 1, sameScoreWithFirst);

            // 更新统计数据
            stats.games++;
            stats.totalScore += playerInfo.score;
            stats.totalPT += pt;
            stats.ranks[rank]++;

            // 保存对局记录（包含完整的玩家数据）
            stats.recentGames.push({
                time: game.time || game.timestamp,
                rank: rank + 1,
                score: playerInfo.score,
                pt: pt,
                players: game.players,  // 保存完整的玩家数据
                opponents: game.players
                    .filter(p => p.name !== playerName)
                    .map(p => p.name)
            });
        });

        // 计算平均值
        if (stats.games > 0) {
            stats.avgScore = Math.round(stats.totalScore / stats.games);
            stats.avgPT = stats.totalPT / stats.games;
            stats.avgRank = stats.ranks.reduce((sum, count, index) => 
                sum + (count * (index + 1)), 0) / stats.games;
        }

        // 对对局按时间排序（最新的在前）
        stats.recentGames.sort((a, b) => new Date(b.time) - new Date(a.time));

        return stats;
    },

    // 更新基本信息
    updateBasicInfo(stats) {
        document.getElementById('totalGames').textContent = stats.games;
        document.getElementById('averageRank').textContent = stats.avgRank.toFixed(2);
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

        new Chart(ctx, {
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
                            label: function(context) {
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
        const ctx = document.getElementById('trendChart').getContext('2d');
        const reversedGames = [...recentGames].slice(-10).reverse(); // 最近10场，最早的在前

        const data = {
            labels: reversedGames.map(game => this.formatDate(game.time)),
            datasets: [{
                label: '顺位走势',
                data: reversedGames.map(game => game.rank),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0, // 使用直线
                fill: false,
                pointRadius: 6, // 加粗点的大小
                pointHoverRadius: 8,
                borderWidth: 2 // 加粗线的宽度
            }]
        };

        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                scales: {
                    y: {
                        reverse: true,
                        min: 1,
                        max: 4,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const game = reversedGames[context.dataIndex];
                                return [
                                    `顺位: ${game.rank}`,
                                    `得点: ${game.score.toLocaleString()}`,
                                    `PT: ${game.pt.toFixed(1)}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    },

    // 更新最近对局记录
    updateRecentGames(recentGames) {
        const tbody = document.getElementById('recentGames');
        tbody.innerHTML = recentGames.map(game => {
            const time = new Date(game.time).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            // 按分数排序玩家
            const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);

            // 生成玩家名字的HTML，当前玩家高亮显示
            const playersHtml = sortedPlayers.map(player => {
                const isCurrentPlayer = player.name === this.stats.name;
                return `<a href="?name=${encodeURIComponent(player.name)}" class="text-decoration-none${isCurrentPlayer ? ' fw-bold text-primary' : ''}">${player.name}</a> (${player.score.toLocaleString()})`;
            }).join('、');

            return `
                <tr>
                    <td>${time}</td>
                    <td>${game.rank}</td>
                    <td>${game.score.toLocaleString()}</td>
                    <td class="text-${game.pt >= 0 ? 'success' : 'danger'}">
                        ${game.pt.toFixed(1)}
                    </td>
                    <td>${playersHtml}</td>
                </tr>
            `;
        }).join('');
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
    }
}; 