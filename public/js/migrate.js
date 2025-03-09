// 数据迁移工具
const migrate = {
    // 从本地存储迁移数据到服务器
    async migrateLocalData() {
        try {
            // 获取本地存储的数据
            const localGames = localStorage.getItem('mahjongGames');
            if (!localGames) {
                console.log('没有找到本地数据，无需迁移');
                return;
            }

            const games = JSON.parse(localGames);
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

            // 迁移完成后，重命名本地存储的键名，作为备份
            localStorage.setItem('mahjongGames_backup', localGames);
            localStorage.removeItem('mahjongGames');

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