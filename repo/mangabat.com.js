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
        return this.request(url, {
            headers: {
                "Miru-Url": await this.getSetting("mangabat"),
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
        let res = await this.req(`/genre/all?type=latest&state=all&page=${page}`);

        let items = await this.querySelectorAll(res, ".list-comic-item-wrap");

        let respItems = await Promise.all(items.map(async (item) => {
            let url = (await this.getAttributeText(item.content, "a.cover", "href")) || "";
            if (!url) url = (await this.getAttributeText(item.content, "h3 a", "href")) || "";

            let titleObj = await this.querySelector(item.content, "h3 a");
            let title = (titleObj && titleObj.text) ? titleObj.text.trim() : "";
            if (!title) title = (await this.getAttributeText(item.content, "a.cover", "title")) || "";

            let cover = (await this.getAttributeText(item.content, "img", "src")) || "";
            if (!cover) cover = (await this.getAttributeText(item.content, "img", "data-src")) || "";

            if (url && url.startsWith("/")) url = baseUrl + url;
            if (cover && cover.startsWith("/")) cover = baseUrl + cover;

            return {
                url: url || "",
                cover: cover || "",
                title: title || "",
            };
        }));

        return respItems.filter((i) => i.url && i.title);
    }

    async search(kw, page) {
        const baseUrl = await this.getSetting("mangabat");
        const cleanKw = kw.trim().replace(/ /g, "_");
        let res = await this.req(`/search/story/${cleanKw}?page=${page}`);

        let items = await this.querySelectorAll(res, ".story_item");

        let respItems = await Promise.all(items.map(async (item) => {
            let url = (await this.getAttributeText(item.content, "h3.story_name a", "href")) || "";
            if (!url) url = (await this.getAttributeText(item.content, "a", "href")) || "";

            let titleObj = await this.querySelector(item.content, "h3.story_name a");
            let title = (titleObj && titleObj.text) ? titleObj.text.trim() : "";
            if (!title) title = (await this.getAttributeText(item.content, "a", "title")) || "";

            let cover = (await this.getAttributeText(item.content, "img", "src")) || "";
            if (!cover) cover = (await this.getAttributeText(item.content, "img", "data-src")) || "";

            if (url && url.startsWith("/")) url = baseUrl + url;
            if (cover && cover.startsWith("/")) cover = baseUrl + cover;

            return {
                url: url || "",
                cover: cover || "",
                title: title || "",
            };
        }));

        return respItems.filter((i) => i.url && i.title);
    }

    async detail(url) {
        let res = await this.request('', {
            headers: {
                "Miru-Url": url,
            },
        });

        const baseUrl = await this.getSetting("mangabat");

        let titleObj = await this.querySelector(res, "h1");
        let title = (titleObj && titleObj.text) ? titleObj.text.trim() : "";

        let cover = (await this.getAttributeText(res, ".thumbnail-wrap img", "src")) || "";
        if (!cover) cover = (await this.getAttributeText(res, ".manga-info-pic img", "src")) || "";
        if (cover && cover.startsWith("/")) cover = baseUrl + cover;

        let descObj = await this.querySelector(res, "#contentBox");
        let desc = (descObj && descObj.text) ? descObj.text.trim() : "";
        if (!desc) {
            descObj = await this.querySelector(res, "#panel-story-info-description");
            desc = (descObj && descObj.text) ? descObj.text.trim() : "";
        }
        if (!desc) {
            descObj = await this.querySelector(res, ".description");
            desc = (descObj && descObj.text) ? descObj.text.trim() : "";
        }

        let episodes = [];
        let slug = "";
        const match = url.match(/\/manga\/([^\/]+)/);
        if (match) slug = match[1];

        if (slug) {
            try {
                const apiUrl = `${baseUrl}/api/manga/${slug}/chapters?limit=10000`;
                const apiRes = await this.request(apiUrl);
                const data = typeof apiRes === "string" ? JSON.parse(apiRes) : apiRes;
                if (data && data.success && data.data && data.data.chapters) {
                    episodes = data.data.chapters.map((c) => ({
                        name: String(c.chapter_name || ""),
                        url: `${baseUrl}/manga/${slug}/${c.chapter_slug}`,
                    }));
                }
            } catch (e) {
                // Fallback to DOM parsing if API call fails
            }
        }

        if (episodes.length === 0) {
            let epiList = await this.querySelectorAll(res, "ul.row-content-chapter li, .chapter-list a, .a-h");
            episodes = await Promise.all(epiList.map(async (element) => {
                let epUrl = (await this.getAttributeText(element.content, "a", "href")) || "";
                if (epUrl && epUrl.startsWith("/")) epUrl = baseUrl + epUrl;
                let epNameObj = await this.querySelector(element.content, "a");
                let epName = (epNameObj && epNameObj.text) ? epNameObj.text.trim() : "";
                return {
                    url: epUrl || "",
                    name: epName || "",
                };
            }));
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
        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
            },
        });

        const baseUrl = await this.getSetting("mangabat");

        const images = await Promise.all((await this.querySelectorAll(res, "div.container-chapter-reader img")).map(async (element) => {
            const html = await element.content;
            let src = (await this.getAttributeText(html, "img", "src")) || "";
            if (!src) src = (await this.getAttributeText(html, "img", "data-src")) || "";
            src = src.trim();
            if (src && src.startsWith("/")) src = baseUrl + src;
            return src;
        }));

        return {
            urls: images.filter((i) => typeof i === "string" && i.length > 0),
        };
    }
}
