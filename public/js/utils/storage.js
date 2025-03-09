// 数据验证工具
window.storage = {
    // 验证玩家数据
    validatePlayers(players) {
        if (!Array.isArray(players)) {
            throw new Error('玩家必须是数组');
        }
        if (players.length !== 4) {
            throw new Error('必须有4个玩家');
        }
        return true;
    },

    // 验证分数数据
    validateScores(scores) {
        if (!Array.isArray(scores)) {
            throw new Error('分数必须是数组');
        }

        if (scores.length !== 4) {
            throw new Error('必须有4个分数');
        }

        if (!scores.every(score => !isNaN(parseInt(score)))) {
            throw new Error('所有分数必须是数字');
        }

        // 转换分数为整数
        const parsedScores = scores.map(score => parseInt(score));
        
        // 验证总分
        const totalScore = parsedScores.reduce((sum, score) => sum + score, 0);
        if (totalScore !== 120000) {
            throw new Error('得点总和必须为120,000');
        }

        return parsedScores;
    }
}; 