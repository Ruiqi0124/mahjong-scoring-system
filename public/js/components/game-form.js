// 游戏表单组件
const GameForm = {
    // 初始化表单
    init() {
        this.updatePlayerSelects();
    },

    // 更新玩家选择下拉框
    async updatePlayerSelects() {
        const players = await api.getPlayers();
        const selects = document.querySelectorAll('.player-select');
        
        selects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">选择玩家</option>';
            
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player;
                option.textContent = player;
                if (player === currentValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    },

    // 保存比赛数据
    async saveData() {
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
            // 保存比赛记录
            await api.addGame(players, scores);
            
            // 更新显示
            this.clearInputs();
            History.displayHistory();
            
            alert('保存成功！');
        } catch (error) {
            alert('保存失败：' + error.message);
        }
    },

    // 清空输入框
    clearInputs() {
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`score${i}`).value = '';
        }
    }
}; 