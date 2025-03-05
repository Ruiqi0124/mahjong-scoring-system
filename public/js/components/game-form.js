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
                    players.map(player => 
                        `<option value="${player}" ${player === currentValues[index] ? 'selected' : ''}>${player}</option>`
                    ).join('');
            });
        } catch (error) {
            console.error('更新玩家列表失败:', error);
            this.showError('更新玩家列表失败: ' + error.message);
        }
    },

    // 检查并保存比赛数据
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

            // 2. 检查分数总和是否为 120000
            const totalScore = scores.reduce((sum, score) => sum + score, 0);
            if (totalScore !== 120000) {
                throw new Error('分数总和必须为 120,000');
            }

            // 3. 检查分数是否按顺序递减
            for (let i = 1; i < scores.length; i++) {
                if (scores[i] > scores[i-1]) {
                    throw new Error('分数必须按顺位递减');
                }
            }

            // 4. 检查是否有重复玩家
            const duplicates = this.findDuplicatePlayers(players);
            if (duplicates.length > 0) {
                // 保存当前数据以供确认后使用
                this.pendingGameData = { players, scores };
                // 显示重复玩家确认弹窗
                document.getElementById('duplicatePlayers').textContent = duplicates.join('、');
                this.duplicateModal.show();
                return;
            }

            // 如果没有重复玩家，直接保存
            await this.saveGameData(players, scores);
        } catch (error) {
            console.error('保存失败:', error);
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
            await this.saveGameData(this.pendingGameData.players, this.pendingGameData.scores);
            this.duplicateModal.hide();
        } catch (error) {
            console.error('保存失败:', error);
            this.showError(error.message);
        } finally {
            this.pendingGameData = null;
        }
    },

    // 保存游戏数据的具体实现
    async saveGameData(players, scores) {
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