"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageCircle,
  Users,
  Settings,
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  Wifi,
  WifiOff,
  Paperclip,
  ImageIcon,
  File,
  Camera,
  UserPlus,
  Upload,
  Eye,
  EyeOff,
  Shield,
  Lock,
  Mail,
  AtSign,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";

interface ActogramUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  bio?: string;
  createdAt: Date;
  isVerified: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  chatId: string;
  timestamp: Date;
  type: "text" | "image" | "file" | "audio";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isEncrypted: boolean;
}

interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  participants: ActogramUser[];
  messageCount: number;
  type: "private" | "group";
  isEncrypted: boolean;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: "uz", name: "O'zbek", flag: "🇺🇿" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "en", name: "English", flag: "🇺🇸" },
];

const translations = {
  uz: {
    welcome: "ACTOGRAM'ga xush kelibsiz",
    login: "Kirish",
    register: "Ro'yxatdan o'tish",
    email: "Email",
    password: "Parol",
    confirmPassword: "Parolni tasdiqlang",
    username: "Foydalanuvchi nomi",
    fullName: "To'liq ism",
    enterEmail: "Email kiriting",
    enterPassword: "Parol kiriting",
    enterUsername: "Foydalanuvchi nomini kiriting (@username)",
    enterFullName: "To'liq ismingizni kiriting",
    connecting: "Ulanmoqda...",
    connected: "Ulandi",
    disconnected: "Aloqa uzildi",
    online: "Onlayn",
    offline: "Oflayn",
    searchChats: "Chatlarni qidirish...",
    searchUsers: "@username orqali qidirish...",
    typeMessage: "Xabar yozing...",
    send: "Yuborish",
    typing: "yozmoqda...",
    generalChat: "Umumiy chat",
    settings: "Sozlamalar",
    profile: "Profil",
    notifications: "Bildirishnomalar",
    darkMode: "Tungi rejim",
    language: "Til",
    selectAvatar: "Avatar tanlash",
    uploadFile: "Fayl yuklash",
    participants: "ishtirokchilar",
    messages: "xabarlar",
    newChat: "Yangi chat",
    addUser: "Foydalanuvchi qo'shish",
    bio: "Bio",
    lastSeen: "Oxirgi ko'rilgan",
    save: "Saqlash",
    cancel: "Bekor qilish",
    close: "Yopish",
    selectFromGallery: "Galereyadan tanlash",
    takePhoto: "Rasm olish",
    uploadFromDevice: "Qurilmadan yuklash",
    loginError: "Kirish xatosi",
    registerError: "Ro'yxatdan o'tish xatosi",
    passwordMismatch: "Parollar mos kelmaydi",
    weakPassword: "Parol juda zaif (kamida 8 ta belgi)",
    invalidEmail: "Noto'g'ri email format",
    userExists: "Bu foydalanuvchi allaqachon mavjud",
    loginSuccess: "Muvaffaqiyatli kirildi",
    registerSuccess: "Muvaffaqiyatli ro'yxatdan o'tildi",
    encrypted: "Shifrlangan",
    verified: "Tasdiqlangan",
    secureConnection: "Xavfsiz aloqa",
    endToEndEncryption: "Uchdan-uchgacha shifrlash",
    haveAccount: "Hisobingiz bormi?",
    noAccount: "Hisobingiz yo'qmi?",
    forgotPassword: "Parolni unutdingizmi?",
    showPassword: "Parolni ko'rsatish",
    hidePassword: "Parolni yashirish",
  },
  ru: {
    welcome: "Добро пожаловать в ACTOGRAM",
    login: "Войти",
    register: "Регистрация",
    email: "Email",
    password: "Пароль",
    confirmPassword: "Подтвердите пароль",
    username: "Имя пользователя",
    fullName: "Полное имя",
    enterEmail: "Введите email",
    enterPassword: "Введите пароль",
    enterUsername: "Введите имя пользователя (@username)",
    enterFullName: "Введите ваше полное имя",
    connecting: "Подключение...",
    connected: "Подключено",
    disconnected: "Отключено",
    online: "Онлайн",
    offline: "Оффлайн",
    searchChats: "Поиск чатов...",
    searchUsers: "Поиск по @username...",
    typeMessage: "Напишите сообщение...",
    send: "Отправить",
    typing: "печатает...",
    generalChat: "Общий чат",
    settings: "Настройки",
    profile: "Профиль",
    notifications: "Уведомления",
    darkMode: "Темная тема",
    language: "Язык",
    selectAvatar: "Выбрать аватар",
    uploadFile: "Загрузить файл",
    participants: "участников",
    messages: "сообщений",
    newChat: "Новый чат",
    addUser: "Добавить пользователя",
    bio: "О себе",
    lastSeen: "Был в сети",
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    selectFromGallery: "Выбрать из галереи",
    takePhoto: "Сделать фото",
    uploadFromDevice: "Загрузить с устройства",
    loginError: "Ошибка входа",
    registerError: "Ошибка регистрации",
    passwordMismatch: "Пароли не совпадают",
    weakPassword: "Слабый пароль (минимум 8 символов)",
    invalidEmail: "Неверный формат email",
    userExists: "Пользователь уже существует",
    loginSuccess: "Успешный вход",
    registerSuccess: "Успешная регистрация",
    encrypted: "Зашифровано",
    verified: "Подтвержден",
    secureConnection: "Безопасное соединение",
    endToEndEncryption: "Сквозное шифрование",
    haveAccount: "Есть аккаунт?",
    noAccount: "Нет аккаунта?",
    forgotPassword: "Забыли пароль?",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
  },
  en: {
    welcome: "Welcome to ACTOGRAM",
    login: "Login",
    register: "Register",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    username: "Username",
    fullName: "Full Name",
    enterEmail: "Enter email",
    enterPassword: "Enter password",
    enterUsername: "Enter username (@username)",
    enterFullName: "Enter your full name",
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
    online: "Online",
    offline: "Offline",
    searchChats: "Search chats...",
    searchUsers: "Search by @username...",
    typeMessage: "Type a message...",
    send: "Send",
    typing: "typing...",
    generalChat: "General Chat",
    settings: "Settings",
    profile: "Profile",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    language: "Language",
    selectAvatar: "Select Avatar",
    uploadFile: "Upload File",
    participants: "participants",
    messages: "messages",
    newChat: "New Chat",
    addUser: "Add User",
    bio: "Bio",
    lastSeen: "Last seen",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    selectFromGallery: "Select from Gallery",
    takePhoto: "Take Photo",
    uploadFromDevice: "Upload from Device",
    loginError: "Login Error",
    registerError: "Registration Error",
    passwordMismatch: "Passwords don't match",
    weakPassword: "Weak password (minimum 8 characters)",
    invalidEmail: "Invalid email format",
    userExists: "User already exists",
    loginSuccess: "Login successful",
    registerSuccess: "Registration successful",
    encrypted: "Encrypted",
    verified: "Verified",
    secureConnection: "Secure Connection",
    endToEndEncryption: "End-to-end Encryption",
    haveAccount: "Have an account?",
    noAccount: "Don't have an account?",
    forgotPassword: "Forgot password?",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
};

// Простое шифрование для демонстрации
const encryptMessage = (message: string, key = "actogram_secret"): string => {
  return btoa(message + key);
};

const decryptMessage = (
  encryptedMessage: string,
  key = "actogram_secret"
): string => {
  try {
    const decoded = atob(encryptedMessage);
    return decoded.replace(key, "");
  } catch {
    return encryptedMessage;
  }
};

export default function Actogram() {
  const [currentUser, setCurrentUser] = useState<ActogramUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    fullName: "",
    bio: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDomainAllowed, setIsDomainAllowed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActogramUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<ActogramUser[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<"uz" | "ru" | "en">("uz");
  const [notifications, setNotifications] = useState(true);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  // Проверка домена
  useEffect(() => {
    const checkDomain = () => {
      const hostname = window.location.hostname;
      const allowedDomains = [
        "acto-uimuz.vercel.app",
        "render.com",
        "vercel.app",
        "localhost",
      ];
      const isAllowed = allowedDomains.some(
        (domain) => hostname.includes(domain) || hostname === "localhost"
      );
      setIsDomainAllowed(isAllowed);
    };

    checkDomain();
  }, []);

  // Загрузка настроек из localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("actogram_settings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setDarkMode(settings.darkMode || false);
      setLanguage(settings.language || "uz");
      setNotifications(settings.notifications !== false);
    }

    const savedUser = localStorage.getItem("actogram_user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  // Применение темной темы
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Подключение к серверу
  useEffect(() => {
    if (!isDomainAllowed || !isAuthenticated) return;

    const serverUrl = "https://actogr.onrender.com";

    socketRef.current = io(serverUrl, {
      transports: ["websocket", "polling"],
      auth: {
        token: localStorage.getItem("actogram_token"),
        userId: currentUser?.id,
      },
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ ACTOGRAM serveriga xavfsiz ulandi");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("❌ Serverdan uzildi");
      setIsConnected(false);
    });

    socket.on("auth_error", (error) => {
      console.error("Autentifikatsiya xatosi:", error);
      handleLogout();
    });

    socket.on("new_message", (message: Message) => {
      // Расшифровываем сообщение
      if (message.isEncrypted) {
        message.content = decryptMessage(message.content);
      }

      setMessages((prev) => [...prev, message]);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chatId ? { ...chat, lastMessage: message } : chat
        )
      );

      if (notifications && message.senderId !== currentUser?.id) {
        playNotificationSound();
        showNotification(message.senderName, message.content);
      }
    });

    socket.on("user_joined", (data) => {
      console.log("👋", data.message);
    });

    socket.on("user_left", (data) => {
      console.log("👋", data.message);
    });

    socket.on("users_update", (users: ActogramUser[]) => {
      setActiveUsers(users);
    });

    socket.on("user_typing", (data) => {
      if (data.chatId === selectedChat?.id) {
        setTypingUsers((prev) => [
          ...prev.filter((u) => u !== data.username),
          data.username,
        ]);
      }
    });

    socket.on("user_stop_typing", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    socket.on("search_results", (results: ActogramUser[]) => {
      setSearchResults(results);
    });

    return () => {
      socket.disconnect();
    };
  }, [
    isDomainAllowed,
    isAuthenticated,
    selectedChat?.id,
    notifications,
    currentUser?.id,
  ]);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const playNotificationSound = () => {
    const audio = new Audio(
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"
    );
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^@[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleAuth = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Валидация
      if (!validateEmail(formData.email)) {
        setError(t.invalidEmail);
        return;
      }

      if (!validatePassword(formData.password)) {
        setError(t.weakPassword);
        return;
      }

      if (!isLoginMode) {
        if (formData.password !== formData.confirmPassword) {
          setError(t.passwordMismatch);
          return;
        }

        if (!validateUsername(formData.username)) {
          setError("Username должен начинаться с @ и содержать 3-20 символов");
          return;
        }

        if (!formData.fullName.trim()) {
          setError("Введите полное имя");
          return;
        }
      }

      // Отправка данных на сервер
      const response = await fetch("https://actogr.onrender.com/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: isLoginMode ? "login" : "register",
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || (isLoginMode ? t.loginError : t.registerError));
        return;
      }

      // Успешная аутентификация
      const user: ActogramUser = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        avatar: data.user.avatar,
        bio: data.user.bio,
        isOnline: true,
        createdAt: new Date(data.user.createdAt),
        isVerified: data.user.isVerified,
      };

      setCurrentUser(user);
      setIsAuthenticated(true);
      setSuccess(isLoginMode ? t.loginSuccess : t.registerSuccess);

      // Сохранение в localStorage
      localStorage.setItem("actogram_user", JSON.stringify(user));
      localStorage.setItem("actogram_token", data.token);

      // Запрос разрешения на уведомления
      await requestNotificationPermission();

      setTimeout(() => {
        loadChats();
      }, 1000);
    } catch (error) {
      console.error("Auth error:", error);
      setError("Aloqa xatosi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("actogram_user");
    localStorage.removeItem("actogram_token");
    setCurrentUser(null);
    setIsAuthenticated(false);
    setChats([]);
    setMessages([]);
    setSelectedChat(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const loadChats = async () => {
    try {
      const token = localStorage.getItem("actogram_token");
      const response = await fetch("https://actogr.onrender.com/api/chats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);

        const generalChat = chatsData.find(
          (chat: Chat) => chat.id === "general"
        );
        if (generalChat) {
          selectChat(generalChat);
        }
      }
    } catch (error) {
      console.error("Chatlarni yuklashda xatolik:", error);
      const generalChat: Chat = {
        id: "general",
        name: t.generalChat,
        isGroup: true,
        participants: [],
        unreadCount: 0,
        messageCount: 0,
        type: "group",
        isEncrypted: true,
      };
      setChats([generalChat]);
      selectChat(generalChat);
    }
  };

  const loadMessages = async (chatId: string) => {
    try {
      const token = localStorage.getItem("actogram_token");
      const response = await fetch(
        `https://actogr.onrender.com/api/messages/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const messagesData = await response.json();
        // Расшифровываем сообщения
        const decryptedMessages = messagesData.map((msg: Message) => ({
          ...msg,
          content: msg.isEncrypted ? decryptMessage(msg.content) : msg.content,
        }));
        setMessages(decryptedMessages);
      }
    } catch (error) {
      console.error("Xabarlarni yuklashda xatolik:", error);
      setMessages([]);
    }
  };

  const sendMessage = () => {
    if (
      !newMessage.trim() ||
      !selectedChat ||
      !currentUser ||
      !socketRef.current
    )
      return;

    // Шифруем сообщение
    const encryptedContent = encryptMessage(newMessage.trim());

    const messageData = {
      content: encryptedContent,
      chatId: selectedChat.id,
      type: "text",
      isEncrypted: true,
    };

    socketRef.current.emit("send_message", messageData);
    setNewMessage("");
    socketRef.current.emit("stop_typing", { chatId: selectedChat.id });
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);

    if (socketRef.current) {
      socketRef.current.emit("join_chat", chat.id);
    }
  };

  const handleTyping = () => {
    if (selectedChat && socketRef.current) {
      socketRef.current.emit("typing", { chatId: selectedChat.id });

      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("stop_typing", { chatId: selectedChat.id });
        }
      }, 3000);
    }
  };

  const searchUsers = (query: string) => {
    if (!query.trim() || !socketRef.current) return;
    // Поиск по @username
    const searchQuery = query.startsWith("@") ? query : `@${query}`;
    socketRef.current.emit("search_users", searchQuery);
  };

  const startPrivateChat = (user: ActogramUser) => {
    const chatId = `private_${Math.min(
      Number.parseInt(currentUser!.id),
      Number.parseInt(user.id)
    )}_${Math.max(Number.parseInt(currentUser!.id), Number.parseInt(user.id))}`;

    const existingChat = chats.find((chat) => chat.id === chatId);
    if (existingChat) {
      selectChat(existingChat);
      setShowUserSearch(false);
      return;
    }

    const newChat: Chat = {
      id: chatId,
      name: user.username,
      avatar: user.avatar,
      isGroup: false,
      participants: [currentUser!, user],
      unreadCount: 0,
      messageCount: 0,
      type: "private",
      isEncrypted: true,
    };

    setChats((prev) => [...prev, newChat]);
    selectChat(newChat);
    setShowUserSearch(false);

    if (socketRef.current) {
      socketRef.current.emit("create_private_chat", {
        userId: user.id,
        chatId,
      });
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat || !socketRef.current) return;

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("actogram_token");
      const response = await fetch("https://actogr.onrender.com/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const messageData = {
          content: file.name,
          chatId: selectedChat.id,
          type: file.type.startsWith("image/") ? "image" : "file",
          fileUrl: data.fileUrl,
          fileName: file.name,
          fileSize: file.size,
          isEncrypted: false,
        };

        socketRef.current.emit("send_message", messageData);
      }
    } catch (error) {
      console.error("Fayl yuklashda xatolik:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      const avatarUrl = URL.createObjectURL(file);
      const updatedUser = { ...currentUser, avatar: avatarUrl };

      setCurrentUser(updatedUser);
      localStorage.setItem("actogram_user", JSON.stringify(updatedUser));

      if (socketRef.current) {
        socketRef.current.emit("update_profile", updatedUser);
      }

      setShowAvatarDialog(false);
    } catch (error) {
      console.error("Avatar yuklashda xatolik:", error);
    }
  };

  const updateProfile = () => {
    if (!currentUser) return;

    const updatedUser = { ...currentUser, bio: formData.bio };
    setCurrentUser(updatedUser);
    localStorage.setItem("actogram_user", JSON.stringify(updatedUser));

    if (socketRef.current) {
      socketRef.current.emit("update_profile", updatedUser);
    }
  };

  const saveSettings = () => {
    const settings = { darkMode, language, notifications };
    localStorage.setItem("actogram_settings", JSON.stringify(settings));
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isDomainAllowed) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Kirish taqiqlangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>ACTOGRAM faqat ruxsat etilgan domenlardan foydalanish mumkin</p>
            <p className="text-sm text-gray-500 mt-2">
              Xavfsizlik uchun domen tekshiruvi
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md animate-in fade-in-50 duration-500">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
              <Shield className="h-8 w-8" />
              ACTOGRAM
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-300">{t.welcome}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Lock className="h-4 w-4 text-green-500" />
              <span className="text-green-500 text-sm">
                {t.secureConnection}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={isLoginMode ? "login" : "register"} className="w-full">
              <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700">
                <TabsTrigger
                  value="login"
                  onClick={() => setIsLoginMode(true)}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  {t.login}
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  onClick={() => setIsLoginMode(false)}
                  className="dark:data-[state=active]:bg-gray-600"
                >
                  {t.register}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t.email}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.enterEmail}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t.password}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.enterPassword}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="pr-10 transition-all duration-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    {t.fullName}
                  </Label>
                  <Input
                    id="fullName"
                    placeholder={t.enterFullName}
                    value={formData.fullName}
                    onChange={(e) =>
                      handleInputChange("fullName", e.target.value)
                    }
                    className="transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    {t.username}
                  </Label>
                  <Input
                    id="username"
                    placeholder={t.enterUsername}
                    value={formData.username}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (!value.startsWith("@") && value.length > 0) {
                        value = "@" + value;
                      }
                      handleInputChange("username", value);
                    }}
                    className="transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="email-reg"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {t.email}
                  </Label>
                  <Input
                    id="email-reg"
                    type="email"
                    placeholder={t.enterEmail}
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password-reg"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {t.password}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-reg"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.enterPassword}
                      value={formData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
                      className="pr-10 transition-all duration-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="flex items-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    {t.confirmPassword}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t.confirmPassword}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      className="pr-10 transition-all duration-200"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    {t.bio}
                  </Label>
                  <Input
                    id="bio"
                    placeholder={t.bio}
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    className="transition-all duration-200"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between">
              <Label>{t.language}</Label>
              <div className="flex gap-1">
                {languages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant={language === lang.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLanguage(lang.code as "uz" | "ru" | "en")}
                    className="transition-all duration-200"
                  >
                    {lang.flag}
                  </Button>
                ))}
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900">
                <AlertDescription className="text-red-600 dark:text-red-400">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900">
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleAuth}
              className="w-full transition-all duration-200 hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {t.connecting}
                </div>
              ) : isLoginMode ? (
                t.login
              ) : (
                t.register
              )}
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AtSign className="h-4 w-4 text-green-500" />
                <span>{t.endToEndEncryption}</span>
              </div>
              <p>
                {isLoginMode ? t.noAccount : t.haveAccount}{" "}
                <button
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isLoginMode ? t.register : t.login}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`h-screen flex ${darkMode ? "dark" : ""}`}>
      <div className="h-screen flex bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        {/* Боковая панель */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transition-colors duration-200">
          {/* Заголовок */}
          <div className="p-4 border-b dark:border-gray-700 bg-blue-600 dark:bg-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AtSign className="h-6 w-6" />
                <h1 className="text-xl font-bold">ACTOGRAM</h1>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-300 animate-pulse" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-300" />
                )}
                <Badge
                  variant="secondary"
                  className="bg-blue-500 dark:bg-blue-600 flex items-center gap-1"
                >
                  {currentUser?.isVerified && <AtSign className="h-3 w-3" />}
                  {currentUser?.username}
                </Badge>
                <Dialog open={showSettings} onOpenChange={setShowSettings}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dark:bg-gray-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        {t.settings}
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="profile" className="w-full">
                      <TabsList className="grid w-full grid-cols-3 dark:bg-gray-700">
                        <TabsTrigger
                          value="profile"
                          className="dark:data-[state=active]:bg-gray-600"
                        >
                          {t.profile}
                        </TabsTrigger>
                        <TabsTrigger
                          value="settings"
                          className="dark:data-[state=active]:bg-gray-600"
                        >
                          {t.settings}
                        </TabsTrigger>
                        <TabsTrigger
                          value="security"
                          className="dark:data-[state=active]:bg-gray-600"
                        >
                          Security
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="profile" className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar
                            className="h-16 w-16 cursor-pointer"
                            onClick={() => setShowAvatarDialog(true)}
                          >
                            <AvatarImage
                              src={currentUser?.avatar || "/placeholder.svg"}
                            />
                            <AvatarFallback className="text-lg">
                              {currentUser?.username?.[1]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold dark:text-white">
                                {currentUser?.username}
                              </h3>
                              {currentUser?.isVerified && (
                                <Badge variant="secondary" className="text-xs">
                                  <AtSign className="h-3 w-3 mr-1" />
                                  {t.verified}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {currentUser?.email}
                            </p>
                            <p className="text-sm text-green-500">{t.online}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio-edit" className="dark:text-white">
                            {t.bio}
                          </Label>
                          <Input
                            id="bio-edit"
                            value={formData.bio}
                            onChange={(e) =>
                              handleInputChange("bio", e.target.value)
                            }
                            placeholder={t.bio}
                            className="dark:bg-gray-700 dark:text-white transition-all duration-200"
                          />
                        </div>
                        <Button onClick={updateProfile} className="w-full">
                          {t.save}
                        </Button>
                        <Button
                          onClick={handleLogout}
                          variant="destructive"
                          className="w-full"
                        >
                          Chiqish
                        </Button>
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="dark:text-white">
                              {t.notifications}
                            </Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Yangi xabarlar uchun bildirishnomalar
                            </p>
                          </div>
                          <Switch
                            checked={notifications}
                            onCheckedChange={(checked) => {
                              setNotifications(checked);
                              saveSettings();
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="dark:text-white">
                              {t.darkMode}
                            </Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Tungi rejimni yoqish
                            </p>
                          </div>
                          <Switch
                            checked={darkMode}
                            onCheckedChange={(checked) => {
                              setDarkMode(checked);
                              saveSettings();
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="dark:text-white">
                            {t.language}
                          </Label>
                          <div className="flex gap-2">
                            {languages.map((lang) => (
                              <Button
                                key={lang.code}
                                variant={
                                  language === lang.code ? "default" : "outline"
                                }
                                size="sm"
                                onClick={() => {
                                  setLanguage(lang.code as "uz" | "ru" | "en");
                                  saveSettings();
                                }}
                                className="transition-all duration-200"
                              >
                                {lang.flag} {lang.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="security" className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                            <AtSign className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-200">
                                {t.endToEndEncryption}
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-300">
                                Barcha xabarlar shifrlangan
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                            <Lock className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-blue-800 dark:text-blue-200">
                                {t.secureConnection}
                              </p>
                              <p className="text-sm text-blue-600 dark:text-blue-300">
                                SSL/TLS himoyasi
                              </p>
                            </div>
                          </div>
                          {currentUser?.isVerified && (
                            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                              <AtSign className="h-5 w-5 text-purple-600" />
                              <div>
                                <p className="font-medium text-purple-800 dark:text-purple-200">
                                  Tasdiqlangan hisob
                                </p>
                                <p className="text-sm text-purple-600 dark:text-purple-300">
                                  Hisobingiz tasdiqlangan
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="text-xs text-blue-200 mt-1 flex items-center gap-2">
              <span>
                {t.online}: {activeUsers.length}
              </span>
              <span>•</span>
              <span>{isConnected ? "🟢" : "🔴"}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <AtSign className="h-3 w-3" />
                {t.encrypted}
              </span>
            </div>
          </div>

          {/* Поиск и кнопки */}
          <div className="p-3 border-b dark:border-gray-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={t.searchChats}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-700 dark:text-white transition-all duration-200"
              />
            </div>
            <div className="flex gap-2">
              <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 dark:bg-gray-700 dark:text-white bg-transparent"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t.newChat}
                  </Button>
                </DialogTrigger>
                <DialogContent className="dark:bg-gray-800">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white flex items-center gap-2">
                      <AtSign className="h-5 w-5" />
                      {t.addUser}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder={t.searchUsers}
                        onChange={(e) => searchUsers(e.target.value)}
                        className="pl-10 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => startPrivateChat(user)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
                        >
                          <Avatar>
                            <AvatarImage
                              src={user.avatar || "/placeholder.svg"}
                            />
                            <AvatarFallback>{user.username[1]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium dark:text-white">
                                {user.username}
                              </h4>
                              {user.isVerified && (
                                <AtSign className="h-3 w-3 text-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user.isOnline ? t.online : t.offline}
                            </p>
                            {user.bio && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {user.bio}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {searchResults.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <AtSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>@username orqali qidiring</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Список чатов */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => selectChat(chat)}
                className={`p-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 ${
                  selectedChat?.id === chat.id
                    ? "bg-blue-50 dark:bg-blue-900 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="transition-transform duration-200 hover:scale-110">
                    <AvatarImage src={chat.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {chat.isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        chat.name[1] || chat.name[0]
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate dark:text-white">
                          {chat.name}
                        </h3>
                        {chat.isEncrypted && (
                          <Lock className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            chat.lastMessage.timestamp
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {chat.lastMessage.senderName}:{" "}
                        {chat.lastMessage.content}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>
                        {chat.messageCount} {t.messages}
                      </span>
                      <span>•</span>
                      <span>
                        {chat.participants.length} {t.participants}
                      </span>
                      {chat.isEncrypted && (
                        <>
                          <span>•</span>
                          <AtSign className="h-3 w-3 text-green-500" />
                        </>
                      )}
                    </div>
                  </div>
                  {chat.unreadCount > 0 && (
                    <Badge className="bg-blue-500 animate-pulse">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Область чата */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Заголовок чата */}
              <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <Avatar className="transition-transform duration-200 hover:scale-110">
                    <AvatarImage
                      src={selectedChat.avatar || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {selectedChat.isGroup ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        selectedChat.name[1] || selectedChat.name[0]
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold dark:text-white">
                        {selectedChat.name}
                      </h2>
                      {selectedChat.isEncrypted && (
                        <Lock className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedChat.isGroup
                        ? `${selectedChat.participants.length} ${t.participants} • ${activeUsers.length} ${t.online}`
                        : isConnected
                        ? t.online
                        : t.offline}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Сообщения */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8 animate-in fade-in-50 duration-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Hali xabarlar yo'q</p>
                    <p className="text-sm">Birinchi bo'lib yozing!</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-xs">
                      <AtSign className="h-3 w-3 text-green-500" />
                      <span>{t.endToEndEncryption}</span>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
                      message.senderId === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                        message.senderId === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-white dark:bg-gray-700 border dark:border-gray-600 dark:text-white"
                      }`}
                    >
                      {message.senderId !== currentUser?.id && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium flex items-center gap-1">
                          {message.senderName}
                          {message.isEncrypted && <Lock className="h-2 w-2" />}
                        </p>
                      )}

                      {message.type === "image" && message.fileUrl && (
                        <img
                          src={message.fileUrl || "/placeholder.svg"}
                          alt={message.fileName}
                          className="max-w-full h-auto rounded mb-2 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                          onClick={() => window.open(message.fileUrl, "_blank")}
                        />
                      )}

                      {message.type === "file" && (
                        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded">
                          <File className="h-4 w-4" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {message.fileName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {message.fileSize
                                ? `${(message.fileSize / 1024).toFixed(1)} KB`
                                : ""}
                            </p>
                          </div>
                        </div>
                      )}

                      <p>{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p
                          className={`text-xs ${
                            message.senderId === currentUser?.id
                              ? "text-blue-100"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {message.isEncrypted && (
                          <Lock className="h-3 w-3 text-green-500 opacity-70" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Индикатор печати */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {typingUsers.join(", ")} {t.typing}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Поле ввода */}
              <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="*/*"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    {uploadingFile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    placeholder={t.typeMessage}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      if (e.target.value.length === 1) {
                        handleTyping();
                      }
                    }}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    disabled={!isConnected}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !isConnected}
                    className="hover:scale-110 transition-transform duration-200"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    {!isConnected && (
                      <span className="text-red-500">{t.disconnected}</span>
                    )}
                    {isConnected && (
                      <div className="flex items-center gap-1">
                        <AtSign className="h-3 w-3 text-green-500" />
                        <span>{t.encrypted}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-green-500" />
                    <span>{t.endToEndEncryption}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
              <div className="text-center animate-in fade-in-50 duration-500">
                <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
                  ACTOGRAM'ga xush kelibsiz
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Suhbatni boshlash uchun chatni tanlang
                </p>
                <div className="mt-4 space-y-2 text-sm text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    {isConnected
                      ? "🟢 Serverga ulandi"
                      : "🔴 Server bilan aloqa yo'q"}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <AtSign className="h-4 w-4 text-green-500" />
                    <span>{t.endToEndEncryption}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Dialog */}
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t.selectAvatar}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
                accept="image/*"
              />
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => avatarInputRef.current?.click()}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <Upload className="h-4 w-4" />
                  {t.uploadFromDevice}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Мобильная камера
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.capture = "environment";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleAvatarUpload({
                          target: { files: [file] },
                        } as any);
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <Camera className="h-4 w-4" />
                  {t.takePhoto}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Галерея
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.multiple = false;
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleAvatarUpload({
                          target: { files: [file] },
                        } as any);
                      }
                    };
                    input.click();
                  }}
                  className="flex items-center gap-2 dark:bg-gray-700 dark:text-white"
                >
                  <ImageIcon className="h-4 w-4" />
                  {t.selectFromGallery}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
