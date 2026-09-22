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

  cleanShowTitle(title) {
    if (!title) return "";
    let clean = title.replace(/S\d+E\d+[\s\S]*/i, "");
    clean = clean.replace(/\b(1080p|720p|480p|HDTV|WEB-DL|WEB|AAC2|H264|H\.264|x264|x265|HEVC|REPACK|EZTV|DARKFLiX|MeGusta|RMTeam)\b.*/gi, "");
    clean = clean.replace(/[\.\_]/g, " ").trim();
    return clean;
  }

  async getMetadata(imdbId, rawTitle) {
    let cover = "";
    let desc = "";

    if (imdbId && imdbId !== "0") {
      try {
        const fullImdb = imdbId.startsWith("tt") ? imdbId : `tt${imdbId}`;
        const res = await this.request("", {
          headers: {
            "Miru-Url": `https://api.tvmaze.com/lookup/shows?imdb=${fullImdb}`,
          },
        });
        if (res) {
          if (res.image) {
            cover = res.image.medium || res.image.original || "";
          }
          if (res.summary) {
            desc = res.summary.replace(/<[^>]*>/g, "").trim();
          }
        }
      } catch (e) {
        // Fallback to title lookup if IMDB lookup fails
      }
    }

    if (!cover || !desc) {
      const showTitle = this.cleanShowTitle(rawTitle);
      if (showTitle) {
        try {
          const res = await this.request("", {
            headers: {
              "Miru-Url": `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(showTitle)}`,
            },
          });
          if (res) {
            if (!cover && res.image) {
              cover = res.image.medium || res.image.original || "";
            }
            if (!desc && res.summary) {
              desc = res.summary.replace(/<[^>]*>/g, "").trim();
            }
          }
        } catch (e) {
          // Ignore API lookup errors
        }
      }
    }

    return { cover, desc };
  }

  formatEztvScreenshot(item) {
    if (item.large_screenshot) {
      return item.large_screenshot.startsWith("//")
        ? "https:" + item.large_screenshot
        : item.large_screenshot;
    }
    if (item.small_screenshot) {
      return item.small_screenshot.startsWith("//")
        ? "https:" + item.small_screenshot
        : item.small_screenshot;
    }
    return "";
  }

  async latest(page) {
    const res = await this.request(`/api/get-torrents?limit=30&page=${page}`);
    if (!res || !res.torrents) return [];

    return Promise.all(
      res.torrents.map(async (item) => {
        const sizeStr = this.formatSize(item.size_bytes);
        const updateText = `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`;

        const meta = await this.getMetadata(item.imdb_id, item.title || item.filename);
        const cover = meta.cover || this.formatEztvScreenshot(item);

        return {
          title: item.title || item.filename,
          url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
          cover: cover,
          update: updateText,
        };
      })
    );
  }

  async search(kw, page) {
    const cleanKw = kw.trim();
    if (/^\d+$/.test(cleanKw) || /^tt\d+$/i.test(cleanKw)) {
      const imdbId = cleanKw.replace(/^tt/i, "");
      const res = await this.request(`/api/get-torrents?imdb_id=${imdbId}&page=${page}`);
      if (!res || !res.torrents) return [];

      return Promise.all(
        res.torrents.map(async (item) => {
          const sizeStr = this.formatSize(item.size_bytes);
          const meta = await this.getMetadata(item.imdb_id, item.title || item.filename);
          const cover = meta.cover || this.formatEztvScreenshot(item);

          return {
            title: item.title || item.filename,
            url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
            cover: cover,
            update: `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`,
          };
        })
      );
    }

    const res = await this.request(`/api/get-torrents?limit=30&page=${page}`);
    if (!res || !res.torrents) return [];

    const lowerKw = cleanKw.toLowerCase();
    const filtered = res.torrents.filter((item) => {
      const title = (item.title || item.filename || "").toLowerCase();
      return title.includes(lowerKw);
    });

    return Promise.all(
      filtered.map(async (item) => {
        const sizeStr = this.formatSize(item.size_bytes);
        const meta = await this.getMetadata(item.imdb_id, item.title || item.filename);
        const cover = meta.cover || this.formatEztvScreenshot(item);

        return {
          title: item.title || item.filename,
          url: item.imdb_id && item.imdb_id !== "0" ? item.imdb_id : item.id.toString(),
          cover: cover,
          update: `S${item.season}E${item.episode} | S:${item.seeds} P:${item.peers}${sizeStr ? " | " + sizeStr : ""}`,
        };
      })
    );
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
    const rawTitle = firstItem.title || firstItem.filename;
    const cleanTitle = this.cleanShowTitle(rawTitle);

    const meta = await this.getMetadata(firstItem.imdb_id, rawTitle);
    const cover = meta.cover || this.formatEztvScreenshot(firstItem);
    const desc = meta.desc || (firstItem.imdb_id && firstItem.imdb_id !== "0" ? `IMDB ID: ${firstItem.imdb_id}` : "");

    if (torrents.length === 1) {
      const item = torrents[0];
      const sizeStr = this.formatSize(item.size_bytes);
      return {
        title: cleanTitle || rawTitle,
        cover,
        desc: desc || `Released: ${new Date(item.date_released_unix * 1000).toLocaleDateString()}`,
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
      title: cleanTitle || rawTitle,
      cover,
      desc,
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
