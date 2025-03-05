// 全局变量
let gameHistory = [];
let playersList = [];

// 初始化
async function init() {
    try {
        // 获取玩家列表和比赛记录
        const [players, games] = await Promise.all([
            api.getPlayers(),
            api.getGames()
        ]);
        
        playersList = players;
        gameHistory = games;
        
        // 更新显示
        displayHistory();
        updatePlayerSelects();
        updateRankings();
    } catch (error) {
        alert('初始化数据失败：' + error.message);
    }
}

// 初始化显示
document.addEventListener('DOMContentLoaded', init);

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
async function addNewPlayer() {
    const newPlayerInput = document.getElementById('newPlayerName');
    const playerName = newPlayerInput.value.trim();
    
    if (!playerName) {
        alert('请输入玩家名称！');
        return;
    }

    try {
        await api.addPlayer(playerName);
        playersList.push(playerName);
        newPlayerInput.value = '';
        updateRankings();
        updatePlayerSelects();
    } catch (error) {
        alert(error.message);
    }
}

// 保存比赛数据
async function saveData() {
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

    try {
        // 保存到服务器
        const game = await api.addGame(players, scores);
        
        // 添加到本地历史记录
        gameHistory.unshift(game);
        
        // 更新显示
        displayHistory();
        updateRankings();
        
        // 清空输入框
        clearInputs();
    } catch (error) {
        alert('保存失败：' + error.message);
    }
}

// ... 其他函数保持不变 ... 