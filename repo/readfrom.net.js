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
  async request(url, options = {}) {
    options.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://readfrom.net/",
      ...options.headers,
    };

    let res = await super.request(url, options);

    // Detect Cloudflare anti-bot page or Cloudflare challenge
    if (
      typeof res === "string" &&
      (res.includes("Just a moment...") ||
        res.includes("cf-mitigation") ||
        res.includes("Attention Required! | Cloudflare") ||
        res.includes("Enable JavaScript and cookies to continue"))
    ) {
      const targetUrl = options?.headers?.["Miru-Url"] || (url ? (url.startsWith("http") ? url : `https://readfrom.net${url.startsWith("/") ? "" : "/"}${url}`) : "https://readfrom.net/");
      // Open WebView so user can complete Cloudflare captcha
      await this.openWebView(targetUrl);

      // Retry request with updated Cloudflare cookies
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
    const url = pageNum === 1 ? "/allbooks/" : `/allbooks/page/${pageNum}/`;
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
                         res.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (ogTitleMatch) {
      title = this.decodeHTML(ogTitleMatch[1].replace(/<[^>]+>/g, "").trim());
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
    const ogDescMatch = res.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        res.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (ogDescMatch) {
      desc = this.decodeHTML(ogDescMatch[1].trim());
    }

    // Find max page number in pagination
    const pageMatches = [...res.matchAll(/page,(\d+),/gi)];
    let maxPage = 1;
    for (const pm of pageMatches) {
      const p = parseInt(pm[1], 10);
      if (!isNaN(p) && p > maxPage) {
        maxPage = p;
      }
    }

    const episodes = [];
    const pageUrls = [];

    for (let i = 1; i <= maxPage; i++) {
      let pageUrl = url;
      if (i > 1) {
        pageUrl = url.replace(/(\d+-[^/]+\.html)/, `page,${i},$1`);
      }
      pageUrls.push({
        name: `Page ${i}`,
        url: pageUrl,
      });
    }

    episodes.push({
      title: "Pages",
      urls: pageUrls,
    });

    return {
      title,
      cover,
      desc,
      episodes,
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

    // Process content body
    let rawContent = typeof res === "string" ? res : JSON.stringify(res || {});

    // Remove scripts and styles
    rawContent = rawContent.replace(/<script[\s\S]*?<\/script>/gi, "")
                           .replace(/<style[\s\S]*?<\/style>/gi, "");

    // Convert breaks and block elements to newlines
    rawContent = rawContent.replace(/<br\s*\/?>/gi, "\n")
                           .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
                           .replace(/<[^>]+>/g, "");

    const lines = rawContent.split("\n");
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
      if (ignorePhrases.some(phrase => lower.includes(phrase))) {
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
