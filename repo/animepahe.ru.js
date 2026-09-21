// ==MiruExtension==
// @name         Animepahe
// @version      v0.0.4
// @author       appdevelpo
// @lang         en
// @license      MIT
// @icon         https://animepahe.ng/wp-content/uploads/2026/04/favicon.png
// @package      animepahe.ru
// @type         bangumi
// @webSite      https://animepahe.ng
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async req(url) {
    const baseUrl = (await this.getSetting("animepahe")) || "https://animepahe.ng";
    return this.request("", {
      headers: {
        "Miru-Url": `${baseUrl}${url}`,
      },
    });
  }

  async load() {
    this.registerSetting({
      title: "Animepahe URL",
      key: "animepahe",
      type: "input",
      description: "Homepage URL for Animepahe",
      defaultValue: "https://animepahe.ng",
    });
  }

  async latest(page) {
    const res = await this.req(`/latest-releases/page/${page}/`);
    const latest = await this.querySelectorAll(res, "div.listupd > article.bs");

    return await Promise.all(
      latest.map(async (element) => {
        const html = element.content;
        const [url, title, cover, update] = await Promise.all([
          this.getAttributeText(html, "div.bsx > a", "href"),
          this.querySelector(html, "div.tt").text,
          this.getAttributeText(html, "img", "src"),
          this.querySelector(html, "span.epx").text,
        ]);

        return {
          title: title.trim(),
          url,
          cover,
          update: update ? update.trim() : "",
        };
      })
    );
  }

  async search(kw, page) {
    const res = await this.req(`/?s=${encodeURIComponent(kw)}`);
    const searchList = await this.querySelectorAll(res, "div.listupd > article.bs");

    return await Promise.all(
      searchList.map(async (element) => {
        const html = element.content;
        const [url, title, cover] = await Promise.all([
          this.getAttributeText(html, "div.bsx > a", "href"),
          this.querySelector(html, "div.tt").text,
          this.getAttributeText(html, "img", "src"),
        ]);

        return {
          title: title.trim(),
          url,
          cover,
        };
      })
    );
  }

  async detail(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
      },
    });

    const [title, cover, desc] = await Promise.all([
      this.querySelector(res, "h1.entry-title").text,
      this.getAttributeText(res, "div.thumb > img", "src"),
      this.querySelector(res, "div.entry-content[itemprop='description']").text,
    ]);

    const epList = await this.querySelectorAll(res, "div.eplister > ul > li");

    const episodes = await Promise.all(
      epList.map(async (element) => {
        const html = element.content;
        const name = await this.querySelector(html, "div.epl-title").text;
        const episodeUrl = await this.getAttributeText(html, "a", "href");
        return { name: name.trim(), url: episodeUrl };
      })
    );

    return {
      title: title.trim(),
      cover,
      desc: desc ? desc.trim() : "",
      episodes: [{ title: "Episodes", urls: episodes }],
    };
  }

  async watch(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
      },
    });

    const mirrorOptions = await this.querySelectorAll(res, "select.mirror > option");
    let iframeSrc = "";

    for (const opt of mirrorOptions) {
      const val = opt.getAttributeText("value");
      if (val) {
        try {
          const decoded = atob(val);
          const m = decoded.match(/src=["']([^"']+)["']/i);
          if (m) {
            iframeSrc = m[1];
            break;
          }
        } catch (e) {}
      }
    }

    if (!iframeSrc) {
      iframeSrc = await this.getAttributeText(res, "div.player-embed > iframe", "src");
    }

    if (!iframeSrc) {
      throw new Error("No video player found");
    }

    if (iframeSrc.startsWith("//")) {
      iframeSrc = "https:" + iframeSrc;
    }

    // Check if direct m3u8 in url query param
    const m3u8Match = iframeSrc.match(/m3u8=([^&]+)/);
    if (m3u8Match) {
      return {
        type: "hls",
        url: decodeURIComponent(m3u8Match[1]),
      };
    }

    const embedRes = await this.request("", {
      headers: {
        "Miru-Url": iframeSrc,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const evalMatch = embedRes.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]+?\.split\('\|'\)\)\)/);
    if (!evalMatch) {
      const videoSrc = embedRes.match(/<source[^>]+src=["']([^"']+)["']/i);
      if (videoSrc) {
        return {
          type: videoSrc[1].includes(".m3u8") ? "hls" : "mp4",
          url: videoSrc[1],
        };
      }
      throw new Error("Failed to extract video stream from embed");
    }

    const unpacked = eval(evalMatch[0].replace(/^eval/, ""));
    const fileMatch = unpacked.match(/file:\s*["']([^"']+)["']/);
    if (!fileMatch) {
      throw new Error("Failed to find stream URL in unpacked code");
    }

    const streamUrl = fileMatch[1];
    return {
      type: streamUrl.includes(".m3u8") ? "hls" : "mp4",
      url: streamUrl,
    };
  }
}
