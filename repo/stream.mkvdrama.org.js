// ==MiruExtension==
// @name         MkvDrama
// @version      v0.0.3
// @author       bachig26
// @lang         en
// @license      MIT
// @package      stream.mkvdrama.org
// @type         bangumi
// @icon         https://kisskh.top/wp-content/uploads/2024/11/Kisskh.png
// @webSite      https://kisskh.top
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async latest(page) {
    const res = await this.request(`/trending/page/${page}/`);
    const bsxList = await this.querySelectorAll(res, "article.item, article.post, article.w_item_b, div.poster");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      if (!url) continue;

      let title = "";
      const titleElem = await this.querySelector(html, "h3");
      if (titleElem) {
        title = await titleElem.text;
      }
      if (!title) {
        const imgElem = await this.querySelector(html, "img");
        if (imgElem) {
          title = await imgElem.getAttributeText("alt");
        }
      }

      let cover = "";
      const imgElem = await this.querySelector(html, "img");
      if (imgElem) {
        cover = await imgElem.getAttributeText("src");
      }

      if (title && url) {
        novel.push({
          title: title.trim(),
          url: url.startsWith("http") ? url : "https://kisskh.top" + url,
          cover,
        });
      }
    }

    // Deduplicate by URL
    const unique = [];
    const seen = new Set();
    for (const item of novel) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        unique.push(item);
      }
    }
    return unique;
  }

  async search(kw) {
    const res = await this.request(`/?s=${encodeURIComponent(kw)}`);
    const bsxList = await this.querySelectorAll(res, "article.result-item, article.item, article");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      if (!url || url.includes("/genre/") || url.includes("/release/")) continue;

      let title = "";
      const titleElem = await this.querySelector(html, "h3");
      if (titleElem) {
        title = await titleElem.text;
      }
      if (!title) {
        const imgElem = await this.querySelector(html, "img");
        if (imgElem) {
          title = await imgElem.getAttributeText("alt");
        }
      }

      let cover = "";
      const imgElem = await this.querySelector(html, "img");
      if (imgElem) {
        cover = await imgElem.getAttributeText("src");
      }

      if (title && url) {
        novel.push({
          title: title.trim(),
          url: url.startsWith("http") ? url : "https://kisskh.top" + url,
          cover,
        });
      }
    }

    // Deduplicate by URL
    const unique = [];
    const seen = new Set();
    for (const item of novel) {
      if (!seen.has(item.url)) {
        seen.add(item.url);
        unique.push(item);
      }
    }
    return unique;
  }

  async detail(url) {
    const fullUrl = url.startsWith("http") ? url : "https://kisskh.top" + url;
    const res = await this.request("", {
      headers: {
        "Miru-Url": fullUrl,
      },
    });

    let title = "";
    const titleElem = await this.querySelector(res, "h1");
    if (titleElem) {
      title = await titleElem.text;
    }

    let cover = "";
    const coverElem = await this.querySelector(res, "div.poster img, div.sheader img");
    if (coverElem) {
      cover = await coverElem.getAttributeText("src");
    }

    let desc = "";
    const descElem = await this.querySelector(res, "div#player + p, div.entry-content p, div.wp-content p");
    if (descElem) {
      desc = await descElem.text;
    }

    const episodeList = [];

    // 1. Check for episode elements in HTML if present
    const episodeElems = await this.querySelectorAll(res, "#episodes li, ul.episodios li, .num-epi a");
    if (episodeElems && episodeElems.length > 0) {
      for (const ep of episodeElems) {
        const html = await ep.content;
        const epUrl = await this.getAttributeText(html, "a", "href");
        let epTitle = "Episode";
        const titleElem = await this.querySelector(html, ".title, .numerando, a");
        if (titleElem) {
          epTitle = await titleElem.text;
        }
        if (epUrl) {
          episodeList.push({
            name: epTitle.trim(),
            url: epUrl.startsWith("http") ? epUrl : "https://kisskh.top" + epUrl,
          });
        }
      }
    }

    // 2. Default fallback to fullUrl
    if (episodeList.length === 0) {
      episodeList.push({
        name: "Full Video",
        url: fullUrl,
      });
    }

    return {
      title: title.trim(),
      cover,
      desc: desc.trim(),
      episodes: [
        {
          title: "Directory",
          urls: episodeList,
        },
      ],
    };
  }

  async watch(url) {
    const pageUrl = url.startsWith("http") ? url : "https://kisskh.top" + url;

    // Check if url is already a direct video or jwplayer source
    if (pageUrl.includes("source=")) {
      const sourceMatch = pageUrl.match(/source=([^&"'\s>]+)/i);
      if (sourceMatch) {
        try {
          const directUrl = decodeURIComponent(sourceMatch[1]);
          if (directUrl.includes(".m3u8") || directUrl.includes(".mp4")) {
            return {
              type: directUrl.includes(".m3u8") ? "hls" : "mp4",
              url: directUrl,
              headers: {
                Referer: "https://kisskh.top/",
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
            };
          }
        } catch (e) {}
      }
    }

    const res = await this.request("", {
      headers: {
        "Miru-Url": pageUrl,
      },
    });

    let directUrl = "";

    // 1. Look for iframe src
    const iframeMatches = [...res.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)];
    for (const match of iframeMatches) {
      const iframeSrc = match[1];

      // Check source param in iframe
      const sourceMatch = iframeSrc.match(/source=([^&"'\s>]+)/i);
      if (sourceMatch) {
        try {
          const decoded = decodeURIComponent(sourceMatch[1]);
          if (decoded.includes(".m3u8") || decoded.includes(".mp4")) {
            directUrl = decoded;
            break;
          }
        } catch (e) {
          if (sourceMatch[1].includes(".m3u8") || sourceMatch[1].includes(".mp4")) {
            directUrl = sourceMatch[1];
            break;
          }
        }
      }

      // Check if iframe points directly to a media file
      if (iframeSrc.includes(".m3u8") || iframeSrc.includes(".mp4")) {
        directUrl = iframeSrc;
        break;
      }

      // If iframe points to jwplayer or embed, fetch iframe content
      if (iframeSrc.includes("jwplayer") || iframeSrc.includes("embed")) {
        const fullIframe = iframeSrc.startsWith("http") ? iframeSrc : "https://kisskh.top" + iframeSrc;
        try {
          const iframeRes = await this.request("", {
            headers: {
              "Miru-Url": fullIframe,
            },
          });

          const fileMatch = iframeRes.match(/"file"\s*:\s*"([^"]+)"/);
          if (fileMatch && (fileMatch[1].includes(".m3u8") || fileMatch[1].includes(".mp4"))) {
            directUrl = fileMatch[1].replace(/\\/g, "");
            break;
          }
        } catch (e) {}
      }
    }

    // 2. Try doo_player_ajax API if directUrl not found from static iframe
    if (!directUrl) {
      const postIdMatch = res.match(/data-id=["'](\d+)["']/i) ||
                          res.match(/postid-(\d+)/i) ||
                          res.match(/data-post-id=["'](\d+)["']/i);
      if (postIdMatch) {
        const postId = postIdMatch[1];
        const epNumberMatch = pageUrl.match(/\/(\d+)\/?$/);
        const numeVal = epNumberMatch ? epNumberMatch[1] : "1";

        for (const ptype of ["movie", "tv"]) {
          try {
            const formData = new URLSearchParams();
            formData.append("action", "doo_player_ajax");
            formData.append("post", postId);
            formData.append("nume", numeVal);
            formData.append("type", ptype);

            const ajaxRes = await this.request("/wp-admin/admin-ajax.php", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Requested-With": "XMLHttpRequest",
              },
              data: formData.toString(),
            });

            const parsed = typeof ajaxRes === "string" ? JSON.parse(ajaxRes) : ajaxRes;
            if (parsed && parsed.embed_url) {
              const sourceMatch = parsed.embed_url.match(/source=([^&"'\s>]+)/i);
              if (sourceMatch) {
                const decoded = decodeURIComponent(sourceMatch[1]);
                if (decoded.includes(".m3u8") || decoded.includes(".mp4")) {
                  directUrl = decoded;
                  break;
                }
              }
            }
          } catch (e) {}
        }
      }
    }

    // 3. Direct regex match fallback on page source for m3u8 or mp4
    if (!directUrl) {
      const directMatch = res.match(/https?:\/\/[^\s'"\>]+\.(?:m3u8|mp4)[^\s'"\>]*/i);
      if (directMatch && !directMatch[0].endsWith(".js") && !directMatch[0].endsWith(".css")) {
        directUrl = directMatch[0];
      }
    }

    const isHls = directUrl.includes(".m3u8");

    return {
      type: isHls ? "hls" : "mp4",
      url: directUrl,
      headers: {
        Referer: "https://kisskh.top/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };
  }
}
