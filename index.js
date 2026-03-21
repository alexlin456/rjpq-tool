import { AppController } from "./js/AppController.js";

/**
 * 應用程式進入點。
 *
 * 在 DOM 載入完成後建立並啟動主控制器，
 * 確保所有元素都已可被服務層正確綁定。
 */
document.addEventListener("DOMContentLoaded", () => {
    const app = new AppController();
    app.init();
});
