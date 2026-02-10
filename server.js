const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

let worldState = {
    settings: { multiplier: 0.8, taxRate: 0.15, volatility: 15 }, // Налог 15%, доходность ниже
    globalPrice: 120,
    marketLots: [],
    messages: [],
    events: ["Экономический кризис: правительство ввело налог 15% на продажу энергии."],
    players: {} 
};

app.post('/api/auth', (req, res) => {
    const { username, password, action, corp } = req.body;
    
    if (action === 'register') {
        if (worldState.players[username]) return res.status(400).json({ m: "Имя занято" });
        worldState.players[username] = { 
            password, 
            money: 10000, // Уменьшено до 10к для хардкора
            energy: 200, 
            assets: [], 
            corp: corp || "VOID", 
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
        worldState.events.push(`[РЫНОК]: ${buyerName} выкупил актив у ${lot.seller}`);
        res.json({ success: true });
    } else {
        res.status(400).send("Недостаточно средств");
    }
});

app.post('/api/admin/action', (req, res) => {
    const { login, pass, action, target, value } = req.body;
    if (login !== 'xeone' || pass !== '565811') return res.status(403).send();

    if (action === 'setPrice') worldState.globalPrice = Number(value);
    if (action === 'setTax') worldState.settings.taxRate = Number(value) / 100;
    if (action === 'giveMoney') worldState.players[target].money += Number(value);
    
    res.json({ success: true, world: worldState });
});

// Плавное изменение цен
setInterval(() => {
    let drift = (Math.random() - 0.5) * worldState.settings.volatility;
    worldState.globalPrice = Math.max(10, worldState.globalPrice + drift);
}, 10000);

app.listen(PORT, () => console.log(`Mars 1.9 HARDCORE Online`));
