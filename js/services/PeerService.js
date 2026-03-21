import { Helper } from "../utils/Helper.js";

/**
 * PeerJS 連線服務。
 *
 * 功能：
 * 1. 建立 peer 節點
 * 2. 管理所有 data channel 連線
 * 3. 將連線事件透過 callback 回拋給上層控制器
 */
export class PeerService {
    /**
     * 建立 PeerService。
     *
     * @param {Object} callbacks 事件回呼集合。
     * @param {(id: string) => void} callbacks.onPeerReady peer 建立成功回呼。
     * @param {(err: any) => void} callbacks.onPeerError peer 錯誤回呼。
     * @param {(conn: any, data: any) => void} callbacks.onData 收到訊息回呼。
     * @param {(user: {peerId: string, nick: string}) => void} callbacks.onMemberClosed 成員離線回呼。
     * @param {(conn: any) => void} callbacks.onConnectionOpen 連線開啟回呼。
     */
    constructor(callbacks) {
        this.callbacks = callbacks;
        this.peer = null;
        this.fullMyId = "";
        /** @type {Record<string, {conn: any, nick: string}>} */
        this.connections = {};
    }

    /**
     * 初始化 peer 節點。
     *
     * @returns {Promise<string>} 回傳 peer id。
     */
    async ensurePeer() {
        if (this.peer) {
            return this.fullMyId;
        }

        if (typeof window.Peer === "undefined") {
            throw new Error("PeerJS 尚未載入，請確認 HTML 先引入 peerjs.min.js。");
        }

        return new Promise((resolve, reject) => {
            this.peer = new window.Peer({
                debug: 1,
                config: {
                    iceServers: [
                        { urls: "stun:stun.l.google.com:19302" },
                        { urls: "stun:stun1.l.google.com:19302" },
                    ],
                },
            });

            this.peer.on("open", (id) => {
                this.fullMyId = id;
                this.callbacks.onPeerReady(id);
                resolve(id);
            });

            this.peer.on("connection", (conn) => {
                this.#setupConnection(conn);
            });

            this.peer.on("error", (error) => {
                this.callbacks.onPeerError(error);
                reject(error);
            });
        });
    }

    /**
     * 以 joiner 身分連線房主。
     *
     * @param {string} targetId 房主 peer id。
     * @returns {any} 建立的連線物件。
     */
    connectToHost(targetId) {
        const conn = this.peer.connect(targetId, { reliable: true });
        this.#setupConnection(conn);
        return conn;
    }

    /**
     * 綁定連線事件。
     *
     * @param {any} conn PeerJS DataConnection。
     */
    #setupConnection(conn) {
        conn.on("open", () => {
            this.callbacks.onConnectionOpen(conn);
        });

        conn.on("data", (data) => {
            this.callbacks.onData(conn, data);
        });

        conn.on("close", () => {
            const user = this.connections[conn.peer];
            if (user) {
                this.callbacks.onMemberClosed({ peerId: conn.peer, nick: user.nick });
                delete this.connections[conn.peer];
            }
        });
    }

    /**
     * 設定某連線對應的玩家暱稱。
     *
     * @param {string} peerId 對方 peer id。
     * @param {string} nick 玩家暱稱。
     */
    setConnectionNick(peerId, nick) {
        const existing = this.connections[peerId];
        if (existing) {
            existing.nick = nick;
            return;
        }

        const conn = this.getConnection(peerId);
        if (conn) {
            this.connections[peerId] = { conn, nick };
        }
    }

    /**
     * 依 peer id 取得連線。
     *
     * @param {string} peerId 對方 peer id。
     * @returns {any | null} 找到回傳連線物件。
     */
    getConnection(peerId) {
        if (!this.peer || !this.peer.connections || !this.peer.connections[peerId]) {
            return null;
        }
        const list = this.peer.connections[peerId];
        return list && list.length ? list[0] : null;
    }

    /**
     * 取得所有已知成員。
     *
     * @returns {Array<{peerId: string, conn: any, nick: string}>} 成員清單。
     */
    getMembers() {
        return Object.entries(this.connections).map(([peerId, value]) => ({
            peerId,
            conn: value.conn,
            nick: value.nick,
        }));
    }

    /**
     * 檢查是否存在相同暱稱。
     *
     * @param {string} nick 欲檢查的暱稱。
     * @returns {boolean} true 代表已有相同暱稱。
     */
    hasNick(nick) {
        return this.getMembers().some((member) => member.nick === nick);
    }

    /**
     * 廣播訊息到所有成員。
     *
     * @param {any} payload 傳送資料。
     * @param {any | null} excludeConn 欲排除的連線。
     */
    broadcast(payload, excludeConn = null) {
        this.getMembers().forEach((member) => {
            if (member.conn.open && member.conn !== excludeConn) {
                member.conn.send(Helper.clone(payload));
            }
        });
    }

    /**
     * 傳送訊息給指定 peer。
     *
     * @param {string} peerId 對方 peer id。
     * @param {any} payload 傳送資料。
     */
    sendToPeer(peerId, payload) {
        const conn = this.connections[peerId]?.conn || this.getConnection(peerId);
        if (conn && conn.open) {
            conn.send(Helper.clone(payload));
        }
    }

    /**
     * 關閉所有連線並銷毀 peer。
     */
    destroy() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.connections = {};
        this.fullMyId = "";
    }
}
