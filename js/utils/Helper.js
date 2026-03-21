/**
 * 工具函式集合。
 *
 * 此類別只提供靜態方法，方便在不同服務中共用。
 */
export class Helper {
    /**
     * 產生預設暱稱。
     *
     * @returns {string} 回傳 `冒險者XXXX` 格式的預設名稱。
     */
    static generateDefaultNick() {
        return `冒險者${Math.floor(1000 + Math.random() * 9000)}`;
    }

    /**
     * 驗證暱稱是否合法。
     *
     * 規則：1-10 字，僅允許英文、數字、中文。
     *
     * @param {string} nick 使用者輸入的暱稱。
     * @returns {boolean} 合法回傳 true，否則 false。
     */
    static validateNick(nick) {
        return /^[a-zA-Z0-9\u4e00-\u9fa5]{1,10}$/.test(nick);
    }

    /**
     * 依暱稱計算穩定顏色。
     *
     * 此方法可讓每位玩家在 UI 中維持固定色彩，
     * 便於快速辨識標記所有者。
     *
     * @param {string} nick 玩家暱稱。
     * @returns {string} HSL 顏色字串。
     */
    static getNickColor(nick) {
        let hash = 0;
        for (let i = 0; i < nick.length; i += 1) {
            hash = nick.charCodeAt(i) + ((hash << 5) - hash);
        }
        return `hsl(${Math.abs(hash % 360)}, 65%, 42%)`;
    }

    /**
     * 深拷貝 JSON 相容資料。
     *
     * @template T
     * @param {T} data 要複製的資料。
     * @returns {T} 深拷貝後的新物件。
     */
    static clone(data) {
        return JSON.parse(JSON.stringify(data));
    }
}
