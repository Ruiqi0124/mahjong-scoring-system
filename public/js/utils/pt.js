// PT计算工具
const ptUtils = {
    calculateGamePtsFromScoresWithIndex(scoresWithIndex, basePts = [45, 5, -15, -35]) {
        if (basePts.reduce((acc, pt) => acc + pt, 0) !== 0)
            throw new Error("马点总和不为0", basePts);
        const indicesOfScore = (targetScore) => scoresWithIndex.map(({ score, index }) => score === targetScore ? index : null).filter(index => index !== null);
        const result = {};
        scoresWithIndex.forEach(({ score }) => {
            const umaIndices = indicesOfScore(score);
            const umaTotal = umaIndices.reduce((sum, index) => sum + basePts[index], 0);
            const uma = umaTotal / umaIndices.length;
            const pt = (score - 30000) / 1000 + uma;
            result[score] = pt;
        });
        return result;
    },

    calculateGamePtsFromScores(scores) {
        scores = scores.sort((a, b) => b - a);
        const scoresWithIndex = scores.map((score, index) => ({ score, index }));
        return this.calculateGamePtsFromScoresWithIndex(scoresWithIndex);
    },
}; 