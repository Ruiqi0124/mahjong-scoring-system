// 权限控制工具
const auth = {
    // 管理员密码 (这里使用一个简单的密码，实际应用中应该使用更安全的方式)
    adminPassword: 'admin123',

    // 验证管理员权限
    async verifyAdmin() {
        const password = await this.showPasswordPrompt();
        return password === this.adminPassword;
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