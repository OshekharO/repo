// ==MiruExtension==
// @name         Piped
// @version      v0.0.4
// @author       bethro
// @lang         all
// @license      MIT
// @icon         https://piped.video/img/icons/android-chrome-192x192.png
// @package      piped.video
// @type         bangumi
// @webSite      https://invidious.tiekoetter.com
// ==/MiruExtension==

export default class extends Extension {
    async req(url) {
        let apiUrl = (await this.getSetting("piped") || "").trim().replace(/\/+$/, "");
        if (!apiUrl.includes("/api/v1")) {
            apiUrl = `${apiUrl}/api/v1`;
        }
        try {
            return await this.request(url, {
                headers: {
                    "Miru-Url": apiUrl,
                },
            });
        } catch (e) {
            return { error: true, message: e ? (e.message || String(e)) : "Request failed" };
        }
    }

    async load() {
        this.registerSetting({
            title: "INVIDIOUS / PIPED INSTANCE",
            key: "piped",
            type: "input",
            description: "url invidious/piped instance",
            defaultValue: "https://invidious.tiekoetter.com",
        });

        this.registerSetting({
            title: "DEFAULT QUALITY",
            key: "quality",
            type: "input",
            description: "default video quality",
            defaultValue: "480p",
        });
    }

    async latest(page) {
        const res = await this.req(`/trending?region=US`);
        if (!Array.isArray(res)) {
            return [];
        }
        return res.map((item) => ({
            url: item.videoId || item.url || "",
            title: item.title || "",
            cover: item.videoThumbnails?.[0]?.url || item.thumbnail || "",
        }));
    }

    async search(kw, page) {
        const res = await this.req(`/search?q=${kw}`);
        const items = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : []);

        return items.map((item) => ({
            url: item.videoId || item.url || "",
            title: item.title || item.name || "",
            cover: item.videoThumbnails?.[0]?.url || item.thumbnail || "",
        }));
    }

    async detail(url) {
        const videoID = url.split("v=").pop().replace(/^\//, "");
        const res = await this.req(`/videos/${videoID}`);

        if (res && res.error) {
            return {
                title: `Video (${videoID})`,
                cover: "",
                desc: res.message || "Failed to fetch video details from Invidious API.",
                episodes: [],
            };
        }

        const formatStreams = Array.isArray(res.formatStreams) ? res.formatStreams : [];
        const adaptiveFormats = Array.isArray(res.adaptiveFormats) ? res.adaptiveFormats : [];

        let episodes = [];

        if (formatStreams.length > 0) {
            episodes = formatStreams.map((item) => ({
                title: item.qualityLabel || item.quality || "Default",
                urls: [{ name: res.title || "Play", url: item.url }],
            }));
        } else if (res.hlsUrl) {
            episodes = [{
                title: "HLS",
                urls: [{ name: res.title || "Play", url: res.hlsUrl }],
            }];
        } else if (adaptiveFormats.length > 0) {
            episodes = adaptiveFormats.filter(f => f.url).map((item) => ({
                title: item.qualityLabel || item.quality || "Adaptive",
                urls: [{ name: res.title || "Play", url: item.url }],
            }));
        }

        return {
            title: res.title || "",
            cover: res.videoThumbnails?.[0]?.url || res.thumbnailUrl || "",
            desc: res.description || "",
            episodes,
        };
    }

    async watch(url) {
        const type = url.includes(".m3u8") ? "hls" : "mp4";

        return {
            type,
            url: url,
        };
    }
}
