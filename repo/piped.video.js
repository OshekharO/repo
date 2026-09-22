// ==MiruExtension==
// @name         Piped
// @version      v0.0.3
// @author       bethro
// @lang         all
// @license      MIT
// @icon         https://piped.video/img/icons/android-chrome-192x192.png
// @package      piped.video
// @type         bangumi
// @webSite      https://piped.private.coffee
// ==/MiruExtension==

export default class extends Extension {
    async req(url) {
        let apiUrl = (await this.getSetting("piped") || "").trim().replace(/\/+$/, "");
        if (apiUrl === "https://piped.private.coffee") {
            apiUrl = "https://api.piped.private.coffee";
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
            title: "PIPED INSTANCE",
            key: "piped",
            type: "input",
            description: "url piped instance api",
            defaultValue: "https://api.piped.private.coffee",
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
            url: item.url,
            title: item.title,
            cover: item.thumbnail,
        }));
    }

    async search(kw, page) {
        const res = await this.req(`/search?q=${kw}&filter=all`);
        const items = res && Array.isArray(res.items) ? res.items : [];
        let streams = items.filter((item) => item.type == "stream");

        return streams.map((item) => {
            return {
                url: item.url,
                title: item.title || item.name,
                cover: item.thumbnail,
            };
        });
    }

    async detail(url) {
        const videoID = url.split("v=").pop();
        const res = await this.req(`/streams/${videoID}`);

        if (res && res.error) {
            return {
                title: `Video (${videoID})`,
                cover: "",
                desc: res.message || "Failed to fetch video details from Piped API.",
                episodes: [],
            };
        }

        let preferredQuality = await this.getSetting("quality");
        const sortEpisodes = (episodes) =>
            episodes.sort((a, b) => {
                const qualityA = (a.title || "").toLowerCase();
                const qualityB = (b.title || "").toLowerCase();

                if (qualityA === preferredQuality) return -1;
                if (qualityB === preferredQuality) return 1;
                return qualityA.localeCompare(qualityB);
            });

        const videoStreams = res && Array.isArray(res.videoStreams) ? res.videoStreams : [];
        const audioStreams = res && Array.isArray(res.audioStreams) ? res.audioStreams : [];

        let episodes = sortEpisodes(
            videoStreams.map((item, index) => {
                const audioStream = audioStreams[index] || audioStreams[0];
                const combinedURL = `${item.url || ''}|${audioStream ? audioStream.url : ''}|${videoID}`;
                return {
                    title: item.quality || "Default",
                    urls: [{ name: res.title || "Play", url: combinedURL }],
                };
            })
        );

        return {
            title: res.title || "",
            cover: res.thumbnailUrl || "",
            desc: res.description || "",
            episodes,
        };
    }

    async watch(url) {
        const [videoUrl, audioUrl, videoID] = url.split("|");
        let subtitles = [];

        if (videoID) {
            const sub = await this.req(`/streams/${videoID}`);
            const subtitlesList = sub && Array.isArray(sub.subtitles) ? sub.subtitles : [];
            subtitles = subtitlesList.map((item) => ({
                title: item.name,
                url: item.url,
                language: item.code,
            }));
        }

        const type = videoUrl.includes(".m3u8") ? "hls" : "mp4";

        return {
            type,
            url: videoUrl,
            audioTrack: audioUrl,
            subtitles: subtitles,
        };
    }
}
