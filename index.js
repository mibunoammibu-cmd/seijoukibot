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
// ニコニコ新着監視
// =======================

// 通知を送るDiscordチャンネルID
const NICO_NOTIFY_CHANNEL_ID = "485127725888045059";

// 監視するニコニコ投稿者ID
const NICO_USER_IDS = [
  "67530815",//りてちに
  "736445",//アンカルジア
  "89625156",//のーろら
  "119941711",//めがさら
  "70753841",//のーち
  "18496535",//壬生乃
  "125432075",//rebmit
  "16958431",//matsuri
  "56313141",//しろ
  "33752635",//AKAK
  "66393463",//亀タコ
  "121980691",//さくらにく
  "95693788",//にり
  "140743151",//有象無象
  "130667070",//やまい
  "42012401",//クロア
  "99204894",//ニウム
  "80655329",//ﾘｭｰｸﾞｰ
  "85436397",//パウチ猫
  "118466190",//コロアヤメ
  "44477814",//ひのこ
  "121585241",//手羽先
  "46753252",//カイリス
];

// 5分ごとに確認
const NICO_CHECK_INTERVAL = 5 * 60 * 1000;

// Bot起動中だけ最新動画IDを記憶
const latestNicoVideos = new Map();

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
  "ンチャンズ",
  "ポャズ",
  "ンンンズ",
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
  "アル",
  "ビィ",
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
・アル
・ビィ
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
// ニコニコ最新動画取得
// =======================
async function getLatestNicoVideo(userId) {
  const url =
    `https://nvapi.nicovideo.jp/v2/users/${userId}/videos` +
    `?sortKey=registeredAt` +
    `&sortOrder=desc` +
    `&pageSize=1` +
    `&page=1`;

  const response = await fetch(url, {
    headers: {
      "X-Frontend-ID": "6",
      "X-Frontend-Version": "0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `ニコニコ取得失敗 user=${userId} status=${response.status}`
    );
  }

  const json = await response.json();

  const item = json?.data?.items?.[0];

  if (!item) {
    return null;
  }

  const videoId =
    item?.essential?.id ||
    item?.video?.id ||
    item?.id ||
    item?.contentId;

  return videoId || null;
}

// =======================
// ニコニコ新着チェック
// =======================
async function checkNicoNewVideos() {
  let channel;

  try {
    channel = await client.channels.fetch(NICO_NOTIFY_CHANNEL_ID);
  } catch (error) {
    console.error(
      "ニコニコ通知先チャンネル取得失敗:",
      error
    );
    return;
  }

  if (!channel || !channel.isTextBased()) {
    console.error(
      "ニコニコ通知先がテキストチャンネルではありません"
    );
    return;
  }

  for (const userId of NICO_USER_IDS) {

    if (
      !userId ||
      userId === "ここに投稿者ID"
    ) {
      continue;
    }

    try {
      const videoId =
        await getLatestNicoVideo(userId);

      if (!videoId) {
        console.log(
          `ニコニコ動画なし user=${userId}`
        );
        continue;
      }

      const previousVideoId =
        latestNicoVideos.get(userId);

      // ==========================
      // 起動直後
      // ==========================
      // 現在の最新動画を記録するだけ。
      // Discordには送らない。
      if (!previousVideoId) {

        latestNicoVideos.set(
          userId,
          videoId
        );

        console.log(
          `ニコニコ初期登録 user=${userId} video=${videoId}`
        );

        continue;
      }

      // 前回と同じなら何もしない
      if (previousVideoId === videoId) {
        continue;
      }

      // ==========================
      // 新着発見
      // ==========================
      latestNicoVideos.set(
        userId,
        videoId
      );

      const videoUrl =
        `https://www.nicovideo.jp/watch/${videoId}`;

      // DiscordにはURLだけ送る
      await channel.send(videoUrl);

      console.log(
        `ニコニコ新着通知 user=${userId} video=${videoId}`
      );

    } catch (error) {

      console.error(
        `ニコニコ監視エラー user=${userId}:`,
        error
      );
    }
  }
}

// =======================
// VC再生
// =======================
async function playInUserVoiceChannel(
  message,
  fileName,
  replyText
) {

  const voiceChannel =
    message.member?.voice?.channel;

  if (!voiceChannel) {
    await message.reply(
      "そんなことはない"
    );
    return;
  }

  const filePath =
    path.join(__dirname, fileName);

  console.log(
    "再生ファイル:",
    filePath
  );

  const connection =
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator:
        voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

  const player =
    createAudioPlayer();

  player.on(
    "stateChange",
    (oldState, newState) => {

      console.log(
        `Player state: ${oldState.status} -> ${newState.status}`
      );
    }
  );

  player.on(
    AudioPlayerStatus.Idle,
    () => {

      console.log(
        "再生終了、VCから退出します"
      );

      connection.destroy();
    }
  );

  player.on(
    "error",
    error => {

      console.error(
        "再生中にエラー:",
        error
      );

      connection.destroy();
    }
  );

  const resource =
    createAudioResource(
      filePath,
      {
        inlineVolume: true,
      }
    );

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

  const oneMinuteAgo =
    now - 60 * 1000;

  while (
    rateLimitLog.length &&
    rateLimitLog[0] < oneMinuteAgo
  ) {
    rateLimitLog.shift();
  }

  if (rateLimitLog.length < 100) {
    rateLimitLog.push(now);
    return true;
  }

  return false;
}

// =======================
// 起動処理
// =======================
client.once(
  Events.ClientReady,
  async readyClient => {

    console.log(
      `ログイン完了: ${readyClient.user.tag}`
    );

    // ニコニコ設定がまだなら監視しない
    if (
      NICO_NOTIFY_CHANNEL_ID ===
        "ここにDiscordチャンネルID" ||
      NICO_USER_IDS.every(
        id =>
          !id ||
          id === "ここに投稿者ID"
      )
    ) {

      console.log(
        "ニコニコ新着監視: 設定未完了のため停止中"
      );

      return;
    }

    // ==========================
    // 起動時チェック
    // ==========================
    // この時点の最新動画を基準として記録。
    // Discordには送信しない。
    await checkNicoNewVideos();

    // ==========================
    // 定期チェック
    // ==========================
    setInterval(
      () => {

        checkNicoNewVideos()
          .catch(error => {

            console.error(
              "ニコニコ定期監視エラー:",
              error
            );

          });

      },
      NICO_CHECK_INTERVAL
    );

    console.log(
      `ニコニコ新着監視開始: ${NICO_CHECK_INTERVAL / 60000}分間隔`
    );
  }
);

// =======================
// メッセージ処理
// =======================
client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;
    if (!canRespond()) return;

    // ポケモンチャンピオンズ崩壊
    if (
      message.content.includes(
        "ポケットモンスターチャンピオンズ"
      ) ||
      message.content.includes(
        "ポケモンチャンピオンズ"
      )
    ) {

      const reply =
        pickRandom(pokeReplies) +
        pickSuffix();

      await message.reply(reply);
      return;
    }

    // 崩壊一覧
    if (
      message.content ===
      "!チャンピオンズ一覧"
    ) {

      const text =
        "【ポケモンチャンピオンズ崩壊一覧】\n\n" +
        pokeReplies
          .map(name => "・" + name)
          .join("\n");

      await message.reply(
        "```" + text + "```"
      );

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

      await message.reply(
        "```" +
        helpMessage +
        "```"
      );

      return;
    }

    // ガチャ確率
    if (
      message.content ===
      "!ガチャ確率"
    ) {

      await message.reply(
        "```" +
        CHARACTER_LIST_TEXT +
        "```"
      );

      return;
    }

    // スタンプリアクション
    if (
      message.content.includes("つかう") ||
      message.content.includes("使う") ||
      message.content.includes("つかっ") ||
      message.content.includes("使っ")
    ) {

      await message.react(
        "1442771448673599628"
      );

      return;
    }

    // ちんぽ返信
    if (
      message.content.includes("ちんぽ")
    ) {

      const helloReplies = [
        {
          text: "ナイスちんぽ",
          weight: 98
        },
        {
          text: "だまれ",
          weight: 2
        },
      ];

      const choice =
        randomWeightedItem(
          helloReplies
        );

      await message.reply(
        choice.text
      );

      return;
    }

    // おみくじ
    if (
      message.content ===
      "!おみくじ"
    ) {

      const omikuji = [
        {
          text: "凶",
          weight: 90
        },
        {
          text: "大凶",
          weight: 9
        },
        {
          text: "超凶",
          weight: 1
        },
      ];

      const choice =
        randomWeightedItem(
          omikuji
        );

      await message.reply(
        choice.text
      );

      return;
    }

    // =======================
    // VCコマンド
    // =======================

    if (
      message.content ===
      "空気悪くね？"
    ) {

      await playInUserVoiceChannel(
        message,
        "air_purifer_M.wav",
        "換気するか"
      );

      return;
    }

    if (
      message.content ===
      "ちょっと空気悪くね？"
    ) {

      await playInUserVoiceChannel(
        message,
        "air_purifer_L.wav",
        "ちょっと換気するか"
      );

      return;
    }

    if (
      message.content ===
      "めっちゃ空気悪くね？"
    ) {

      await playInUserVoiceChannel(
        message,
        "air_purifer_H.wav",
        "めっちゃ換気するか"
      );

      return;
    }

    // =======================
    // 10連
    // =======================
    if (
      message.content.includes(
        "10連今日誰で抜く？"
      )
    ) {

      const results = [];

      for (
        let i = 0;
        i < 10;
        i++
      ) {

        results.push(
          pickCharacter60_30_10()
        );
      }

      const replyText =
        "今日誰で抜く？ 10連結果\n\n" +
        results
          .map(
            (name, i) =>
              `${i + 1}. ${name}`
          )
          .join("\n");

      await message.reply(
        "```" +
        replyText +
        "```"
      );

      return;
    }

    // =======================
    // 1連
    // =======================
    if (
      message.content.includes(
        "今日誰で抜く？"
      )
    ) {

      const name =
        pickCharacter60_30_10();

      await message.reply(name);

      return;
    }
  }
);

// =======================
// Discordログイン
// =======================
client.login(token)
  .catch(err => {

    console.error(
      "Discord ログインに失敗しました:",
      err
    );

  });

// =======================
// HTTPサーバー
// =======================
const PORT =
  process.env.PORT || 3000;

http
  .createServer(
    (req, res) => {

      res.writeHead(
        200,
        {
          "Content-Type":
            "text/plain"
        }
      );

      res.end(
        "bot is alive"
      );
    }
  )
  .listen(
    PORT,
    () => {

      console.log(
        `Render keep-alive server running on port ${PORT}`
      );

    }
  );