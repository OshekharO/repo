// ==MiruExtension==
// @name         TamilYogi
// @version      v0.0.5
// @author       appdevelpo
// @lang         hi-ta
// @license      MIT
// @icon         https://tamilyogi.express/wp-content/uploads/2021/06/ty.png
// @package      tamilyogi
// @type         bangumi
// @webSite      https://tamilyogi.express
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
    async search(kw, page) {
        const path = page > 1 ? `/page/${page}/?s=${kw}` : `/?s=${kw}`;
        const res = await this.request(path);
        const cards = res.match(/<article class="movie-card">[\s\S]+?<\/article>/g) || [];
        const bangumi = [];
        cards.forEach((card) => {
            const urlMatch = card.match(/href="([^"]+)"/);
            const titleMatch = card.match(/<h3>([^<]+)<\/h3>/);
            const coverMatch = card.match(/src="([^"]+)"/);
            if (urlMatch && titleMatch) {
                bangumi.push({
                    title: titleMatch[1].trim(),
                    url: urlMatch[1],
                    cover: coverMatch ? coverMatch[1] : "",
                });
            }
        });
        return bangumi;
    }

    async latest(page) {
        const path = page > 1 ? `/movies/page/${page}/` : `/movies/`;
        const res = await this.request(path);
        const cards = res.match(/<article class="movie-card">[\s\S]+?<\/article>/g) || [];
        const bangumi = [];
        cards.forEach((card) => {
            const urlMatch = card.match(/href="([^"]+)"/);
            const titleMatch = card.match(/<h3>([^<]+)<\/h3>/);
            const coverMatch = card.match(/src="([^"]+)"/);
            if (urlMatch && titleMatch) {
                bangumi.push({
                    title: titleMatch[1].trim(),
                    url: urlMatch[1],
                    cover: coverMatch ? coverMatch[1] : "",
                });
            }
        });
        return bangumi;
    }

    async detail(url) {
        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
            },
        });

        const titleMatch = res.match(/<h1[^>]*>([\s\S]+?)<\/h1>/);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Unknown Title";

        const coverMatch = res.match(/<img[^>]+src="([^"]+)"[^>]*alt="[^"]*"/);
        const cover = coverMatch ? coverMatch[1] : "";

        const descMatch = res.match(/<div class="content-area"[^>]*>([\s\S]+?)<\/div>/);
        let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "No description available.";

        const urls = [];
        const btnMatches = res.match(/<button[^>]+class="v3-btn[^"]*"[^>]*data-url="([^"]+)"[^>]*>[\s\S]+?<b>([^<]+)<\/b>/g) || [];
        btnMatches.forEach((btn) => {
            const embedMatch = btn.match(/data-url="([^"]+)"/);
            const nameMatch = btn.match(/<b>([^<]+)<\/b>/);
            if (embedMatch && nameMatch) {
                urls.push({
                    name: nameMatch[1].trim(),
                    url: embedMatch[1].trim(),
                });
            }
        });

        const episodes = [
            {
                title: "Directory",
                urls,
            },
        ];

        return {
            title,
            cover,
            desc,
            episodes,
        };
    }

    async watch(url) {
        if (!url) {
            return {
                type: "hls",
                url: "",
            };
        }

        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
                "Referer": "https://tamilyogi.express/",
            },
        });

        const m3u8Match = res.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/) || res.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
        const streamUrl = m3u8Match ? m3u8Match[1] : url;

        return {
            type: "hls",
            url: streamUrl,
            headers: {
                "Referer": url,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        };
    }
}
