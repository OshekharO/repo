// ==MiruExtension==
// @name         Read From Net
// @version      v0.0.1
// @author       OshekharO
// @lang         en
// @license      MIT
// @package      readfrom.net
// @type         fikushon
// @webSite      https://readfrom.net
// @icon         https://static.readfrom.net//templates/readfromnet/images/logo41.png
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
  async request(url, options) {
    let res;
    try {
      res = await super.request(url, options);
    } catch (e) {
      // 403 status or connection error throws an exception in Miru app client
      await this.openWebView("https://readfrom.net/");
      res = await super.request(url, options);
    }

    // Detect Cloudflare anti-bot page or Cloudflare challenge in string response
    if (
      typeof res === "string" &&
      (res.includes("Just a moment...") ||
        res.includes("cf-mitigation") ||
        res.includes("403 Forbidden") ||
        res.includes("Attention Required! | Cloudflare") ||
        res.includes("Enable JavaScript and cookies to continue"))
    ) {
      await this.openWebView("https://readfrom.net/");
      res = await super.request(url, options);
    }

    return res;
  }

  decodeHTML(text) {
    if (!text) return "";
    const entityMap = {
      '&quot;': '"',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&nbsp;': ' ',
      '&#039;': "'",
      '&#39;': "'",
      '&rsquo;': "'",
      '&lsquo;': "'",
      '&ldquo;': '"',
      '&rdquo;': '"',
      '&mdash;': '—',
      '&ndash;': '–',
      '&hellip;': '...',
    };
    return text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
      if (entityMap[match]) {
        return entityMap[match];
      }
      if (match.startsWith("&#")) {
        const code = match.slice(2, -1);
        const num = code.startsWith("x") || code.startsWith("X")
          ? parseInt(code.slice(1), 16)
          : parseInt(code, 10);
        if (!isNaN(num)) {
          return String.fromCharCode(num);
        }
      }
      return match;
    });
  }

  parseBookList(res) {
    const books = [];
    const seenUrls = new Set();

    // Match book links: href=".../[author]/123-title.html"
    const linkRegex = /href=["']([^"']*?\/([a-zA-Z0-9_-]+\/(\d+-[a-zA-Z0-9_-]+\.html)))["']/gi;
    let match;

    while ((match = linkRegex.exec(res)) !== null) {
      const fullHref = match[1];
      const relPath = "/" + match[2];
      const bookFilename = match[3];

      if (seenUrls.has(relPath) || relPath.includes("/page,")) {
        continue;
      }

      // Find nearby HTML chunk around this match to locate title and cover image
      const startIndex = Math.max(0, match.index - 300);
      const endIndex = Math.min(res.length, match.index + 500);
      const chunk = res.substring(startIndex, endIndex);

      // Try extracting title
      let title = "";
      const titleMatch = chunk.match(/class=["']book_name["'][^>]*>([\s\S]*?)<\//i) ||
                         chunk.match(new RegExp(`href=["']` + match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `["'][^>]*>([^<]+)<\/a>`, 'i')) ||
                         chunk.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);

      if (titleMatch) {
        title = this.decodeHTML(titleMatch[1].replace(/<[^>]+>/g, "").trim());
      }

      if (!title || title.length < 2) {
        // Derive human readable title from filename slug
        const slugWithoutExt = bookFilename.replace(/^\d+-/, "").replace(/\.html$/, "");
        title = slugWithoutExt.replace(/_/g, " ").replace(/-/g, " ");
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      // Try extracting cover image
      let cover = "";
      const imgMatch = chunk.match(/src=["']([^"']*(?:picture\.readfrom\.net|\/img\/|\/uploads\/)[^"']+)["']/i) ||
                       chunk.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/i);

      if (imgMatch) {
        cover = imgMatch[1];
        if (cover.startsWith("//")) {
          cover = "https:" + cover;
        } else if (cover.startsWith("/")) {
          cover = "https://readfrom.net" + cover;
        }
      }

      seenUrls.add(relPath);
      books.push({
        title,
        url: relPath,
        cover,
      });
    }

    return books;
  }

  async latest(page) {
    const pageNum = page || 1;
    const url = pageNum === 1 ? "/" : `/allbooks/page/${pageNum}/`;
    const res = await this.request(url);
    return this.parseBookList(res);
  }

  async search(kw, page) {
    if (!kw || kw.trim().length === 0) {
      return this.latest(page);
    }
    const pageNum = page || 1;
    const query = encodeURIComponent(kw.trim());
    const url = `/build_in_search/?q=${query}&page=${pageNum}`;
    const res = await this.request(url);
    return this.parseBookList(res);
  }

  async detail(url) {
    const res = await this.request(url);

    // Title
    let title = "";
    const ogTitleMatch = res.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         res.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
                         res.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                         res.match(/center\s*>\s*<h2[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/h2>/i);
    if (ogTitleMatch) {
      title = this.decodeHTML(ogTitleMatch[1].replace(/<[^>]+>/g, "").trim().split(", \n\n")[0]);
    }

    // Cover
    let cover = "";
    const ogImgMatch = res.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                       res.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                       res.match(/src=["']([^"']*(?:picture\.readfrom\.net|\/img\/|\/uploads\/)[^"']+)["']/i);
    if (ogImgMatch) {
      cover = ogImgMatch[1];
      if (cover.startsWith("//")) {
        cover = "https:" + cover;
      } else if (cover.startsWith("/")) {
        cover = "https://readfrom.net" + cover;
      }
    }

    // Description / Synopsis
    let desc = "";
    const descBlockMatch = res.match(/<div[^>]+class=["'](?:text3|text5)["'][^>]*>([\s\S]*?)<\/div>/i) ||
                           res.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (descBlockMatch) {
      desc = this.decodeHTML(descBlockMatch[1].replace(/<[^>]+>/g, " ").trim());
    }

    // Chapters / Pages list from div.pages
    const pageUrls = [
      {
        name: "Page 1",
        url: url,
      },
    ];

    const pagesBlockMatch = res.match(/<div[^>]+class=["'][^"']*pages[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (pagesBlockMatch) {
      const pageLinks = [...pagesBlockMatch[1].matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      for (const linkMatch of pageLinks) {
        let href = linkMatch[1].trim();
        if (href.startsWith("https://readfrom.net")) {
          href = href.replace("https://readfrom.net", "");
        }
        if (!href.startsWith("/")) {
          href = "/" + href;
        }
        const name = this.decodeHTML(linkMatch[2].replace(/<[^>]+>/g, "").trim()) || `Page ${pageUrls.length + 1}`;
        if (!pageUrls.some((p) => p.url === href)) {
          pageUrls.push({
            name,
            url: href,
          });
        }
      }
    } else {
      // Fallback: search for page,N, links
      const pageMatches = [...res.matchAll(/page,(\d+),/gi)];
      let maxPage = 1;
      for (const pm of pageMatches) {
        const p = parseInt(pm[1], 10);
        if (!isNaN(p) && p > maxPage) {
          maxPage = p;
        }
      }
      for (let i = 2; i <= maxPage; i++) {
        const pageUrl = url.replace(/(\d+-[^/]+\.html)/, `page,${i},$1`);
        pageUrls.push({
          name: `Page ${i}`,
          url: pageUrl,
        });
      }
    }

    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: "Pages",
          urls: pageUrls,
        },
      ],
    };
  }

  async watch(url) {
    const res = await this.request(url);

    // Title
    let title = "";
    const titleMatch = res.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ||
                       res.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (titleMatch) {
      title = this.decodeHTML(titleMatch[1].replace(/<[^>]+>/g, "").trim());
    }

    // Extract #textToRead container if available
    let textToRead = "";
    const textToReadMatch = res.match(/<div[^>]+id=["']textToRead["'][^>]*>([\s\S]*?)<\/div>/i);
    if (textToReadMatch) {
      textToRead = textToReadMatch[1];
    } else {
      textToRead = typeof res === "string" ? res : JSON.stringify(res || {});
    }

    // Clean scripts, styles, center tags, empty spans
    textToRead = textToRead.replace(/<script[\s\S]*?<\/script>/gi, "")
                           .replace(/<style[\s\S]*?<\/style>/gi, "")
                           .replace(/<center[\s\S]*?<\/center>/gi, "")
                           .replace(/<span[^>]*><\/span>/gi, "");

    // Convert breaks and block elements to newlines
    textToRead = textToRead.replace(/<br\s*\/?>/gi, "\n")
                           .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
                           .replace(/<[^>]+>/g, "");

    const lines = textToRead.split("\n");
    const content = [];

    const ignorePhrases = [
      "select voice:", "brian (uk)", "emma (uk)", "amy (uk)", "eric (us)",
      "ivy (us)", "joey (us)", "salli (us)", "justin (us)", "jennifer (us)",
      "kimberly (us)", "kendra (us)", "russell (au)", "nicole (au)",
      "larger font", "reset font size", "smaller font", "add fast bookmark",
      "load fast bookmark", "turn navi on", "scroll up", "scroll",
      "axpoc co.", "privacy policy", "dmca policy", "search by first letter",
      "search by year", "all books by popularity", "read online", "submit"
    ];

    for (let line of lines) {
      line = this.decodeHTML(line).trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (ignorePhrases.some((phrase) => lower.includes(phrase))) {
        continue;
      }

      content.push(line);
    }

    return {
      title,
      content,
    };
  }
}
