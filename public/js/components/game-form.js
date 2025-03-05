// 游戏表单组件
const GameForm = {
    // 初始化
    async init() {
        try {
            await this.updatePlayerSelects();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    },

    // 更新玩家选择框
    async updatePlayerSelects() {
        try {
            const players = await api.getPlayers();
            const selects = [1, 2, 3, 4].map(i => document.getElementById(`player${i}`));
            
            // 保存当前选择的值
            const currentValues = selects.map(select => select.value);
            
            // 更新选项
            selects.forEach((select, index) => {
                select.innerHTML = '<option value="">选择玩家</option>' + 
                    players.map(player => 
                        `<option value="${player}" ${player === currentValues[index] ? 'selected' : ''}>${player}</option>`
                    ).join('');
            });
        } catch (error) {
            console.error('更新玩家列表失败:', error);
            this.showError('更新玩家列表失败: ' + error.message);
        }
    },

    // 保存比赛数据
    async saveData() {
        try {
            // 清除之前的错误
            this.hideError();

            // 获取玩家和分数
            const players = [1, 2, 3, 4].map(i => document.getElementById(`player${i}`).value);
            const scores = [1, 2, 3, 4].map(i => parseInt(document.getElementById(`score${i}`).value));

            // 验证数据
            // 1. 检查是否所有字段都已填写
            if (players.some(p => !p) || scores.some(s => isNaN(s))) {
                throw new Error('请填写所有玩家和分数');
            }

            // 2. 检查玩家是否重复
            if (new Set(players).size !== 4) {
                throw new Error('玩家不能重复');
            }

            // 3. 检查分数总和是否为 120000
            const totalScore = scores.reduce((sum, score) => sum + score, 0);
            if (totalScore !== 120000) {
                throw new Error('分数总和必须为 120,000');
            }

            // 4. 检查分数是否按顺序递减
            for (let i = 1; i < scores.length; i++) {
                if (scores[i] > scores[i-1]) {
                    throw new Error('分数必须按顺位递减');
                }
            }

            // 保存数据
            await api.addGame(players, scores);

            // 清空表单
            [1, 2, 3, 4].forEach(i => {
                document.getElementById(`player${i}`).value = '';
                document.getElementById(`score${i}`).value = '';
            });

            // 更新历史记录
            await History.updateHistory();

            // 显示成功消息
            alert('记录保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            this.showError(error.message);
        }
    },

    // 显示错误信息
    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    },

    // 隐藏错误信息
    hideError() {
        const errorDiv = document.getElementById('error');
        errorDiv.style.display = 'none';
    }
}; 