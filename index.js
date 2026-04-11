// index.js

require("dotenv").config();

const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Events } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@discordjs/voice");

// =======================
// 基本設定
// =======================
const token = process.env.DISCORD_TOKEN;
console.log("DISCORD_TOKEN 存在チェック:", token ? "OK" : "NG");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// =======================
// ポケモン崩壊ワード
// =======================
const pokeReplies = [
  "ケモチャンズ",
  "モンチャンズ",
  "ンチャンズ",
  "チャンズ",
  "ャンズ",
  "ンズ",
  "ケチャンピン",
  "モチャンピン",
  "ンチャンピン",
  "チャンピン",
  "ャンピン",
  "ケモンチャン",
  "モンチャン",
  "ンチャン",
  "ケモンズ",
  "モンズ",
  "ンンズ",
  "ケチャン",
  "モチャン",
  "ンチャンズズ",
  "ポャズ",
  "ンンンズ",
  "ヌーン",
  "ポンズ",
];

const suffixList = [
  "、な？:raised_hand::sweat_smile:",
  "、な？:sweat_smile:",
  "、な？",
];

function pickSuffix() {
  return suffixList[Math.floor(Math.random() * suffixList.length)];
}

// =======================
// ガチャ関連
// =======================
const groupA = ["東北きりたん", "音街ウナ"];
const groupB = [
  "彩澄しゅお",
  "鳴花ヒメ",
  "鳴花ミコト",
  "大江戸ちゃんこ",
  "中国うさぎ",
  "小夜",
  "アル・ビィ",
  "月読アイ",
  "ついなちゃん",
  "ずんだもん",
  "リリンちゃん",
  "つくよみちゃん",
  "ディアちゃん",
  "櫻歌ミコ",
];
const groupC = [
  "琴葉葵",
  "琴葉茜",
  "結月ゆかり",
  "紲星あかり",
  "東北ずん子",
  "東北イタコ",
  "弦巻マキ",
  "ONE",
  "WhiteCUL",
  "彩澄りりせ",
  "足立レイ",
  "雨晴はう",
  "アリアル",
  "伊織弓鶴",
  "重音テト",
  "アルマちゃん",
  "風見壮一",
  "春日部つむぎ",
  "九州そら",
  "京町セイカ",
  "小春六花",
  "さとうささら",
  "四国めたん",
  "白上虎太郎",
  "すずきつづみ",
  "タカハシ",
  "夏色花梨",
  "桜乃そら",
  "フィーちゃん",
  "フリモメン",
  "松樺りすく",
  "ミリアル",
  "冥鳴ひまり",
  "夜語トバリ",
  "花隈千冬",
  "双葉湊音",
  "紡乃世詞音",
  "ナースロボ＿タイプＴ",
  "青山龍星",
  "クロワちゃん",
  "宮舞モカ",
];

const CHARACTER_LIST_TEXT = `
【好きなキャラクター確率一覧】

■ 40% 枠
・東北きりたん
・音街ウナ

■ 30% 枠
・阿澄しゅお
・鳴花ヒメ
・鳴花ミコト
・大江戸ちゃんこ
・中国うさぎ
・小夜
・アル・ビィ
・月読アイ
・ついなちゃん
・ずんだもん
・リリンちゃん
・つくよみちゃん
・ディアちゃん
・櫻歌ミコ

■ 30% 枠
・琴葉葵
・琴葉茜
・結月ゆかり
・紲星あかり
・東北ずん子
・東北イタコ
・弦巻マキ
・ONE
・WhiteCUL
・阿澄りりせ
・足立レイ
・雨晴はう
・アリアル
・伊織弓鶴
・重音テト
・アルマちゃん
・風見壮一
・春日部つむぎ
・九州そら
・京町セイカ
・小春六花
・さとうささら
・四国めたん
・白上虎太郎
・すずきつづみ
・タカハシ
・夏色花梨
・桜乃そら
・フィーちゃん
・フリモメン
・松樺りすく
・ミリアル
・冥鳴ひまり
・夜語トバリ
・花隈千冬
・双葉湊音
・紡乃世詞音
・ナースロボ＿タイプＴ
・青山龍星
・クロワちゃん
・宮舞モカ
`;

// =======================
// 汎用関数
// =======================
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomWeightedItem(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

function pickCharacter60_30_10() {
  const r = Math.random();

  if (r < 0.4) {
    return pickRandom(groupA);
  } else if (r < 0.7) {
    return pickRandom(groupB);
  } else {
    return pickRandom(groupC);
  }
}

// =======================
// VC再生
// =======================
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
    inlineVolume: true,
  });

  resource.volume.setVolume(0.1);
  connection.subscribe(player);
  player.play(resource);

  if (replyText) {
    await message.reply(replyText);
  }
}

// =======================
// レート制限
// =======================
const rateLimitLog = [];

function canRespond() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  while (rateLimitLog.length && rateLimitLog[0] < oneMinuteAgo) {
    rateLimitLog.shift();
  }

  if (rateLimitLog.length < 100) {
    rateLimitLog.push(now);
    return true;
  }

  return false;
}

// =======================
// 起動ログ
// =======================
client.once(Events.ClientReady, readyClient => {
  console.log(`ログイン完了: ${readyClient.user.tag}`);
});

// =======================
// メッセージ処理
// =======================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (!canRespond()) return;

  // ポケモンチャンピオンズ崩壊
  if (
    message.content.includes("ポケットモンスターチャンピオンズ") ||
    message.content.includes("ポケモンチャンピオンズ")
  ) {
    const reply = pickRandom(pokeReplies) + pickSuffix();
    await message.reply(reply);
    return;
  }

  // 崩壊一覧
  if (message.content === "!チャンピオンズ一覧") {
    const text =
      "【ポケモンチャンピオンズ崩壊一覧】\n\n" +
      pokeReplies.map(name => "・" + name).join("\n");

    await message.reply("```" + text + "```");
    return;
  }

  // help
  if (message.content === "!help") {
    const helpMessage = [
      "空気清浄機くんbot コマンドリスト",
      "",
      "【VC系コマンド】",
      "空気悪くね？ → 中換気",
      "ちょっと空気悪くね？ → 弱換気",
      "めっちゃ空気悪くね？ → 強換気",
      "",
      "【テキスト反応】",
      "ちんぽ（含む） → ナイスちんぽ",
      "!おみくじ → 凶か大凶か超凶が出る",
      "!ガチャ確率 → 確率分布を表示",
      "!チャンピオンズ一覧 → 崩壊候補一覧を表示",
      "ポケットモンスターチャンピオンズ / ポケモンチャンピオンズ → 崩壊返信",
      "",
      "【botにリプライ】",
      "今日誰で抜く？ → ランダムでボイロ（広義）キャラクター",
      "10連今日誰で抜く？ → ランダムでボイロ（広義）キャラクターを10キャラ",
      "",
      "短時間に大量のコマンド送信を受けると一時停止します",
    ].join("\n");

    await message.reply("```" + helpMessage + "```");
    return;
  }

  // ガチャ確率一覧
  if (message.content === "!ガチャ確率") {
    await message.reply("```" + CHARACTER_LIST_TEXT + "```");
    return;
  }

  // スタンプリアクション
  if (
    message.content.includes("つかう") ||
    message.content.includes("使う") ||
    message.content.includes("つかっ") ||
    message.content.includes("使っ")
  ) {
    await message.react("1442771448673599628");
    return;
  }

  // ちんぽ返信
  if (message.content.includes("ちんぽ")) {
    const helloReplies = [
      { text: "ナイスちんぽ", weight: 98 },
      { text: "だまれ", weight: 2 },
    ];

    const choice = randomWeightedItem(helloReplies);
    await message.reply(choice.text);
    return;
  }

  // おみくじ
  if (message.content === "!おみくじ") {
    const omikuji = [
      { text: "凶", weight: 90 },
      { text: "大凶", weight: 9 },
      { text: "超凶", weight: 1 },
    ];

    const choice = randomWeightedItem(omikuji);
    await message.reply(choice.text);
    return;
  }

  // VCコマンド
  if (message.content === "空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_M.wav", "換気するか");
    return;
  }

  if (message.content === "ちょっと空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_L.wav", "ちょっと換気するか");
    return;
  }

  if (message.content === "めっちゃ空気悪くね？") {
    await playInUserVoiceChannel(message, "air_purifer_H.wav", "めっちゃ換気するか");
    return;
  }

  // 10連
  if (message.content.includes("10連今日誰で抜く？")) {
    const results = [];

    for (let i = 0; i < 10; i++) {
      results.push(pickCharacter60_30_10());
    }

    const replyText =
      "今日誰で抜く？ 10連結果\n\n" +
      results.map((name, i) => `${i + 1}. ${name}`).join("\n");

    await message.reply("```" + replyText + "```");
    return;
  }

  // 1連
  if (message.content.includes("今日誰で抜く？")) {
    const name = pickCharacter60_30_10();
    await message.reply(name);
    return;
  }
});

// =======================
// ログイン
// =======================
client.login(token).catch(err => {
  console.error("Discord ログインに失敗しました:", err);
});

// =======================
// HTTPサーバー
// =======================
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("bot is alive");
  })
  .listen(PORT, () => {
    console.log(`Render keep-alive server running on port ${PORT}`);
  });