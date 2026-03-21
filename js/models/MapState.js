/**
 * 地圖狀態模型。
 *
 * 負責管理 10 層 x 4 門的標記狀態，
 * 並提供所有資料層操作，不直接處理 DOM。
 */
export class MapState {
    /**
     * 建立地圖狀態。
     *
     * @param {number} floors 樓層數量。
     * @param {number} doorsPerFloor 每層門數。
     */
    constructor(floors = 10, doorsPerFloor = 4) {
        this.floors = floors;
        this.doorsPerFloor = doorsPerFloor;
        this.mapData = this.#createEmptyMap();
    }

    /**
     * 建立空白地圖資料。
     *
     * @returns {Array<Array<{v: number, owner: string | null}>>} 二維地圖資料。
     */
    #createEmptyMap() {
        return Array(this.floors)
            .fill(null)
            .map(() => Array(this.doorsPerFloor).fill(null).map(() => ({ v: 0, owner: null })));
    }

    /**
     * 取得指定格子的資料。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @returns {{v: number, owner: string | null}} 格子狀態。
     */
    getCell(floor, door) {
        return this.mapData[floor][door];
    }

    /**
     * 設定指定格子的資料。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @param {number} value 0=未標記, 1=正確標記。
     * @param {string | null} owner 標記者暱稱。
     */
    setCell(floor, door, value, owner) {
        this.mapData[floor][door].v = value;
        this.mapData[floor][door].owner = owner;
    }

    /**
     * 清除指定玩家在某層的其他標記。
     *
     * @param {number} floor 樓層索引。
     * @param {string} owner 玩家暱稱。
     * @param {number} exceptDoor 保留不清除的門索引。
     * @returns {number[]} 回傳被清除的門索引。
     */
    clearOwnerMarksOnFloor(floor, owner, exceptDoor = -1) {
        const changed = [];
        for (let i = 0; i < this.doorsPerFloor; i += 1) {
            if (i !== exceptDoor && this.mapData[floor][i].owner === owner) {
                this.mapData[floor][i].v = 0;
                this.mapData[floor][i].owner = null;
                changed.push(i);
            }
        }
        return changed;
    }

    /**
     * 移除指定玩家在全圖上的標記。
     *
     * @param {string} owner 玩家暱稱。
     * @returns {Array<{floor: number, door: number}>} 回傳所有被清除的位置。
     */
    removeOwner(owner) {
        const changed = [];
        for (let f = 0; f < this.floors; f += 1) {
            for (let d = 0; d < this.doorsPerFloor; d += 1) {
                if (this.mapData[f][d].owner === owner) {
                    this.mapData[f][d].v = 0;
                    this.mapData[f][d].owner = null;
                    changed.push({ floor: f, door: d });
                }
            }
        }
        return changed;
    }

    /**
     * 尋找玩家在某層是否已有標記。
     *
     * @param {number} floor 樓層索引。
     * @param {string} owner 玩家暱稱。
     * @returns {number} 找到回傳門索引，否則回傳 -1。
     */
    findOwnerDoorOnFloor(floor, owner) {
        for (let i = 0; i < this.doorsPerFloor; i += 1) {
            if (this.mapData[floor][i].owner === owner) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 判斷某格是否已被其他人佔用。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @param {string} myNick 目前玩家暱稱。
     * @returns {boolean} true 代表被他人佔用。
     */
    isOccupiedByOther(floor, door, myNick) {
        const item = this.mapData[floor][door];
        return Boolean(item.owner && item.owner !== myNick);
    }

    /**
     * 載入遠端同步狀態。
     *
     * @param {Array<Array<{v: number, owner: string | null}>>} snapshot 遠端資料快照。
     */
    loadSnapshot(snapshot) {
        this.mapData = JSON.parse(JSON.stringify(snapshot));
    }

    /**
     * 取得可傳輸的地圖快照。
     *
     * @returns {Array<Array<{v: number, owner: string | null}>>} 深拷貝快照。
     */
    getSnapshot() {
        return JSON.parse(JSON.stringify(this.mapData));
    }

    /**
     * 重置為空白地圖。
     */
    reset() {
        this.mapData = this.#createEmptyMap();
    }
}
