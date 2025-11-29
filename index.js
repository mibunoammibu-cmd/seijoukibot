// index.js

// 1. .env 読み込み
require("dotenv").config();

const path = require("path");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const { Client, GatewayIntentBits, Events } = require("discord.js");

// 3. .env からトークンなど取得
const token = process.env.DISCORD_TOKEN;

// 4. Client 作成
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// 重み付きランダム
function randomWeightedItem(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of items) {
    if (r < item.weight) {
      return item;
    }
    r -= item.weight;
  }
  return items[items.length - 1];
}

// VCに入って音を流して抜ける共通関数
async function playInUserVoiceChannel(message, fileName, replyText) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    await message.reply("そんなことはない");
    return;
  }

  const filePath = path.join(__dirname, fileName);
  console.log("再生ファイル:", filePath);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  const player = createAudioPlayer();

  player.on("stateChange", (oldState, newState) => {
    console.log(`Player state: ${oldState.status} -> ${newState.status}`);
  });

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("再生終了、VCから退出します");
    connection.destroy();
  });

  player.on("error", error => {
    console.error("再生中にエラー:", error);
    connection.destroy();
  });

  const resource = createAudioResource(filePath, {
    inlineVolume: true
});

  // 音量を 30% に設定
  resource.volume.setVolume(0.1);
  connection.subscribe(player);
  player.play(resource);

  if (replyText) {
    await message.reply(replyText);
  }
}

// 5. ログイン完了時
client.once(Events.ClientReady, readyClient => {
  console.log(`ログイン完了: ${readyClient.user.tag}`);
});

// -------------------------
//  レート制限（1分で10回まで）
// -------------------------
const rateLimitLog = []; // 反応したタイムスタンプを保存

function canRespond() {
  const now = Date.now();

  // 1分以内のログだけ残す
  const oneMinuteAgo = now - 60 * 1000;
  while (rateLimitLog.length && rateLimitLog[0] < oneMinuteAgo) {
    rateLimitLog.shift(); // 古いやつ削除
  }

  // 10回以内ならOK
  if (rateLimitLog.length < 10) {
    rateLimitLog.push(now);
    return true;
  }

  // 10回超えてたら拒否
  return false;
}

// 6. メッセージハンドラ
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

    // レート制限チェック（1分で10回まで）
  if (!canRespond()) {
    // 必要なら無言で無視
    return;

    // もしくは軽い注意メッセージを入れるならこんな感じ（任意）
    // await message.reply("反応しすぎなので少し休みます");
    // return;
  }


  // コマンドリスト（!help）
  if (message.content === "!help") {
    const helpMessage = [
      "空気清浄機くんbot コマンドリスト",
      "",
      "【VC系コマンド】",
      "・空気悪くね？ → 中換気",
      "・ちょっと空気悪くね？ → 弱換気",
      "・めっちゃ空気悪くね？ → 強換気",
      "",
      "【テキスト反応】",
      "・ちんぽ（含む） → ナイスちんぽ",
      "・!おみくじ → 凶か大凶が出る",
      "",
      "短時間に大量のコマンド送信を受けると一時停止します",
    
    ].join("\n");

    await message.reply("```" + helpMessage + "```");
    return;
  }

  if (message.content.includes("つかう")) {
  // カスタム絵文字IDを直接指定
  await message.react("1442771448673599628"); // カスタム絵文字ID
  return;
}

  if (message.content.includes("使う")) {
  // カスタム絵文字IDを直接指定
  await message.react("1442771448673599628"); // カスタム絵文字ID
  return;
}

  if (message.content.includes("つかっ")) {
  // カスタム絵文字IDを直接指定
  await message.react("1442771448673599628"); // カスタム絵文字ID
  return;
}

  if (message.content.includes("使っ")) {
  // カスタム絵文字IDを直接指定
  await message.react("1442771448673599628"); // カスタム絵文字ID
  return;
}



  // 「ちんぽ」が含まれていたら重み付きランダム返信
  if (message.content.includes("ちんぽ")) {
    const helloReplies = [
      { text: "ナイスちんぽ", weight: 98 },
      { text: "だまれ", weight: 2 },
    ];

    const choice = randomWeightedItem(helloReplies);
    await message.reply(choice.text);
    return;
  }

  // おみくじコマンド
  if (message.content === "!おみくじ") {
    const omikuji = [
      { text: "凶", weight: 98 },
      { text: "大凶", weight: 2 },
    ];

    const choice = randomWeightedItem(omikuji);
    await message.reply(choice.text);
    return;
  }

  // 1つ目: 空気悪くね？
  if (message.content === "空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_M.wav", "換気するか");
    return;
  }

  // 2つ目: ちょっと空気悪くね？
  if (message.content === "ちょっと空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_L.wav", "ちょっと換気するか");
    return;
  }

  // 3つ目: めっちゃ空気悪くね？
  if (message.content === "めっちゃ空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_H.wav", "めっちゃ換気するか");
    return;
  }

  // 他の条件分岐があればこの下に追加
});

// 7. 最後にログイン
client.login(token);
