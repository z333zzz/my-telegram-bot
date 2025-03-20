const TelegramBot = require('node-telegram-bot-api');

// [1] Votre token
const BOT_TOKEN = '7912803547:AAH3bbL5pP6Av8s1BVqQWG1gvzamxYJje88';

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
//    - welcomeProject: le message qui propose Scama, Letter, Bot
//    - questionScama: question unique pour Scama
//    - questionLetter: question unique pour Letter
//    - questionBot: question unique pour Bot
//    - final: message final
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

// ---------------------------------------------------------------------
// userStates[chatId] = {
//   language: 'fr'|'en'|'zh'|'ru',
//   projectChosen: 'scama'|'letter'|'bot'| null,
//   awaitingAnswer: boolean, // pour savoir si on attend le texte libre
//   answers: []
// }
// ---------------------------------------------------------------------
const userStates = {};

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ---------------------------------------------------------------------
// 1) /start => GIF commun + choix de langue
// ---------------------------------------------------------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || "Utilisateur";

  // Envoyer GIF commun
  await bot.sendAnimation(chatId, WELCOME_GIF);

  // Notifier l'admin
  await bot.sendMessage(
    ADMIN_CHAT_ID,
    `Nouvel utilisateur : ${userName} (chat_id: ${chatId}) a démarré le bot.`
  );

  // Proposer la langue
  await bot.sendMessage(chatId, "Choisissez votre langue / Choose your language:", {
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
// 2) callback_query => gère le choix de langue OU le choix de projet
// ---------------------------------------------------------------------
bot.on('callback_query', async (callbackQuery) => {
  const data   = callbackQuery.data;          // ex: "lang_fr", "proj_scama"
  const chatId = callbackQuery.message.chat.id;
  const msgId  = callbackQuery.message.message_id;

  // Si data = "lang_fr" / "lang_en" / ...
  if (data.startsWith("lang_")) {
    const chosenLang = data.split("_")[1]; // fr, en, zh, ru

    // Retirer le clavier des langues
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: msgId
    });

    // Envoyer GIF spécifique
    const gif = GIFS_LANG[chosenLang] || WELCOME_GIF;
    await bot.sendAnimation(chatId, gif);

    // Initialiser l'état
    userStates[chatId] = {
      language: chosenLang,
      projectChosen: null,
      awaitingAnswer: false,
      answers: []
    };

    // Proposer Scama, Letter, Bot
    await bot.sendMessage(chatId, TEXTS[chosenLang].welcomeProject, {
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
  // Sinon, data = "proj_scama" / "proj_letter" / "proj_bot"
  else if (data.startsWith("proj_")) {
    const project = data.split("_")[1]; // scama / letter / bot
    const state = userStates[chatId];
    if (!state) return;

    // Retirer le clavier "Scama, Letter, Bot"
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: msgId
    });

    // Stocker le projet
    state.projectChosen = project;

    // En fonction du projet, poser UNE question
    if (project === "scama") {
      bot.sendMessage(chatId, TEXTS[state.language].questionScama);
    } else if (project === "letter") {
      bot.sendMessage(chatId, TEXTS[state.language].questionLetter);
    } else if (project === "bot") {
      bot.sendMessage(chatId, TEXTS[state.language].questionBot);
    }

    // On attend la réponse en texte libre
    state.awaitingAnswer = true;
  }
});

// ---------------------------------------------------------------------
// 3) on('message') => si on attend la réponse libre (Scama / Letter / Bot)
// ---------------------------------------------------------------------
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text || "";

  // Si pas d'état, on ignore
  if (!userStates[chatId]) return;
  if (text.startsWith("/start")) return; // on ignore un nouveau /start

  const state = userStates[chatId];
  // Vérifier si on est en attente d'une réponse
  if (!state.awaitingAnswer) {
    // On ignore
    return;
  }

  // On stocke la réponse
  state.answers.push(text);

  // On envoie le message final
  bot.sendMessage(chatId, TEXTS[state.language].final);

  // Notifier l'admin
  const answersJoined = state.answers.join(" | ");
  bot.sendMessage(
    ADMIN_CHAT_ID,
    `Utilisateur (chat_id: ${chatId})\nLangue: ${state.language}\nProjet: ${state.projectChosen}\nRéponse: ${answersJoined}`
  );

  // Fin
  delete userStates[chatId];
});

console.log("Bot lancé : en attente des interactions...");