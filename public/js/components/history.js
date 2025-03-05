// 历史记录组件
const History = {
    // 显示历史记录
    async displayHistory() {
        const historyContent = document.getElementById('historyContent');
        const games = await api.getGames();
        
        if (games.length === 0) {
            historyContent.innerHTML = '<p>暂无比赛记录</p>';
            return;
        }

        let html = '<table class="history-table">';
        html += '<tr><th>时间</th><th>玩家</th><th>分数</th></tr>';

        games.forEach(game => {
            const date = new Date(game.timestamp).toLocaleString('zh-CN');
            html += `<tr><td rowspan="4">${date}</td>`;
            
            game.players.forEach((player, index) => {
                if (index > 0) {
                    html += '<tr>';
                }
                html += `<td>${player.name}</td><td>${player.score}</td></tr>`;
            });
        });

        html += '</table>';
        historyContent.innerHTML = html;
    }
}; 