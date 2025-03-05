// 获取历史记录和玩家列表
let gameHistory = JSON.parse(localStorage.getItem('mahjongGames') || '[]');
let playersList = JSON.parse(localStorage.getItem('mahjongPlayers') || '[]');

// 初始化显示历史记录和玩家选择
document.addEventListener('DOMContentLoaded', () => {
    displayHistory();
    updatePlayerSelects();
});

// 更新所有玩家选择下拉框
function updatePlayerSelects() {
    const selects = document.querySelectorAll('.player-select');
    if (!selects.length) return;

    // 获取当前选中的值
    const selectedValues = Array.from(selects).map(select => select.value);

    // 清空并重新填充选项
    selects.forEach((select, index) => {
        const currentValue = selectedValues[index];
        select.innerHTML = '<option value="">选择玩家</option>';
        
        // 添加所有玩家选项
        playersList.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            if (player === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

// 添加新玩家
function addNewPlayer() {
    const newPlayerInput = document.getElementById('newPlayerName');
    const playerName = newPlayerInput.value.trim();
    
    if (!playerName) {
        alert('请输入玩家名称！');
        return;
    }

    if (playersList.includes(playerName)) {
        alert('该玩家已存在！');
        return;
    }

    playersList.push(playerName);
    localStorage.setItem('mahjongPlayers', JSON.stringify(playersList));
    
    newPlayerInput.value = '';
    updateRankings();
    updatePlayerSelects(); // 更新选择框
}

function saveData() {
    // 获取所有输入值
    const players = [];
    const scores = [];
    let isValid = true;

    // 收集并验证玩家名称
    for (let i = 1; i <= 4; i++) {
        const playerName = document.getElementById(`player${i}`).value;
        const score = document.getElementById(`score${i}`).value;
        
        if (!playerName || !score) {
            alert('请填写所有玩家名称和分数！');
            isValid = false;
            break;
        }

        // 检查玩家是否重复选择
        if (players.includes(playerName)) {
            alert('不能选择相同的玩家！');
            isValid = false;
            break;
        }
        
        players.push(playerName);
        scores.push(parseInt(score));
    }

    if (!isValid) return;

    // 验证分数总和是否为120000
    const totalScore = scores.reduce((a, b) => a + b, 0);
    if (totalScore !== 120000) {
        alert('所有玩家分数之和必须为120000！');
        return;
    }

    // 验证分数大小顺序
    for (let i = 0; i < 3; i++) {
        if (scores[i] < scores[i + 1]) {
            alert(`第${i + 1}位的分数必须大于等于第${i + 2}位的分数！`);
            return;
        }
    }

    // 创建新的游戏记录
    const gameRecord = {
        timestamp: new Date().toLocaleString(),
        players: players,
        scores: scores
    };

    // 添加到历史记录
    gameHistory.unshift(gameRecord);
    
    // 保存到localStorage
    localStorage.setItem('mahjongGames', JSON.stringify(gameHistory));

    // 更新显示
    displayHistory();
    updateRankings();

    // 清空输入框
    clearInputs();
}

function displayHistory() {
    const historyContent = document.getElementById('historyContent');
    if (!historyContent) return;

    historyContent.innerHTML = '';

    gameHistory.forEach((game, index) => {
        const gameElement = document.createElement('div');
        gameElement.className = 'history-item';
        
        let gameHtml = `<p><strong>${game.timestamp}</strong></p>`;
        game.players.forEach((player, i) => {
            gameHtml += `<p>${player}: ${game.scores[i]}</p>`;
        });

        gameElement.innerHTML = gameHtml;
        historyContent.appendChild(gameElement);
    });
}

function clearInputs() {
    // 清空所有输入框
    for (let i = 1; i <= 4; i++) {
        document.getElementById(`player${i}`).value = '';
        document.getElementById(`score${i}`).value = '';
    }
}

// 计算玩家排名统计
function calculatePlayerStats() {
    const playerStats = {};

    // 初始化所有玩家的统计数据
    playersList.forEach(player => {
        playerStats[player] = {
            totalScore: 0,
            gamesPlayed: 0,
            rankings: [0, 0, 0, 0],
            averageScore: 0,
            averageRanking: 0,
            rankingRates: ['0.0%', '0.0%', '0.0%', '0.0%']
        };
    });

    // 统计比赛数据
    gameHistory.forEach(game => {
        game.players.forEach((player, index) => {
            if (playerStats[player]) {
                playerStats[player].totalScore += game.scores[index];
                playerStats[player].gamesPlayed += 1;
                playerStats[player].rankings[index] += 1;
            }
        });
    });

    // 计算统计数据
    Object.keys(playerStats).forEach(player => {
        const stats = playerStats[player];
        
        if (stats.gamesPlayed > 0) {
            // 计算平均素点
            stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed);
            
            // 计算平均顺位
            let totalRankingWeight = 0;
            stats.rankings.forEach((count, index) => {
                totalRankingWeight += (index + 1) * count;
            });
            stats.averageRanking = (totalRankingWeight / stats.gamesPlayed).toFixed(2);

            // 计算各个顺位率
            stats.rankingRates = stats.rankings.map(count => 
                ((count / stats.gamesPlayed) * 100).toFixed(1) + '%'
            );
        }
    });

    return playerStats;
}

// 更新排名页面
function updateRankings() {
    const playerStats = calculatePlayerStats();
    const rankingsContent = document.getElementById('rankingsContent');
    if (!rankingsContent) return;

    // 转换为数组并排序
    const players = Object.entries(playerStats).map(([name, stats]) => ({
        name,
        ...stats
    }));

    // 获取排序选项
    const sortOption = document.getElementById('sortOption')?.value || 'averageScore';
    
    // 首先将玩家分为有比赛记录和无比赛记录两组
    const activePlayers = players.filter(p => p.gamesPlayed > 0);
    const inactivePlayers = players.filter(p => p.gamesPlayed === 0);
    
    // 对有比赛记录的玩家进行排序
    if (sortOption === 'averageScore') {
        activePlayers.sort((a, b) => b.averageScore - a.averageScore);
    } else {
        activePlayers.sort((a, b) => {
            // 如果平均顺位相同，则按平均素点排序
            if (a.averageRanking === b.averageRanking) {
                return b.averageScore - a.averageScore;
            }
            return a.averageRanking - b.averageRanking;
        });
    }

    // 对无比赛记录的玩家按名字排序
    inactivePlayers.sort((a, b) => a.name.localeCompare(b.name));

    // 合并两组玩家
    const sortedPlayers = [...activePlayers, ...inactivePlayers];

    // 生成HTML
    let html = '<table class="rankings-table">';
    html += `
        <tr>
            <th>排名</th>
            <th>玩家</th>
            <th>场数</th>
            <th>平均素点</th>
            <th>平均顺位</th>
            <th>一位率</th>
            <th>二位率</th>
            <th>三位率</th>
            <th>四位率</th>
            <th>一位次数</th>
            <th>二位次数</th>
            <th>三位次数</th>
            <th>四位次数</th>
        </tr>
    `;

    sortedPlayers.forEach((player, index) => {
        // 对于无比赛记录的玩家，不显示排名
        const rankDisplay = player.gamesPlayed > 0 ? index + 1 : '-';
        
        html += `
            <tr${player.gamesPlayed === 0 ? ' class="inactive-player"' : ''}>
                <td>${rankDisplay}</td>
                <td>${player.name}</td>
                <td>${player.gamesPlayed}</td>
                <td>${player.averageScore}</td>
                <td>${player.averageRanking}</td>
                <td>${player.rankingRates[0]}</td>
                <td>${player.rankingRates[1]}</td>
                <td>${player.rankingRates[2]}</td>
                <td>${player.rankingRates[3]}</td>
                <td>${player.rankings[0]}</td>
                <td>${player.rankings[1]}</td>
                <td>${player.rankings[2]}</td>
                <td>${player.rankings[3]}</td>
            </tr>
        `;
    });

    html += '</table>';
    rankingsContent.innerHTML = html;
}

// 为玩家选择添加change事件监听
document.addEventListener('DOMContentLoaded', () => {
    const selects = document.querySelectorAll('.player-select');
    selects.forEach(select => {
        select.addEventListener('change', updatePlayerSelects);
    });
}); 