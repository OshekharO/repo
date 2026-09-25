// ==MiruExtension==
// @name         Filmpalast
// @version      v0.0.1
// @author       appdevelpo
// @lang         de
// @license      MIT
// @icon         https://filmpalast.to/themes/downloadarchive/images/favicon.ico
// @package      filmpalast.to
// @type         bangumi
// @webSite      https://filmpalast.to
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    try {
      const res = await this.request(`/movies/new/page/${page}`);
      const articles = res.match(/<article class="liste[^"]*"[\s\S]+?<\/article>/g) || [];
      const list = [];
      articles.forEach((a) => {
        const urlMatch = a.match(/href="([^"]+)"/);
        const titleMatch = a.match(/h2 class="rb">[\s\S]*?<a[^>]*>([^<]+)<\/a>/) || a.match(/title="([^"]+)"/);
        const coverMatch = a.match(/src="([^"]*movies[^"]*)"/);

        if (urlMatch && titleMatch) {
          let url = urlMatch[1];
          if (!url.startsWith("http")) {
            url = url.startsWith("//") ? "https:" + url : "https://filmpalast.to" + url;
          }
          let cover = coverMatch ? coverMatch[1] : "";
          if (cover && !cover.startsWith("http")) {
            cover = cover.startsWith("//") ? "https:" + cover : "https://filmpalast.to" + cover;
          }
          list.push({
            title: titleMatch[1].trim(),
            url,
            cover,
          });
        }
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  async search(kw, page) {
    try {
      const path = page > 1 ? `/search/title/${encodeURIComponent(kw)}/${page}` : `/search/title/${encodeURIComponent(kw)}`;
      const res = await this.request(path);
      const articles = res.match(/<article class="liste[^"]*"[\s\S]+?<\/article>/g) || [];
      const list = [];
      articles.forEach((a) => {
        const urlMatch = a.match(/href="([^"]+)"/);
        const titleMatch = a.match(/h2 class="(?:h2-start|rb)">[\s\S]*?<a[^>]*>([^<]+)<\/a>/) || a.match(/title="([^"]+)"/);
        const coverMatch = a.match(/src="([^"]*movies[^"]*)"/);

        if (urlMatch && titleMatch) {
          let url = urlMatch[1];
          if (!url.startsWith("http")) {
            url = url.startsWith("//") ? "https:" + url : "https://filmpalast.to" + url;
          }
          let cover = coverMatch ? coverMatch[1] : "";
          if (cover && !cover.startsWith("http")) {
            cover = cover.startsWith("//") ? "https:" + cover : "https://filmpalast.to" + cover;
          }
          list.push({
            title: titleMatch[1].trim(),
            url,
            cover,
          });
        }
      });
      return list;
    } catch (e) {
      return [];
    }
  }

  async detail(url) {
    try {
      const fullUrl = url.startsWith("http")
        ? url
        : url.startsWith("//")
        ? "https:" + url
        : "https://filmpalast.to" + url;

      const html = await this.request("", {
        headers: {
          "Miru-Url": fullUrl,
        },
      });

      // Extract Title
      let title = "";
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        let t = titleMatch[1]
          .replace(/ Stream kostenlos online in HD anschauen.*/i, "")
          .replace(/ online streamen.*/i, "")
          .replace(/Filmpalast\.to.*/i, "")
          .trim();
        t = t.replace(/^(Serie|Film)\s+/i, "");
        t = t.replace(/\s+S\d+E\d+.*$/i, "");
        title = t.trim();
      }

      // Extract Cover
      const coverMatch = html.match(/<img[^>]+src="([^"]*movies[^"]*)"/);
      let cover = coverMatch ? coverMatch[1] : "";
      if (cover && !cover.startsWith("http")) {
        cover = cover.startsWith("//") ? "https:" + cover : "https://filmpalast.to" + cover;
      }

      // Extract Description
      const descMatch = html.match(/class="moviedescription">[\s\S]*?<b>Beschreibung:<\/b>([\s\S]+?)<\/div>/);
      const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      // Check if Series or Movie
      const loops = html.split(/<div\s+class="staffelWrapperLoop/).slice(1);

      const episodes = [];
      if (loops.length > 0) {
        // Series parsing
        for (let i = 0; i < loops.length; i++) {
          const loop = loops[i];
          const sidMatch = loop.match(/data-sid="(\d+)"/);
          const sid = sidMatch ? sidMatch[1] : `${i + 1}`;
          const seasonTitle = `Staffel ${sid}`;

          const epMatches = [...loop.matchAll(/<a[^>]*href="([^"]+)"[^>]*class="getStaffelStream"[\s\S]+?<i class="fa fa-chain"><\/i>\s*([^&<]+)/g)];
          const seasonUrls = [];
          for (const ep of epMatches) {
            let epUrl = ep[1];
            if (!epUrl.startsWith("http")) {
              epUrl = epUrl.startsWith("//") ? "https:" + epUrl : "https://filmpalast.to" + epUrl;
            }
            seasonUrls.push({
              name: ep[2].trim(),
              url: epUrl,
            });
          }
          if (seasonUrls.length > 0) {
            episodes.push({
              title: seasonTitle,
              urls: seasonUrls,
            });
          }
        }
      } else {
        // Movie parsing
        const hosterBlocks = html.match(/<ul class="currentStreamLinks">[\s\S]+?<\/ul>/g) || [];
        const movieUrls = [];
        for (const hb of hosterBlocks) {
          const hName = hb.match(/class="hostName">([^<]+)<\/p>/);
          const hUrl = hb.match(/data-player-url="([^"]+)"/) || hb.match(/href="([^"]+)"/);
          if (hUrl) {
            const name = hName ? hName[1].trim() : "Server";
            movieUrls.push({
              name,
              url: hUrl[1],
            });
          }
        }
        if (movieUrls.length > 0) {
          episodes.push({
            title: "Movie",
            urls: movieUrls,
          });
        }
      }

      return {
        title,
        cover,
        desc,
        episodes,
      };
    } catch (e) {
      return {
        title: "",
        cover: "",
        desc: "",
        episodes: [],
      };
    }
  }

  async watch(url) {
    try {
      if (!url) {
        return { type: "hls", url: "" };
      }

      let targetUrl = url;

      // If this is a Filmpalast episode URL (series episode detail), fetch hosters from it
      if (url.includes("filmpalast.to/stream/")) {
        const fullUrl = url.startsWith("http")
          ? url
          : url.startsWith("//")
          ? "https:" + url
          : "https://filmpalast.to" + url;

        const html = await this.request("", {
          headers: {
            "Miru-Url": fullUrl,
          },
        });

        const hosterBlocks = html.match(/<ul class="currentStreamLinks">[\s\S]+?<\/ul>/g) || [];
        for (const hb of hosterBlocks) {
          const hUrl = hb.match(/data-player-url="([^"]+)"/) || hb.match(/href="([^"]+)"/);
          if (hUrl && hUrl[1] && !hUrl[1].includes("filmpalast.to") && !hUrl[1].startsWith("#")) {
            targetUrl = hUrl[1];
            break;
          }
        }
      }

      if (targetUrl.startsWith("//")) {
        targetUrl = "https:" + targetUrl;
      }

      // Check if direct stream or embed page
      if (targetUrl.includes(".m3u8") || targetUrl.includes(".mp4")) {
        return {
          type: targetUrl.includes(".mp4") ? "mp4" : "hls",
          url: targetUrl,
        };
      }

      // Resolve embed page for video source link
      let directUrl = targetUrl;
      let headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      try {
        const embedRes = await this.request("", {
          headers: {
            "Miru-Url": targetUrl,
            "User-Agent": headers["User-Agent"],
          },
        });

        if (typeof embedRes === "string") {
          const m3u8Match = embedRes.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/);
          const mp4Match = embedRes.match(/https?:\/\/[^\s'"]+\.mp4[^\s'"]*/);

          if (m3u8Match) {
            directUrl = m3u8Match[0];
          } else if (mp4Match) {
            directUrl = mp4Match[0];
          }
        }
      } catch (e) {
        // Fall back to targetUrl
      }

      return {
        type: directUrl.includes(".mp4") ? "mp4" : "hls",
        url: directUrl,
        headers,
      };
    } catch (e) {
      return {
        type: "hls",
        url: "",
      };
    }
  }
}
