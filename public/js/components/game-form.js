// 游戏表单组件
const GameForm = {
    ruleSelect: null,
    pendingGameData: null,

    // 初始化
    async init() {
        try {
            this.ruleSelect = document.getElementById('ruleSelect');
            this.outOfTableKyoutaku = document.getElementById('outOfTableKyoutaku');
            await this.updatePlayerSelects();
            this.ruleSelect.addEventListener('change', () => {
                if (this.ruleSelect.value === "A") {
                    this.outOfTableKyoutaku.disabled = false;
                    this.outOfTableKyoutaku.value = 0;
                } else {
                    this.outOfTableKyoutaku.disabled = true;
                    this.outOfTableKyoutaku.value = "";
                }
                this.updatePT();
            });
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    },

    // 更新玩家选择框
    async updatePlayerSelects() {
        try {
            const players = await api.getPlayers();
            const selects = [...Array(4).keys()].map(i => document.getElementById(`player${i}`));

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
        const scores = [...Array(4)].map((_, i) => parseInt(document.getElementById(`score${i}`).value));
        const allValid = scores.every(s => !isNaN(s));
        let gamePts = null;
        if (allValid) {
            if (this.ruleSelect.value === "M") {
                gamePts = ptCalc.calculateGamePtsFromScores(scores, [45, 5, -15, -35]);
            } else if (this.ruleSelect.value === "A") {
                const ukiCount = scores.filter(score => score >= 30000).length;
                if (ukiCount === 1) {
                    gamePts = ptCalc.calculateGamePtsFromScores(scores, [12, -1, -3, -8]);
                } else if (ukiCount === 2) {
                    gamePts = ptCalc.calculateGamePtsFromScores(scores, [8, 4, -4, -8]);
                } else if (ukiCount === 3) {
                    gamePts = ptCalc.calculateGamePtsFromScores(scores, [8, 3, 1, -12]);
                } else if (ukiCount === 4) {
                    gamePts = ptCalc.calculateGamePtsFromScores(scores, [0, 0, 0, 0]);
                }
            }
        }

        scores.forEach((score, index) => {
            const ptElement = document.getElementById(`pt${index}`);

            if (gamePts) {
                const totalPt = gamePts[score].finalPoint;
                ptElement.textContent = totalPt.toFixed(1);
                ptElement.className = `pt-value ${totalPt >= 0 ? 'text-success' : 'text-danger'}`;
            } else {
                ptElement.textContent = "";
            }
        });
    },

    // 保存对局数据
    async saveData() {
        try {
            const playerNames = [];
            const scores = [];
            let totalScore = 0;

            // 收集玩家数据
            for (let i = 0; i < 4; i++) {
                const name = document.getElementById(`player${i}`).value;
                const score = parseInt(document.getElementById(`score${i}`).value);

                if (!name || isNaN(score)) {
                    throw new Error('请填写完整的对局信息');
                }

                playerNames.push(name);
                scores.push(score);
                totalScore += score;
            }

            if (!this.outOfTableKyoutaku.disabled) {
                const outOfTableKyoutaku = parseInt(this.outOfTableKyoutaku.value);
                if (isNaN(outOfTableKyoutaku)) {
                    throw new Error('桌外供托格式有误');
                }
                totalScore += outOfTableKyoutaku;
            }

            // 验证总分
            if (totalScore !== 120000) {
                throw new Error(`得点总和必须为120,000，当前为${totalScore}`);
            }

            // 检查重复玩家
            const uniquePlayers = new Set(playerNames);
            if (uniquePlayers.size !== 4) {
                throw new Error(`含有重复玩家。若有不止一名其他玩家，请先将其登录为新玩家，或不录入此局。`)
            }

            await api.addGame(playerNames, scores, this.ruleSelect.value);
            this.resetForm();
            await History.updateHistory();
            alert('记录保存成功！');
        } catch (error) {
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
    },

    // 重置表单
    resetForm() {
        for (let i = 0; i < 4; i++) {
            document.getElementById(`player${i}`).value = '';
            document.getElementById(`score${i}`).value = '';
        };
    }
}; 