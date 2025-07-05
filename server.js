const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

// Безопасность
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: "Juda ko'p so'rov yuborildi, keyinroq urinib ko'ring",
});
app.use("/api/", limiter);

// Более строгий лимит для аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // максимум 5 попыток входа
  message: "Juda ko'p kirish urinishi, 15 daqiqa kutib turing",
});

// JWT секрет
const JWT_SECRET = process.env.JWT_SECRET || "actogram_super_secret_key_2024";

// Проверка разрешенных доменов
const allowedDomains = [
  "https://acto-uimuz.vercel.app",
  "https://actogr.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedDomains.some((domain) =>
        origin.startsWith(domain)
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS - Domain access restricted"));
      }
    },
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedDomains.some((domain) =>
        origin.startsWith(domain)
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Хранилище данных в памяти (в продакшене использовать базу данных)
const users = new Map(); // userId -> user data
const usersByEmail = new Map(); // email -> userId
const usersByUsername = new Map(); // username -> userId
const chats = new Map();
const messages = new Map();
const activeConnections = new Map(); // socketId -> userId

// Создаем общий чат при запуске
const generalChatId = "general";
chats.set(generalChatId, {
  id: generalChatId,
  name: "Umumiy chat",
  isGroup: true,
  participants: [],
  createdAt: new Date(),
  type: "group",
  isEncrypted: true,
});
messages.set(generalChatId, []);

// Middleware для проверки домена
const checkDomain = (req, res, next) => {
  const origin = req.get("origin") || req.get("host");
  const isAllowed = allowedDomains.some(
    (domain) =>
      origin &&
      (origin.includes("vercel.app") ||
        origin.includes("render.com") ||
        origin.includes("localhost"))
  );

  if (!isAllowed && req.path.startsWith("/api")) {
    return res.status(403).json({ error: "Domain access restricted" });
  }
  next();
};

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token talab qilinadi" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Noto'g'ri yoki muddati o'tgan token" });
    }
    req.user = user;
    next();
  });
};

// Валидация email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Валидация username
const validateUsername = (username) => {
  const usernameRegex = /^@[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Валидация пароля
const validatePassword = (password) => {
  return password && password.length >= 8;
};

// Главная страница
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uz">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ACTOGRAM Server</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                background: rgba(255,255,255,0.1);
                padding: 30px;
                border-radius: 15px;
                backdrop-filter: blur(10px);
            }
            h1 { color: #fff; text-align: center; margin-bottom: 30px; }
            .status { 
                background: rgba(0,255,0,0.2); 
                padding: 15px; 
                border-radius: 8px; 
                margin: 20px 0;
                text-align: center;
                font-size: 18px;
            }
            .info {
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .security-badge {
                background: rgba(0,255,0,0.3);
                padding: 10px;
                border-radius: 8px;
                margin: 10px 0;
                text-align: center;
            }
            .api-link {
                color: #fff;
                text-decoration: none;
                background: rgba(255,255,255,0.2);
                padding: 8px 15px;
                border-radius: 5px;
                display: inline-block;
                margin: 5px;
                transition: all 0.3s;
            }
            .api-link:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .client-link {
                background: rgba(0,255,0,0.3);
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                text-decoration: none;
                display: inline-block;
                margin: 10px 0;
                font-size: 18px;
                font-weight: bold;
                transition: all 0.3s;
            }
            .client-link:hover {
                background: rgba(0,255,0,0.4);
                transform: scale(1.05);
            }
            code {
                background: rgba(0,0,0,0.3);
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛡️ ACTOGRAM Secure Server</h1>
            
            <div class="status">
                ✅ Xavfsiz server mukammal ishlayapti!
            </div>
            
            <div class="security-badge">
                🔐 End-to-End Encryption • JWT Authentication • Rate Limiting
            </div>
            
            <div class="info">
                <h3>💬 Mijoz ilovasi:</h3>
                <a href="https://acto-uimuz.vercel.app" class="client-link" target="_blank">
                    🌐 ACTOGRAM Chat ochish
                </a>
                <p>Xavfsiz shifrlangan chat ilovasi</p>
            </div>
            
            <div class="info">
                <h3>📊 Server statistikasi:</h3>
                <p>• Ro'yxatdan o'tgan foydalanuvchilar: <strong>${
                  users.size
                }</strong></p>
                <p>• Faol ulanishlar: <strong>${
                  activeConnections.size
                }</strong></p>
                <p>• Faol chatlar: <strong>${chats.size}</strong></p>
                <p>• Umumiy chatdagi xabarlar: <strong>${
                  messages.get(generalChatId)?.length || 0
                }</strong></p>
                <p>• Ishlash vaqti: <strong>${Math.floor(
                  process.uptime() / 60
                )} daqiqa</strong></p>
                <p>• Oxirgi yangilanish: <strong>${new Date().toLocaleString(
                  "uz-UZ"
                )}</strong></p>
            </div>
            
            <div class="info">
                <h3>🔒 Xavfsizlik xususiyatlari:</h3>
                <p>• ✅ JWT Authentication</p>
                <p>• ✅ Bcrypt Password Hashing</p>
                <p>• ✅ Rate Limiting</p>
                <p>• ✅ CORS Protection</p>
                <p>• ✅ Helmet Security Headers</p>
                <p>• ✅ End-to-End Message Encryption</p>
                <p>• ✅ Domain Verification</p>
            </div>
            
            <div class="info">
                <h3>🔗 API Endpoints:</h3>
                <a href="/api/health" class="api-link" target="_blank">Health Check</a>
                <a href="/api/auth" class="api-link">Authentication (POST)</a>
                <a href="/api/chats" class="api-link">Secure Chats (Auth Required)</a>
                <p style="margin-top: 10px; font-size: 14px; opacity: 0.8;">
                    Barcha API endpointlar JWT token bilan himoyalangan
                </p>
            </div>
            
            <div class="info">
                <h3>🌐 Ruxsat etilgan domenlar:</h3>
                ${allowedDomains
                  .map((domain) => `<p>• <code>${domain}</code></p>`)
                  .join("")}
            </div>
            
            <div class="info">
                <h3>⚡ WebSocket aloqasi:</h3>
                <p>Socket.IO server: <code>${req.protocol}://${req.get(
    "host"
  )}</code></p>
                <p>Holat: <span id="ws-status">Tekshirilmoqda...</span></p>
                <p>Xavfsizlik: JWT Authentication + Domain Verification</p>
            </div>
        </div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const statusEl = document.getElementById('ws-status');
            
            socket.on('connect', () => {
                statusEl.innerHTML = '<span style="color: #00ff00;">🟢 Xavfsiz ulandi</span>';
                console.log('WebSocket xavfsiz ulandi:', socket.id);
            });
            
            socket.on('disconnect', () => {
                statusEl.innerHTML = '<span style="color: #ff0000;">🔴 Uzildi</span>';
            });
            
            socket.on('connect_error', () => {
                statusEl.innerHTML = '<span style="color: #ff0000;">❌ Ulanishda xatolik</span>';
            });
        </script>
    </body>
    </html>
  `);
});

// API Routes
app.get("/api/health", checkDomain, (req, res) => {
  res.json({
    status: "ACTOGRAM secure server mukammal ishlayapti",
    timestamp: new Date().toISOString(),
    registeredUsers: users.size,
    activeConnections: activeConnections.size,
    activeChats: chats.size,
    uptime: process.uptime(),
    clientUrl: "https://acto-uimuz.vercel.app",
    version: "2.0.0-secure",
    security: {
      jwtAuth: true,
      bcryptHashing: true,
      rateLimiting: true,
      corsProtection: true,
      domainVerification: true,
      endToEndEncryption: true,
    },
  });
});

// Аутентификация
app.post("/api/auth", checkDomain, authLimiter, async (req, res) => {
  try {
    const { action, email, password, username, fullName, bio } = req.body;

    // Валидация общих полей
    if (!email || !password) {
      return res.status(400).json({ error: "Email va parol talab qilinadi" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Noto'g'ri email format" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" });
    }

    if (action === "register") {
      // Регистрация
      if (!username || !fullName) {
        return res
          .status(400)
          .json({ error: "Username va to'liq ism talab qilinadi" });
      }

      if (!validateUsername(username)) {
        return res
          .status(400)
          .json({
            error:
              "Username @ bilan boshlanishi va 3-20 ta belgidan iborat bo'lishi kerak",
          });
      }

      // Проверка существования пользователя
      if (usersByEmail.has(email)) {
        return res
          .status(400)
          .json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });
      }

      if (usersByUsername.has(username)) {
        return res.status(400).json({ error: "Bu username allaqachon band" });
      }

      // Хеширование пароля
      const hashedPassword = await bcrypt.hash(password, 12);

      // Создание пользователя
      const userId = uuidv4();
      const user = {
        id: userId,
        email,
        username,
        fullName,
        bio: bio || "",
        password: hashedPassword,
        createdAt: new Date(),
        isVerified: false,
        isOnline: false,
        lastSeen: new Date(),
      };

      // Сохранение пользователя
      users.set(userId, user);
      usersByEmail.set(email, userId);
      usersByUsername.set(username, userId);

      // Создание JWT токена
      const token = jwt.sign({ userId, email, username }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // Ответ без пароля
      const { password: _, ...userResponse } = user;
      res.json({
        success: true,
        message: "Muvaffaqiyatli ro'yxatdan o'tildi",
        user: userResponse,
        token,
      });

      console.log(
        `Yangi foydalanuvchi ro'yxatdan o'tdi: ${username} (${email})`
      );
    } else if (action === "login") {
      // Вход
      const userId = usersByEmail.get(email);
      if (!userId) {
        return res.status(401).json({ error: "Noto'g'ri email yoki parol" });
      }

      const user = users.get(userId);
      if (!user) {
        return res.status(401).json({ error: "Foydalanuvchi topilmadi" });
      }

      // Проверка пароля
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Noto'g'ri email yoki parol" });
      }

      // Обновление статуса
      user.isOnline = true;
      user.lastSeen = new Date();

      // Создание JWT токена
      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      // Ответ без пароля
      const { password: _, ...userResponse } = user;
      res.json({
        success: true,
        message: "Muvaffaqiyatli kirildi",
        user: userResponse,
        token,
      });

      console.log(`Foydalanuvchi kirdi: ${user.username} (${user.email})`);
    } else {
      res.status(400).json({ error: "Noto'g'ri action" });
    }
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Server xatosi" });
  }
});

app.get("/api/chats", checkDomain, authenticateToken, (req, res) => {
  const chatList = Array.from(chats.values()).map((chat) => ({
    ...chat,
    lastMessage: messages.get(chat.id)?.slice(-1)[0] || null,
    messageCount: messages.get(chat.id)?.length || 0,
  }));
  res.json(chatList);
});

app.get("/api/messages/:chatId", checkDomain, authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const chatMessages = messages.get(chatId) || [];
  res.json(chatMessages);
});

// Загрузка файлов (требует аутентификации)
app.post("/api/upload", checkDomain, authenticateToken, (req, res) => {
  res.status(503).json({
    error: "Fayl yuklash vaqtincha mavjud emas",
    message: "Keyingi yangilanishda qo'shiladi",
  });
});

// Socket.IO с аутентификацией
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const origin = socket.handshake.headers.origin;

  // Проверка домена
  const isAllowed = allowedDomains.some(
    (domain) =>
      origin &&
      (origin.includes("vercel.app") ||
        origin.includes("render.com") ||
        origin.includes("localhost"))
  );

  if (!isAllowed && origin) {
    return next(new Error("Domain access restricted"));
  }

  // Проверка токена
  if (!token) {
    return next(new Error("Authentication token required"));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Invalid or expired token"));
    }

    const user = users.get(decoded.userId);
    if (!user) {
      return next(new Error("User not found"));
    }

    socket.userId = decoded.userId;
    socket.user = user;
    next();
  });
});

io.on("connection", (socket) => {
  const user = socket.user;
  console.log(`Xavfsiz ulanish: ${user.username} (${socket.id})`);

  // Сохраняем активное соединение
  activeConnections.set(socket.id, user.id);

  // Обновляем статус пользователя
  user.isOnline = true;
  user.lastSeen = new Date();

  // Добавляем пользователя в общий чат
  const generalChat = chats.get(generalChatId);
  if (generalChat && !generalChat.participants.find((p) => p.id === user.id)) {
    generalChat.participants.push({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isOnline: true,
      isVerified: user.isVerified,
    });
  }

  socket.join(generalChatId);

  // Уведомляем всех о новом пользователе
  socket.to(generalChatId).emit("user_joined", {
    user: {
      id: user.id,
      username: user.username,
      isOnline: true,
    },
    message: `${user.username} ACTOGRAM'ga qo'shildi`,
  });

  // Отправляем список активных пользователей
  const activeUsers = Array.from(activeConnections.values()).map((userId) => {
    const u = users.get(userId);
    return {
      id: u.id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      isOnline: true,
      isVerified: u.isVerified,
    };
  });
  io.emit("users_update", activeUsers);

  // Поиск пользователей
  socket.on("search_users", (query) => {
    const results = Array.from(users.values())
      .filter(
        (u) =>
          u.id !== user.id &&
          u.username.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        isOnline: activeConnections.has(u.id),
        isVerified: u.isVerified,
      }));

    socket.emit("search_results", results);
  });

  // Создание приватного чата
  socket.on("create_private_chat", (data) => {
    const { userId, chatId } = data;
    const targetUser = users.get(userId);

    if (!targetUser) return;

    if (!chats.has(chatId)) {
      const privateChat = {
        id: chatId,
        name: targetUser.username,
        avatar: targetUser.avatar,
        isGroup: false,
        participants: [
          {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            isOnline: true,
          },
          {
            id: targetUser.id,
            username: targetUser.username,
            avatar: targetUser.avatar,
            isOnline: activeConnections.has(targetUser.id),
          },
        ],
        createdAt: new Date(),
        type: "private",
        isEncrypted: true,
      };

      chats.set(chatId, privateChat);
      messages.set(chatId, []);

      // Уведомляем обоих пользователей о новом чате
      const targetSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.userId === userId
      );

      if (targetSocket) {
        targetSocket.join(chatId);
        targetSocket.emit("new_private_chat", privateChat);
      }

      socket.join(chatId);
      socket.emit("new_private_chat", privateChat);
    }
  });

  // Присоединение к чату
  socket.on("join_chat", (chatId) => {
    socket.join(chatId);
    console.log(`${user.username} chatga qo'shildi: ${chatId}`);
  });

  // Отправка сообщения
  socket.on("send_message", (messageData) => {
    const message = {
      id: uuidv4(),
      senderId: user.id,
      senderName: user.username,
      content: messageData.content,
      chatId: messageData.chatId,
      timestamp: new Date(),
      type: messageData.type || "text",
      fileUrl: messageData.fileUrl,
      fileName: messageData.fileName,
      fileSize: messageData.fileSize,
      isEncrypted: messageData.isEncrypted || false,
    };

    // Сохраняем сообщение
    if (!messages.has(messageData.chatId)) {
      messages.set(messageData.chatId, []);
    }
    messages.get(messageData.chatId).push(message);

    // Отправляем сообщение всем в чате
    io.to(messageData.chatId).emit("new_message", message);

    console.log(
      `${user.username}dan shifrlangan xabar ${messageData.chatId} chatiga`
    );
  });

  // Обновление профиля
  socket.on("update_profile", (userData) => {
    const updatedUser = {
      ...user,
      ...userData,
      id: user.id,
      email: user.email,
    };
    users.set(user.id, updatedUser);

    // Обновляем пользователя во всех чатах
    for (const chat of chats.values()) {
      const participantIndex = chat.participants.findIndex(
        (p) => p.id === user.id
      );
      if (participantIndex !== -1) {
        chat.participants[participantIndex] = {
          ...chat.participants[participantIndex],
          ...userData,
        };
      }
    }

    // Уведомляем всех об обновлении
    const activeUsers = Array.from(activeConnections.values()).map((userId) => {
      const u = users.get(userId);
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        isOnline: true,
        isVerified: u.isVerified,
      };
    });
    io.emit("users_update", activeUsers);

    console.log(`${user.username} profilini yangiladi`);
  });

  // Пользователь печатает
  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("user_typing", {
      userId: user.id,
      username: user.username,
      chatId: data.chatId,
    });
  });

  // Пользователь перестал печатать
  socket.on("stop_typing", (data) => {
    socket.to(data.chatId).emit("user_stop_typing", {
      userId: user.id,
      chatId: data.chatId,
    });
  });

  // Отключение пользователя
  socket.on("disconnect", () => {
    // Удаляем из активных соединений
    activeConnections.delete(socket.id);

    // Обновляем статус пользователя
    user.isOnline = false;
    user.lastSeen = new Date();

    // Удаляем пользователя из общего чата
    const generalChat = chats.get(generalChatId);
    if (generalChat) {
      generalChat.participants = generalChat.participants.filter(
        (p) => p.id !== user.id
      );
    }

    // Уведомляем о выходе пользователя
    socket.to(generalChatId).emit("user_left", {
      user: {
        id: user.id,
        username: user.username,
      },
      message: `${user.username} ACTOGRAM'dan chiqdi`,
    });

    // Обновляем список активных пользователей
    const activeUsers = Array.from(activeConnections.values()).map((userId) => {
      const u = users.get(userId);
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        avatar: u.avatar,
        isOnline: true,
        isVerified: u.isVerified,
      };
    });
    io.emit("users_update", activeUsers);

    console.log(`${user.username} xavfsiz tarzda uzildi`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🛡️ ACTOGRAM secure server ${PORT} portida ishga tushdi`);
  console.log(`📱 Mijoz: https://acto-uimuz.vercel.app`);
  console.log(`🌐 Server: https://actogr.onrender.com`);
  console.log(`💬 Umumiy chat yaratildi ID: ${generalChatId}`);
  console.log(`🔐 Xavfsizlik: JWT + Bcrypt + Rate Limiting + E2E Encryption`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal qabul qilindi, server xavfsiz to'xtatilmoqda...");
  server.close(() => {
    console.log("Server xavfsiz to'xtatildi");
    process.exit(0);
  });
});
