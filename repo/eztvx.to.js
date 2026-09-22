// ==MiruExtension==
// @name         EZTV
// @version      v0.0.1
// @author       Miru
// @lang         en
// @license      MIT
// @icon         https://eztvx.to/favicon.ico
// @package      eztvx.to
// @type         bangumi
// @webSite      https://eztvx.to
// @description  EZTV is a BitTorrent distribution group for TV shows.
// ==/MiruExtension==

export default class extends Extension {
  formatSize(bytes) {
    if (!bytes || isNaN(bytes)) return "";
    const b = parseInt(bytes);
    if (b >= 1024 * 1024 * 1024) {
      return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (b >= 1024 * 1024) {
      return `${(b / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (b >= 1024) {
      return `${(b / 1024).toFixed(2)} KB`;
    }
    return `${b} B`;
  }

  getTorrentUrl(item) {
    if (item.hash) {
      return `https://itorrents.net/torrent/${item.hash.toUpperCase()}.torrent`;
    }
    return item.magnet_url || "";
  }

  async latest(page) {
    const res = await this.request(`/api/get-torrents?limit=30&page=${page}`);
    if (!res || !res.torrents) return [];
    return res.torrents.map((item) => {
      const sizeStr = this.formatSize(item.size_bytes);
      const updateText = `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`;
      return {
        title: item.title || item.filename,
        url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
        cover: item.large_screenshot
          ? item.large_screenshot.startsWith("//")
            ? "https:" + item.large_screenshot
            : item.large_screenshot
          : item.small_screenshot
          ? item.small_screenshot.startsWith("//")
            ? "https:" + item.small_screenshot
            : item.small_screenshot
          : "",
        update: updateText,
      };
    });
  }

  async search(kw, page) {
    const cleanKw = kw.trim();
    if (/^\d+$/.test(cleanKw) || /^tt\d+$/i.test(cleanKw)) {
      const imdbId = cleanKw.replace(/^tt/i, "");
      const res = await this.request(`/api/get-torrents?imdb_id=${imdbId}&page=${page}`);
      if (!res || !res.torrents) return [];
      return res.torrents.map((item) => {
        const sizeStr = this.formatSize(item.size_bytes);
        return {
          title: item.title || item.filename,
          url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
          cover: item.large_screenshot
            ? item.large_screenshot.startsWith("//")
              ? "https:" + item.large_screenshot
              : item.large_screenshot
            : "",
          update: `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`,
        };
      });
    }

    const res = await this.request(`/api/get-torrents?limit=30&page=${page}`);
    if (!res || !res.torrents) return [];

    const lowerKw = cleanKw.toLowerCase();
    const filtered = res.torrents.filter((item) => {
      const title = (item.title || item.filename || "").toLowerCase();
      return title.includes(lowerKw);
    });

    return filtered.map((item) => {
      const sizeStr = this.formatSize(item.size_bytes);
      return {
        title: item.title || item.filename,
        url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
        cover: item.large_screenshot
          ? item.large_screenshot.startsWith("//")
            ? "https:" + item.large_screenshot
            : item.large_screenshot
          : "",
        update: `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`,
      };
    });
  }

  async detail(url) {
    let torrents = [];
    let isImdb = /^\d+$/.test(url);

    if (isImdb) {
      const res = await this.request(`/api/get-torrents?imdb_id=${url}`);
      if (res && res.torrents) {
        torrents = res.torrents;
      }
    }

    if (torrents.length === 0) {
      const res = await this.request(`/api/get-torrents?limit=100&page=1`);
      if (res && res.torrents) {
        torrents = res.torrents.filter((item) => item.id.toString() === url);
      }
    }

    if (torrents.length === 0) {
      return {
        title: "Unknown",
        cover: "",
        desc: "",
        episodes: [],
      };
    }

    const firstItem = torrents[0];
    const mainTitle = firstItem.title || firstItem.filename;
    const cover = firstItem.large_screenshot
      ? firstItem.large_screenshot.startsWith("//")
        ? "https:" + firstItem.large_screenshot
        : firstItem.large_screenshot
      : firstItem.small_screenshot
      ? firstItem.small_screenshot.startsWith("//")
        ? "https:" + firstItem.small_screenshot
        : firstItem.small_screenshot
      : "";

    if (torrents.length === 1) {
      const item = torrents[0];
      const sizeStr = this.formatSize(item.size_bytes);
      return {
        title: mainTitle,
        cover,
        desc: `Released: ${new Date(item.date_released_unix * 1000).toLocaleDateString()}`,
        episodes: [
          {
            title: "Torrents",
            urls: [
              {
                name: `${item.title || item.filename} [S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}]`,
                url: this.getTorrentUrl(item),
              },
            ],
          },
        ],
      };
    }

    const seasonMap = {};
    torrents.forEach((item) => {
      const seasonNum = parseInt(item.season) || 0;
      const seasonKey = seasonNum > 0 ? `Season ${seasonNum}` : "Torrents";
      if (!seasonMap[seasonKey]) {
        seasonMap[seasonKey] = [];
      }
      const sizeStr = this.formatSize(item.size_bytes);
      seasonMap[seasonKey].push({
        name: `${item.title || item.filename} [S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}]`,
        url: this.getTorrentUrl(item),
      });
    });

    const episodes = Object.keys(seasonMap).map((seasonKey) => ({
      title: seasonKey,
      urls: seasonMap[seasonKey],
    }));

    return {
      title: mainTitle,
      cover,
      desc: `IMDB ID: ${firstItem.imdb_id}`,
      episodes,
    };
  }

  async watch(url) {
    return {
      type: "torrent",
      url: url,
    };
  }
}
