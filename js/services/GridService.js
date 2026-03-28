import { Helper } from "../utils/Helper.js";

/**
 * 地圖渲染服務。
 *
 * 職責：
 * 1. 建立 10x4 門格 UI
 * 2. 綁定左鍵/右鍵/手機雙擊事件
 * 3. 更新門格視覺狀態
 */
export class GridService {
    /**
     * 建立 Grid 服務。
     *
     * @param {Object} options 參數設定。
     * @param {string} options.containerId 地圖容器 ID。
     * @param {number} options.floors 樓層數。
     * @param {number} options.doorsPerFloor 每層門數。
     */
    constructor(options = {}) {
        this.container = /** @type {HTMLElement} */ (document.getElementById(options.containerId || "map-grid"));
        this.floors = options.floors || 10;
        this.doorsPerFloor = options.doorsPerFloor || 4;
        this.getColorByNick = options.getColorByNick || ((nick) => Helper.getNickColor(nick));
        this.onLeftClick = null;
        this.onRightClick = null;
    }

    /**
     * 註冊門格點擊回呼。
     *
     * @param {(floor: number, door: number) => void} onLeft 左鍵回呼。
     * @param {(floor: number, door: number) => void} onRight 右鍵回呼。
     */
    registerHandlers(onLeft, onRight) {
        this.onLeftClick = onLeft;
        this.onRightClick = onRight;
    }

    /**
     * 渲染整張地圖。
     */
    render() {
        this.container.innerHTML = "";
        for (let floor = 0; floor < this.floors; floor += 1) {
            const floorRow = this.#createFloorRow(floor);
            this.container.appendChild(floorRow);
        }
    }

    /**
     * 建立一層的列元素。
     *
     * @param {number} floor 樓層索引。
     * @returns {HTMLElement} 樓層 row。
     */
    #createFloorRow(floor) {
        const row = document.createElement("div");
        row.className = "floor";

        const label = document.createElement("div");
        label.className = "f-label";
        label.innerText = `L${this.floors - floor}`;
        row.appendChild(label);

        const doorGrid = document.createElement("div");
        doorGrid.className = "door-grid";

        for (let door = 0; door < this.doorsPerFloor; door += 1) {
            const doorElement = this.#createDoorElement(floor, door);
            doorGrid.appendChild(doorElement);
        }

        row.appendChild(doorGrid);
        return row;
    }

    /**
     * 建立單一門格元素。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @returns {HTMLElement} 門格元素。
     */
    #createDoorElement(floor, door) {
        const doorElement = document.createElement("div");
        doorElement.className = "door";
        doorElement.id = `d-${floor}-${door}`;

        const number = document.createElement("div");
        number.className = "door-number";
        number.innerText = String(door + 1);
        doorElement.appendChild(number);

        const tag = document.createElement("div");
        tag.className = "door-tag";
        doorElement.appendChild(tag);

        const errorTag = document.createElement("div");
        errorTag.className = "error-tag";
        doorElement.appendChild(errorTag);

        let lastTouch = 0;
        doorElement.addEventListener("touchstart", (event) => {
            const now = Date.now();
            if (now - lastTouch < 350) {
                event.preventDefault();
                if (this.onRightClick) {
                    this.onRightClick(floor, door);
                }
            }
            lastTouch = now;
        }, { passive: false });

        doorElement.addEventListener("click", () => {
            if (this.onLeftClick) {
                this.onLeftClick(floor, door);
            }
        });

        doorElement.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            if (this.onRightClick) {
                this.onRightClick(floor, door);
            }
        });

        return doorElement;
    }

    /**
     * 更新指定門格視覺。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @param {{v: number, owner: string | null, errorOwners: string[]}} cell 格子資料。
     */
    updateDoor(floor, door, cell) {
        const element = this.getDoorElement(floor, door);
        if (!element) {
            return;
        }
        const tag = /** @type {HTMLElement} */ (element.querySelector(".door-tag"));
        const errorTag = /** @type {HTMLElement} */ (element.querySelector(".error-tag"));

        // 更新正確標記
        if (cell.v === 1 && cell.owner) {
            element.classList.add("state-pass");
            element.classList.remove("state-error");
            element.style.setProperty("--marker-color", this.getColorByNick(cell.owner));
            tag.innerText = cell.owner;
        } else {
            element.classList.remove("state-pass");
            element.style.removeProperty("--marker-color");
            tag.innerText = "";
        }

        // 更新死路標記
        if (cell.errorOwners && cell.errorOwners.length > 0) {
            element.classList.add("has-error-mark");
            errorTag.innerText = cell.errorOwners.join(", ");
        } else {
            element.classList.remove("has-error-mark");
            errorTag.innerText = "";
        }
    }

    /**
     * 切換死路視覺（僅本地顯示）。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     */
    toggleErrorMark(floor, door) {
        const element = this.getDoorElement(floor, door);
        if (!element) {
            return;
        }

        if (element.classList.contains("state-pass")) {
            return;
        }

        element.classList.toggle("state-error");
    }

    /**
     * 清除所有門格視覺狀態。
     */
    clearAllDoors() {
        for (let floor = 0; floor < this.floors; floor += 1) {
            for (let door = 0; door < this.doorsPerFloor; door += 1) {
                const element = this.getDoorElement(floor, door);
                if (!element) {
                    continue;
                }
                const tag = /** @type {HTMLElement} */ (element.querySelector(".door-tag"));
                element.classList.remove("state-pass", "state-error");
                element.style.removeProperty("--marker-color");
                tag.innerText = "";
            }
        }
    }

    /**
     * 取得門格元素。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     * @returns {HTMLElement | null} 門格 DOM 元素。
     */
    getDoorElement(floor, door) {
        return document.getElementById(`d-${floor}-${door}`);
    }
}
