/* Приём анкет и меню бота. Секреты только в окружении хоста.
   BOT_TOKEN — токен BotFather
   RSVPS — хранилище KV со списком анкет и id чата администратора
*/

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    if (url.pathname === "/rsvp" && request.method === "POST") {
      return cors(await saveRsvp(request, env));
    }
    if (url.pathname === "/telegram" && request.method === "POST") {
      return handleTelegram(request, env);
    }
    return new Response("ok");
  }
};

async function saveRsvp(request, env) {
  var body;
  try { body = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  var name = clean(body.name);
  var attend = body.attend === "yes" ? "yes" : body.attend === "no" ? "no" : "";
  var pair = body.pair === "yes" ? "yes" : body.pair === "no" ? "no" : "";
  var companion = pair === "yes" ? clean(body.companion) : "";
  if (!name || !attend || !pair || (pair === "yes" && !companion)) return json({ ok: false }, 400);

  var list = await readList(env);
  var item = { name: name, attend: attend, pair: pair, companion: companion, at: new Date().toISOString() };
  list.push(item);
  await writeList(env, list);
  var admin = await env.RSVPS.get("admin");
  await sendTelegram(env, admin, formatOne(item, list.length - 1));
  return json({ ok: true }, 200);
}

async function handleTelegram(request, env) {
  var update;
  try { update = await request.json(); } catch (e) { return new Response("ok"); }
  var message = update.message;
  if (!message || !message.text || !message.chat) return new Response("ok");
  var chat = String(message.chat.id);
  var text = message.text.trim().toLowerCase();
  await env.RSVPS.put("admin", chat);
  var list = await readList(env);

  if (text === "/start" || text.indexOf("меню") !== -1) {
    await sendTelegram(env, chat, "Анкеты гостей. Выберите, что показать.", menu());
  } else if (text === "1" || text.indexOf("количество") !== -1) {
    await sendTelegram(env, chat, countText(list));
  } else if (text === "2" || text.indexOf("анкет") !== -1) {
    await sendChunks(env, chat, list.length ? list.map(shortLine).join("\n\n") : "Анкет пока нет.");
  } else if (text === "3" || text.indexOf("все") !== -1 || text.indexOf("открыть") !== -1) {
    await sendChunks(env, chat, list.length ? list.map(formatOne).join("\n\n") : "Сообщений пока нет.");
  } else {
    await sendTelegram(env, chat, "Напишите 1, 2 или 3.", menu());
  }
  return new Response("ok");
}

function menu() {
  return {
    keyboard: [["1 — Количество гостей"], ["2 — Анкеты"], ["3 — Открыть все сообщения"]],
    resize_keyboard: true
  };
}

function countText(list) {
  var coming = 0;
  var forms = 0;
  list.forEach(function (item) {
    if (item.attend !== "yes") return;
    forms += 1;
    coming += 1;
    if (item.pair === "yes" && item.companion) coming += 1;
  });
  return "Подтвердили присутствие: " + forms + " " + plural(forms, "анкета", "анкеты", "анкет") +
    ".\nВсего гостей: " + coming + ".";
}

function shortLine(item, index) {
  return (index + 1) + ". " + item.name + " — " + (item.attend === "yes" ? "будет" : "не сможет") +
    (item.pair === "yes" ? ", с парой: " + item.companion : "");
}

function formatOne(item, index) {
  var title = typeof index === "number" ? "Анкета " + (index + 1) : "Новая анкета";
  return title + "\nИмя: " + item.name +
    "\nПрисутствие: " + (item.attend === "yes" ? "Да, буду" : "К сожалению, не смогу") +
    "\nС парой: " + (item.pair === "yes" ? "Да" : "Нет") +
    (item.pair === "yes" ? "\nСопровождающий: " + item.companion : "");
}

async function sendChunks(env, chat, text) {
  var rest = text;
  while (rest.length) {
    var part = rest.slice(0, 3500);
    rest = rest.slice(3500);
    await sendTelegram(env, chat, part);
  }
}

async function sendTelegram(env, chat, text, replyMarkup) {
  if (!env.BOT_TOKEN || !chat) return;
  var payload = { chat_id: chat, text: text };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

async function readList(env) {
  var raw = await env.RSVPS.get("list");
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function writeList(env, list) {
  await env.RSVPS.put("list", JSON.stringify(list));
}

function clean(value) {
  return String(value || "").trim().slice(0, 80);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: { "Content-Type": "application/json" }
  });
}

function cors(response) {
  var headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "https://youngmud.github.io");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(response.body, { status: response.status, headers: headers });
}

function plural(value, one, few, many) {
  var n = Math.abs(value) % 100;
  var n1 = n % 10;
  if (n > 10 && n < 20) return many;
  if (n1 > 1 && n1 < 5) return few;
  if (n1 === 1) return one;
  return many;
}
