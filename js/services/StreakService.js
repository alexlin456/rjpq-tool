import { STREAK_MESSAGES } from "../config/streakMessages.js";

/**
 * 連續同門偵測服務。
 *
 * 當玩家在相鄰樓層連續標記同一扇門時，
 * 計算 streak 並回傳可顯示的趣味提示。
 */
export class StreakService {
    /**
     * 建立連續偵測服務。
     *
     * @param {number} floors 樓層數量。
     */
    constructor(floors = 10) {
        this.floors = floors;
        this.myFloorMark = Array(floors).fill(-1);
    }

    /**
     * 重設所有樓層標記紀錄。
     */
    reset() {
        this.myFloorMark = Array(this.floors).fill(-1);
    }

    /**
     * 清除特定樓層的我方標記紀錄。
     *
     * @param {number} floor 樓層索引。
     */
    clearFloor(floor) {
        this.myFloorMark[floor] = -1;
    }

    /**
     * 設定某層我方標記並計算連續次數。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @returns {{count: number, message: {icon: string, title: string, msg: string} | null}} streak 結果。
     */
    markAndCheck(floor, door) {
        this.myFloorMark[floor] = door;
        let count = 1;

        for (let i = floor + 1; i < this.floors; i += 1) {
            if (this.myFloorMark[i] === door) {
                count += 1;
            } else {
                break;
            }
        }

        for (let i = floor - 1; i >= 0; i -= 1) {
            if (this.myFloorMark[i] === door) {
                count += 1;
            } else {
                break;
            }
        }

        if (count < 2) {
            return { count, message: null };
        }

        const key = Math.min(count, 5);
        const pool = STREAK_MESSAGES[key] || [];
        const pick = pool[Math.floor(Math.random() * pool.length)] || null;
        return { count, message: pick };
    }
}
