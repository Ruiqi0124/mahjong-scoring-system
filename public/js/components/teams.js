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
        // 动态生成团队得分输入区域
        const teamScores = document.getElementById('teamScores');
        teamScores.innerHTML = this.teams.map((team, index) => `
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">${team.name}</label>
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control" id="score_${index}" placeholder="得分" required>
                </div>
                <div class="col-md-3">
                    <input type="number" class="form-control" id="pt_${index}" placeholder="PT" required>
                </div>
            </div>
        `).join('');

        this.recordMatchModal.show();
    },

    // 加载玩家列表
    async loadPlayers() {
        try {
            const response = await fetch('/api/players');
            const players = await response.json();
            
            // 更新成员选择区域
            const memberSelection = document.getElementById('memberSelection');
            memberSelection.innerHTML = players.map(player => `
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" value="${player.name}" id="player_${player.name}">
                    <label class="form-check-label" for="player_${player.name}">
                        ${player.name}
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
            this.matches = await response.json();
            this.updateMatchesList();
        } catch (error) {
            console.error('加载比赛记录失败:', error);
            alert('加载比赛记录失败');
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

    // 记录比赛
    async recordMatch() {
        const matchTime = document.getElementById('matchTime').value;
        if (!matchTime) {
            alert('请选择比赛时间');
            return;
        }

        // 收集团队得分
        const teamResults = this.teams.map((team, index) => {
            const score = parseInt(document.getElementById(`score_${index}`).value);
            const pt = parseFloat(document.getElementById(`pt_${index}`).value);
            
            if (isNaN(score) || isNaN(pt)) {
                return null;
            }

            return {
                name: team.name,
                score,
                pt
            };
        }).filter(result => result !== null);

        if (teamResults.length < 2) {
            alert('至少需要两个团队的完整得分');
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
                    teams: teamResults
                })
            });

            if (!response.ok) {
                throw new Error('记录比赛失败');
            }

            // 重新加载数据
            await Promise.all([
                this.loadTeams(),
                this.loadMatches()
            ]);
            
            this.recordMatchModal.hide();
            document.getElementById('recordMatchForm').reset();
        } catch (error) {
            console.error('记录比赛失败:', error);
            alert('记录比赛失败');
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