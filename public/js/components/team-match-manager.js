// 记录比赛功能
class TeamMatchManager {
    constructor() {
        this.season = season;
        this.lang = lang;
        this.recordMatchModal = new bootstrap.Modal(document.getElementById('recordMatchModal'));
        this.editTeamModal = new bootstrap.Modal(document.getElementById('editTeamModal'));
        this.currentPlayerRankingsSort = {
            field: 'totalPT',
            direction: 'desc'
        };
        this.playerRankings = null;
        this.init();
    }

    async init() {
        await this.loadRankings();
        await this.loadMatches();
        this.setupEventListeners();
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

        // 添加排序按钮和表头点击事件监听
        document.querySelectorAll('#playerRankingsTable .sortable').forEach(th => {
            const sortField = th.dataset.sort;
            // 为表头添加点击事件
            th.addEventListener('click', (e) => {
                // 如果点击的是按钮，不处理（让按钮自己的事件处理）
                if (e.target.closest('.sort-btn')) return;
                this.handlePlayerRankingsSort(sortField);
            });
            // 为排序按钮添加点击事件
            const btn = th.querySelector('.sort-btn');
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // 阻止事件冒泡到表头
                    this.handlePlayerRankingsSort(sortField);
                });
            }
        });
    }

    async loadRankings() {
        try {
            const response = await fetch(`/api/team-rankings?season=${this.season}`);
            if (!response.ok) throw new Error('加载排名数据失败');
            const { teamRankings, playerRankings } = await response.json();
            this.playerRankings = playerRankings;
            this.updateTeamRankings(teamRankings);
            this.updatePlayerRankings(playerRankings);
        } catch (error) {
            console.error('加载排名错误:', error);
            alert(`加载排名数据失败${error}`);
        }
    }

    getColorOverWhite(colorHex, alphaHex) {
        colorHex = colorHex.slice(1); // get rid of "#"
        const r = parseInt(colorHex.slice(0, 2), 16),
            g = parseInt(colorHex.slice(2, 4), 16),
            b = parseInt(colorHex.slice(4, 6), 16);
        const a = parseInt(alphaHex, 16) / 255;
        const res = c => Math.round(a * c + (1 - a) * 255);
        return '#' + [res(r), res(g), res(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    safeDivide(a, b) {
        if (b === 0) return -1;
        else return a / b;
    }

    safeDivideText(a, b, dp = 2) {
        if (b === 0) return "";
        else return (a / b).toFixed(dp);
    }

    safeDividePct(a, b, dp = 1) {
        if (b === 0) return "";
        else return `${(a / b * 100).toFixed(dp)}%`
    }

    updateTeamRankings(rankings) {
        const tbody = document.getElementById('teamRankings');
        if (!tbody) return;

        tbody.innerHTML = rankings.map(team => {
            const teamColorFaint = this.getColorOverWhite(player.teamColor, '20');
            const noWrap = "white-space: nowrap;";
            return `<tr style="background-color: ${teamColorFaint}">
                        <td class="team-color" style="color: ${team.color}">${this.lang === "zh" ? team.name : team.engName}</td>
                        <td>${team.progress}</td>
                        <td class="${team.totalPT >= 0 ? 'text-success' : 'text-danger'}">${team.totalPT.toFixed(1)}</td>
                        <td>${this.safeDivideText(team.totalPlacement, team.games)}</td>
                        <td style="${noWrap};">${team.placementStats.map(count => Number.isInteger(count) ? count : count.toFixed(1)).join("-")}</td>
                        <td class="${team.totalRawPoint >= 0 ? 'text-success' : 'text-danger'}">${team.totalRawPoint.toFixed(1)}</td>
                        <td class="${team.totalPlacementPoint >= 0 ? 'text-success' : 'text-danger'}">${team.totalPlacementPoint.toFixed(1)}</td>
                    </tr>
                `;
        }).join('');
    }

    updatePlayerRankings(rankings) {
        const tbody = document.getElementById('playerRankings');
        if (!tbody) return;

        tbody.innerHTML = this.sortPlayerRankings(rankings).map(player => {
            const teamColorFaint = this.getColorOverWhite(player.teamColor, '20');
            const noWrap = "white-space: nowrap;";
            const stats = player.stats;
            return `<tr style="background-color: ${teamColorFaint}">
                        <td style="background-color: ${teamColorFaint}">${this.lang === "zh" ? player.name : player.engName}</td>
                        <td class="team-color" style="color: ${player.teamColor};${noWrap}">${this.lang === "zh" ? player.team : player.teamEngName}</td>
                        <td>${player.games}</td>
                        <td class="${player.totalPT >= 0 ? 'text-success' : 'text-danger'}">${player.totalPT.toFixed(1)}</td>
                        <td>${this.safeDivideText(player.totalPlacement, player.games)}</td>
                        <td style="${noWrap}">${player.placementStats.map(count => Number.isInteger(count) ? count : count.toFixed(1)).join("-")}</td>
                        <td class="${player.totalRawPoint >= 0 ? 'text-success' : 'text-danger'}">${player.totalRawPoint.toFixed(1)}</td>
                        <td class="${player.totalPlacementPoint >= 0 ? 'text-success' : 'text-danger'}">${player.totalPlacementPoint.toFixed(1)}</td>
                        ${this.season === 1 ? `<td>${this.safeDividePct(stats.win, stats.rounds)}</td>
                        <td>${this.safeDividePct(stats.dealIn, stats.rounds)}</td>
                        <td>${this.safeDividePct(stats.tsumo, stats.win)}</td>
                        <td>${this.safeDividePct(stats.call, stats.rounds)}</td>
                        <td>${this.safeDividePct(stats.riichi, stats.rounds)}</td>
                        <td>${this.safeDividePct(stats.riichiSuccess, stats.riichi)}</td>
                        <td>${this.safeDividePct(stats.riichiDealIn, stats.riichi)}</td>
                        <td>${this.safeDividePct(stats.riichiTsumo, stats.riichiSuccess)}</td>
                        <td>${this.safeDividePct(stats.riichiDraw, stats.riichi)}</td>
                        <td>${this.safeDividePct(stats.dama, stats.win)}</td>
                        <td>${this.safeDividePct(stats.drawTenpai, stats.draw)}</td>` : ""}
                    </tr>
                `}).join('');
        this.updatePlayerRankingsSortIcons();
    }

    updatePlayerRankingsSortIcons() {
        document.querySelectorAll('#playerRankingsTable .sort-btn i').forEach(icon => {
            const button = icon.closest('.sort-btn');
            if (button.dataset.sort === this.currentPlayerRankingsSort.field) {
                icon.className = `fas fa-sort-${this.currentPlayerRankingsSort.direction === 'asc' ? 'up' : 'down'}`;
            } else {
                icon.className = 'fas fa-sort';
            }
        });
    }

    handlePlayerRankingsSort(field) {
        if (this.currentPlayerRankingsSort.field === field) {
            this.currentPlayerRankingsSort.direction = this.currentPlayerRankingsSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentPlayerRankingsSort.field = field
            this.currentPlayerRankingsSort.direction = field === 'avgPlacement' ? 'asc' : 'desc';
        }
        this.updatePlayerRankingsSortIcons();
        this.updatePlayerRankings(this.playerRankings);
    }

    sortPlayerRankings(rankings) {
        const sorted = rankings.sort((a, b) => {
            let aValue, bValue;
            switch (this.currentPlayerRankingsSort.field) {
                case 'games':
                    aValue = a.games;
                    bValue = b.games;
                    break;
                case 'totalPT':
                    aValue = a.totalPT;
                    bValue = b.totalPT;
                    break;
                case 'avgPlacement':
                    aValue = this.safeDivide(a.totalPlacement, a.games);
                    bValue = this.safeDivide(b.totalPlacement, b.games);
                    break;
                case 'totalRawPoint':
                    aValue = a.totalRawPoint;
                    bValue = b.totalRawPoint;
                    break;
                case 'totalPlacementPoint':
                    aValue = a.totalPlacementPoint;
                    bValue = b.totalPlacementPoint;
                    break;
                case 'winRate':
                    aValue = this.safeDivide(a.stats.win, a.stats.rounds);
                    bValue = this.safeDivide(b.stats.win, b.stats.rounds);
                    break;
                case 'dealInRate':
                    aValue = this.safeDivide(a.stats.dealIn, a.stats.rounds);
                    bValue = this.safeDivide(b.stats.dealIn, b.stats.rounds);
                    break;
                case 'tsumoRate':
                    aValue = this.safeDivide(a.stats.tsumo, a.stats.win);
                    bValue = this.safeDivide(b.stats.tsumo, b.stats.win);
                    break;
                case 'callRate':
                    aValue = this.safeDivide(a.stats.call, a.stats.rounds);
                    bValue = this.safeDivide(b.stats.call, b.stats.rounds);
                    break;
                case 'riichiRate':
                    aValue = this.safeDivide(a.stats.riichi, a.stats.rounds);
                    bValue = this.safeDivide(b.stats.riichi, b.stats.rounds);
                    break;
                case 'riichiWinRate':
                    aValue = this.safeDivide(a.stats.riichiSuccess, a.stats.riichi);
                    bValue = this.safeDivide(b.stats.riichiSuccess, b.stats.riichi);
                    break;
                case 'riichiDealInRate':
                    aValue = this.safeDivide(a.stats.riichiDealIn, a.stats.riichi);
                    bValue = this.safeDivide(b.stats.riichiDealIn, b.stats.riichi);
                    break;
                case 'riichiTsumoRate':
                    aValue = this.safeDivide(a.stats.riichiTsumo, a.stats.riichiSuccess);
                    bValue = this.safeDivide(b.stats.riichiTsumo, b.stats.riichiSuccess);
                    break;
                case 'riichiDrawRate':
                    aValue = this.safeDivide(a.stats.riichiDraw, a.stats.riichi);
                    bValue = this.safeDivide(b.stats.riichiDraw, b.stats.riichi);
                    break;
                case 'damaRate':
                    aValue = this.safeDivide(a.stats.dama, a.stats.win);
                    bValue = this.safeDivide(b.stats.dama, b.stats.win);
                    break;
                case 'drawTenpaiRate':
                    aValue = this.safeDivide(a.stats.drawTenpai, a.stats.draw);
                    bValue = this.safeDivide(b.stats.drawTenpai, b.stats.draw);
                    break;
                default:
                    aValue = a.totalPT;
                    bValue = b.totalPT;
            }

            // 无比赛记录的玩家排在后面
            if (a.games === 0 && b.games === 0) {
                return a.name.localeCompare(b.name);
            }
            if (a.games === 0) return 1;
            if (b.games === 0) return -1;

            // 根据排序方向返回比较结果
            const compareResult = aValue - bValue;
            return this.currentPlayerRankingsSort.direction === 'asc' ? compareResult : -compareResult;
        });
        return sorted;
    }

    async loadMatches() {
        try {
            const response = await fetch(`/api/team-matches?season=${this.season}`);
            if (!response.ok) throw new Error('加载比赛记录失败');
            const matches = await response.json();
            this.updateMatchRecords(matches);

        } catch (error) {
            console.error('加载比赛记录错误:', error);
            alert(`加载比赛记录失败: ${error}`);
        }
    }

    updateMatchRecords(matches) {
        const dateInNYCZone = (date) => {
            return new Date(date).toLocaleDateString('en-US', {
                timeZone: 'America/New_York',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        };
        const firstDate = matches[0] ? dateInNYCZone(matches[0].time) : undefined;
        this.updateAllMatchRecordsInternal(matches.filter(match => dateInNYCZone(match.time) === firstDate), 'recentMatchRecords');
        this.updateAllMatchRecordsInternal(matches, 'allMatchRecords');
    }

    updateAllMatchRecordsInternal(matches, elemId) {
        const tbody = document.getElementById(elemId);
        if (!tbody) return;

        tbody.innerHTML = matches.map(match => {
            const sortedPlayers = [...match.players].sort((a, b) => b.score - a.score);
            return `
                        <tr>
                            <td>${new Date(match.time).toLocaleString()}</td>
                            ${sortedPlayers.map(player => `
                                <td>
                                    <div class="fw-bold">${this.lang === "zh" ? player.name : player.engName}</div>
                                    <div class="text-muted small">${this.lang === "zh" ? player.team : player.teamEngName}</div>
                                    <div>
                                        <span>${player.score.toLocaleString()}</span>
                                        <span class="${player.pt >= 0 ? 'text-success' : 'text-danger'} ms-2">${player.pt > 0 ? '+' : ''}${player.pt.toFixed(1)}pt</span>
                                    </div>
                                </td>
                            `).join('')}
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-primary edit-time" data-match-id="${match._id}" title="编辑时间">
                                        <i class="fas fa-clock"></i>
                                    </button>
                                    <button class="btn btn-outline-danger delete-match" data-match-id="${match._id}" title="删除记录">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
        }).join('');
    }

    async loadPlayers() {
        try {
            const response = await fetch(`/api/players?season=${this.season}`);
            if (!response.ok) throw new Error('加载玩家列表失败');
            const players = await response.json();

            // 更新所有玩家选择框
            const selects = document.querySelectorAll('select[name="player"]');
            selects.forEach(select => {
                select.innerHTML = `
                            <option value="">${this.lang === 'zh' ? '选择玩家' : 'Choose player'}</option>
                            ${players.map(player => `
                                <option value="${player.name}" data-team="${player.team || ''}">${player.name}</option>
                            `).join('')}
                        `;

                // 添加change事件监听器
                select.addEventListener('change', (e) => {
                    const teamInput = e.target.closest('td').querySelector('input[name="team"]');
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    teamInput.value = selectedOption.dataset.team || '';
                    this.updatePT();
                });
            });

            // 添加得点输入事件监听器
            document.querySelectorAll('input[name="score"]').forEach(input => {
                input.addEventListener('change', () => this.updatePT());
            });
        } catch (error) {
            console.error('加载玩家列表错误:', error);
            alert(`加载玩家列表失败${error}`);
        }
    }

    updatePT() {
        const scores = Array.from(document.querySelectorAll('input[name="score"]')).map(input => parseInt(input.value));
        const scoresWithIndex = [];
        scores.forEach((score, index) => {
            if (score) {
                scoresWithIndex.push({ score, index });
            }
        });
        const ptOfScore = ptUtils.calculateGamePtsFromScoresWithIndex(scoresWithIndex);

        const ptCells = document.querySelectorAll('.pt-value');
        const chomboChecks = document.querySelectorAll('input[name="chombo"]');

        // 更新显示
        scores.forEach((score, index) => {
            if (score) {
                const chombo = chomboChecks[index].checked ? -20 : 0;
                const totalPt = ptOfScore[score] + chombo;
                ptCells[index].textContent = totalPt.toFixed(1);
                ptCells[index].className = `pt-value ${totalPt >= 0 ? 'text-success' : 'text-danger'}`;
            } else {
                ptCells[index].textContent = "";
            }
        });
    }

    setupEventListeners() {
        // 记录比赛表单提交
        document.getElementById('recordMatchForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.recordMatch();
        });

        // 编辑团队表单提交
        document.getElementById('editTeamForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTeamEdit();
        });

        // 清空表单
        document.getElementById('recordMatchModal')?.addEventListener('hidden.bs.modal', () => {
            document.getElementById('recordMatchForm').reset();
        });

        document.getElementById('editTeamModal')?.addEventListener('hidden.bs.modal', () => {
            document.getElementById('editTeamForm').reset();
        });

        // 记录比赛模态框显示时加载玩家列表
        document.getElementById('recordMatchModal')?.addEventListener('show.bs.modal', () => {
            this.loadPlayers();
        });

        // 添加chombo复选框事件监听器
        document.querySelectorAll('input[name="chombo"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updatePT());
        });

        // 修改删除和编辑时间按钮的事件监听器
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-match')) {
                const button = e.target.closest('.delete-match');
                const matchId = button.dataset.matchId;
                const password = await auth.verifyAdmin();
                if (!password) {
                    alert('管理员密码错误');
                }
                else if (confirm('确定要删除这条记录吗？')) {
                    try {
                        const response = await fetch(`/api/team-matches/${matchId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ adminPassword: password, season: this.season })
                        });
                        if (!response.ok) throw new Error('删除失败');
                        await this.loadMatches();
                        await this.loadRankings();
                        alert('删除成功');
                    } catch (error) {
                        console.error('删除记录错误:', error);
                        alert('删除失败');
                    }
                }
            } else if (e.target.closest('.edit-time')) {
                const button = e.target.closest('.edit-time');
                const matchId = button.dataset.matchId;
                const password = await auth.verifyAdmin();
                if (!password) {
                    alert('管理员密码错误');
                }
                else {
                    const newTime = prompt('请输入新的时间 (YYYY-MM-DD HH:mm:ss)');
                    if (newTime) {
                        try {
                            const response = await fetch(`/api/team-matches/${matchId}/time`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    time: new Date(newTime).toISOString(),
                                    adminPassword: password,
                                    season: this.season
                                })
                            });
                            if (!response.ok) throw new Error('更新时间失败');
                            await this.loadMatches();
                            alert('更新时间成功');
                        } catch (error) {
                            console.error('更新时间错误:', error);
                            alert('更新时间失败');
                        }
                    }
                }
            }
        });
    }

    async recordMatch() {
        try {
            const playerRows = document.querySelectorAll('#recordMatchForm tbody tr');
            const players = Array.from(playerRows).map(row => ({
                name: row.querySelector('select[name="player"]').value,
                team: row.querySelector('input[name="team"]').value,
                score: parseInt(row.querySelector('input[name="score"]').value, 10),
                chombo: row.querySelector('input[name="chombo"]').checked
            }));

            // 验证数据
            if (players.some(p => !p.name || !p.team)) {
                alert('所选的部分玩家并无所属队伍');
                return;
            }

            // 验证队伍是否重复
            const teams = players.map(p => p.team);
            const uniqueTeams = new Set(teams);
            if (uniqueTeams.size !== 4) {
                alert('四个玩家必须来自不同的队伍');
                return;
            }

            const totalScore = players.reduce((sum, p) => sum + p.score, 0);
            if (totalScore !== 120000) {
                alert('得点总和必须为120,000');
                return;
            }

            const response = await fetch('/api/team-matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    time: new Date().toISOString(),
                    players,
                    season: this.season
                })
            });

            if (!response.ok) {
                throw new Error('记录比赛失败');
            }

            await this.loadMatches();
            await this.loadRankings();
            this.recordMatchModal.hide();
            document.getElementById('recordMatchForm').reset();
            document.querySelectorAll('.pt-value').forEach(cell => {
                cell.textContent = '-';
                cell.className = 'pt-value';
            });
            alert('记录比赛成功！');

        } catch (error) {
            console.error('记录比赛错误:', error);
            alert(error.message || '记录比赛失败');
        }
    }

    showEditTeamModal(teamName) {
        document.getElementById('editTeamName').value = teamName;
        document.getElementById('originalTeamName').value = teamName;
        this.editTeamModal.show();
    }

    async saveTeamEdit() {
        try {
            const adminPassword = document.getElementById('adminPassword').value;
            const newTeamName = document.getElementById('editTeamName').value.trim();
            const originalTeamName = document.getElementById('originalTeamName').value;
            const color = document.getElementById('editTeamColor').value;

            if (!(await auth.verifyPassword(adminPassword))) {
                alert('管理员密码错误');
                return;
            }

            if (!newTeamName) {
                alert('团队名称不能为空');
                return;
            }

            const response = await fetch(`/api/teams/${encodeURIComponent(originalTeamName)}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newName: newTeamName,
                    adminPassword: adminPassword,
                    color: color,
                    season: this.season
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '更新团队失败');
            }

            await this.loadRankings();
            this.editTeamModal.hide();
            document.getElementById('editTeamForm').reset();
            alert('更新团队成功！');
            // 通知团队管理器重新加载团队列表
            teamManager.loadTeams();

        } catch (error) {
            console.error('更新团队错误:', error);
            alert(error.message || '更新团队失败');
        }
    }
}

// 初始化团队联赛功能
const teamMatchManager = new TeamMatchManager();