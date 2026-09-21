// ==MiruExtension==
// @name         MangaBat
// @version      v0.0.2
// @author       bethro
// @lang         en
// @license      MIT
// @icon         https://www.mangabats.com/images/favicon-bat.webp
// @package      mangabat.com
// @type         manga
// @webSite      https://www.mangabats.com
// ==/MiruExtension==

export default class extends Extension {
    async req(url) {
        const baseUrl = await this.getSetting("mangabat");
        return this.request(url, {
            headers: {
                "Miru-Url": baseUrl,
                "Referer": baseUrl + "/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });
    }

    async load() {
        this.registerSetting({
            title: "MangaBat Base URL",
            key: "mangabat",
            type: "input",
            description: "This is the URL where the comics are fetched from",
            defaultValue: "https://www.mangabats.com",
        });

        this.registerSetting({
            title: "Reverse Order of Chapters",
            key: "reverseChaptersOrder",
            type: "toggle",
            description: "Reverse the order of chapters in ascending order",
            defaultValue: "true",
        });
    }

    async latest(page) {
        const baseUrl = await this.getSetting("mangabat");
        const res = await this.req(`/genre/all?type=latest&state=all&page=${page}`);

        const matches = [...res.matchAll(/<div[^>]*class="list-comic-item-wrap"[\s\S]*?<a[^>]*href="([^"]+)"[^>]*title="([^"]*)"[\s\S]*?<img[^>]*src="([^"]+)"/gi)];

        const comic = matches.map((m) => {
            let itemUrl = m[1] || "";
            let itemTitle = m[2] || "";
            let itemCover = m[3] || "";

            if (itemUrl && itemUrl.startsWith("/")) itemUrl = baseUrl + itemUrl;
            if (itemCover && itemCover.startsWith("/")) itemCover = baseUrl + itemCover;

            return {
                url: itemUrl,
                title: itemTitle.trim(),
                cover: itemCover,
            };
        });

        return comic.filter((item) => item.url && item.title);
    }

    async search(kw, page) {
        const baseUrl = await this.getSetting("mangabat");
        const cleanKw = kw.trim().replace(/ /g, "_");
        const res = await this.req(`/search/story/${cleanKw}?page=${page}`);

        const matches = [...res.matchAll(/<div[^>]*class="story_item"[\s\S]*?<a[^>]*href="([^"]+)"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*class="story_name"[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]+?)<\/a>/gi)];

        const comic = matches.map((m) => {
            let itemUrl = m[3] || m[1] || "";
            let itemCover = m[2] || "";
            let itemTitle = (m[4] || "").replace(/<[^>]+>/g, "").trim();

            if (itemUrl && itemUrl.startsWith("/")) itemUrl = baseUrl + itemUrl;
            if (itemCover && itemCover.startsWith("/")) itemCover = baseUrl + itemCover;

            return {
                url: itemUrl,
                title: itemTitle,
                cover: itemCover,
            };
        });

        return comic.filter((item) => item.url && item.title);
    }

    async detail(url) {
        const baseUrl = await this.getSetting("mangabat");
        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
                "Referer": baseUrl + "/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        const titleMatch = res.match(/<h1[^>]*>([\s\S]+?)<\/h1>/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const coverMatch = res.match(/<div[^>]*class="thumbnail-wrap"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i) || res.match(/<div[^>]*class="manga-info-pic"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/i);
        let cover = coverMatch ? coverMatch[1] : "";
        if (cover && cover.startsWith("/")) cover = baseUrl + cover;

        const descMatch = res.match(/id="contentBox"[^>]*>([\s\S]+?)<\/div>/i) || res.match(/id="panel-story-info-description"[^>]*>([\s\S]+?)<\/div>/i) || res.match(/class="description"[^>]*>([\s\S]+?)<\/div>/i);
        let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        let episodes = [];
        const match = url.match(/\/manga\/([^\/]+)/);
        if (match) {
            const slug = match[1];
            try {
                const apiUrl = `${baseUrl}/api/manga/${slug}/chapters?limit=10000`;
                const apiRes = await this.request(apiUrl, {
                    headers: {
                        "Referer": baseUrl + "/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    },
                });
                const data = typeof apiRes === "string" ? JSON.parse(apiRes) : apiRes;
                if (data && data.success && data.data && data.data.chapters) {
                    episodes = data.data.chapters.map((c) => {
                        let epUrl = `${baseUrl}/manga/${slug}/${c.chapter_slug}`;
                        return {
                            name: String(c.chapter_name || ""),
                            url: epUrl,
                        };
                    });
                }
            } catch (e) {
                // Fallback if API fails
            }
        }

        if (episodes.length === 0) {
            const chapMatches = [...res.matchAll(/<a[^>]*href="([^"]*\/chapter-[^"]*)"[^>]*>([\s\S]+?)<\/a>/gi)];
            const seen = new Set();
            for (const m of chapMatches) {
                let epUrl = m[1] || "";
                if (!epUrl || seen.has(epUrl)) continue;
                seen.add(epUrl);
                if (epUrl.startsWith("/")) epUrl = baseUrl + epUrl;

                let epName = (m[2] || "").replace(/<[^>]+>/g, "").trim();
                episodes.push({
                    name: epName,
                    url: epUrl,
                });
            }
        }

        if ((await this.getSetting("reverseChaptersOrder")) === "true") {
            episodes.reverse();
        }

        return {
            title: title || "",
            cover: cover || "",
            desc: desc || "",
            episodes: [
                {
                    title: "Chapters",
                    urls: episodes.filter((e) => e.url && e.name),
                },
            ],
        };
    }

    async watch(url) {
        const baseUrl = await this.getSetting("mangabat");
        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
                "Referer": baseUrl + "/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        const idx = res.indexOf("container-chapter-reader");
        let containerContent = idx !== -1 ? res.slice(idx) : res;
        const commentIdx = containerContent.search(/<div[^>]*class=['\"][^'\"]*(?:comment|footer|panel-category)/i);
        if (commentIdx !== -1) {
            containerContent = containerContent.slice(0, commentIdx);
        }

        const imgMatches = [...containerContent.matchAll(/<img[^>]*src=['\"]([^'\"]+)['\"]/gi)];
        const urls = imgMatches
            .map((m) => {
                let src = (m[1] || "").trim();
                if (src && src.startsWith("/")) src = baseUrl + src;
                return src;
            })
            .filter((src) => src && !src.includes("logo") && !src.includes("banner") && !src.includes("favicon") && !src.includes("loadingimg") && !src.includes("default") && !src.includes("avatar"));

        const headers = {
            "Referer": baseUrl + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };

        return {
            urls,
            headers,
            header: headers,
        };
    }
}
