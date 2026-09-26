// ==MiruExtension==
// @name         xHamster
// @version      v0.0.2
// @author       bachig26
// @lang         en
// @license      MIT
// @package      xhamster.com
// @type         bangumi
// @icon         https://static-lvlt.xhcdn.com/xh-desktop/images/favicon/favicon-512x512.png?v=1
// @webSite      https://xhamster.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const res = await this.request(`/newest/${page}`);
    const bsxList = await this.querySelectorAll(res, "div.thumb-list__item.video-thumb");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a.video-thumb__image-container.role-pop", "href");
      const titleEl = await this.querySelector(html, "a.root-9d8b4.primary-9d8b4.video-thumb-info__name, a[data-qa='video-title']");
      const title = titleEl ? (await titleEl.text).trim() : "xHamster Video";
      const cover = await this.getAttributeText(html, "img.thumb-image-container__image", "src");
      if (url) {
        novel.push({
          title,
          url,
          cover: cover || "",
        });
      }
    }
    return novel;
  }

  async search(kw) {
    const kwstring = kw.replace(/ /g, '+');
    const res = await this.request(`/search/${kwstring}`);
    const bsxList = await this.querySelectorAll(res, "div.thumb-list__item.video-thumb");
    const novel = [];

    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a.video-thumb__image-container.role-pop", "href");
      const titleEl = await this.querySelector(html, "a.root-9d8b4.primary-9d8b4.video-thumb-info__name, a[data-qa='video-title']");
      const title = titleEl ? (await titleEl.text).trim() : "xHamster Video";
      const cover = await this.getAttributeText(html, "img.thumb-image-container__image", "src");
      if (url) {
        novel.push({
          title,
          url,
          cover: cover || "",
        });
      }
    }
    return novel;
  }

  async detail(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
	  
    const titleEl = await this.querySelector(res, "meta[property='og:title']");
    const title = titleEl ? await titleEl.getAttributeText("content") : "xHamster Video";
    const coverEl = await this.querySelector(res, "meta[property='og:image']");
    const cover = coverEl ? await coverEl.getAttributeText("content") : "";

    const urlPatterns = [
      /https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/i,
      /https?:\/\/[^\s'"]+\.mp4[^\s'"]*/i,
      /<link rel="preload" href="([^"]+)"/i
    ];
	  
    let episodeUrl = "";

    for (const pattern of urlPatterns) {
      const match = res.match(pattern);
      if (match) {
        episodeUrl = match[1] || match[0];
        break;
      }
    }

    if (!episodeUrl) {
      episodeUrl = url;
    }

    return {
      title: title.trim(),
      cover,
      episodes: [
        {
          title: "Directory",
          urls: [
            {
              name: title.trim(),
              url: episodeUrl,
            },
          ],
        },
      ],
    };
  }

  async watch(url) {
    if (url.includes(".m3u8") || url.includes(".mp4")) {
      return {
        type: url.includes(".mp4") ? "mp4" : "hls",
        url: url,
        headers: {
          "referer": "https://xhamster.com/",
          "origin": "https://xhamster.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      };
    }

    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
        "referer": "https://xhamster.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const m3u8Match = res.match(/(https?:\/\/[^\s'"]+\.m3u8[^\s'"]*)/i) || res.match(/(https?:\/\/[^\s'"]+\.mp4[^\s'"]*)/i);
    const playUrl = m3u8Match ? m3u8Match[1] : url;

    return {
      type: playUrl.includes(".mp4") ? "mp4" : "hls",
      url: playUrl || "",
      headers: {
        "referer": "https://xhamster.com/",
        "origin": "https://xhamster.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    };
  }
}
