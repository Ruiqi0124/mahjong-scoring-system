// 游戏表单组件
const GameForm = {
    duplicateModal: null,
    pendingGameData: null,

    // 初始化
    async init() {
        try {
            this.duplicateModal = new bootstrap.Modal(document.getElementById('duplicatePlayerModal'));
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
                    players.map(player => {
                        // 如果player是对象，使用其name属性
                        const playerName = typeof player === 'object' ? player.name : player;
                        return `<option value="${playerName}" ${playerName === currentValues[index] ? 'selected' : ''}>${playerName}</option>`;
                    }).join('');
            });
        } catch (error) {
            console.error('更新玩家列表失败:', error);
            this.showError('更新玩家列表失败: ' + error.message);
        }
    },

    // 更新PT显示
    updatePT() {
        const scores = [];
        for (let i = 1; i <= 4; i++) {
            const score = parseInt(document.getElementById(`score${i}`).value) || 0;
            scores.push({ score, index: i - 1 }); // 保存原始索引
        }
        
        // 按分数降序排序，保留原始索引
        scores.sort((a, b) => b.score - a.score);
        
        // 计算并显示PT
        const playersWithPT = ptUtils.calculateGamePTs(scores.map(s => ({ score: s.score })));
        
        // 使用原始索引更新PT显示
        for (let i = 1; i <= 4; i++) {
            const ptElement = document.getElementById(`pt${i}`);
            const score = parseInt(document.getElementById(`score${i}`).value);
            
            if (!isNaN(score)) { // 只要有输入分数就显示PT
                // 找到对应的计算结果
                const scoreInfo = scores.find(s => s.score === score);
                if (scoreInfo) {
                    const ptValue = playersWithPT[scores.indexOf(scoreInfo)].pt;
                    ptElement.textContent = ptValue.toFixed(1);
                }
            } else {
                ptElement.textContent = '-';
            }
        }
    },

    // 保存对局数据
    async saveData() {
        try {
            const playerNames = [];
            const scores = [];
            let totalScore = 0;
            
            // 收集玩家数据
            for (let i = 1; i <= 4; i++) {
                const name = document.getElementById(`player${i}`).value;
                const score = parseInt(document.getElementById(`score${i}`).value);
                
                if (!name || isNaN(score)) {
                    throw new Error('请填写完整的对局信息');
                }
                
                playerNames.push(name);
                scores.push(score);
                totalScore += score;
            }
            
            // 验证总分
            if (totalScore !== 120000) {
                throw new Error('得点总和必须为120,000');
            }
            
            // 检查重复玩家
            const uniquePlayers = new Set(playerNames);
            if (uniquePlayers.size !== 4) {
                const duplicateModal = new bootstrap.Modal(document.getElementById('duplicatePlayerModal'));
                document.getElementById('duplicatePlayers').textContent = 
                    this.findDuplicatePlayers(playerNames).join('、');
                duplicateModal.show();
                this.pendingGameData = { players: playerNames, scores };
                return;
            }
            
            await this.processSaveData(playerNames, scores);
        } catch (error) {
            this.showError(error.message);
        }
    },

    // 处理保存数据
    async processSaveData(playerNames, scores) {
        try {
            // 保存对局
            await this.saveGameData(playerNames, scores);
            
            // 重置表单
            this.resetForm();
            // 更新历史记录
            await History.updateHistory();
        } catch (error) {
            this.showError(error.message);
        }
    },

    // 查找重复玩家
    findDuplicatePlayers(players) {
        const duplicates = new Set();
        const seen = new Set();
        
        players.forEach(player => {
            if (seen.has(player)) {
                duplicates.add(player);
            }
            seen.add(player);
        });
        
        return Array.from(duplicates);
    },

    // 确认保存带有重复玩家的对局
    async confirmSaveWithDuplicates() {
        if (!this.pendingGameData) return;

        try {
            const { players, scores } = this.pendingGameData;
            
            // 保存对局
            await api.addGame(players, scores);

            // 清空表单
            this.resetForm();

            // 更新历史记录
            await History.updateHistory();

            // 隐藏对话框
            this.duplicateModal.hide();
            
            // 显示成功消息
            alert('记录保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            this.showError(error.message);
        } finally {
            this.pendingGameData = null;
        }
    },

    // 保存游戏数据的具体实现
    async saveGameData(players, scores) {
        try {
            // 保存数据
            await api.addGame(players, scores);

            // 清空表单
            this.resetForm();

            // 更新历史记录
            await History.updateHistory();

            // 显示成功消息
            alert('记录保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            throw error; // 向上传递错误
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
    },

    // 重置表单
    resetForm() {
        [1, 2, 3, 4].forEach(i => {
            document.getElementById(`player${i}`).value = '';
            document.getElementById(`score${i}`).value = '';
        });
    }
}; 