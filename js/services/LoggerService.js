/**
 * 系統日誌服務。
 *
 * 封裝 log 面板顯示與切換，
 * 方便由控制器直接呼叫記錄事件。
 */
export class LoggerService {
    /**
     * 建立日誌服務。
     *
     * @param {string} panelId 日誌面板元素 ID。
     * @param {string} buttonId 顯示/隱藏按鈕 ID。
     */
    constructor(panelId = "log-panel", buttonId = "btn-log-toggle") {
        this.panel = /** @type {HTMLElement} */ (document.getElementById(panelId));
        this.button = /** @type {HTMLElement} */ (document.getElementById(buttonId));
    }

    /**
     * 新增一筆日誌。
     *
     * @param {string} message 日誌訊息。
     * @param {"info" | "warn" | "error" | "success"} type 日誌類型。
     */
    log(message, type = "info") {
        const entry = document.createElement("div");
        entry.className = `log-entry log-${type}`;
        entry.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.panel.prepend(entry);
    }

    /**
     * 切換日誌區顯示狀態。
     */
    toggle() {
        const visible = this.panel.style.display !== "flex";
        this.panel.style.display = visible ? "flex" : "none";
        this.button.innerText = visible ? "隱藏" : "顯示";
    }
}
