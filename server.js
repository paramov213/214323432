const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let worldState = {
    settings: { multiplier: 1, taxRate: 0.05, volatility: 8, disasterChance: 0.1 },
    globalPrice: 150,
    priceHistory: [150],
    messages: [],
    corps: {
        "ARES": { balance: 0, members: [], color: "#ff4444" },
        "NEBULA": { balance: 0, members: [], color: "#44ff44" },
        "VOID": { balance: 0, members: [], color: "#00f2ff" }
    },
    events: ["Корпоративные войны начались."],
    players: {}
};

app.post('/api/login', (req, res) => {
    const { username, corp } = req.body;
    if (!worldState.players[username]) {
        worldState.players[username] = { 
            money: 15000, energy: 500, assets: [], 
            isBanned: false, corp: corp || "ARES", shield: 100 
        };
        worldState.corps[corp || "ARES"].members.push(username);
    }
    res.json({ user: worldState.players[username], world: worldState });
});

app.post('/api/sync', (req, res) => {
    const { username, data, chatMsg, raidTarget } = req.body;
    if (worldState.players[username]) {
        if (worldState.players[username].isBanned) return res.status(403).json({ banned: true });
        worldState.players[username] = { ...worldState.players[username], ...data };
        
        if (chatMsg) worldState.messages.push({ user: username, text: chatMsg, time: Date.now() });
        
        // Логика рейда (Энергомост)
        if (raidTarget && worldState.players[raidTarget]) {
            let target = worldState.players[raidTarget];
            if (target.shield > 0) {
                target.shield -= 20;
                worldState.events.push(`[RAID]: ${username} атакует щиты ${raidTarget}!`);
            } else {
                const loot = Math.floor(target.money * 0.1);
                target.money -= loot;
                worldState.players[username].money += loot;
                worldState.events.push(`[RAID]: ${username} украл ${loot}₮ у ${raidTarget}!`);
            }
        }
    }
    if (worldState.messages.length > 30) worldState.messages.shift();
    res.json(worldState);
});

app.listen(PORT, () => console.log(`Mars OS 1.5 (CORP) active on ${PORT}`));
