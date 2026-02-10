const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let worldState = {
    settings: { taxRate: 0.10, volatility: 20 }, 
    globalPrice: 135,
    marketLots: [],
    messages: [],
    events: ["Система Mars OS v2.0 инициализирована. Удачной колонизации!"],
    players: {} 
};

app.post('/api/auth', (req, res) => {
    const { username, password, action } = req.body;
    if (action === 'register') {
        if (worldState.players[username]) return res.status(400).json({ m: "Имя занято" });
        worldState.players[username] = { 
            password, money: 20000, energy: 500, assets: [], 
            isAdmin: (username === 'xeone' && password === '565811')
        };
        return res.json({ user: worldState.players[username] });
    }
    if (action === 'login') {
        const user = worldState.players[username];
        if (user && user.password === password) return res.json({ user });
        return res.status(403).json({ m: "Ошибка входа" });
    }
});

app.post('/api/sync', (req, res) => {
    const { username, password, data, chatMsg, newLot } = req.body;
    const user = worldState.players[username];
    if (!user || user.password !== password) return res.status(403).send();

    worldState.players[username] = { ...user, ...data };
    if (chatMsg) worldState.messages.push({ user: username, text: chatMsg });
    if (newLot) worldState.marketLots.push({ ...newLot, seller: username, id: Date.now() });

    res.json(worldState);
});

app.post('/api/admin/action', (req, res) => {
    const { login, pass, action, target, value } = req.body;
    if (login !== 'xeone' || pass !== '565811') return res.status(403).send();
    if (action === 'setPrice') worldState.globalPrice = Number(value);
    if (action === 'giveMoney') worldState.players[target].money += Number(value);
    if (action === 'clearChat') worldState.messages = [];
    res.json({ success: true, world: worldState });
});

// Экономика и случайные события
setInterval(() => {
    worldState.globalPrice = Math.max(15, worldState.globalPrice + (Math.random() - 0.5) * worldState.settings.volatility);
    
    // Случайное событие раз в 2 минуты
    if (Math.random() > 0.95) {
        const evs = ["Солнечная вспышка! Цена на энергию растет!", "Обвал акций Марса!", "Правительственные субсидии всем колонистам!"];
        const ev = evs[Math.floor(Math.random()*evs.length)];
        worldState.events.push(`[ВНИМАНИЕ]: ${ev}`);
        if (ev.includes("растет")) worldState.globalPrice += 50;
    }
    if (worldState.events.length > 15) worldState.events.shift();
    if (worldState.messages.length > 50) worldState.messages.shift();
}, 8000);

app.listen(PORT, () => console.log(`Mars 2.0 Imperial Online`));
