const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_FILE = './database.json';

// --- ЗАГРУЗКА ДАННЫХ ИЗ ФАЙЛА ---
let players = {};
if (fs.existsSync(DB_FILE)) {
    const data = fs.readFileSync(DB_FILE);
    players = JSON.parse(data);
    console.log("✅ Данные игроков загружены из файла");
}

// Функция сохранения
const saveToDisk = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(players, null, 2));
};

const market = [
    { id: 1, name: "Киоск с едой", price: 800, profit: 25 },
    { id: 2, name: "АЗС Гравитация", price: 4000, profit: 120 },
    { id: 3, name: "Завод роботов", price: 15000, profit: 550 },
    { id: 4, name: "Квантовый Хаб", price: 50000, profit: 2100 }
];

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    
    socket.on('auth', (data) => {
        if (!players[data.username]) {
            players[data.username] = {
                username: data.username,
                password: data.password,
                cash: 2500,
                owned: [],
                isBanned: false
            };
            saveToDisk();
        } else if (players[data.username].password !== data.password) {
            return socket.emit('event', { msg: "Неверный пароль!" });
        }
        
        socket.username = data.username;
        socket.emit('init', { player: players[socket.username], market: market });
        io.emit('chat_msg', { user: 'SYSTEM', text: `${socket.username} вошел.` });
    });

    socket.on('buy_request', (bizId) => {
        const p = players[socket.username];
        const biz = market.find(m => m.id === bizId);
        if (p && biz && p.cash >= biz.price && !p.isBanned) {
            p.cash -= biz.price;
            p.owned.push(biz);
            saveToDisk();
            socket.emit('update_data', p);
        }
    });

    socket.on('send_chat', (text) => {
        if (socket.username) io.emit('chat_msg', { user: socket.username, text });
    });

    // --- АДМИНКА (paramov / 565811) ---
    socket.on('admin_login', (data) => {
        if (data.login === "paramov" && data.pass === "565811") {
            socket.isAdmin = true;
            socket.emit('admin_auth_success');
        } else {
            socket.emit('event', { msg: "Доступ запрещен!" });
        }
    });

    socket.on('admin_cmd', (data) => {
        if (!socket.isAdmin) return;
        const target = players[data.target];
        if (target) {
            if (data.type === 'add_cash') target.cash += 10000;
            if (data.type === 'ban') target.isBanned = true;
            saveToDisk();
            socket.emit('event', { msg: `Команда для ${data.target} выполнена` });
        }
    });
});

// Ежесекундный доход и сохранение раз в 10 сек
setInterval(() => {
    Object.keys(players).forEach(name => {
        const p = players[name];
        if (!p.isBanned && p.owned.length > 0) {
            let income = 0;
            p.owned.forEach(b => income += b.profit);
            p.cash += income;
        }
    });
    // Рассылаем обновления всем подключенным
    io.sockets.sockets.forEach(s => {
        if (s.username && players[s.username]) {
            s.emit('update_data', players[s.username]);
        }
    });
}, 1000);

// Авто-сохранение в файл каждые 10 секунд
setInterval(saveToDisk, 10000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));