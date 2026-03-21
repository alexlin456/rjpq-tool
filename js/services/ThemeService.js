import { THEMES } from "../config/themes.js";

/**
 * 主題管理服務。
 *
 * 負責主題套用、主題清單渲染、開關主題視窗、以及 localStorage 持久化。
 */
export class ThemeService {
    /**
     * 建立主題管理器。
     *
     * @param {Object} options 參數設定。
     * @param {string} options.storageKey localStorage key。
     * @param {string} options.rootSelector 根元素選擇器。
     * @param {string} options.pickerId 主題視窗 ID。
     * @param {string} options.gridId 主題卡片容器 ID。
     */
    constructor(options = {}) {
        this.storageKey = options.storageKey || "rjpq-theme";
        this.root = /** @type {HTMLElement} */ (document.querySelector(options.rootSelector || "html"));
        this.picker = /** @type {HTMLElement} */ (document.getElementById(options.pickerId || "theme-picker"));
        this.grid = /** @type {HTMLElement} */ (document.getElementById(options.gridId || "tp-grid"));
        this.currentTheme = localStorage.getItem(this.storageKey) || "classic";
    }

    /**
     * 初始化主題系統。
     *
     * @param {(themeId: string) => void} [onThemeApplied] 主題套用後回呼。
     */
    init(onThemeApplied) {
        this.applyTheme(this.currentTheme);
        this.renderCards(onThemeApplied);
        this.bindPickerClose();
    }

    /**
     * 套用主題。
     *
     * @param {string} themeId 主題 ID。
     */
    applyTheme(themeId) {
        this.currentTheme = themeId;
        this.root.setAttribute("data-theme", themeId);
        localStorage.setItem(this.storageKey, themeId);
    }

    /**
     * 開啟主題挑選視窗。
     */
    openPicker() {
        this.picker.classList.add("open");
    }

    /**
     * 關閉主題挑選視窗。
     */
    closePicker() {
        this.picker.classList.remove("open");
    }

    /**
     * 綁定點擊遮罩可關閉視窗。
     */
    bindPickerClose() {
        this.picker.addEventListener("click", (event) => {
            if (event.target === this.picker) {
                this.closePicker();
            }
        });
    }

    /**
     * 渲染主題卡片。
     *
     * @param {(themeId: string) => void} [onThemeApplied] 主題套用後回呼。
     */
    renderCards(onThemeApplied) {
        this.grid.innerHTML = "";
        THEMES.forEach((theme) => {
            const card = document.createElement("div");
            card.className = `tp-card${theme.id === this.currentTheme ? " active" : ""}`;
            if (theme.id === this.currentTheme) {
                card.style.borderColor = theme.color;
            }
            card.innerHTML = `
                <div class="tp-swatch" style="background:${theme.color}"></div>
                <div>${theme.emoji} ${theme.name}</div>
                <div style="font-size:10px;opacity:0.6;margin-top:2px">${theme.sub}</div>
            `;
            card.addEventListener("click", () => {
                this.applyTheme(theme.id);
                this.renderCards(onThemeApplied);
                this.closePicker();
                if (onThemeApplied) {
                    onThemeApplied(theme.id);
                }
            });
            this.grid.appendChild(card);
        });
    }
}
