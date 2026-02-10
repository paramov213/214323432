const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let worldState = {
    settings: { taxRate: 0.12, volatility: 25 }, 
    globalPrice: 140,
    marketLots: [],
    messages: [],
    events: ["Система Mars OS v2.2 запущена. Все модули стабильны."],
    players: {} 
};

// Авторизация
app.post('/api/auth', (req, res) => {
    const { username, password, action } = req.body;
    if (action === 'register') {
        if (worldState.players[username]) return res.status(400).json({ m: "Имя занято" });
        worldState.players[username] = { 
            password, money: 15000, energy: 300, assets: [], loan: 0,
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

// Синхронизация и Рынок
app.post('/api/sync', (req, res) => {
    const { username, password, data, chatMsg, newLot } = req.body;
    const user = worldState.players[username];
    if (!user || user.password !== password) return res.status(403).send();

    worldState.players[username] = { ...user, ...data };
    if (chatMsg) worldState.messages.push({ user: username, text: chatMsg });
    
    if (newLot) {
        const lotId = Date.now();
        worldState.marketLots.push({ ...newLot, seller: username, id: lotId });
        worldState.players[username].assets = worldState.players[username].assets.filter(a => a.iid !== newLot.item.iid);
    }
    res.json(worldState);
});

// Покупка на рынке
app.post('/api/market/buy', (req, res) => {
    const { buyerName, lotId } = req.body;
    const lotIdx = worldState.marketLots.findIndex(l => l.id === lotId);
    if (lotIdx === -1) return res.status(404).send();

    const lot = worldState.marketLots[lotIdx];
    const buyer = worldState.players[buyerName];
    const seller = worldState.players[lot.seller];

    if (buyer.money >= lot.price) {
        buyer.money -= lot.price;
        if (seller) seller.money += lot.price;
        buyer.assets.push(lot.item);
        worldState.marketLots.splice(lotIdx, 1);
        worldState.events.push(`[СДЕЛКА]: ${buyerName} купил ${lot.item.name} у ${lot.seller}`);
        res.json({ success: true });
    } else res.status(400).send();
});

// Кредит
app.post('/api/loan', (req, res) => {
    const { username, amount } = req.body;
    const p = worldState.players[username];
    if (p.loan > 0) return res.status(400).send();
    p.money += amount;
    p.loan = Math.floor(amount * 1.25);
    res.json({ success: true });
});

// Админка
app.post('/api/admin/action', (req, res) => {
    const { login, pass, action, target, value } = req.body;
    if (login !== 'xeone' || pass !== '565811') return res.status(403).send();
    if (action === 'setPrice') worldState.globalPrice = Number(value);
    if (action === 'giveMoney') worldState.players[target].money += Number(value);
    res.json({ success: true });
});

setInterval(() => {
    worldState.globalPrice = Math.max(15, worldState.globalPrice + (Math.random() - 0.5) * worldState.settings.volatility);
    if (worldState.messages.length > 30) worldState.messages.shift();
}, 10000);

app.listen(PORT, () => console.log(`Mars OS v2.2 ACTIVE`));
