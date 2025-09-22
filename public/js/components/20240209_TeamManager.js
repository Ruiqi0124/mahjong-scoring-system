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
            const teams = await response.json();
            this.updateTeamsList(teams);
        } catch (error) {
            console.error('加载团队列表错误:', error);
            alert('加载团队列表失败');
        }
    }

    updatePlayerSelection() {
        const memberSelection = document.getElementById('memberSelection');
        if (!memberSelection) return;

        memberSelection.innerHTML = this.players.map(player => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${player.name}" id="player_${player.name}">
                <label class="form-check-label" for="player_${player.name}">
                    ${player.name}
                </label>
            </div>
        `).join('');
    }

    updateTeamsList(teams) {
        const container = document.getElementById('teamsList');
        if (!container) return;

        container.innerHTML = teams.map(team => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0 team-color" style="color: ${team.color}">${team.name}</h5>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary btn-sm edit-team" data-team-name="${team.name}" data-team-color="${team.color}">
                                <i class="fas fa-edit"></i> 编辑
                            </button>
                            <button class="btn btn-outline-danger btn-sm delete-team" data-team-name="${team.name}">
                                <i class="fas fa-trash"></i> 删除
                            </button>
                        </div>
                    </div>
                    <div class="mt-2">
                        <strong>成员：</strong>
                        ${team.members.map(member => `<span class="badge bg-secondary me-1">${member}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        // 添加事件监听器
        container.querySelectorAll('.edit-team').forEach(button => {
            button.addEventListener('click', () => {
                const teamName = button.dataset.teamName;
                const teamColor = button.dataset.teamColor;
                document.getElementById('editTeamName').value = teamName;
                document.getElementById('originalTeamName').value = teamName;
                document.getElementById('editTeamColor').value = teamColor;
                teamLeague.editTeamModal.show();
            });
        });

        container.querySelectorAll('.delete-team').forEach(button => {
            button.addEventListener('click', () => this.deleteTeam(button.dataset.teamName));
        });
    }

    setupEventListeners() {
        document.getElementById('createTeamForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createTeam();
        });

        document.getElementById('createTeamModal')?.addEventListener('hidden.bs.modal', () => {
            document.getElementById('createTeamForm').reset();
        });
    }

    async createTeam() {
        try {
            const name = document.getElementById('teamName').value.trim();
            const color = document.getElementById('teamColor').value;
            const memberCheckboxes = document.querySelectorAll('#memberSelection input[type="checkbox"]:checked');
            const members = Array.from(memberCheckboxes).map(cb => cb.value);

            if (!name) {
                alert('请输入团队名称');
                return;
            }

            if (members.length === 0) {
                alert('请选择至少一名成员');
                return;
            }

            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, members, color })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '创建团队失败');
            }

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
        try {
            if (!confirm(`确定要删除团队 "${teamName}" 吗？`)) {
                return;
            }

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