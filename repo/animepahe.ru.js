// ==MiruExtension==
// @name         Animepahe
// @version      v0.0.4
// @author       appdevelpo
// @lang         en
// @license      MIT
// @icon         https://animepahe.pw/favicon.ico
// @package      animepahe.ru
// @type         bangumi
// @webSite      https://animepahe.pw
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async req(url) {
    const baseUrl = (await this.getSetting("animepahe")) || "https://animepahe.pw";
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
      description: "Homepage URL for Animepahe (e.g. https://animepahe.pw or https://animepahe.ng)",
      defaultValue: "https://animepahe.pw",
    });
  }

  async latest(page) {
    try {
      // Try JSON API first (used by animepahe.pw / animepahe.org / animepahe.ru)
      const apiRes = await this.req(`/api?m=airing&page=${page}`);
      try {
        const json = typeof apiRes === "string" ? JSON.parse(apiRes) : apiRes;
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((item) => ({
            title: item.anime_title || item.title,
            url: (item.anime_session || item.session).toString(),
            cover: item.snapshot || item.poster,
          }));
        }
      } catch (e) {}

      // Fallback to HTML parsing (used by animepahe.ng / Dramastream)
      const res = await this.req(`/latest-releases/page/${page}/`);
      const latest = await this.querySelectorAll(res, "div.listupd > article.bs");

      if (latest && latest.length > 0) {
        return await Promise.all(
          latest.map(async (element) => {
            const html = element.content;
            const [url, title, cover, update] = await Promise.all([
              this.getAttributeText(html, "div.bsx > a", "href"),
              this.getAttributeText(html, "div.bsx > a", "title"),
              this.getAttributeText(html, "img", "src"),
              this.querySelector(html, "span.epx").text,
            ]);

            return {
              title: (title || (await this.querySelector(html, "div.tt").text)).trim(),
              url,
              cover,
              update: update ? update.trim() : "",
            };
          })
        );
      }

      throw new Error("No data found");
    } catch (e) {
      return [
        {
          title: "Need to use webview",
          url: "/",
          cover: null,
        },
      ];
    }
  }

  async search(kw, page) {
    try {
      // Try JSON API first
      const apiRes = await this.req(`/api?m=search&q=${encodeURIComponent(kw)}`);
      try {
        const json = typeof apiRes === "string" ? JSON.parse(apiRes) : apiRes;
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.map((item) => ({
            title: item.title,
            url: item.session.toString(),
            cover: item.poster,
          }));
        }
      } catch (e) {}

      // Fallback to HTML search
      const res = await this.req(`/?s=${encodeURIComponent(kw)}`);
      const searchList = await this.querySelectorAll(res, "div.listupd > article.bs");

      if (searchList && searchList.length > 0) {
        return await Promise.all(
          searchList.map(async (element) => {
            const html = element.content;
            const [url, title, cover] = await Promise.all([
              this.getAttributeText(html, "div.bsx > a", "href"),
              this.getAttributeText(html, "div.bsx > a", "title"),
              this.getAttributeText(html, "img", "src"),
            ]);

            return {
              title: (title || (await this.querySelector(html, "div.tt").text)).trim(),
              url,
              cover,
            };
          })
        );
      }

      return [];
    } catch (e) {
      return [
        {
          title: "Need to use webview",
          url: "/",
          cover: null,
        },
      ];
    }
  }

  async detail(url) {
    if (url === "/") {
      return {
        title: "Use webview",
        cover: null,
        desc: "Please use webview to enter the website then close the webview window.",
      };
    }

    try {
      const requestUrl = url.startsWith("http") ? url : `/anime/${url}`;
      const res = await this.request("", {
        headers: {
          "Miru-Url": requestUrl,
        },
      });

      // Try JSON API for episode list if session url
      if (!url.startsWith("http")) {
        try {
          const epRes = await this.req(`/api?m=release&id=${url}`);
          const json = typeof epRes === "string" ? JSON.parse(epRes) : epRes;
          if (json && Array.isArray(json.data)) {
            const title = (await this.querySelector(res, ".user-select-none > span")).text;
            const coverMatch = res.match(/<a href="(https:\/\/[^"]+posters.+?)"/);
            const cover = coverMatch ? coverMatch[1] : null;
            const desc = (await this.querySelector(res, ".anime-synopsis")).text;
            const reverse_data = json.data.reverse();

            return {
              title: title.trim(),
              cover,
              desc: desc ? desc.trim() : "",
              episodes: [
                {
                  title: "SubsPlease-360p",
                  urls: reverse_data.map((item) => ({
                    name: `Episode ${item.episode}`,
                    url: `${url}/${item.session};0`,
                  })),
                },
                {
                  title: "SubsPlease-720p",
                  urls: reverse_data.map((item) => ({
                    name: `Episode ${item.episode}`,
                    url: `${url}/${item.session};1`,
                  })),
                },
                {
                  title: "SubsPlease-1080p",
                  urls: reverse_data.map((item) => ({
                    name: `Episode ${item.episode}`,
                    url: `${url}/${item.session};2`,
                  })),
                },
              ],
            };
          }
        } catch (e) {}
      }

      // HTML Detail parsing
      let title = await this.querySelector(res, "h1.entry-title").text;
      if (!title) {
        title = await this.querySelector(res, "div.det > h2").text;
      }

      let cover = await this.getAttributeText(res, "div.thumb > img", "src");
      if (!cover) {
        cover = await this.getAttributeText(res, "div.thumbnel > img", "src");
      }

      let desc = await this.querySelector(res, "div.entry-content[itemprop='description']").text;
      if (!desc) {
        desc = await this.querySelector(res, "div.entry-content").text;
      }

      let epList = await this.querySelectorAll(res, "div.eplister > ul > li");
      if (epList.length === 0) {
        epList = await this.querySelectorAll(res, "div.episodelist > ul > li");
      }

      const episodes = await Promise.all(
        epList.map(async (element) => {
          const html = element.content;
          let name = await this.querySelector(html, "div.epl-title").text;
          if (!name) {
            name = await this.querySelector(html, "div.playinfo > h3").text;
          }
          if (!name) {
            name = await this.getAttributeText(html, "a", "title");
          }
          const episodeUrl = await this.getAttributeText(html, "a", "href");
          return { name: name ? name.trim() : "", url: episodeUrl };
        })
      );

      return {
        title: title ? title.trim() : "",
        cover,
        desc: desc ? desc.trim() : "",
        episodes: [{ title: "Episodes", urls: episodes }],
      };
    } catch (e) {
      return {
        title: "Error loading detail",
        cover: null,
        desc: e.message,
      };
    }
  }

  async watch(url) {
    if (url.includes(";")) {
      const url_split = url.split(";");
      const baseUrl = (await this.getSetting("animepahe")) || "https://animepahe.pw";
      const res = await this.request("", {
        headers: {
          "Miru-Url": `${baseUrl}/play/${url_split[0]}`,
        },
      });

      const matches = res.match(/data-src="(https:\/\/[^"]+)"/g);
      if (matches && matches[parseInt(url_split[1])]) {
        const src = matches[parseInt(url_split[1])].match(/data-src="(.+?)"/)[1];
        const hid_res = await this.request("", {
          headers: {
            "Miru-Url": src,
            "Referer": baseUrl,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
          },
        });
        const hid_script = hid_res.match(/eval\(f.+?\}\)\)/g)[1];
        const decode_script = eval(hid_script.match(/eval(.+)/)[1]);
        const decode_url = decode_script.match(/source='(.+?)'/)[1];
        return {
          type: "hls",
          url: decode_url,
        };
      }
    }

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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
