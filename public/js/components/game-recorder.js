const GameStorage = {
    STORAGE_KEY: 'mahjong_game_in_progress',
    save(game) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(game));
    },
    load() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};

const GameAPI = {
    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    },

    async saveGame(gameData) {
        const response = await fetch('/api/game-detail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gameData)
        });

        if (!response.ok) {
            throw new Error('Failed to save game to server');
        }

        return response.json();
    },

    async fetchAllGames() {
        const response = await fetch('/api/game-detail');
        if (!response.ok) {
            throw new Error('Failed to load games');
        }
        return response.json();
    },

    async fetchGameById(gameId) {
        const response = await fetch(`/api/game-detail/${gameId}`);
        if (!response.ok) {
            throw new Error('Failed to load game details');
        }
        return response.json();
    },

    async deleteGame(gameId) {
        const response = await fetch(`/api/game-detail/${gameId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error('Failed to delete game');
        }
        return response.json();
    }
};

const GameRecorder = {
    resumeModal: null,
    detailsModal: null,
    currentGame: null,
    season: null,

    showError(elementId, message) {
        const errorDiv = document.getElementById(elementId);
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    },

    async init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.season = parseInt(urlParams.get('s'), 10) || 1;
            this.resumeModal = new bootstrap.Modal(document.getElementById('resumeGameModal'));
            this.detailsModal = new bootstrap.Modal(document.getElementById('gameDetailsModal'));

            await this.loadPlayers();
            await this.loadGamesHistory();

            const savedGame = GameStorage.load();
            if (savedGame) {
                const summary = document.getElementById('resumeGameSummary');
                summary.innerHTML = `
                    <strong>Players:</strong> ${savedGame.players.join(', ')}<br>
                    <strong>Rounds recorded:</strong> ${savedGame.rounds.length}
                `;
                this.resumeModal.show();
            }

            document.querySelectorAll('input[name="resultType"]').forEach(radio => {
                radio.addEventListener('change', () => this.handleResultTypeChange());
            });
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError('setupError', 'Initialization failed: ' + error.message);
        }
    },

    async loadPlayers() {
        try {
            const allPlayers = await api.getPlayers();
            const teams = await api.getTeams(this.season);
            const teamPlayerNames = new Set();
            teams.forEach(team => { team.members.forEach(member => teamPlayerNames.add(member)); });
            const players = allPlayers.filter(player => teamPlayerNames.has(player.name));

            const selects = [...Array(4).keys()].map(i => document.getElementById(`setupPlayer${i}`));

            selects.forEach(select => {
                select.innerHTML = this.generatePlayerOptions(players);
            });
        } catch (error) {
            console.error('Failed to load players:', error);
            this.showError('setupError', 'Failed to load players: ' + error.message);
        }
    },

    generatePlayerOptions(players) {
        return '<option value="">Select player</option>' +
            players.map(player => {
                const playerName = typeof player === 'object' ? player.name : player;
                return `<option value="${playerName}">${playerName}</option>`;
            }).join('');
    },

    handleResultTypeChange() {
        const resultType = document.querySelector('input[name="resultType"]:checked')?.value;
        const checkbox = (id, label) => `
            <div class="form-check tenpai-checkbox-item">
                <input class="form-check-input" type="checkbox" id="${id}" value="${id}">
                <label class="form-check-label" for="${id}">${label}</label>
            </div>
        `;

        if (resultType === 'deal-in') {
            this.toggleSectionVisibility('dealIn');
        } else if (resultType === 'tsumo') {
            this.toggleSectionVisibility('tsumo');
        } else if (resultType === 'draw') {
            this.toggleSectionVisibility('tenpai');
            const container = document.getElementById('tenpaiContainer');
            container.innerHTML = '';
            container.className = 'd-flex flex-wrap gap-2';
            this.currentGame.players.forEach((player, index) => {
                const playerState = document.querySelector(`input[name="playerState${index}"]:checked`)?.value;
                const isRiichi = playerState === 'Riichi';
                container.innerHTML += checkbox(`tenpai${index}`, player);
            });
            // Auto-check tenpai for riichi players
            this.currentGame.players.forEach((player, index) => {
                const playerState = document.querySelector(`input[name="playerState${index}"]:checked`)?.value;
                if (playerState === 'Riichi') {
                    const tenpaiCheckbox = document.getElementById(`tenpai${index}`);
                    if (tenpaiCheckbox) tenpaiCheckbox.checked = true;
                }
            });
        } else {
            this.toggleSectionVisibility('placeholder');
        }
    },

    toggleSectionVisibility(visibleSection) {
        const sections = {
            placeholder: document.getElementById('noResultPlaceholder'),
            tsumo: document.getElementById('tsumoSection'),
            dealIn: document.getElementById('dealInSection'),
            tenpai: document.getElementById('tenpaiSection')
        };

        Object.values(sections).forEach(section => section.style.display = 'none');

        if (sections[visibleSection]) {
            sections[visibleSection].style.display = 'block';
        }
    },

    startGame() {
        try {
            const players = [...Array(4).keys()].map(i =>
                document.getElementById(`setupPlayer${i}`).value
            );
            if (players.some(p => !p)) throw new Error('Please select all 4 players');
            if (new Set(players).size !== 4) throw new Error('All players must be different');
            this.currentGame = {
                players: players,
                rounds: []
            };
            GameStorage.save(this.currentGame);
            this.showGameScreen();
        } catch (error) {
            this.showError('setupError', error.message);
        }
    },

    showGameScreen() {
        document.getElementById('setupScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('historySection').style.display = 'none';
        this.setupPlayerStateButtons();
        const options = this.generatePlayerOptions(this.currentGame.players);
        document.getElementById('tsumoSelect').innerHTML = options;
        document.getElementById('dealInToSelect').innerHTML = options;
        document.getElementById('dealInFromSelect').innerHTML = options;
        document.getElementById('currentPlayers').textContent = this.currentGame.players.join(', ');
        document.getElementById('roundNumber').textContent = this.currentGame.rounds.length;
        this.updateRoundHistory();
        this.setupDealInSync();
    },

    setupDealInSync() {
        const fromSelect = document.getElementById('dealInFromSelect');
        const toSelect = document.getElementById('dealInToSelect');

        fromSelect.addEventListener('change', () => {
            const fromValue = fromSelect.value;
            const toValue = toSelect.value;
            if (fromValue && fromValue === toValue) {
                toSelect.value = '';
            }
        });

        toSelect.addEventListener('change', () => {
            const fromValue = fromSelect.value;
            const toValue = toSelect.value;
            if (toValue && fromValue === toValue) {
                fromSelect.value = '';
            }
        });
    },

    setupPlayerStateButtons() {
        const radioBtn = (name, idx, val, lbl, chk = '') => `
            <input type="radio" class="btn-check" name="${name}${idx}" id="${name}${idx}${val}" value="${val}" ${chk}>
            <label class="btn btn-outline-secondary btn-sm" for="${name}${idx}${val}">${lbl}</label>
        `;

        const container = document.getElementById('playerStatesContainer');
        container.innerHTML = '';
        container.className = '';
        this.currentGame.players.forEach((player, index) => {
            const div = document.createElement('div');
            div.className = 'player-state-item';
            div.innerHTML = `
                <label class="form-label mb-1 small">${player}</label>
                <div class="btn-group w-100" role="group">
                    ${radioBtn('playerState', index, 'Riichi', 'Riichi')}
                    ${radioBtn('playerState', index, 'Closed', 'Closed', 'checked')}
                    ${radioBtn('playerState', index, 'Open', 'Open')}
                </div>
            `;
            container.appendChild(div);
        });

        // Add event listeners to auto-check tenpai when riichi is selected
        this.currentGame.players.forEach((player, index) => {
            document.querySelectorAll(`input[name="playerState${index}"]`).forEach(radio => {
                radio.addEventListener('change', () => this.handlePlayerStateChange(index));
            });
        });
    },

    handlePlayerStateChange(playerIndex) {
        const resultType = document.querySelector('input[name="resultType"]:checked')?.value;
        if (resultType === 'draw') {
            const playerState = document.querySelector(`input[name="playerState${playerIndex}"]:checked`)?.value;
            const tenpaiCheckbox = document.getElementById(`tenpai${playerIndex}`);
            if (tenpaiCheckbox && playerState === 'Riichi') {
                tenpaiCheckbox.checked = true;
            }
        }
    },

    saveRound() {
        try {
            const resultType = document.querySelector('input[name="resultType"]:checked')?.value;
            if (!resultType) throw new Error('Please select a result type');
            const playerStates = [...Array(4).keys()].map(i => {
                const state = document.querySelector(`input[name="playerState${i}"]:checked`)?.value;
                if (!state) throw new Error(`Please select state for ${this.currentGame.players[i]}`);
                return state.toLowerCase();
            });
            let winner = null;
            let loser = null;
            let tenpai = null;
            if (resultType === 'tsumo') {
                winner = document.getElementById('tsumoSelect').value;
                if (!winner) throw new Error('Please select tsumo player');
            }
            if (resultType === 'deal-in') {
                winner = document.getElementById('dealInToSelect').value;
                loser = document.getElementById('dealInFromSelect').value;
                if (!winner) throw new Error('Please select deal-in to player');
                if (!loser) throw new Error('Please select deal-in from player');
                if (winner === loser) throw new Error('Deal-in to and from cannot be the same');
            }
            if (resultType === 'draw') {
                tenpai = [...Array(4).keys()].map(i =>
                    document.getElementById(`tenpai${i}`).checked
                );
            }
            const round = {
                resultType,
                playerStates,
                winner,
                loser,
                tenpai
            };

            const summary = this.generateRoundSummary(round);
            if (!confirm(`Confirm round:\n\n${summary}`)) return;
            this.currentGame.rounds.push(round);
            GameStorage.save(this.currentGame);
            this.updateRoundHistory();
            document.getElementById('roundNumber').textContent = this.currentGame.rounds.length;
            this.resetRoundForm();
            const btn = event.target;
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Saved!';
            setTimeout(() => btn.innerHTML = originalText, 1000);
        } catch (error) {
            this.showError('roundError', error.message);
        }
    },

    formatResultText(round) {
        if (round.resultType === 'tsumo') {
            return `${round.winner} tsumo`;
        }
        if (round.resultType === 'deal-in') {
            return `${round.loser} → ${round.winner} deal-in`;
        }
        return 'draw';
    },

    formatStateDisplay(state, playerIndex, round) {
        const stateName = state === 'riichi' ? 'riichi' : state === 'open' ? 'open' : 'closed';
        const playerName = this.currentGame.players[playerIndex];
        let display = `${playerName}: ${stateName}`;

        if (round.resultType === 'draw' && round.tenpai) {
            // Don't show tenpai/noten for riichi players since riichi implies tenpai
            if (state !== 'riichi') {
                display += ` (${round.tenpai[playerIndex] ? 'tenpai' : 'noten'})`;
            }
        }

        return display;
    },

    generateRoundSummary(round) {
        const resultText = this.formatResultText(round);
        const stateInfo = round.playerStates
            .map((state, i) => this.formatStateDisplay(state, i, round))
            .join('\n');
        return `Result: ${resultText}\n\nHand states:\n${stateInfo}`;
    },

    updateRoundHistory() {
        const container = document.getElementById('roundHistory');

        if (this.currentGame.rounds.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No rounds recorded yet</p>';
            return;
        }

        container.innerHTML = this.currentGame.rounds.map((round, index) => {
            const resultText = this.formatResultText(round);
            const stateInfo = round.playerStates
                .map((state, i) => this.formatStateDisplay(state, i, round))
                .join('; ');
            return `
                <div class="round-item mb-2 p-2 border rounded">
                    <div class="d-flex justify-content-between align-items-start">
                        <div><strong>Round ${index + 1}:</strong> ${resultText}</div>
                        <button class="btn btn-sm btn-outline-danger" onclick="if(confirm('Delete this round?')){GameRecorder.currentGame.rounds.splice(${index},1);GameStorage.save(GameRecorder.currentGame);GameRecorder.updateRoundHistory();}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <small class="text-muted d-block mt-1">${stateInfo}</small>
                </div>
            `;
        }).join('');
    },

    resetRoundForm() {
        document.querySelectorAll('input[name="resultType"]').forEach(radio => radio.checked = false);
        [...Array(4).keys()].forEach(i => {
            document.getElementById(`playerState${i}Closed`).checked = true;
        });
        document.getElementById('tsumoSelect').value = '';
        document.getElementById('dealInToSelect').value = '';
        document.getElementById('dealInFromSelect').value = '';
        this.toggleSectionVisibility('placeholder');
        document.getElementById('roundError').style.display = 'none';
    },

    async finishGame() {
        try {
            if (this.currentGame.rounds.length === 0) throw new Error('Cannot save game with no rounds');
            if (!confirm('Finish and save this game to the server?')) return;
            const gameData = {
                players: this.currentGame.players,
                rounds: this.currentGame.rounds
            };
            await GameAPI.saveGame(gameData);
            GameStorage.clear();
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('setupScreen').style.display = 'block';
            document.getElementById('historySection').style.display = 'block';
            document.getElementById('setupError').style.display = 'none';
            document.getElementById('roundError').style.display = 'none';
            await this.loadGamesHistory();
        } catch (error) {
            alert('Error saving game: ' + error.message);
        }
    },

    resumeGame() {
        this.currentGame = GameStorage.load();
        this.resumeModal.hide();
        this.showGameScreen();
        this.updateRoundHistory();
    },

    async loadGamesHistory() {
        try {
            const games = await GameAPI.fetchAllGames();
            const container = document.getElementById('gamesHistory');
            if (games.length === 0) {
                container.innerHTML = '<p class="text-muted text-center">No games recorded yet</p>';
                return;
            }
            container.innerHTML = games.map(game => {
                const date = GameAPI.formatDateTime(game.submittedTime);
                return `
                    <div class="game-item mb-2 p-3 border rounded bg-light">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>Players:</strong> ${game.players.join(', ')}<br>
                                <small class="text-muted">Rounds: ${game.rounds.length} | ${date}</small>
                            </div>
                            <div class="btn-group gap-1">
                                <button class="btn btn-sm btn-primary" onclick="GameRecorder.showGameDetails('${game._id}')">
                                    View Details
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="GameRecorder.deleteGame('${game._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Failed to load games history:', error);
            document.getElementById('gamesHistory').innerHTML =
                '<p class="text-danger text-center">Failed to load games</p>';
        }
    },

    async showGameDetails(gameId) {
        try {
            const game = await GameAPI.fetchGameById(gameId);
            const modalBody = document.getElementById('gameDetailsBody');
            const date = GameAPI.formatDateTime(game.submittedTime);
            const roundsHtml = game.rounds.map((round, index) => {
                let resultText;
                if (round.resultType === 'tsumo') {
                    resultText = `<strong>${round.winner}</strong> tsumo`;
                } else if (round.resultType === 'deal-in') {
                    resultText = `<strong>${round.loser} → ${round.winner}</strong> deal-in`;
                } else {
                    resultText = '<strong>draw</strong>';
                }
                const statesHtml = round.playerStates
                    .map((state, i) => {
                        const stateLower = (state || '').toLowerCase();
                        let bgClass = 'bg-secondary'; // default closed
                        if (stateLower === 'riichi') {
                            bgClass = 'bg-danger';
                        } else if (stateLower === 'open') {
                            bgClass = 'bg-info';
                        }
                        return `<span class="badge ${bgClass}">${this.formatStateDisplay(state, i, round)}</span>`;
                    })
                    .join(' ');
                return `
                    <div class="round-details mb-2 p-2 border rounded">
                        <strong>Round ${index + 1}:</strong> ${resultText}
                        <div class="mt-1">${statesHtml}</div>
                    </div>
                `;
            }).join('');
            modalBody.innerHTML = `
                <div class="mb-3">
                    <h6>Players:</h6>
                    <p>${game.players.join(', ')}</p>
                </div>
                <div class="mb-3">
                    <h6>Submitted:</h6>
                    <p>${date}</p>
                </div>
                <div class="mb-3">
                    <h6>Rounds (${game.rounds.length}):</h6>
                    ${roundsHtml}
                </div>
            `;
            this.detailsModal.show();
        } catch (error) {
            alert('Failed to load game details: ' + error.message);
        }
    },

    async deleteGame(gameId) {
        try {
            // Verify admin permission
            const isAdmin = await auth.verifyAdmin();
            if (!isAdmin) {
                alert('Password incorrect, no permission to delete!');
                return;
            }

            if (!confirm('Are you sure you want to delete this game? This cannot be undone.')) {
                return;
            }

            await GameAPI.deleteGame(gameId);
            await this.loadGamesHistory();
            alert('Game deleted successfully!');
        } catch (error) {
            console.error('Failed to delete game:', error);
            alert('Failed to delete game: ' + error.message);
        }
    }
};
