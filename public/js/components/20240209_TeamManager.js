class TeamManager {
    constructor() {
        this.teams = [];
        this.players = [];
        this.createTeamModal = new bootstrap.Modal(document.getElementById('createTeamModal'));
        this.init();
    }

    async init() {
        await this.loadPlayers();
        await this.loadTeams();
        this.setupEventListeners();
    }

    async loadPlayers() {
        try {
            const response = await fetch('/api/players');
            if (!response.ok) throw new Error('加载玩家列表失败');
            this.players = await response.json();
            this.updatePlayerSelection();
        } catch (error) {
            console.error('加载玩家列表错误:', error);
            alert('加载玩家列表失败');
        }
    }

    async loadTeams() {
        try {
            const response = await fetch('/api/teams');
            if (!response.ok) throw new Error('加载团队列表失败');
            this.teams = await response.json();
            this.renderTeams();
        } catch (error) {
            console.error('加载团队列表错误:', error);
            alert('加载团队列表失败');
        }
    }

    updatePlayerSelection() {
        const memberSelection = document.getElementById('memberSelection');
        if (!memberSelection) return;

        memberSelection.innerHTML = this.players.map(playerName => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${playerName}" id="player_${playerName}">
                <label class="form-check-label" for="player_${playerName}">
                    ${playerName}
                </label>
            </div>
        `).join('');
    }

    renderTeams() {
        const teamsContainer = document.getElementById('teamsList');
        if (!teamsContainer) return;

        if (this.teams.length === 0) {
            teamsContainer.innerHTML = '<p class="text-center text-muted">暂无团队</p>';
            return;
        }

        const teamsList = this.teams.map(team => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="card-title mb-0">${team.name}</h5>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary me-2" onclick="teamLeague.showEditTeamModal('${team.name}')">
                                编辑
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="teamManager.deleteTeam('${team.name}')" ${team.games > 0 ? 'disabled' : ''}>
                                删除
                            </button>
                        </div>
                    </div>
                    <p class="card-text">成员：${team.members.join('、')}</p>
                </div>
            </div>
        `).join('');

        teamsContainer.innerHTML = teamsList;
    }

    setupEventListeners() {
        // 创建团队表单提交
        document.getElementById('createTeamForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTeam();
        });

        // 清空表单
        document.getElementById('createTeamModal')?.addEventListener('hidden.bs.modal', () => {
            document.getElementById('createTeamForm').reset();
        });
    }

    async createTeam() {
        try {
            const teamName = document.getElementById('teamName').value.trim();
            const selectedMembers = Array.from(document.querySelectorAll('#memberSelection input:checked'))
                .map(input => input.value);

            if (!teamName) {
                alert('请输入团队名称');
                return;
            }

            if (selectedMembers.length === 0) {
                alert('请选择团队成员');
                return;
            }

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

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '创建团队失败');
            }

            // 重新加载团队列表
            await this.loadTeams();
            this.createTeamModal.hide();
            document.getElementById('createTeamForm').reset();
            alert('创建团队成功！');

        } catch (error) {
            console.error('创建团队错误:', error);
            alert(error.message || '创建团队失败');
        }
    }

    async deleteTeam(teamName) {
        if (!confirm(`确定要删除团队"${teamName}"吗？`)) return;

        try {
            const response = await fetch(`/api/teams/${encodeURIComponent(teamName)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || '删除团队失败');
            }

            await this.loadTeams();
            alert('删除团队成功！');

        } catch (error) {
            console.error('删除团队错误:', error);
            alert(error.message || '删除团队失败');
        }
    }
}

// 初始化团队管理器
const teamManager = new TeamManager(); 