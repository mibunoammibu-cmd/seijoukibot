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
const http = require("http");

// 2. トークン取得
const token = process.env.DISCORD_TOKEN;
console.log("DISCORD_TOKEN 存在チェック:", token ? "OK" : "NG");

// 3. Client 作成
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

const group60 = ["東北きりたん", "音街ウナ"];           
const group30 = ["阿澄しゅお", "鳴花ヒメ", "鳴花ミコト", "大江戸ちゃんこ","中国うさぎ","小夜","アル・ビィ","月読アイ","ついなちゃん","ずんだもん","リリンちゃん","つくよみちゃん","ディアちゃん","櫻歌ミコ"];      // 30%枠（均等）
const group10 = ["琴葉葵", "琴葉茜", "結月ゆかり", "紲星あかり","東北ずん子","東北イタコ","弦巻マキ","ONE","WhiteCUL","阿澄りりせ","足立レイ","雨晴はう","アリアル","伊織弓鶴",
                "重音テト","アルマちゃん","風見壮一","春日部つむぎ","九州そら","京町セイカ","小春六花","さとうささら","四国めたん","白上虎太郎","すずきつづみ","タカハシ","夏色花梨","桜乃そら",
                "フィーちゃん","フリモメン","松樺りすく","ミリアル","冥鳴ひまり","夜語トバリ","花隈千冬","双葉湊音","紡乃世詞音","ナースロボ＿タイプＴ","青山龍星","クロワちゃん","宮舞モカ"];      // 10%枠（均等）

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


function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickCharacter60_30_10() {
  const r = Math.random(); // 0.0〜1.0

  if (r < 0.4) {
    return pickRandom(group60); // 高確率
  } else if (r < 0.3) {
    return pickRandom(group30); // 中確率
  } else {
    return pickRandom(group10); // 低確率
  }
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
    inlineVolume: true,
  });

  // 音量を 10% に設定
  resource.volume.setVolume(0.1);
  connection.subscribe(player);
  player.play(resource);

  if (replyText) {
    await message.reply(replyText);
  }
}

// -------------------------
//  レート制限（1分で10回まで）
// -------------------------
const rateLimitLog = []; // 反応したタイムスタンプを保存

function canRespond() {
  const now = Date.now();

  // 1分以内のログだけ残す
  const oneMinuteAgo = now - 60 * 1000;
  while (rateLimitLog.length && rateLimitLog[0] < oneMinuteAgo) {
    rateLimitLog.shift();
  }

  // 10回以内ならOK
  if (rateLimitLog.length < 100) {
    rateLimitLog.push(now);
    return true;
  }

  return false;
}

// 5. ログイン完了時
client.once(Events.ClientReady, readyClient => {
  console.log(`ログイン完了: ${readyClient.user.tag}`);
});

// 6. メッセージハンドラ
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  // レート制限チェック（1分で10回まで）
  if (!canRespond()) {
    return;
  }

  // コマンドリスト（!help）
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
      "!ガチャ確率 → ↓の確率分布を表示",
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
      { text: "凶", weight: 90 },
      { text: "大凶", weight: 9 },
      { text: "超凶", weight: 1 },
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

// 10連（優先的に判定）
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

if (message.content.includes("今日誰で抜く？")) {
  const name = pickCharacter60_30_10();
  await message.reply(name);
  return;
}


});

// 7. 最後にログイン
client.login(token).catch(err => {
  console.error("Discord ログインに失敗しました:", err);
});

// ===============================
// Render Free 裏技：ダミーHTTPサーバー
// ===============================
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("bot is alive");
  })
  .listen(PORT, () => {
    console.log(`Render keep-alive server running on port ${PORT}`);
  });

  