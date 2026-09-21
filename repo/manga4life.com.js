// ==MiruExtension==
// @name         MangaLife
// @version      v0.0.2
// @author       appdevelpo
// @lang         en
// @license      MIT
// @type         manga
// @icon         https://manga4life.org/favicon.ico
// @package      manga4life.com
// @webSite      https://manga4life.org
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  decodeHTMLEntities(text) {
    if (!text) return "";
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  async req(url, options = {}) {
    return this.request(url, {
      ...options,
      headers: {
        "x-app-token": "mz-x7k2p9q4w1n8r3",
        ...(options.headers || {}),
      },
    });
  }

  async latest(page) {
    const res = await this.req(`/api/v1/list?p=${page}`);
    const list = typeof res === "string" ? JSON.parse(res) : res;
    const results = list.results || [];
    return results.map((item) => ({
      title: this.decodeHTMLEntities(item.anime_name),
      url: item.source_id,
      cover: item.image_src,
    }));
  }

  async createFilter() {
    const genres = [
      "Action",
      "Romance",
      "Fantasy",
      "Comedy",
      "Reincarnation",
      "Martial Arts",
      "Supernatural",
      "Historical",
      "Drama",
      "Adventure",
      "School Life",
      "Isekai",
      "Harem",
      "Mystery",
      "Thriller",
      "Slice of Life",
      "Horror",
      "Sci-Fi",
      "Sports",
      "Psychological",
    ];
    const options = {};
    genres.forEach((g) => {
      options[g] = g;
    });
    return {
      Genre: {
        title: "Genre",
        max: 1,
        min: 0,
        default: "",
        options,
      },
    };
  }

  async search(kw, page, filter) {
    if (!kw && (!filter || !filter.Genre || !filter.Genre[0])) {
      return this.latest(page);
    }
    const res = await this.req("/data/series_list.json");
    const list = typeof res === "string" ? JSON.parse(res) : res;
    let filtered = list;

    if (kw) {
      const query = kw.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query)
      );
    }

    if (filter && filter.Genre && filter.Genre[0]) {
      const genre = filter.Genre[0].toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(genre) ||
          item.slug.toLowerCase().includes(genre)
      );
    }

    const pageSize = 20;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize).map((item) => ({
      title: this.decodeHTMLEntities(item.name),
      url: item.id,
      cover: item.cover,
    }));
  }

  async detail(url) {
    const res = await this.req("/data/series_list.json");
    const list = typeof res === "string" ? JSON.parse(res) : res;
    let series = list.find((item) => item.id === url || item.slug === url);
    if (!series) {
      series = { id: url, name: url, cover: "" };
    }
    const chRes = await this.req(`/api/v1/ch?s=${series.id}`);
    const chapters = Array.isArray(chRes)
      ? chRes
      : typeof chRes === "string"
      ? JSON.parse(chRes)
      : [];
    const episodes = chapters.map((ch) => ({
      name:
        ch.chapter_name && ch.chapter_name !== "Chapter"
          ? `${ch.chapter_name} ${ch.chapter_number}`
          : `Chapter ${ch.chapter_number}`,
      url: ch.chapter_id,
    }));
    return {
      title: this.decodeHTMLEntities(series.name),
      cover: series.cover,
      desc: "",
      episodes: [
        {
          title: "Chapters",
          urls: episodes,
        },
      ],
    };
  }

  async watch(url) {
    const pgRes = await this.req(`/api/v1/pg?c=${url}`);
    const pages = Array.isArray(pgRes)
      ? pgRes
      : typeof pgRes === "string"
      ? JSON.parse(pgRes)
      : [];
    return {
      urls: pages.map((p) => p.url),
    };
  }
}
