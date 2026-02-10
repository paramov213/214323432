const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let worldState = {
    settings: { multiplier: 1, taxRate: 0.05, volatility: 12 },
    globalPrice: 150,
    marketLots: [], // Предложения от игроков
    messages: [],
    events: ["Система безопасности обновлена. Вход через протокол авторизации."],
    players: {} // Здесь теперь хранятся данные с паролями
};

// Регистрация и Вход
app.post('/api/auth', (req, res) => {
    const { username, password, action, corp } = req.body;
    
    if (action === 'register') {
        if (worldState.players[username]) return res.status(400).json({ m: "Имя занято" });
        worldState.players[username] = { 
            password, money: 30000, energy: 1500, assets: [], corp: corp || "VOID", isAdmin: (username === 'xeone' && password === '565811')
        };
        return res.json({ user: worldState.players[username] });
    }
    
    if (action === 'login') {
        const user = worldState.players[username];
        if (user && user.password === password) {
            return res.json({ user });
        }
        return res.status(403).json({ m: "Ошибка входа" });
    }
});

app.post('/api/sync', (req, res) => {
    const { username, password, data, chatMsg, newLot } = req.body;
    const user = worldState.players[username];
    if (!user || user.password !== password) return res.status(403).send();

    // Обновление данных
    worldState.players[username] = { ...user, ...data };

    if (chatMsg) worldState.messages.push({ user: username, text: chatMsg });
    if (newLot) worldState.marketLots.push({ ...newLot, seller: username, id: Date.now() });

    res.json(worldState);
});

// Рынок: Покупка у игрока
app.post('/api/market/buy', (req, res) => {
    const { buyerName, lotId } = req.body;
    const lotIndex = worldState.marketLots.findIndex(l => l.id === lotId);
    if (lotIndex === -1) return res.status(404).send();

    const lot = worldState.marketLots[lotIndex];
    const buyer = worldState.players[buyerName];
    const seller = worldState.players[lot.seller];

    if (buyer.money >= lot.price) {
        buyer.money -= lot.price;
        seller.money += lot.price;
        buyer.assets.push(lot.item);
        worldState.marketLots.splice(lotIndex, 1);
        worldState.events.push(`[РЫНОК]: ${buyerName} купил ${lot.item.name} у ${lot.seller}`);
        res.json({ success: true });
    } else {
        res.status(400).send("No money");
    }
});

// Админ-панель (xeone / 565811)
app.post('/api/admin/action', (req, res) => {
    const { login, pass, action, target, value } = req.body;
    if (login !== 'xeone' || pass !== '565811') return res.status(403).send();

    if (action === 'setPrice') worldState.globalPrice = Number(value);
    if (action === 'setVolatility') worldState.settings.volatility = Number(value);
    if (action === 'giveMoney') worldState.players[target].money += Number(value);
    
    res.json({ success: true, world: worldState });
});

setInterval(() => {
    worldState.globalPrice = Math.max(20, worldState.globalPrice + (Math.random() - 0.5) * worldState.settings.volatility);
}, 5000);

app.listen(PORT, () => console.log(`Mars 1.8 Security active`));
