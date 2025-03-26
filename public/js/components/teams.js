const Teams = {
    createTeamModal: null,
    recordMatchModal: null,
    teams: [],
    matches: [],

    init() {
        // 初始化模态框
        this.createTeamModal = new bootstrap.Modal(document.getElementById('createTeamModal'));
        this.recordMatchModal = new bootstrap.Modal(document.getElementById('recordMatchModal'));

        // 加载团队和比赛数据
        this.loadTeams();
        this.loadMatches();

        // 加载玩家列表用于创建团队
        this.loadPlayers();
    },

    // 显示创建团队模态框
    showCreateTeamModal() {
        this.createTeamModal.show();
    },

    // 显示记录比赛模态框
    showRecordMatchModal() {
        const teamScores = document.getElementById('teamScores');
        teamScores.innerHTML = '';
        
        // 创建4个玩家的输入行
        for (let i = 0; i < 4; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>
                    <select class="form-select player-select" data-position="${i}" onchange="Teams.updateTeamInfo(this)">
                        <option value="">选择玩家</option>
                    </select>
                </td>
                <td class="team-name" data-position="${i}">-</td>
                <td>
                    <input type="number" class="form-control score-input" 
                           data-position="${i}" 
                           onchange="Teams.updatePT()"
                           required>
                </td>
                <td class="pt" data-position="${i}">0</td>
            `;
            teamScores.appendChild(row);
        }
        
        // 加载玩家列表
        this.updatePlayerSelects();
        
        // 重置时间为当前时间
        document.getElementById('matchTime').value = new Date().toISOString().slice(0, 16);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('recordMatchModal'));
        modal.show();
    },

    // 更新玩家选择器
    async updatePlayerSelects() {
        try {
            const response = await fetch('/api/players');
            const players = await response.json();
            
            const playerSelects = document.querySelectorAll('.player-select');
            playerSelects.forEach(select => {
                // 保存当前选中的值
                const currentValue = select.value;
                
                // 清空并重新填充选项
                select.innerHTML = '<option value="">选择玩家</option>';
                players.forEach(playerName => {
                    const option = document.createElement('option');
                    option.value = playerName;
                    option.textContent = playerName;
                    select.appendChild(option);
                });
                
                // 恢复之前选中的值
                if (currentValue) {
                    select.value = currentValue;
                }
            });
        } catch (error) {
            console.error('加载玩家列表失败:', error);
            alert('加载玩家列表失败，请刷新页面重试');
        }
    },

    // 更新队伍信息
    async updateTeamInfo(selectElement) {
        const position = selectElement.dataset.position;
        const playerName = selectElement.value;
        const teamNameCell = document.querySelector(`.team-name[data-position="${position}"]`);
        
        if (!playerName) {
            teamNameCell.textContent = '-';
            return;
        }
        
        try {
            const response = await fetch('/api/teams');
            const teams = await response.json();
            
            // 查找玩家所属的队伍
            const team = teams.find(t => t.members.includes(playerName));
            teamNameCell.textContent = team ? team.name : '无队伍';
        } catch (error) {
            console.error('获取队伍信息失败:', error);
            teamNameCell.textContent = '获取失败';
        }
    },

    // 更新PT值
    updatePT() {
        const scores = Array.from(document.querySelectorAll('.score-input'))
            .map(input => parseInt(input.value) || 0);
        
        // 计算总分
        const totalScore = scores.reduce((sum, score) => sum + score, 0);
        
        // 如果总分不为120000，显示警告
        if (totalScore !== 0 && totalScore !== 120000) {
            alert('得点总和必须为120,000');
            return;
        }
        
        // 计算每个位置的PT
        const ptElements = document.querySelectorAll('.pt');
        scores.forEach((score, index) => {
            const pt = this.calculatePT(score, index + 1);
            ptElements[index].textContent = pt;
        });
    },

    calculatePT(score, position) {
        if (!score) return 0;
        // 计算PT：(得点 - 30000) / 1000 + 顺位分
        const positionPoints = [15, 5, -5, -15];
        return ((score - 30000) / 1000 + positionPoints[position - 1]).toFixed(1);
    },

    // 记录比赛
    async recordMatch() {
        // 获取比赛时间
        const matchTime = document.getElementById('matchTime').value;
        if (!matchTime) {
            alert('请选择比赛时间');
            return;
        }
        
        // 收集玩家数据
        const playerData = [];
        const playerSelects = document.querySelectorAll('.player-select');
        const scoreInputs = document.querySelectorAll('.score-input');
        const ptElements = document.querySelectorAll('.pt');
        const teamNameElements = document.querySelectorAll('.team-name');
        
        for (let i = 0; i < 4; i++) {
            const playerName = playerSelects[i].value;
            const score = parseInt(scoreInputs[i].value) || 0;
            const pt = parseFloat(ptElements[i].textContent) || 0;
            const teamName = teamNameElements[i].textContent;
            
            if (!playerName) {
                alert('请选择所有玩家');
                return;
            }
            
            if (!score) {
                alert('请输入所有玩家的得点');
                return;
            }
            
            if (teamName === '-' || teamName === '获取失败') {
                alert('请确保所有玩家的队伍信息正确');
                return;
            }
            
            playerData.push({
                name: playerName,
                team: teamName,
                score: score,
                pt: pt
            });
        }
        
        // 验证总分
        const totalScore = playerData.reduce((sum, data) => sum + data.score, 0);
        if (totalScore !== 120000) {
            alert('得点总和必须为120,000');
            return;
        }
        
        try {
            const response = await fetch('/api/team-matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    time: matchTime,
                    players: playerData
                })
            });
            
            if (!response.ok) {
                throw new Error('记录比赛失败');
            }
            
            // 关闭模态框并刷新数据
            bootstrap.Modal.getInstance(document.getElementById('recordMatchModal')).hide();
            this.loadTeams();
            this.loadMatches();
            
        } catch (error) {
            console.error('记录比赛失败:', error);
            alert('记录比赛失败，请重试');
        }
    },

    // 加载玩家列表
    async loadPlayers() {
        try {
            const response = await fetch('/api/players');
            const players = await response.json();
            
            // 更新成员选择区域
            const memberSelection = document.getElementById('memberSelection');
            memberSelection.innerHTML = players.map(playerName => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${playerName}" id="player_${playerName}">
                    <label class="form-check-label" for="player_${playerName}">
                        ${playerName}
                    </label>
                </div>
            `).join('');
        } catch (error) {
            console.error('加载玩家列表失败:', error);
            alert('加载玩家列表失败');
        }
    },

    // 加载团队列表
    async loadTeams() {
        try {
            const response = await fetch('/api/teams');
            this.teams = await response.json();
            this.updateTeamsList();
        } catch (error) {
            console.error('加载团队列表失败:', error);
            alert('加载团队列表失败');
        }
    },

    // 加载比赛记录
    async loadMatches() {
        try {
            const response = await fetch('/api/team-matches');
            const matches = await response.json();
            
            const matchRecords = document.getElementById('matchRecords');
            matchRecords.innerHTML = matches.map(match => {
                // 按得分排序玩家
                const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score);
                
                // 生成每个玩家的行
                return sortedPlayers.map((player, index) => `
                    <tr>
                        ${index === 0 ? `<td rowspan="4">${new Date(match.time).toLocaleString('zh-CN')}</td>` : ''}
                        <td>${index + 1}</td>
                        <td>${player.name}</td>
                        <td>${player.team}</td>
                        <td>${player.score.toLocaleString()}</td>
                        <td>${player.pt}</td>
                    </tr>
                `).join('');
            }).join('');
            
        } catch (error) {
            console.error('加载比赛记录失败:', error);
            alert('加载比赛记录失败，请刷新页面重试');
        }
    },

    // 更新团队列表显示
    updateTeamsList() {
        const tbody = document.getElementById('teamsList');
        tbody.innerHTML = this.teams.map(team => `
            <tr>
                <td>${team.name}</td>
                <td>${team.members.join(', ')}</td>
                <td>${team.games}</td>
                <td>${(team.winRate * 100).toFixed(1)}%</td>
                <td class="text-${team.totalPT >= 0 ? 'success' : 'danger'}">${team.totalPT.toFixed(1)}</td>
                <td class="text-${team.avgPT >= 0 ? 'success' : 'danger'}">${team.avgPT.toFixed(1)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="Teams.deleteTeam('${team.name}')"
                            ${team.games > 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // 更新比赛记录显示
    updateMatchesList() {
        const tbody = document.getElementById('matchesList');
        tbody.innerHTML = this.matches.map(match => {
            // 按分数排序的团队
            const sortedTeams = [...match.teams].sort((a, b) => b.score - a.score);
            
            return `
                <tr>
                    <td>${this.formatDate(match.time)}</td>
                    ${sortedTeams.map(team => `
                        <td>
                            ${team.name}<br>
                            <small class="text-muted">
                                ${team.score.toLocaleString()}<br>
                                <span class="text-${team.pt >= 0 ? 'success' : 'danger'}">
                                    ${team.pt.toFixed(1)}pt
                                </span>
                            </small>
                        </td>
                    `).join('')}
                    ${Array(4 - sortedTeams.length).fill('<td></td>').join('')}
                </tr>
            `;
        }).join('');
    },

    // 创建团队
    async createTeam() {
        const teamName = document.getElementById('teamName').value.trim();
        if (!teamName) {
            alert('请输入团队名称');
            return;
        }

        // 获取选中的成员
        const selectedMembers = Array.from(document.querySelectorAll('#memberSelection input:checked'))
            .map(input => input.value);

        if (selectedMembers.length === 0) {
            alert('请选择团队成员');
            return;
        }

        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: teamName,
                    members: selectedMembers
                })
            });

            if (!response.ok) {
                throw new Error('创建团队失败');
            }

            // 重新加载团队列表
            await this.loadTeams();
            this.createTeamModal.hide();
            document.getElementById('createTeamForm').reset();
        } catch (error) {
            console.error('创建团队失败:', error);
            alert('创建团队失败');
        }
    },

    // 删除团队
    async deleteTeam(teamName) {
        if (!confirm(`确定要删除团队"${teamName}"吗？`)) {
            return;
        }

        try {
            const response = await fetch(`/api/teams/${encodeURIComponent(teamName)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('删除团队失败');
            }

            await this.loadTeams();
        } catch (error) {
            console.error('删除团队失败:', error);
            alert('删除团队失败');
        }
    },

    // 格式化日期
    formatDate(dateString) {
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => Teams.init()); 