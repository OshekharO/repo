// ==MiruExtension==
// @name         FilmyWape
// @version      v0.0.1
// @author       jules
// @lang         hi
// @license      MIT
// @icon         https://filmywape.com/templates/filmyfly/images/logo.webp
// @package      filmywape.com
// @type         bangumi
// @webSite      https://filmywape.com
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    try {
      const url = page === 1 ? "/" : `/page/${page}/`;
      const res = await this.request(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://filmywape.com/",
        },
      });

      const cards = await this.querySelectorAll(res, "a.row-thumb-link");
      const list = [];

      for (const card of cards) {
        const html = card.content;
        const href = await this.getAttributeText(html, "a", "href");
        const img = await this.querySelector(html, "img");
        let cover = await img.getAttributeText("src");
        if (!cover) {
          cover = await img.getAttributeText("data-src");
        }
        let title = await img.getAttributeText("alt");

        if (!title) {
          title = await img.getAttributeText("title");
        }

        if (href && title) {
          let fullUrl = href.startsWith("http") ? href : `https://filmywape.com${href.startsWith("/") ? "" : "/"}${href}`;
          let fullCover = cover ? (cover.startsWith("http") ? cover : `https://filmywape.com${cover.startsWith("/") ? "" : "/"}${cover}`) : null;

          list.push({
            title: title.trim(),
            url: fullUrl,
            cover: fullCover,
          });
        }
      }

      return list;
    } catch (e) {
      return [];
    }
  }

  async search(kw, page) {
    try {
      if (page > 1) {
        return [];
      }
      const res = await this.request("/", {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://filmywape.com/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: `do=search&subaction=search&story=${encodeURIComponent(kw.trim())}`,
      });

      const cards = await this.querySelectorAll(res, "a.row-thumb-link");
      const list = [];

      for (const card of cards) {
        const html = card.content;
        const href = await this.getAttributeText(html, "a", "href");
        const img = await this.querySelector(html, "img");
        let cover = await img.getAttributeText("src");
        if (!cover) {
          cover = await img.getAttributeText("data-src");
        }
        let title = await img.getAttributeText("alt");

        if (!title) {
          title = await img.getAttributeText("title");
        }

        if (href && title) {
          let fullUrl = href.startsWith("http") ? href : `https://filmywape.com${href.startsWith("/") ? "" : "/"}${href}`;
          let fullCover = cover ? (cover.startsWith("http") ? cover : `https://filmywape.com${cover.startsWith("/") ? "" : "/"}${cover}`) : null;

          list.push({
            title: title.trim(),
            url: fullUrl,
            cover: fullCover,
          });
        }
      }

      return list;
    } catch (e) {
      return [];
    }
  }

  async detail(url) {
    try {
      const reqUrl = url.startsWith("http") ? url : `https://filmywape.com${url.startsWith("/") ? "" : "/"}${url}`;
      const res = await this.request("", {
        headers: {
          "Miru-Url": reqUrl,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Referer": "https://filmywape.com/",
        },
      });

      let title = "";
      const ogTitle = await this.querySelector(res, "meta[property='og:title']");
      if (ogTitle) {
        title = await ogTitle.getAttributeText("content");
      }
      if (!title) {
        const h1 = await this.querySelector(res, "h1");
        title = h1 ? await h1.text : "Movie Detail";
      }

      let cover = "";
      const ogImage = await this.querySelector(res, "meta[property='og:image']");
      if (ogImage) {
        cover = await ogImage.getAttributeText("content");
      }

      let desc = "";
      const ogDesc = await this.querySelector(res, "meta[name='description']");
      if (ogDesc) {
        desc = await ogDesc.getAttributeText("content");
      }

      const links = await this.querySelectorAll(res, "a");
      const downloadUrls = [];

      for (const link of links) {
        const lHtml = link.content;
        const href = await this.getAttributeText(lHtml, "a", "href");
        const aElem = await this.querySelector(lHtml, "a");
        const text = aElem ? await aElem.text : "";

        if (href && (href.includes("download") || href.includes("cloud") || href.includes("file") || text.toLowerCase().includes("download"))) {
          if (href === "/" || href.includes("page-how-to-download-movie")) {
            continue;
          }
          let fullHref = href.startsWith("http") ? href : `https://filmywape.com${href.startsWith("/") ? "" : "/"}${href}`;
          const name = text ? text.trim() : "Download Link";
          if (!downloadUrls.some((item) => item.url === fullHref)) {
            downloadUrls.push({
              name: name,
              url: fullHref,
            });
          }
        }
      }

      return {
        title: title.trim(),
        cover: cover ? (cover.startsWith("http") ? cover : `https://filmywape.com${cover.startsWith("/") ? "" : "/"}${cover}`) : null,
        desc: desc.trim(),
        episodes: [
          {
            title: "Download / Stream Links",
            urls: downloadUrls,
          },
        ],
      };
    } catch (e) {
      return {
        title: "Error loading detail",
        cover: null,
        desc: e.toString(),
        episodes: [],
      };
    }
  }

  async watch(url) {
    let type = "mp4";
    if (url.includes(".m3u8") || url.includes("m3u8")) {
      type = "hls";
    }

    return {
      type: type,
      url: url,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://filmywape.com/",
      },
    };
  }
}
