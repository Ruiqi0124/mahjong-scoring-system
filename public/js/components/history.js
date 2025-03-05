// 历史记录组件
const History = {
    // 初始化
    async init() {
        try {
            await this.updateHistory();
        } catch (error) {
            console.error('初始化历史记录失败:', error);
            alert('初始化历史记录失败: ' + error.message);
        }
    },

    // 更新历史记录
    async updateHistory() {
        try {
            const games = await api.getGames();
            const tbody = document.getElementById('historyBody');
            
            tbody.innerHTML = games.map(game => {
                const date = new Date(game.timestamp);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                
                // 按顺位排序玩家
                const sortedPlayers = game.players.map((player, index) => ({
                    name: player.name,
                    score: player.score
                }));

                return `
                    <tr>
                        <td>${formattedDate}</td>
                        ${sortedPlayers.map(player => `
                            <td>
                                <div class="d-flex justify-content-between align-items-center">
                                    <span>${player.name}</span>
                                    <span class="badge bg-light text-dark">${player.score.toLocaleString()}</span>
                                </div>
                            </td>
                        `).join('')}
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('更新历史记录失败:', error);
            alert('更新历史记录失败: ' + error.message);
        }
    }
}; 