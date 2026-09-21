// ==MiruExtension==
// @name         MoviesArc
// @version      v0.0.4
// @author       OshekharO
// @lang         all
// @license      MIT
// @icon         https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg
// @package      themoviearchive
// @type         bangumi
// @webSite      https://api.themoviedb.org/3
// ==/MiruExtension==

const BASE_URL = "https://cinevibe.asia";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const BROWSER_FINGERPRINT = "eyJzY3JlZW4iOiIzNjB4ODA2eDI0Iiwi";
const SESSION_ENTROPY = "pjght152dw2rb.ssst4bzleDI0Iiwibv78";

const WORKING_HEADERS = {
  Referer: BASE_URL + "/",
  "User-Agent": USER_AGENT,
  "X-CV-Fingerprint": BROWSER_FINGERPRINT,
  "X-CV-Session": SESSION_ENTROPY,
  "X-Requested-With": "XMLHttpRequest",
};

function fnv1a32(s) {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) & 0xffffffff;
  }
  return hash.toString(16).padStart(8, "0");
}

function rot13(str) {
  return str.replace(/[A-Za-z]/g, function (char) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + 13) % 26) + 65);
    } else if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + 13) % 26) + 97);
    }
    return char;
  });
}

function base64Encode(str) {
  try {
    const utf8Bytes = unescape(encodeURIComponent(str));
    if (typeof btoa === "function") {
      return btoa(utf8Bytes);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(utf8Bytes, "binary").toString("base64");
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    for (
      let block = 0, charCode, i = 0, map = chars;
      utf8Bytes.charAt(i | 0) || ((map = "="), i % 1);
      output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
    ) {
      charCode = utf8Bytes.charCodeAt((i += 3 / 4));
      block = (block << 8) | charCode;
    }
    return output;
  } catch (error) {
    console.error("[Cinevibe] Base64 encode error:", error);
    throw error;
  }
}

function base64Decode(str) {
  try {
    if (typeof atob === "function") {
      const decoded = atob(str);
      return decodeURIComponent(escape(decoded));
    }
    if (typeof Buffer !== "undefined") {
      const decoded = Buffer.from(str, "base64").toString("binary");
      return decodeURIComponent(escape(decoded));
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/=+$/, "");
    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }
    return decodeURIComponent(escape(output));
  } catch (error) {
    console.error("[Cinevibe] Base64 decode error:", error);
    throw error;
  }
}

function customEncode(e) {
  let encoded = base64Encode(e);
  encoded = encoded.split("").reverse().join("");
  encoded = rot13(encoded);
  encoded = base64Encode(encoded);
  encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return encoded;
}

function generateToken(tmdbId, title, releaseYear, mediaType) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const timeWindow = Math.floor(Date.now() / 300000);
  const timeBasedKey = `${timeWindow}_${BROWSER_FINGERPRINT}_cinevibe_2025`;
  const hashedKey = fnv1a32(timeBasedKey);
  const timeStamp = Math.floor(Date.now() / 1000 / 600);
  const tokenString = `${SESSION_ENTROPY}|${tmdbId}|${cleanTitle}|${releaseYear}||${hashedKey}|${timeStamp}|${BROWSER_FINGERPRINT}`;
  return customEncode(tokenString);
}

export default class extends Extension {
  async req(url) {
    return this.request(url, {
      headers: {
        "Miru-Url": await this.getSetting("moviesarc"),
      },
    });
  }

  async load() {
    this.registerSetting({
      title: "MoviesArc API",
      key: "moviesarc",
      type: "input",
      description: "MoviesArc Api Url",
      defaultValue: "https://api.themoviedb.org/3",
    });
  }

  async latest() {
    const res = await this.request("", {
      headers: {
        "Miru-Url": "https://api.themoviedb.org/3/trending/movie/day?language=en-US&api_key=9990db75d12d4ecd4ed84628ebc96403",
      },
    });
    return res.results.map((item) => ({
      title: item.title,
      url: item.id.toString(),
      cover: "https://image.tmdb.org/t/p/w300/" + item.poster_path,
    }));
  }

  async detail(url) {
    const res = await this.req(`/movie/${url}?language=en-US&api_key=9990db75d12d4ecd4ed84628ebc96403`);
    return {
      title: res.title,
      cover: "https://image.tmdb.org/t/p/w300" + res.poster_path,
      desc: res.overview,
      episodes: [
        {
          title: "Ep",
          urls: [
            {
              name: `Watch ${res.title}`,
              url: res.id.toString(),
            },
          ],
        },
      ],
    };
  }

  async search(kw) {
    const res = await this.request(`query=${kw}&include_adult=false&language=en-US&page=1&region=US&api_key=9990db75d12d4ecd4ed84628ebc96403`, {
      headers: {
        "Miru-Url": "https://api.themoviedb.org/3/search/movie?",
      },
    });

    return res.results.map((item) => ({
      title: item.title,
      url: item.id.toString(),
      cover: "https://image.tmdb.org/t/p/w300" + item.poster_path,
    }));
  }

  async getTMDBDetails(tmdbId, mediaType = "movie") {
    const cleanId = tmdbId.replace(/^(movie|tv)\//, "").split(";")[0];
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}/${cleanId}?api_key=${TMDB_API_KEY}`;

    const data = await this.request("", {
      headers: {
        "Miru-Url": tmdbUrl,
        "User-Agent": USER_AGENT,
      },
    });

    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const title = mediaType === "tv" ? parsed.name : parsed.title;
    const releaseDate = mediaType === "tv" ? parsed.first_air_date : parsed.release_date;
    const releaseYear = releaseDate ? releaseDate.split("-")[0] : "";

    return {
      cleanId,
      title: title || "",
      releaseYear: releaseYear || "",
    };
  }

  async fetchCinevibeStreams(cleanId, title, releaseYear, mediaType = "movie") {
    const token = generateToken(cleanId, title, releaseYear, mediaType);
    const timestamp = Date.now();
    const apiUrl = `${BASE_URL}/api/stream/fetch?server=cinebox-1&type=${mediaType}&mediaId=${cleanId}&title=${encodeURIComponent(title)}&releaseYear=${releaseYear}&_token=${token}&_ts=${timestamp}`;

    const res = await this.request("", {
      headers: {
        "Miru-Url": apiUrl,
        ...WORKING_HEADERS,
      },
    });

    const data = typeof res === "string" ? JSON.parse(res) : res;
    if (data && data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
      return data.sources;
    }
    return null;
  }

  async watch(url) {
    const cleanId = url.replace(/^(movie|tv)\//, "").split(";")[0];

    // Attempt 1: Fetch using Cinevibe Scraper
    try {
      const mediaInfo = await this.getTMDBDetails(cleanId, "movie");
      if (mediaInfo.title && mediaInfo.releaseYear) {
        const sources = await this.fetchCinevibeStreams(mediaInfo.cleanId, mediaInfo.title, mediaInfo.releaseYear, "movie");
        if (sources && sources.length > 0 && sources[0].url) {
          return {
            type: sources[0].url.includes(".mp4") ? "mp4" : "hls",
            url: sources[0].url,
            headers: WORKING_HEADERS,
          };
        }
      }
    } catch (e) {
      console.error("[MoviesArc] Cinevibe scraper error:", e);
    }

    // Attempt 2: Fallback to VidSrc provider
    try {
      const vidsrcRes = await this.request("", {
        headers: {
          "Miru-Url": `https://vidsrc-api-js-eosin.vercel.app/vidsrc/${cleanId}`,
        },
      });
      const parsed = typeof vidsrcRes === "string" ? JSON.parse(vidsrcRes) : vidsrcRes;
      if (parsed && parsed.sources && parsed.sources.length > 0 && parsed.sources[0].url) {
        return {
          type: "hls",
          url: parsed.sources[0].url,
        };
      }
    } catch (e) {
      console.error("[MoviesArc] VidSrc fallback error:", e);
    }

    // Attempt 3: Safe fallback object so Miru app never receives null
    return {
      type: "hls",
      url: "",
    };
  }
}
