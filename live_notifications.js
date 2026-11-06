// live_notifications.js
// ニコニコ生放送 + YouTube Live の配信開始だけをDiscordへ通知
// Node.js 22+ / discord.js v14 / 追加npmパッケージ不要

const { Events } = require("discord.js");

const NICO_LIVE_INTERVAL_MS = 5 * 60 * 1000;
// YouTube search.list は標準で1日100回の制限があるため20分間隔
const YOUTUBE_LIVE_INTERVAL_MS = 20 * 60 * 1000;
const DEFAULT_YOUTUBE_HANDLES = ["@akak-_-47"];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "seijoukibot/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url.split("key=")[0]}`);
  }
  return response.json();
}

async function getNicoOnAirPrograms(userId) {
  const params = new URLSearchParams({
    providerId: String(userId),
    providerType: "user",
    isIncludeNonPublic: "false",
    offset: "0",
    limit: "3",
    withTotalCount: "true",
  });
  const json = await fetchJson(
    `https://live.nicovideo.jp/front/api/v2/user-broadcast-history?${params}`
  );
  const programs = json?.data?.programsList;
  if (!Array.isArray(programs)) {
    throw new Error(`ニコ生の応答形式が想定外です: user=${userId}`);
  }
  return programs.flatMap(item => {
    const status = String(item?.program?.schedule?.status || "").toUpperCase();
    // 配信予定や終了済みは除外する
    if (status !== "ON_AIR" && status !== "ONAIR" && status !== "LIVE") return [];
    const rawId = String(item?.id?.value || "");
    const match = rawId.match(/(?:lv)?(\d{6,})/);
    if (!match) return [];
    return [`lv${match[1]}`];
  });
}

async function resolveYouTubeChannelId(handle, apiKey) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.search = new URLSearchParams({
    part: "id",
    forHandle: handle,
    key: apiKey,
  }).toString();
  const json = await fetchJson(url.toString());
  const id = json?.items?.[0]?.id;
  if (!id) throw new Error(`YouTubeチャンネルが見つかりません: ${handle}`);
  return id;
}

async function getYouTubeLiveVideos(channelId, apiKey) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    channelId,
    eventType: "live",
    type: "video",
    maxResults: "10",
    key: apiKey,
  }).toString();
  const json = await fetchJson(url.toString());
  if (!Array.isArray(json?.items)) {
    throw new Error(`YouTubeの応答形式が想定外です: channel=${channelId}`);
  }
  return json.items
    .map(item => item?.id?.videoId)
    .filter(id => typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id));
}

function setupLiveNotifications(client, {
  nicoUserIds = [],
  notifyChannelId,
  youtubeHandles = DEFAULT_YOUTUBE_HANDLES,
  youtubeApiKey = process.env.YOUTUBE_API_KEY,
} = {}) {
  const users = [...new Set(nicoUserIds.map(String).filter(x => /^\d+$/.test(x)))];
  const handles = [...new Set(youtubeHandles)];
  if (!notifyChannelId || !/^\d+$/.test(String(notifyChannelId))) {
    console.error("配信通知停止: notifyChannelIdにDiscordチャンネルIDを設定してください");
    return;
  }

  const nicoInitialized = new Set();
  const nicoSeen = new Set();
  const youtubeInitialized = new Set();
  const youtubeSeen = new Set();
  const youtubeChannelIds = new Map();
  let nicoRunning = false;
  let youtubeRunning = false;

  async function notifyLink(url) {
    const channel = await client.channels.fetch(String(notifyChannelId));
    if (!channel?.isTextBased() || typeof channel.send !== "function") {
      throw new Error("通知先は送信可能なDiscordテキストチャンネルにしてください");
    }
    await channel.send({ content: url, allowedMentions: { parse: [] } });
  }

  async function checkNico() {
    if (nicoRunning) return;
    nicoRunning = true;
    try {
      for (const userId of users) {
        try {
          const lives = await getNicoOnAirPrograms(userId);
          if (!nicoInitialized.has(userId)) {
            lives.forEach(id => nicoSeen.add(id));
            nicoInitialized.add(userId);
            console.log(`ニコ生初期確認 user=${userId} 放送中=${lives.length}`);
            continue;
          }
          for (const id of lives) {
            if (nicoSeen.has(id)) continue;
            await notifyLink(`https://live.nicovideo.jp/watch/${id}`);
            nicoSeen.add(id); // 送信成功後に記録
            console.log(`ニコ生開始通知 user=${userId} live=${id}`);
          }
        } catch (error) {
          console.error(`ニコ生監視エラー user=${userId}:`, error.message);
        }
      }
    } finally {
      nicoRunning = false;
    }
  }

  async function checkYouTube() {
    if (youtubeRunning || !youtubeApiKey) return;
    youtubeRunning = true;
    try {
      for (const handle of handles) {
        try {
          let channelId = youtubeChannelIds.get(handle);
          if (!channelId) {
            channelId = await resolveYouTubeChannelId(handle, youtubeApiKey);
            youtubeChannelIds.set(handle, channelId);
            console.log(`YouTubeチャンネル確認 ${handle}: ${channelId}`);
          }
          const lives = await getYouTubeLiveVideos(channelId, youtubeApiKey);
          if (!youtubeInitialized.has(handle)) {
            lives.forEach(id => youtubeSeen.add(id));
            youtubeInitialized.add(handle);
            console.log(`YouTube初期確認 ${handle} 配信中=${lives.length}`);
            continue;
          }
          for (const id of lives) {
            if (youtubeSeen.has(id)) continue;
            await notifyLink(`https://www.youtube.com/watch?v=${id}`);
            youtubeSeen.add(id); // 送信成功後に記録
            console.log(`YouTube配信開始通知 ${handle} video=${id}`);
          }
        } catch (error) {
          console.error(`YouTube監視エラー ${handle}:`, error.message);
        }
      }
    } finally {
      youtubeRunning = false;
    }
  }

  client.once(Events.ClientReady, () => {
    if (users.length > 0) {
      console.log(`ニコ生配信監視開始: ${users.length}人 / 5分間隔`);
      checkNico().catch(error => console.error("ニコ生監視失敗:", error));
      setInterval(() => checkNico().catch(console.error), NICO_LIVE_INTERVAL_MS);
    }
    if (handles.length > 0 && youtubeApiKey) {
      console.log(`YouTube配信監視開始: ${handles.join(", ")} / 20分間隔`);
      checkYouTube().catch(error => console.error("YouTube監視失敗:", error));
      setInterval(() => checkYouTube().catch(console.error), YOUTUBE_LIVE_INTERVAL_MS);
    } else if (handles.length > 0) {
      console.warn("YouTube配信監視停止: Koyebの環境変数YOUTUBE_API_KEYが未設定です");
    }
  });
}

module.exports = { setupLiveNotifications };
