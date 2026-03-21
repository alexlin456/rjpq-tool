/**
 * 主題設定清單。
 * 每一筆主題資料都會被主題管理器拿來渲染選單卡片，
 * 並對應到 HTML 根節點 `data-theme` 屬性。
 *
 * @type {Array<{id: string, name: string, emoji: string, color: string, sub: string}>}
 */
export const THEMES = [
    { id: "classic", name: "古典楓城", emoji: "🏰", color: "#336699", sub: "經典楓之谷藍" },
    { id: "romeo", name: "羅密歐之劍", emoji: "⚔️", color: "#7b1d1d", sub: "熱血深紅" },
    { id: "juliet", name: "茱麗葉薔薇", emoji: "🌹", color: "#9b4068", sub: "柔美薔薇粉" },
    { id: "dark", name: "暗影城堡", emoji: "🌙", color: "#1a1a2e", sub: "神秘暗夜" },
    { id: "emerald", name: "翠綠聖域", emoji: "🌿", color: "#1b5e20", sub: "清新翠綠" },
    { id: "gold", name: "黃金貴族", emoji: "👑", color: "#5d4037", sub: "金碧輝煌" },
];
