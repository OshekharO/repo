// ==MiruExtension==
// @name         Ravenscans
// @version      v0.0.2
// @author       bethro
// @lang         en
// @license      MIT
// @icon         https://ravenscans.net/wp-content/uploads/2025/05/logo.png
// @package      ravenscans.com
// @type         manga
// @webSite      https://ravenscans.org
// ==/MiruExtension==

export default class extends Extension {
    async req(url) {
        return this.request(url, {
            headers: {
                "Miru-Url": await this.getSetting("ravenscans"),
            },
        });
    }

    async load() {
        this.registerSetting({
            title: "Ravenscans URL",
            key: "ravenscans",
            type: "input",
            description: "Homepage URL for Ravenscans",
            defaultValue: "https://ravenscans.org",
        });
    }

    async latest(page) {
        const res = await this.req(`/manga/?page=${page}&order=update`);
        const latest = await this.querySelectorAll(res, "div.bsx");

        let comic = [];
        for (const element of latest) {
            const html = await element.content;
            const url = await this.getAttributeText(html, "a", "href");
            const titleElement = await this.querySelector(html, "div.tt");
            const title = titleElement ? titleElement.text : await this.getAttributeText(html, "a", "title");
            const cover = await this.querySelector(html, "img").getAttributeText("src");

            if (url && title) {
                comic.push({
                    title: title.trim(),
                    url,
                    cover: cover || ""
                });
            }
        }
        return comic;
    }

    async search(kw, page) {
        const res = await this.req(`/page/${page}/?s=${kw}`);
        const searchList = await this.querySelectorAll(res, "div.bsx");
        const result = await Promise.all(searchList.map(async (element) => {
            const html = await element.content;
            const url = await this.getAttributeText(html, "a", "href");
            const titleElement = await this.querySelector(html, "div.tt");
            const title = titleElement ? titleElement.text : await this.getAttributeText(html, "a", "title");
            const cover = await this.querySelector(html, "img").getAttributeText("src");
            return {
                title: title ? title.trim() : "",
                url,
                cover: cover || ""
            };
        }));
        return result;
    }

    async detail(url) {
        const res = await this.request("", {
            headers: {
                "Miru-Url": url,
            },
        });

        const titleElement = await this.querySelector(res, "h1.entry-title");
        const title = titleElement ? titleElement.text : (await this.querySelector(res, "div.infox > h1")).text;

        let cover = "";
        const coverElem = await this.querySelector(res, "img.wp-post-image");
        if (coverElem) {
            cover = await coverElem.getAttributeText("src");
        }

        let desc = "";
        const descElem = await this.querySelector(res, "div.entry-content[itemprop='description'], div.entry-content, div.entry-content-single");
        if (descElem) {
            desc = descElem.text;
        }

        const epiList = await this.querySelectorAll(res, "div.eplister > ul > li, div#chapterlist > ul > li");
        const episodes = await Promise.all(epiList.map(async (element) => {
            const html = await element.content;
            const nameElem = await this.querySelector(html, "span.chapternum");
            const name = nameElem ? nameElem.text : "";
            const url = await this.getAttributeText(html, "a", "href");
            return {
                name: name ? name.trim() : "Chapter",
                url: url,
            };
        }));

        return {
            title: title ? title.trim() : "Unknown Title",
            cover: cover || "",
            desc: desc ? desc.trim() : "",
            episodes: [
                {
                    title: "Chapters",
                    urls: episodes,
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

        const match = res.match(/"images":\s*\[([^\]]+)\]/);

        if (!match) {
            return { urls: [] };
        }

        const imagesContent = match[1];

        const imageUrls = imagesContent
            .match(/"([^"]+)"/g)
            .map(m => m.slice(1, -1).replace(/\\/g, ''));

        return { urls: imageUrls };
    }
}
