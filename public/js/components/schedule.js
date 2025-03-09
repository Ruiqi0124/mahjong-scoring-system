// 营业时间表组件
const Schedule = {
    schedules: [], // 所有时间安排
    addModal: null,

    // 初始化
    async init() {
        try {
            this.addModal = new bootstrap.Modal(document.getElementById('addScheduleModal'));
            
            // 获取玩家列表
            const players = await api.getPlayers();
            this.updatePlayerSelects(players);
            
            // 获取时间安排
            await this.updateSchedules();
            
            // 设置日期选择器的最小值为今天
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('quickAddDate').min = today;
            document.getElementById('scheduleDate').min = today;
            
            // 默认选择今天
            document.getElementById('quickAddDate').value = today;
            document.getElementById('scheduleDate').value = today;
            
            // 更新日期表头
            this.updateDateHeaders();
            
            // 每天凌晨自动更新
            this.setupAutoRefresh();

            // 添加日期选择器的事件监听
            document.getElementById('quickAddDate').addEventListener('change', this.validateDate);
            document.getElementById('scheduleDate').addEventListener('change', this.validateDate);
        } catch (error) {
            console.error('初始化失败:', error);
            alert('初始化失败: ' + error.message);
        }
    },

    // 验证日期（周一和周三不可选）
    validateDate(event) {
        const date = new Date(event.target.value);
        const day = date.getDay();
        
        if (day === 1 || day === 3) { // 1是周一，3是周三
            alert('周一和周三不开放约桌');
            event.target.value = ''; // 清空选择
        }
    },

    // 更新玩家选择器
    updatePlayerSelects(players) {
        const options = players.map(player => 
            `<option value="${player}">${player}</option>`
        ).join('');
        
        document.getElementById('quickAddName').innerHTML = 
            '<option value="">选择玩家...</option>' + options;
        document.getElementById('playerName').innerHTML = 
            '<option value="">选择玩家...</option>' + options;
    },

    // 更新日期表头
    updateDateHeaders() {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekday = days[date.getDay()];
            
            const cell = document.getElementById(`day${i}`);
            cell.innerHTML = `${month}/${day}<br><small class="text-muted">周${weekday}</small>`;
            
            // 周一和周三添加特殊样式
            if (date.getDay() === 1 || date.getDay() === 3) {
                cell.classList.add('text-muted', 'bg-light');
            }
        }
    },

    // 更新时间安排
    async updateSchedules() {
        try {
            // 获取时间安排数据
            this.schedules = await api.getSchedules();
            
            // 清空所有单元格
            document.querySelectorAll('.schedule-cell').forEach(cell => {
                cell.innerHTML = '';
                cell.className = 'schedule-cell';
                
                // 如果是周一或周三的单元格，添加禁用样式
                const dayIndex = cell.id.slice(-1);
                const date = new Date();
                date.setDate(date.getDate() + parseInt(dayIndex));
                if (date.getDay() === 1 || date.getDay() === 3) {
                    cell.classList.add('bg-light');
                    cell.innerHTML = '<div class="text-muted text-center">不开放</div>';
                }
            });
            
            // 按日期和时间段分组
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            this.schedules.forEach(schedule => {
                const scheduleDate = new Date(schedule.date);
                scheduleDate.setHours(0, 0, 0, 0);
                
                // 计算与今天的天数差
                const dayDiff = Math.floor((scheduleDate - today) / (1000 * 60 * 60 * 24));
                
                // 只处理未来7天的数据，且跳过周一和周三
                if (dayDiff >= 0 && dayDiff < 7) {
                    const day = scheduleDate.getDay();
                    if (day !== 1 && day !== 3) {
                        schedule.times.forEach(time => {
                            const cellId = `${time}${dayDiff}`;
                            const cell = document.getElementById(cellId);
                            
                            if (cell) {
                                // 添加玩家标签
                                const playerTag = document.createElement('div');
                                playerTag.className = 'player-tag';
                                playerTag.innerHTML = `
                                    ${schedule.playerName}
                                    <span class="remove-btn" onclick="Schedule.removeSchedule('${schedule._id}', '${time}')">
                                        <i class="fas fa-times"></i>
                                    </span>
                                `;
                                cell.appendChild(playerTag);
                                
                                // 更新玩家数量
                                this.updatePlayerCount(cellId);
                            }
                        });
                    }
                }
            });
        } catch (error) {
            console.error('更新时间安排失败:', error);
            alert('更新时间安排失败: ' + error.message);
        }
    },

    // 更新玩家数量
    updatePlayerCount(cellId) {
        const cell = document.getElementById(cellId);
        const playerCount = cell.querySelectorAll('.player-tag').length;
        
        // 移除旧的计数
        const oldCount = cell.querySelector('.player-count');
        if (oldCount) oldCount.remove();
        
        // 添加新的计数
        const countDiv = document.createElement('div');
        countDiv.className = 'player-count';
        countDiv.textContent = `${playerCount} 人`;
        cell.appendChild(countDiv);
        
        // 当人数达到4人时添加特殊样式
        cell.classList.toggle('can-play', playerCount >= 4);
    },

    // 快速添加
    async quickAdd() {
        try {
            const playerName = document.getElementById('quickAddName').value;
            const time = document.getElementById('quickAddTime').value;
            const date = document.getElementById('quickAddDate').value;
            
            if (!playerName || !time || !date) {
                alert('请填写完整信息！');
                return;
            }

            // 检查是否是周一或周三
            const selectedDate = new Date(date);
            const day = selectedDate.getDay();
            if (day === 1 || day === 3) {
                alert('周一和周三不开放约桌');
                return;
            }
            
            await api.addSchedule({
                playerName,
                date,
                times: [time]
            });
            
            await this.updateSchedules();
            alert('添加成功！');
        } catch (error) {
            console.error('添加失败:', error);
            alert('添加失败: ' + error.message);
        }
    },

    // 添加时间安排
    async addSchedule() {
        try {
            const playerName = document.getElementById('playerName').value;
            const repeatMode = document.getElementById('repeatMode').value;
            const date = document.getElementById('scheduleDate').value;
            const note = document.getElementById('scheduleNote').value;
            
            if (!playerName || !date) {
                alert('请填写完整信息！');
                return;
            }

            // 检查是否是周一或周三
            const selectedDate = new Date(date);
            const day = selectedDate.getDay();
            if (day === 1 || day === 3) {
                alert('周一和周三不开放约桌');
                return;
            }
            
            // 获取选中的时间段
            const times = [];
            if (document.getElementById('timeAfternoon').checked) times.push('afternoon');
            if (document.getElementById('timeEvening').checked) times.push('evening');
            if (document.getElementById('timeNight').checked) times.push('night');
            
            if (times.length === 0) {
                alert('请至少选择一个时间段！');
                return;
            }
            
            await api.addSchedule({
                playerName,
                date,
                times,
                repeatMode,
                note
            });
            
            this.addModal.hide();
            await this.updateSchedules();
            alert('添加成功！');
        } catch (error) {
            console.error('添加失败:', error);
            alert('添加失败: ' + error.message);
        }
    },

    // 删除时间安排
    async removeSchedule(scheduleId, time) {
        try {
            if (!confirm('确定要删除这个时间吗？')) return;
            
            await api.removeSchedule(scheduleId, time);
            await this.updateSchedules();
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败: ' + error.message);
        }
    },

    // 设置自动更新
    setupAutoRefresh() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        // 计算到明天凌晨的毫秒数
        const msUntilMidnight = tomorrow - now;
        
        // 设置定时器
        setTimeout(() => {
            this.updateDateHeaders();
            this.updateSchedules();
            // 设置每24小时更新一次
            setInterval(() => {
                this.updateDateHeaders();
                this.updateSchedules();
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }
}; 