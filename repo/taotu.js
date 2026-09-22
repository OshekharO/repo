// ==MiruExtension==
// @name         Taotu[Photo]
// @version      v0.0.2
// @author       OshekharO
// @lang         all
// @license      MIT
// @package      taotu
// @type         manga
// @icon         https://res.taotu.org/favicon.ico
// @webSite      https://en.taotu.org
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": `https://en.taotu.org/page-${page}.html`,
      },
    });

    const elList = await this.querySelectorAll(res, "div.piclist > div");
    const mangas = [];
    for (const element of elList) {
      const html = await element.content;
      const titleEl = await this.querySelector(html, "h2");
      let title = (titleEl ? await titleEl.text : "") || (await this.getAttributeText(html, "img", "alt")) || "";
      const url = await this.getAttributeText(html, "a", "href");
      const cover = await this.getAttributeText(html, "img", "src");
      if (url && cover) {
        mangas.push({
          title: title.trim(),
          url,
          cover,
        });
      }
    }
    return mangas;
  }

  async search(kw, page) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": `https://en.taotu.org/s?q=${encodeURIComponent(kw)}&page=${page}`,
      },
    });

    const elList = await this.querySelectorAll(res, "div.piclist > div");
    const mangas = [];
    for (const element of elList) {
      const html = await element.content;
      const titleEl = await this.querySelector(html, "h2");
      let title = (titleEl ? await titleEl.text : "") || (await this.getAttributeText(html, "img", "alt")) || "";
      const url = await this.getAttributeText(html, "a", "href");
      const cover = await this.getAttributeText(html, "img", "src");
      if (url && cover) {
        mangas.push({
          title: title.trim(),
          url,
          cover,
        });
      }
    }
    return mangas;
  }

  async detail(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url.startsWith("http") ? url : `https://en.taotu.org${url}`,
      },
    });

    const titleEl = await this.querySelector(res, "h1, a.active");
    const title = titleEl ? (await titleEl.text).trim() : "";
    const cover = await this.getAttributeText(res, "div.piclist img", "src");
    const descEl = await this.querySelector(res, "meta[name='description']");
    const desc = descEl ? await this.getAttributeText(res, "meta[name='description']", "content") : "";

    return {
      title,
      cover: cover || "",
      desc: desc || "",
      episodes: [
        {
          title: "Directory",
          urls: [
            {
              name: title || "Gallery",
              url: url,
            },
          ],
        },
      ],
    };
  }

  async watch(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url.startsWith("http") ? url : `https://en.taotu.org${url}`,
      },
    });

    const elList = await this.querySelectorAll(res, "div.piclist > a");
    const images = [];
    for (const element of elList) {
      const html = await element.content;
      const href = (await this.getAttributeText(html, "a", "href")) || (await this.getAttributeText(html, "img", "src"));
      if (href) {
        images.push(href);
      }
    }

    return {
      urls: images.length > 0 ? images : [url],
    };
  }
}
