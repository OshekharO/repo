// ==MiruExtension==
// @name         DesiCinema
// @version      v0.0.1
// @author       appdevelpo
// @lang         hi-ta-te
// @license      MIT
// @icon         https://www.desicinema.org/wp-content/uploads/2025/02/desicinemas-pk-logo.png
// @package      desicinema.org
// @type         bangumi
// @webSite      https://www.desicinema.org
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
    async search(kw, page = 1) {
        const path = page > 1 ? `/page/${page}/?s=${encodeURIComponent(kw)}` : `/?s=${encodeURIComponent(kw)}`;
        const res = await this.request(path);
        const cards = res.match(/<article[^>]*class="[^"]*TPost[^"]*"[^>]*>[\s\S]+?<\/article>/g) || [];
        const bangumi = [];

        cards.forEach((card) => {
            const urlMatch = card.match(/href="([^"]+)"/);
            const titleMatch = card.match(/<h2 class="Title">([^<]+)<\/h2>/) || card.match(/alt="[^"]*Image ([^"]+)"/) || card.match(/<div class="Title">([^<]+)<\/div>/);
            const coverMatch = card.match(/data-src="([^"]+)"/) || card.match(/src="([^"]+)"/);

            if (urlMatch) {
                let cover = coverMatch ? (coverMatch[1] || coverMatch[2]) : "";
                if (cover.startsWith("//")) {
                    cover = "https:" + cover;
                }
                bangumi.push({
                    title: titleMatch ? titleMatch[1].trim() : "Unknown",
                    url: urlMatch[1],
                    cover: cover,
                });
            }
        });

        return bangumi;
    }

    async latest(page = 1) {
        const path = page > 1 ? `/movies/page/${page}/` : `/movies/`;
        const res = await this.request(path);
        const cards = res.match(/<article[^>]*class="[^"]*TPost[^"]*"[^>]*>[\s\S]+?<\/article>/g) || [];
        const bangumi = [];

        cards.forEach((card) => {
            const urlMatch = card.match(/href="([^"]+)"/);
            const titleMatch = card.match(/<h2 class="Title">([^<]+)<\/h2>/) || card.match(/alt="[^"]*Image ([^"]+)"/) || card.match(/<div class="Title">([^<]+)<\/div>/);
            const coverMatch = card.match(/data-src="([^"]+)"/) || card.match(/src="([^"]+)"/);

            if (urlMatch) {
                let cover = coverMatch ? (coverMatch[1] || coverMatch[2]) : "";
                if (cover.startsWith("//")) {
                    cover = "https:" + cover;
                }
                bangumi.push({
                    title: titleMatch ? titleMatch[1].trim() : "Unknown",
                    url: urlMatch[1],
                    cover: cover,
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

        const titleMatch = res.match(/<h1[^>]*>([\s\S]+?)<\/h1>/) || res.match(/<div class="Title">([^<]+)<\/div>/);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "DesiCinema";

        const coverMatch = res.match(/class="TPostBg"[^>]*data-src="([^"]+)"/) || res.match(/class="Objf"[^>]*img[^>]*data-src="([^"]+)"/) || res.match(/src="([^"]+)"/);
        let cover = coverMatch ? coverMatch[1] : "";
        if (cover.startsWith("//")) {
            cover = "https:" + cover;
        }

        const descMatch = res.match(/<div class="Description">([\s\S]+?)<\/div>/);
        const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        const episodes = [];

        // Check if TV Series page or Season page
        if (url.includes("/series/") || url.includes("/season/")) {
            // Check if there are season links or episode links
            const seasonLinks = res.match(/href="(https:\/\/www\.desicinema\.org\/season\/[^"]+)"/g) || [];
            const episodeUrls = new Set();

            if (seasonLinks.length > 0) {
                // Fetch each season page to get all episode links
                for (const seasonTag of seasonLinks) {
                    const sUrlMatch = seasonTag.match(/href="([^"]+)"/);
                    if (sUrlMatch) {
                        try {
                            const sRes = await this.request("", {
                                headers: { "Miru-Url": sUrlMatch[1] },
                            });
                            const epMatches = sRes.match(/href="(https:\/\/www\.desicinema\.org\/episode\/[^"]+)"/g) || [];
                            epMatches.forEach((ep) => {
                                const m = ep.match(/href="([^"]+)"/);
                                if (m) episodeUrls.add(m[1]);
                            });
                        } catch (e) {}
                    }
                }
            } else {
                const epMatches = res.match(/href="(https:\/\/www\.desicinema\.org\/episode\/[^"]+)"/g) || [];
                epMatches.forEach((ep) => {
                    const m = ep.match(/href="([^"]+)"/);
                    if (m) episodeUrls.add(m[1]);
                });
            }

            const epList = Array.from(episodeUrls).map((epUrl, idx) => {
                const epNumMatch = epUrl.match(/episode-([0-9a-z-]+)\/?$/i);
                const epName = epNumMatch ? `Episode ${epNumMatch[1].replace(/-/g, " ")}` : `Episode ${idx + 1}`;
                return {
                    name: epName,
                    url: epUrl,
                };
            });

            if (epList.length > 0) {
                episodes.push({
                    title: "Episodes",
                    urls: epList,
                });
            }
        }

        // If no episodes found (e.g. movie or fallback), set movie page url
        if (episodes.length === 0) {
            episodes.push({
                title: "Movie",
                urls: [
                    {
                        name: title,
                        url: url,
                    },
                ],
            });
        }

        return {
            title,
            cover,
            desc,
            episodes,
        };
    }

    unpackPackedJS(p, a, c, k) {
        const baseN = (num, b) => {
            const digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (num === 0) return "0";
            let res = "";
            while (num > 0) {
                res = digits[num % b] + res;
                num = Math.floor(num / b);
            }
            return res;
        };

        for (let i = c - 1; i >= 0; i--) {
            if (k[i]) {
                const sym = baseN(i, a);
                const reg = new RegExp("\\b" + sym + "\\b", "g");
                p = p.replace(reg, k[i]);
            }
        }
        return p;
    }

    async extractFromEmbed(embedUrl) {
        try {
            const html = await this.request("", {
                headers: {
                    "Miru-Url": embedUrl,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": "https://www.desicinema.org/",
                },
            });

            if (!html || html.length < 10) return null;

            // 1. Check direct m3u8 or mp4 in HTML
            const directM3u8 = html.match(/https?:\/\/[^\s'"\\]+\.m3u8[^\s'"\\]*/);
            if (directM3u8) {
                return { type: "hls", url: directM3u8[0] };
            }

            const directMp4 = html.match(/https?:\/\/[^\s'"\\]+\.mp4[^\s'"\\]*/);
            if (directMp4 && !directMp4[0].includes("ads/")) {
                return { type: "mp4", url: directMp4[0] };
            }

            // 2. Check for Dean Edwards packed JS
            const packedMatch = html.match(/eval\s*\(\s*function\s*\(\s*p\s*,\s*a\s*,\s*c\s*,\s*k\s*,\s*e\s*,\s*d\s*\)[\s\S]+?\}\s*\(\s*(['"])([\s\S]+?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]+?)\5\.split\(['"]\|['"]\)/);
            if (packedMatch) {
                const p = packedMatch[2];
                const a = parseInt(packedMatch[3]);
                const c = parseInt(packedMatch[4]);
                const k = packedMatch[6].split("|");
                const unpacked = this.unpackPackedJS(p, a, c, k);

                const unpackedM3u8 = unpacked.match(/https?:\/\/[^\s'"\\]+\.m3u8[^\s'"\\]*/);
                if (unpackedM3u8) {
                    return { type: "hls", url: unpackedM3u8[0] };
                }

                // Check `links` object or `hls2`/`hls3` property in unpacked JS
                const hlsUrlMatch = unpacked.match(/["']hls2?["']\s*:\s*["'](https?:\/\/[^"']+)["']/);
                if (hlsUrlMatch) {
                    return { type: "hls", url: hlsUrlMatch[1] };
                }

                const unpackedMp4 = unpacked.match(/https?:\/\/[^\s'"\\]+\.mp4[^\s'"\\]*/);
                if (unpackedMp4 && !unpackedMp4[0].includes("ads/")) {
                    return { type: "mp4", url: unpackedMp4[0] };
                }

                // Check sources in unpacked JS (e.g. file: links.hls2 || links.hls3 || ...)
                const fileMatch = unpacked.match(/file\s*:\s*["']([^"']+)["']/);
                if (fileMatch) {
                    const u = fileMatch[1];
                    if (u.includes(".m3u8") || u.includes("hls") || u.includes("master")) {
                        return { type: "hls", url: u };
                    } else if (u.includes(".mp4")) {
                        return { type: "mp4", url: u };
                    }
                }
            }

            // 3. Check for JWPlayer setup in JS
            const jwSetup = html.match(/jwplayer\([^)]*\)\.setup\s*\(\s*\{[\s\S]+?\}\s*\)/);
            if (jwSetup) {
                const fileMatch = jwSetup[0].match(/file\s*:\s*["']([^"']+)["']/);
                if (fileMatch && !fileMatch[1].includes("ads/")) {
                    const u = fileMatch[1];
                    const streamType = u.includes(".mp4") ? "mp4" : "hls";
                    return { type: streamType, url: u };
                }
            }

            // 4. Check for nested iframes inside the embed page
            const iframeMatches = html.match(/<iframe[^>]+>/gi) || [];
            for (const ifrTag of iframeMatches) {
                const srcMatch = ifrTag.match(/src=["']([^"']+)["']/i) || ifrTag.match(/data-litespeed-src=["']([^"']+)["']/i);
                if (srcMatch) {
                    let innerSrc = srcMatch[1].replace(/&#038;/g, "&");
                    if (innerSrc.startsWith("//")) {
                        innerSrc = "https:" + innerSrc;
                    }
                    if (innerSrc !== embedUrl && !innerSrc.includes("about:blank") && !innerSrc.includes("cloudflare") && !innerSrc.includes("sharethis")) {
                        const res = await this.extractFromEmbed(innerSrc);
                        if (res && res.url) {
                            return res;
                        }
                        // Return inner iframe URL (e.g. rpmplay or vidhide embed URL)
                        return { type: "hls", url: innerSrc };
                    }
                }
            }

            // 5. If embedUrl itself is an external player or trembed, return it
            if (embedUrl.includes("trembed") || embedUrl.includes("rpmplay") || embedUrl.includes("vidhide") || embedUrl.includes("vkspeed") || embedUrl.includes("strp2p") || embedUrl.includes("embed") || embedUrl.includes("player")) {
                return { type: "hls", url: embedUrl };
            }
        } catch (e) {}

        return null;
    }

    async watch(url) {
        try {
            const res = await this.request("", {
                headers: {
                    "Miru-Url": url,
                },
            });

            // Find all option elements (data-id and data-key) or direct trembed URLs
            const options = [];

            // Extract option data-id / data-key if present
            const optionMatches = res.match(/<li[^>]*data-id="[^"]+"[^>]*>/gi) || [];
            optionMatches.forEach((optStr) => {
                const keyMatch = optStr.match(/data-key="([^"]+)"/);
                const idMatch = optStr.match(/data-id="([^"]+)"/);
                const key = keyMatch ? keyMatch[1] : "0";
                const id = idMatch ? idMatch[1] : null;
                const typeMatch = url.includes("/episode/") ? "2" : "1";
                if (id) {
                    options.push(`https://www.desicinema.org/?trembed=${key}&trid=${id}&trtype=${typeMatch}`);
                }
            });

            // Extract trembed URLs from data-litespeed-src or src attributes in iframes
            const iframeTags = res.match(/<iframe[^>]+>/gi) || [];
            iframeTags.forEach((ifr) => {
                const srcMatch = ifr.match(/data-litespeed-src=["']([^"']+)["']/i) || ifr.match(/src=["']([^"']+)["']/i);
                if (srcMatch) {
                    let fullSrc = srcMatch[1].replace(/&#038;/g, "&");
                    if (fullSrc.startsWith("//")) fullSrc = "https:" + fullSrc;
                    if (fullSrc.startsWith("/")) fullSrc = "https://www.desicinema.org" + fullSrc;
                    if (!fullSrc.includes("about:blank") && !fullSrc.includes("sharethis") && !fullSrc.includes("googletagmanager")) {
                        options.push(fullSrc);
                    }
                }
            });

            // Extract direct trembed matches in HTML text
            const trembedMatches = res.match(/https:\/\/www\.desicinema\.org\/\?trembed=\d+&#038;trid=\d+&trtype=\d+|https:\/\/www\.desicinema\.org\/\?trembed=\d+&trid=\d+&trtype=\d+|\/\?trembed=\d+&#038;trid=\d+&trtype=\d+|\/\?trembed=\d+&trid=\d+&trtype=\d+/g) || [];
            trembedMatches.forEach((t) => {
                let fullT = t.replace(/&#038;/g, "&");
                if (fullT.startsWith("/")) fullT = "https://www.desicinema.org" + fullT;
                options.push(fullT);
            });

            // Try extracting stream from all discovered embed URLs
            for (const trembedUrl of options) {
                const result = await this.extractFromEmbed(trembedUrl);
                if (result && result.url) {
                    return {
                        type: result.type,
                        url: result.url,
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Referer": "https://www.desicinema.org/",
                        },
                    };
                }
            }

            // Fallback 1: check if page itself contains any direct m3u8 or mp4
            const directM3u8 = res.match(/https?:\/\/[^\s'"\\]+\.m3u8[^\s'"\\]*/);
            if (directM3u8) {
                return {
                    type: "hls",
                    url: directM3u8[0],
                };
            }

            const directMp4 = res.match(/https?:\/\/[^\s'"\\]+\.mp4[^\s'"\\]*/);
            if (directMp4 && !directMp4[0].includes("ads/")) {
                return {
                    type: "mp4",
                    url: directMp4[0],
                };
            }

            // Fallback 2: Return first embed / iframe URL if available (so iframe embed page is passed instead of movie page URL)
            if (options.length > 0) {
                return {
                    type: "hls",
                    url: options[0],
                };
            }
        } catch (e) {}

        // Fallback return if no embed or stream extracted
        return {
            type: "hls",
            url: url,
        };
    }
}
