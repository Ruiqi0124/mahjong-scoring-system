// PT计算工具
const ptCalc = {
    // Use calculateGamePtsFromScores instead
    calculateGamePtsFromScoresWithIndex_deprecated(scoresWithIndex, basePts = [45, 5, -15, -35]) {
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

    calculateGamePtsFromScores(scores, basePts = [45, 5, -15, -35]) {
        if (basePts.reduce((acc, pt) => acc + pt, 0) !== 0)
            throw new Error("马点总和不为0", basePts);
        scores = scores.sort((a, b) => b - a);
        const scoresWithIndex = scores.map((score, index) => ({ score, index }));
        const indicesOfScore = (targetScore) => scoresWithIndex.map(({ score, index }) => score === targetScore ? index : null).filter(index => index !== null);
        const result = {};
        scoresWithIndex.forEach(({ score }) => {
            const placementIndices = indicesOfScore(score); // could be just [0], or e.g. [0, 1] (in case of a tie)
            const placement = placementIndices.reduce((sum, index) => sum + (index + 1), 0) / placementIndices.length;
            const placementPoint = placementIndices.reduce((sum, index) => sum + basePts[index], 0) / placementIndices.length;
            const rawPoint = (score - 30000) / 1000;
            const finalPoint = rawPoint + placementPoint;
            result[score] = {
                placementIndices,
                placement,
                placementPoint,
                rawPoint,
                finalPoint
            }
        });
        return result;
    },

    calculateRateChange({ scores, myScore, allPlayerRates, myRate, pt, myNumGamesPlayed }) {
        const averageRateOfTable = Math.max(1500, allPlayerRates.reduce((acc, rate) => acc + rate, 0) / 4);
        const method1 = () => {
            // https://x.com/MLRating
            return 0.2 * (pt + (averageRateOfTable - myRate) / 40);
        };

        const method2 = () => {
            // https://note.com/mrating_amamo/n/n8ad709572351
            const gamePt = this.calculateGamePtsFromScores(scores, [90, 10, -30, -70]);
            const placementPoint = gamePt[myScore].placementPoint;
            const possibilityFn = (x) => (1 / (Math.pow(10, x / 400) + 3));
            if (pt >= 0) {
                const possibilityOfMinus = possibilityFn(myRate - averageRateOfTable);
                return placementPoint * possibilityOfMinus;
            } else {
                const possibilityOfPlus = possibilityFn(averageRateOfTable - myRate);
                return placementPoint * possibilityOfPlus;
            }
        }

        const method3 = () => {
            // tenhou, ron ron
            const gamePt = this.calculateGamePtsFromScores(scores, [30, 10, -10, -30]);
            const placementPoint = gamePt[myScore].placementPoint;
            const adjustment = Math.max(0.2, 1 - (myNumGamesPlayed * 0.002));
            return adjustment * (placementPoint + (Math.max(1500, averageRateOfTable) - myRate) / 40);
        }

        const method4 = () => {
            // mj
            return 0.24 * (pt + (averageRateOfTable - myRate) / 40);
        };

        const method5 = () => {
            // maru-jan
            const gamePt = this.calculateGamePtsFromScores(scores, [45, 5, -15, -35]);
            const placementPoint = gamePt[myScore].placementPoint;
            return 0.2 * (placementPoint + (averageRateOfTable - myRate) / 80);
        }

        return method4();
    },

    addRateChangeToGames(players, games) {
        if (games[0] && "rateChange" in games[0].players[0]) {
            return;
        }
        const rateOfPlayer = {};
        const numGamesPlayedOfPlayer = {};
        players.forEach((player) => {
            rateOfPlayer[player.name] = 1500;
            numGamesPlayedOfPlayer[player.name] = 0;
        });
        games.forEach((game) => {
            // if (game.players.find((player) => player.name === "其他玩家")) {
            //     game.players.forEach((player) => {
            //         player.previousRate = rateOfPlayer[player.name];
            //         player.rateChange = 0;
            //         player.rate = rateOfPlayer[player.name];
            //     });
            //     return;
            // }
            const allPlayerRates = game.players.map((player) => player.name === "其他玩家" ? 1500 : rateOfPlayer[player.name]);
            const scores = game.players.map((player) => player.score);
            game.players.forEach((player) => {
                player.previousRate = rateOfPlayer[player.name];
                player.rateChange = 0;
                if (player.name != "其他玩家") {
                    const rateChange = Number(this.calculateRateChange({
                        scores,
                        myScore: player.score,
                        allPlayerRates,
                        myRate: rateOfPlayer[player.name],
                        pt: player.pt,
                        myNumGamesPlayed: numGamesPlayedOfPlayer[player.name]
                    }).toFixed(1));
                    rateOfPlayer[player.name] += rateChange;
                    player.rateChange = rateChange;
                }
                player.rate = rateOfPlayer[player.name];
                numGamesPlayedOfPlayer[player.name] += 1;
            });
        });
    }
};
