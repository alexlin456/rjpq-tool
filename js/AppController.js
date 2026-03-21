import { Helper } from "./utils/Helper.js";
import { MapState } from "./models/MapState.js";
import { ToastService } from "./services/ToastService.js";
import { LoggerService } from "./services/LoggerService.js";
import { ThemeService } from "./services/ThemeService.js";
import { GridService } from "./services/GridService.js";
import { PeerService } from "./services/PeerService.js";
import { StreakService } from "./services/StreakService.js";

/**
 * 應用程式主控制器。
 *
 * 使用 OOP 方式整合：UI、地圖資料、Peer 網路、主題、通知、連續提示。
 */
export class AppController {
    /**
     * 建立主控制器。
     */
    constructor() {
        this.isHost = false;
        this.myNick = "";

        /** @type {{floors: number, doors: number}} */
        this.constants = { floors: 10, doors: 4 };

        this.mapState = new MapState(this.constants.floors, this.constants.doors);
        this.streak = new StreakService(this.constants.floors);
        this.toast = new ToastService("toast-stack");
        this.logger = new LoggerService("log-panel", "btn-log-toggle");
        this.theme = new ThemeService({
            storageKey: "rjpq-theme",
            rootSelector: "html",
            pickerId: "theme-picker",
            gridId: "tp-grid",
        });
        this.grid = new GridService({
            containerId: "map-grid",
            floors: this.constants.floors,
            doorsPerFloor: this.constants.doors,
        });

        this.peerService = new PeerService({
            onPeerReady: this.#onPeerReady.bind(this),
            onPeerError: this.#onPeerError.bind(this),
            onData: this.#onPeerData.bind(this),
            onMemberClosed: this.#onMemberClosed.bind(this),
            onConnectionOpen: this.#onConnectionOpen.bind(this),
        });

        this.elements = this.#collectElements();
    }

    /**
     * 啟動應用程式。
     */
    init() {
        this.theme.init();
        this.grid.registerHandlers(this.#handleDoorLeftClick.bind(this), this.#handleDoorRightClick.bind(this));
        this.grid.render();
        this.#bindUiEvents();
        this.#checkInviteHash();
    }

    /**
     * 收集常用 DOM 參照。
     *
     * @returns {Record<string, HTMLElement>} 元素表。
     */
    #collectElements() {
        return {
            loading: document.getElementById("loading"),
            loadingMsg: document.getElementById("load-msg"),
            nickInput: document.getElementById("nick-input"),
            joinInput: document.getElementById("join-id"),
            participantList: document.getElementById("participant-list"),
            buttonSaveNick: document.getElementById("btn-save-nick"),
            buttonEditNick: document.getElementById("btn-edit-nick"),
            buttonCopy: document.getElementById("btn-copy"),
            buttonLeave: document.getElementById("btn-leave"),
            buttonHost: document.getElementById("btn-host"),
            buttonJoin: document.getElementById("btn-join"),
            buttonReset: document.getElementById("btn-reset-all"),
            buttonReconnect: document.getElementById("btn-reconnect"),
            buttonTheme: document.getElementById("btn-theme"),
            buttonThemeClose: document.getElementById("btn-theme-close"),
            buttonLogHeader: document.getElementById("btn-log-header"),
            initActions: document.getElementById("init-actions"),
            joinRow: document.getElementById("join-row"),
            connPanel: document.getElementById("conn-panel"),
        };
    }

    /**
     * 綁定畫面按鈕事件。
     */
    #bindUiEvents() {
        this.elements.buttonSaveNick.addEventListener("click", this.#saveNick.bind(this));
        this.elements.buttonEditNick.addEventListener("click", this.#editNick.bind(this));
        this.elements.buttonCopy.addEventListener("click", this.#copyInvite.bind(this));
        this.elements.buttonLeave.addEventListener("click", this.#leaveRoom.bind(this));
        this.elements.buttonHost.addEventListener("click", this.#startHost.bind(this));
        this.elements.buttonJoin.addEventListener("click", this.#startJoin.bind(this));
        this.elements.buttonReset.addEventListener("click", this.#resetAll.bind(this));
        this.elements.buttonReconnect.addEventListener("click", this.#reconnectCleanly.bind(this));
        this.elements.buttonTheme.addEventListener("click", () => this.theme.openPicker());
        this.elements.buttonThemeClose.addEventListener("click", () => this.theme.closePicker());
        this.elements.buttonLogHeader.addEventListener("click", () => this.logger.toggle());
    }

    /**
     * 設定 loading 遮罩狀態。
     *
     * @param {boolean} show 是否顯示。
     * @param {string} message 顯示訊息。
     */
    #setLoading(show, message = "處理中...") {
        this.elements.loading.style.display = show ? "flex" : "none";
        this.elements.loadingMsg.innerText = message;
    }

    /**
     * 儲存暱稱。
     */
    #saveNick() {
        let nick = this.elements.nickInput.value.trim();
        if (!nick) {
            nick = Helper.generateDefaultNick();
        }

        if (!Helper.validateNick(nick)) {
            this.toast.show("⚠️", "暱稱格式錯誤", "請使用 1-10 位英數或中文字。");
            return;
        }

        this.myNick = nick;
        this.elements.nickInput.value = nick;
        this.elements.nickInput.disabled = true;
        this.elements.buttonSaveNick.style.display = "none";
        this.elements.buttonEditNick.style.display = "inline-flex";
        this.elements.initActions.style.display = "flex";
        this.elements.joinRow.style.display = "flex";

        this.logger.log(`暱稱設定: ${nick}`, "success");
        this.toast.show("👤", "暱稱已設定", `歡迎，${nick}！請建立或加入房間。`, "", 3000);
        this.#refreshParticipants();
    }

    /**
     * 修改暱稱。
     */
    #editNick() {
        if (!window.confirm("修改暱稱將斷開目前連線，確定嗎？")) {
            return;
        }
        this.#leaveRoom();
        this.elements.nickInput.disabled = false;
        this.elements.buttonSaveNick.style.display = "inline-flex";
        this.elements.buttonEditNick.style.display = "none";
    }

    /**
     * 建立房間。
     */
    async #startHost() {
        if (!this.myNick) {
            this.toast.show("⚠️", "請先設定暱稱", "建立房間前請先確認暱稱。");
            return;
        }

        try {
            this.#setLoading(true, "建立 P2P GateWay...");
            await this.peerService.ensurePeer();
            this.#setLoading(false);
            this.isHost = true;
            this.elements.buttonCopy.style.display = "inline-flex";
            this.elements.buttonLeave.style.display = "inline-flex";
            this.elements.connPanel.style.display = "none";
            this.elements.buttonReset.style.display = "inline-flex";
            window.location.hash = this.peerService.fullMyId;
            this.logger.log("已建立房間，您是房主。", "success");
            this.toast.show("🏠", "房間建立成功", "點擊邀請按鈕即可分享連結。", "", 3500);
            this.#refreshParticipants();
        } catch (error) {
            this.#setLoading(false);
            this.logger.log(`建立房間失敗: ${error}`, "error");
            this.toast.show("❌", "建立失敗", "請稍後重試或檢查網路環境。");
        }
    }

    /**
     * 加入房間。
     */
    async #startJoin() {
        if (!this.myNick) {
            this.toast.show("⚠️", "請先設定暱稱", "加入房間前請先設定暱稱。");
            return;
        }

        const targetId = this.elements.joinInput.value.trim();
        if (!targetId) {
            this.toast.show("⚠️", "請輸入房號", "請先貼上房號再加入。");
            return;
        }

        try {
            this.#setLoading(true, "正在接入房間...");
            await this.peerService.ensurePeer();
            const conn = this.peerService.connectToHost(targetId);
            conn.on("open", () => {
                conn.send({ type: "JOIN", nick: this.myNick });
                this.logger.log("已連接房主，送出加入申請。", "info");
            });

            window.setTimeout(() => {
                if (this.elements.loading.style.display === "flex" && this.peerService.getMembers().length === 0) {
                    this.#setLoading(false);
                    this.logger.log("連線申請逾時。", "error");
                    this.toast.show("⏱️", "連線逾時", "無法連上房主，請確認房號或網路狀態。");
                }
            }, 10000);
        } catch (error) {
            this.#setLoading(false);
            this.logger.log(`加入房間失敗: ${error}`, "error");
            this.toast.show("❌", "加入失敗", "請稍後重試。", "", 3000);
        }
    }

    /**
     * 離開目前房間。
     */
    #leaveRoom() {
        this.peerService.destroy();
        this.isHost = false;
        this.mapState.reset();
        this.streak.reset();
        this.grid.clearAllDoors();

        this.elements.initActions.style.display = "flex";
        this.elements.joinRow.style.display = "flex";
        this.elements.connPanel.style.display = "block";
        this.elements.buttonLeave.style.display = "none";
        this.elements.buttonCopy.style.display = "none";
        this.elements.buttonReset.style.display = "none";
        this.elements.buttonHost.disabled = false;
        this.elements.buttonJoin.disabled = false;
        this.elements.participantList.innerHTML = "";

        this.logger.log("連線已中斷。", "warn");
    }

    /**
     * 重新整理頁面並清空 hash。
     */
    #reconnectCleanly() {
        window.history.replaceState("", document.title, window.location.pathname);
        window.location.reload();
    }

    /**
     * 複製邀請連結。
     */
    #copyInvite() {
        const url = `${window.location.origin}${window.location.pathname}#${this.peerService.fullMyId}`;
        navigator.clipboard.writeText(url)
            .then(() => {
                this.toast.show("📋", "連結已複製", "快分享給隊友，一起進房。", "", 2800);
            })
            .catch(() => {
                window.prompt("請複製此連結", url);
            });
    }

    /**
     * 清空所有標記。
     * 房主：清空全員標記並廣播 RESET；一般成員：僅清除自己的標記。
     */
    #resetAll() {
        if (this.isHost) {
            if (!window.confirm("確定要清空所有人的標記嗎？")) {
                return;
            }
            this.mapState.reset();
            this.streak.reset();
            this.grid.clearAllDoors();
            this.peerService.broadcast({ type: "RESET" });
            this.toast.show("🗑️", "標記已全部清空", "所有成員的標記已重置，重新出發！", "", 2600);
        } else {
            if (!window.confirm("確定要清除你在所有層的標記嗎？")) {
                return;
            }
            const changed = this.mapState.removeOwner(this.myNick);
            changed.forEach(({ floor, door }) => {
                this.grid.updateDoor(floor, door, this.mapState.getCell(floor, door));
                this.peerService.broadcast({ type: "SYNC", f: floor, d: door, v: 0, owner: null });
            });
            this.streak.reset();
            this.toast.show("🗑️", "已清除你的標記", "你在所有層的標記已移除。", "", 2600);
        }
    }

    /**
     * 處理門格左鍵點擊。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     */
    #handleDoorLeftClick(floor, door) {
        if (!this.myNick) {
            this.toast.show("⚠️", "尚未設定暱稱", "請先輸入並確定暱稱。");
            return;
        }

        const item = this.mapState.getCell(floor, door);

        if (item.v === 1) {
            if (item.owner === this.myNick || this.isHost) {
                this.mapState.setCell(floor, door, 0, null);
                this.streak.clearFloor(floor);
            } else {
                this.toast.show("🚫", "無法操作", `這格已被 ${item.owner} 標記，你無法移除。`, "", 2500);
                return;
            }
        } else {
            if (this.mapState.isOccupiedByOther(floor, door, this.myNick)) {
                this.toast.show("🚫", "已被佔用", `這格已被 ${item.owner} 標記。`, "", 2500);
                return;
            }

            const removedDoors = this.mapState.clearOwnerMarksOnFloor(floor, this.myNick, door);
            removedDoors.forEach((removedDoor) => {
                this.grid.updateDoor(floor, removedDoor, this.mapState.getCell(floor, removedDoor));
                this.#syncOut({ type: "SYNC", f: floor, d: removedDoor, v: 0, owner: null });
            });

            this.mapState.setCell(floor, door, 1, this.myNick);
            this.#showStreakToast(floor, door);
        }

        this.grid.updateDoor(floor, door, this.mapState.getCell(floor, door));
        this.#syncOut({
            type: "SYNC",
            f: floor,
            d: door,
            v: this.mapState.getCell(floor, door).v,
            owner: this.mapState.getCell(floor, door).owner,
        });
    }

    /**
     * 處理門格右鍵點擊（死路標記）。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     */
    #handleDoorRightClick(floor, door) {
        this.grid.toggleErrorMark(floor, door);
    }

    /**
     * 顯示連續同門趣味提示。
     *
     * @param {number} floor 樓層索引。
     * @param {number} door 門索引。
     */
    #showStreakToast(floor, door) {
        const result = this.streak.markAndCheck(floor, door);
        if (!result.message) {
            return;
        }

        const doorNames = ["最左門", "左二門", "右二門", "最右門"];
        const doorName = doorNames[door] || `第${door + 1}門`;
        this.toast.show(
            result.message.icon,
            `${doorName} × ${result.count} 連！${result.message.title}`,
            result.message.msg,
            "fun",
            5200,
        );
    }

    /**
     * 將訊息同步到其他玩家。
     *
     * @param {any} payload 要同步的資料內容。
     */
    #syncOut(payload) {
        if (this.isHost) {
            this.peerService.broadcast(payload);
            return;
        }

        const host = this.peerService.getMembers().find((member) => member.nick === "房主");
        if (host?.conn?.open) {
            host.conn.send(payload);
        }
    }

    /**
     * 取得完整成員清單。
     *
     * @returns {Array<{nick: string, isHost: boolean}>} 成員陣列。
     */
    #getFullNickList() {
        return [
            { nick: this.myNick, isHost: true },
            ...this.peerService.getMembers().map((member) => ({ nick: member.nick, isHost: false })),
        ];
    }

    /**
     * 重新渲染成員列表。
     */
    #refreshParticipants() {
        const tags = [{ nick: this.myNick, isHost: this.isHost }];
        this.peerService.getMembers().forEach((member) => {
            if (member.conn?.open) {
                tags.push({ nick: member.nick, isHost: false });
            }
        });
        this.#renderParticipants(tags);
    }

    /**
     * 渲染成員標籤。
     *
     * @param {Array<{nick: string, isHost: boolean}>} tags 成員標籤資料。
     */
    #renderParticipants(tags) {
        this.elements.participantList.innerHTML = "";
        tags.forEach((tagInfo) => {
            const tag = document.createElement("span");
            const color = Helper.getNickColor(tagInfo.nick);
            tag.className = `participant-tag${tagInfo.isHost ? " host" : ""}`;
            tag.style.borderColor = color;
            tag.style.color = color;
            tag.innerText = `${tagInfo.isHost ? "👑" : "👤"} ${tagInfo.nick}`;
            this.elements.participantList.appendChild(tag);
        });
    }

    /**
     * 依房間 hash 預填加入欄位。
     */
    #checkInviteHash() {
        const hash = window.location.hash.substring(1);
        if (!hash) {
            return;
        }
        this.elements.joinInput.value = hash;
        this.logger.log("偵測到邀請房號，請設定暱稱後加入。", "warn");
        this.toast.show("🔗", "偵測到邀請連結", "請先設定暱稱，再點擊加入。", "", 5000);
    }

    /**
     * peer 建立成功事件。
     *
     * @param {string} id peer id。
     */
    #onPeerReady(id) {
        this.logger.log(`GateWay就緒。房號: ${id.substring(0, 6)}...`, "success");
    }

    /**
     * peer 錯誤事件。
     *
     * @param {any} error 錯誤物件。
     */
    #onPeerError(error) {
        this.#setLoading(false);
        this.logger.log(`GateWay錯誤: ${error.type || error}`, "error");
        if (error.type === "peer-unavailable") {
            this.toast.show("❌", "找不到房間", "請確認房號是否正確，或請房主重建房間。", "", 3500);
        }
    }

    /**
     * 連線建立事件。
     *
     * @param {any} _conn 連線物件。
     */
    #onConnectionOpen(_conn) {
        // 目前不需額外動作，保留擴充點。
    }

    /**
     * 成員離線事件。
     *
     * @param {{peerId: string, nick: string}} user 離線成員資訊。
     */
    #onMemberClosed(user) {
        this.logger.log(`成員離開: ${user.nick}`, "warn");
        this.toast.show("👋", `${user.nick} 離開了`, "其標記已被移除。", "", 2800);

        const removed = this.mapState.removeOwner(user.nick);
        removed.forEach((item) => {
            this.grid.updateDoor(item.floor, item.door, this.mapState.getCell(item.floor, item.door));
        });

        this.#refreshParticipants();
        if (this.isHost) {
            this.peerService.broadcast({ type: "NICK_LIST", users: this.#getFullNickList() });
        }
    }

    /**
     * 處理收到的 P2P 訊息。
     *
     * @param {any} conn 來源連線。
     * @param {any} data 訊息內容。
     */
    #onPeerData(conn, data) {
        switch (data.type) {
            case "JOIN": {
                if (!this.isHost) {
                    return;
                }

                const duplicated = this.peerService.hasNick(data.nick) || this.myNick === data.nick;
                if (duplicated) {
                    conn.send({ type: "REJECT", reason: `暱稱「${data.nick}」已有人使用，請更換後再試。` });
                    window.setTimeout(() => conn.close(), 500);
                    return;
                }

                this.peerService.connections[conn.peer] = { conn, nick: data.nick };
                this.logger.log(`歡迎: ${data.nick}`, "success");
                this.toast.show("🎉", `${data.nick} 加入了`, "新隊友已進入房間。", "", 2600);

                const list = this.#getFullNickList();
                this.peerService.broadcast({ type: "NICK_LIST", users: list });
                conn.send({ type: "WELCOME", state: this.mapState.getSnapshot(), users: list });
                this.#refreshParticipants();
                break;
            }
            case "WELCOME": {
                this.#setLoading(false);
                this.isHost = false;
                this.peerService.connections[conn.peer] = { conn, nick: "房主" };
                this.mapState.loadSnapshot(data.state);
                this.streak.reset();

                for (let floor = 0; floor < this.constants.floors; floor += 1) {
                    for (let door = 0; door < this.constants.doors; door += 1) {
                        this.grid.updateDoor(floor, door, this.mapState.getCell(floor, door));
                    }
                }

                this.logger.log("進入房間成功！", "success");
                this.toast.show("✅", "成功加入房間", "地圖已同步，開始找路！", "", 3200);
                this.elements.buttonLeave.style.display = "inline-flex";
                this.elements.buttonReset.style.display = "inline-flex";
                this.elements.connPanel.style.display = "none";
                this.elements.joinInput.value = "";
                window.history.replaceState(null, document.title, window.location.pathname);
                this.#renderParticipants(data.users);
                break;
            }
            case "NICK_LIST": {
                this.#renderParticipants(data.users);
                break;
            }
            case "REJECT": {
                this.#setLoading(false);
                this.toast.show("❌", "加入失敗", data.reason, "", 3400);
                conn.close();
                break;
            }
            case "SYNC": {
                this.mapState.setCell(data.f, data.d, data.v, data.owner);
                if (data.v === 1 && data.owner) {
                    const removedDoors = this.mapState.clearOwnerMarksOnFloor(data.f, data.owner, data.d);
                    removedDoors.forEach((door) => {
                        this.grid.updateDoor(data.f, door, this.mapState.getCell(data.f, door));
                    });
                }
                this.grid.updateDoor(data.f, data.d, this.mapState.getCell(data.f, data.d));
                if (this.isHost) {
                    this.peerService.broadcast(data, conn);
                }
                break;
            }
            case "RESET": {
                this.mapState.reset();
                this.streak.reset();
                this.grid.clearAllDoors();
                if (this.isHost) {
                    this.peerService.broadcast(data, conn);
                }
                break;
            }
            default:
                break;
        }
    }
}
