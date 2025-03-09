// 数据迁移工具
const migrate = {
    // 检查本地存储中的游戏记录
    checkLocalGames() {
        const localGames = localStorage.getItem('mahjongGames');
        const localGamesNew = localStorage.getItem('games');
        
        if (!localGames && !localGamesNew) {
            console.log('没有找到本地数据');
            return;
        }

        // 合并两个来源的游戏记录
        const games = [
            ...(localGames ? JSON.parse(localGames) : []),
            ...(localGamesNew ? JSON.parse(localGamesNew) : [])
        ];
        
        console.log('所有本地对局记录:', games);
        
        // 检查每条记录的时间
        games.forEach((game, index) => {
            console.log(`第 ${index + 1} 条记录:`);
            console.log('- 时间戳:', game.timestamp);
            console.log('- 解析后的时间:', new Date(game.timestamp));
            console.log('- 玩家:', game.players);
            console.log('- 分数:', game.scores);
        });
    },

    // 从本地存储迁移数据到服务器
    async migrateLocalData() {
        try {
            // 获取本地存储的数据（检查两个可能的键名）
            const localGames = localStorage.getItem('mahjongGames');
            const localGamesNew = localStorage.getItem('games');
            
            if (!localGames && !localGamesNew) {
                console.log('没有找到本地数据，无需迁移');
                return;
            }

            // 合并两个来源的游戏记录
            const games = [
                ...(localGames ? JSON.parse(localGames) : []),
                ...(localGamesNew ? JSON.parse(localGamesNew) : [])
            ];
            
            console.log(`找到 ${games.length} 条本地对局记录`);

            // 转换并上传每条记录
            for (const game of games) {
                try {
                    // 构造符合新格式的对局数据
                    const newGame = {
                        players: game.players.map((name, index) => ({
                            name,
                            score: game.scores[index]
                        })),
                        time: game.timestamp // 直接使用原始时间戳
                    };

                    // 上传到服务器
                    await fetch('/api/games', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newGame)
                    });

                    console.log('成功迁移一条对局记录');
                } catch (error) {
                    console.error('迁移单条记录失败:', error);
                }
            }

            // 迁移完成后，备份并删除本地数据
            if (localGames) {
                localStorage.setItem('mahjongGames_backup', localGames);
                localStorage.removeItem('mahjongGames');
            }
            if (localGamesNew) {
                localStorage.setItem('games_backup', localGamesNew);
                localStorage.removeItem('games');
            }

            console.log('数据迁移完成');
            alert('本地数据已成功迁移到服务器！');
            
            // 刷新页面以显示最新数据
            window.location.reload();
        } catch (error) {
            console.error('数据迁移失败:', error);
            alert('数据迁移失败: ' + error.message);
        }
    }
}; 