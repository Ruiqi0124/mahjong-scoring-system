// PT计算工具
window.ptUtils = {
    // 计算单场比赛的PT
    calculateGamePTs(scores) {
        // 确保分数已经按降序排序
        const sortedScores = [...scores].sort((a, b) => b.score - a.score);
        
        // 基础PT值
        const basePTs = [30, 10, -10, -30];
        
        // 计算每个位置的PT
        return sortedScores.map((score, index) => {
            let pt = basePTs[index];
            
            // 计算与上一名的分差
            if (index > 0) {
                const scoreDiff = sortedScores[index - 1].score - score.score;
                // 每20000分1PT
                pt += Math.floor(scoreDiff / 20000);
            }
            
            // 计算与下一名的分差
            if (index < sortedScores.length - 1) {
                const scoreDiff = score.score - sortedScores[index + 1].score;
                // 每20000分1PT
                pt += Math.floor(scoreDiff / 20000);
            }
            
            return {
                ...score,
                pt
            };
        });
    }
}; 