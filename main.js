const TelegramBot = require('node-telegram-bot-api');

// [1] Votre token
const BOT_TOKEN = 'VOTRE_BOT_TOKEN_ICI';

// [2] ID de l'admin
const ADMIN_CHAT_ID = 1567991274;

// [3] GIF de bienvenue commun
const WELCOME_GIF = 'https://i.imgur.com/B1oETys.gif';

// [4] GIF par langue
const GIFS_LANG = {
  fr: 'https://i.imgur.com/LUFaQ9t.gif',
  en: 'https://i.imgur.com/9zItIm0.gif',
  zh: 'https://i.imgur.com/per4yrO.gif',
  ru: 'https://i.imgur.com/w2WvY20.gif'
};

// [5] Textes par langue
const TEXTS = {
  fr: {
    welcomeProject: "Choisissez le projet :",
    questionScama: "Quel projet Scama souhaitez-vous faire ? (Réponse libre)",
    questionLetter: "Quel type de Letter souhaitez-vous faire ? (Réponse libre)",
    questionBot: "Quel Bot souhaitez-vous faire et quel type de Bot ? (Réponse libre)",
    final: "Merci ! Pour plus d'informations, contactez-moi : @jsakai_off"
  },
  en: {
    welcomeProject: "Choose your project:",
    questionScama: "Which Scama project do you want? (free answer)",
    questionLetter: "Which Letter project do you want? (free answer)",
    questionBot: "Which Bot project do you want? (free answer)",
    final: "Thanks! For more info, contact me: @jsakai_off"
  },
  zh: {
    welcomeProject: "请选择项目：",
    questionScama: "你想做什么Scama项目？(自由回答)",
    questionLetter: "你想做什么Letter项目？(自由回答)",
    questionBot: "你想做什么Bot项目？(自由回答)",
    final: "谢谢！更多信息请联系：@jsakai_off"
  },
  ru: {
    welcomeProject: "Выберите проект:",
    questionScama: "Какой проект Scama вы хотите? (свободный ответ)",
    questionLetter: "Какой проект Letter вы хотите? (свободный ответ)",
    questionBot: "Какой проект Bot вы хотите? (свободный ответ)",
    final: "Спасибо! По дополнительной информации свяжитесь со мной: @jsakai_off"
  }
};

const userStates = {};

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ---------------------------------------------------------------------
// 1) /start => GIF + choix de langue DANS UN SEUL MESSAGE
// ---------------------------------------------------------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || "Utilisateur";

  // Notifier l'admin
  await bot.sendMessage(
    ADMIN_CHAT_ID,
    `Nouvel utilisateur : ${userName} (chat_id: ${chatId}) a démarré le bot.`
  );

  // Envoyer le GIF avec le message
  await bot.sendAnimation(chatId, WELCOME_GIF, {
    caption: "Choisissez votre langue / Choose your language :",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Français", callback_data: "lang_fr" },
          { text: "English",  callback_data: "lang_en" }
        ],
        [
          { text: "中文",    callback_data: "lang_zh" },
          { text: "Русский", callback_data: "lang_ru" }
        ]
      ]
    }
  });
});

// ---------------------------------------------------------------------
// 2) callback_query => gère le choix de langue + projet dans un seul message
// ---------------------------------------------------------------------
bot.on('callback_query', async (callbackQuery) => {
  const data   = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const msgId  = callbackQuery.message.message_id;

  // 2.1) Si choix de la langue
  if (data.startsWith("lang_")) {
    const chosenLang = data.split("_")[1];

    // Supprimer l'ancien clavier
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: msgId
    });

    // Stocker la langue choisie
    userStates[chatId] = {
      language: chosenLang,
      projectChosen: null,
      awaitingAnswer: false,
      answers: []
    };

    // Envoyer le GIF + question projet DANS UN SEUL MESSAGE
    await bot.sendAnimation(chatId, GIFS_LANG[chosenLang], {
      caption: TEXTS[chosenLang].welcomeProject,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Scama",  callback_data: "proj_scama" },
            { text: "Letter", callback_data: "proj_letter" },
            { text: "Bot",    callback_data: "proj_bot" }
          ]
        ]
      }
    });
  }
  // 2.2) Si choix du projet (Scama / Letter / Bot)
  else if (data.startsWith("proj_")) {
    const project = data.split("_")[1];
    const state = userStates[chatId];
    if (!state) return;

    // Supprimer l'ancien clavier
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: msgId
    });

    // Stocker le projet
    state.projectChosen = project;

    // Envoyer le GIF + Question DANS UN SEUL MESSAGE
    let gif = GIFS_LANG[state.language] || WELCOME_GIF;
    let question = "";

    if (project === "scama") {
      question = TEXTS[state.language].questionScama;
    } else if (project === "letter") {
      question = TEXTS[state.language].questionLetter;
    } else if (project === "bot") {
      question = TEXTS[state.language].questionBot;
    }

    await bot.sendAnimation(chatId, gif, { caption: question });

    // On attend la réponse en texte libre
    state.awaitingAnswer = true;
  }
});

// ---------------------------------------------------------------------
// 3) on('message') => Stocke la réponse et envoie le message final
// ---------------------------------------------------------------------
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text || "";

  // Vérifier si on attend une réponse
  if (!userStates[chatId] || !userStates[chatId].awaitingAnswer) return;

  const state = userStates[chatId];

  // Stocker la réponse
  state.answers.push(text);

  // Envoyer le message final
  bot.sendMessage(chatId, TEXTS[state.language].final);

  // Notifier l'admin
  const answersJoined = state.answers.join(" | ");
  bot.sendMessage(
    ADMIN_CHAT_ID,
    `Utilisateur (chat_id: ${chatId})\nLangue: ${state.language}\nProjet: ${state.projectChosen}\nRéponse: ${answersJoined}`
  );

  // Fin du process pour cet utilisateur
  delete userStates[chatId];
});

console.log("Bot lancé : en attente des interactions...");
