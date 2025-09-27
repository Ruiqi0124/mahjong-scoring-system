// 权限控制工具
const auth = {
    async verifyPassword(password) {
        const response = await fetch(`/api/auth?password=${encodeURIComponent(password)}`);
        if (!response.ok) throw new Error('验证密码失败');
        return await response.json();
    },

    // 验证管理员权限
    async verifyAdmin() {
        const password = prompt('请输入管理员密码：');
        if (!password) return false;
        const result = await this.verifyPassword(password);
        if (result) {
            return password;
        } else {
            return null;
        }
    },

    // 显示密码输入弹窗
    showPasswordPrompt() {
        return new Promise((resolve) => {
            const modal = new bootstrap.Modal(document.getElementById('adminAuthModal'));
            const form = document.getElementById('adminAuthForm');
            const input = document.getElementById('adminPassword');
            
            const handleSubmit = (e) => {
                e.preventDefault();
                const password = input.value;
                input.value = ''; // 清空输入
                modal.hide();
                form.removeEventListener('submit', handleSubmit);
                resolve(password);
            };

            form.addEventListener('submit', handleSubmit);
            modal.show();
        });
    }
}; 