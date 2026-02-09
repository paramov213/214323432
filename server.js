const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// Глобальное состояние сервера
let worldState = {
    globalPrice: 150,
    multiplier: 1,
    events: ["Сервер запущен. Добро пожаловать в Энергокризис."],
    players: {} // Хранилище: { "username": { money, energy, assets, isBanned } }
};

// --- API ДЛЯ ИГРОКОВ ---

// Регистрация или вход
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Имя не указано" });
    
    if (!worldState.players[username]) {
        worldState.players[username] = {
            money: 5000,
            energy: 100,
            assets: [],
            isBanned: false,
            lastSeen: Date.now()
        };
        worldState.events.push(`Новый колонист: ${username}`);
    }
    res.json({ user: worldState.players[username], world: worldState });
});

// Синхронизация данных игрока (Save/Load)
app.post('/api/sync', (req, res) => {
    const { username, data } = req.body;
    if (worldState.players[username]) {
        if (worldState.players[username].isBanned) {
            return res.status(403).json({ banned: true });
        }
        worldState.players[username] = { ...worldState.players[username], ...data };
        worldState.players[username].lastSeen = Date.now();
    }
    res.json(worldState);
});

// --- API ДЛЯ АДМИНА ---

app.post('/api/admin/command', (req, res) => {
    const { password, command, target, value } = req.body;
    if (password !== 'admin1337') return res.status(403).json({ error: 'Hack detected!' });

    if (command === 'setMultiplier') worldState.multiplier = value;
    if (command === 'setPrice') worldState.globalPrice = value;
    if (command === 'ban' && worldState.players[target]) {
        worldState.players[target].isBanned = true;
        worldState.events.push(`Игрок ${target} БЫЛ ЗАБАНЕН`);
    }
    if (command === 'giveMoney' && worldState.players[target]) {
        worldState.players[target].money += Number(value);
    }
    
    res.json({ success: true, world: worldState });
});

// Игровой цикл сервера (Экономика)
setInterval(() => {
    worldState.globalPrice += (Math.random() - 0.5) * 6;
    if (worldState.globalPrice < 20) worldState.globalPrice = 20;
}, 5000);

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
