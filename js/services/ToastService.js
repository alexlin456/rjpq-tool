/**
 * Toast 通知服務。
 *
 * 專責管理底部浮動通知，
 * 提供一致的提示外觀與自動消失機制。
 */
export class ToastService {
    /**
     * 建立 Toast 服務。
     *
     * @param {string} stackId Toast 容器元素 ID。
     */
    constructor(stackId = "toast-stack") {
        this.stack = /** @type {HTMLElement} */ (document.getElementById(stackId));
    }

    /**
     * 顯示一則通知。
     *
     * @param {string} icon 左側 icon。
     * @param {string} title 標題文字。
     * @param {string} message 內容文字。
     * @param {string} type 類型，例如 `fun`。
     * @param {number} duration 顯示毫秒數。
     */
    show(icon, title, message, type = "", duration = 4000) {
        const toast = document.createElement("div");
        toast.className = `toast${type ? ` ${type}` : ""}`;
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-msg">${message}</div>
            </div>
        `;
        this.stack.appendChild(toast);
        window.setTimeout(() => {
            toast.style.animation = "toastOut 0.3s ease forwards";
            window.setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}
