// ==MiruExtension==
// @name         AniGoGo
// @version      v0.0.4
// @author       OshekharO
// @lang         en
// @license      MIT
// @icon         https://anilist.co/img/icons/apple-touch-icon.png
// @package      ani.gogo
// @type         bangumi
// @webSite      https://graphql.anilist.co
// ==/MiruExtension==

export default class extends Extension {
  async req(query, variables = {}) {
    const api = await this.getSetting("anilistApi");
    return this.request("", {
      headers: {
        "Miru-Url": api || "https://graphql.anilist.co",
        "Content-Type": "application/json",
      },
      method: "POST",
      data: {
        query,
        variables,
      },
    });
  }

  async load() {
    this.registerSetting({
      title: "AniList API",
      key: "anilistApi",
      type: "input",
      description: "AniList GraphQL API Url",
      defaultValue: "https://graphql.anilist.co",
    });
  }

  async latest(page) {
    const query = `
      query ($page: Int) {
        Page(page: $page, perPage: 15) {
          media(sort: TRENDING_DESC, type: ANIME) {
            id
            title {
              english
              romaji
              native
            }
            coverImage {
              extraLarge
              large
            }
          }
        }
      }
    `;
    const res = await this.req(query, { page: page || 1 });
    const mediaList = res?.data?.Page?.media || [];
    return mediaList.map((item) => {
      const title = item.title?.english || item.title?.romaji || item.title?.native || "";
      const cover = item.coverImage?.extraLarge || item.coverImage?.large || "";
      return {
        title,
        url: item.id.toString(),
        cover,
      };
    });
  }

  async detail(url) {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title {
            english
            romaji
            native
          }
          coverImage {
            extraLarge
            large
          }
          description(asHtml: false)
          streamingEpisodes {
            title
            thumbnail
            url
            site
          }
        }
      }
    `;
    const res = await this.req(query, { id: parseInt(url, 10) });
    const media = res?.data?.Media || {};
    const title = media.title?.english || media.title?.romaji || media.title?.native || "";
    const cover = media.coverImage?.extraLarge || media.coverImage?.large || "";
    const desc = media.description || "";

    let episodeUrls = [];
    const streamingEps = media.streamingEpisodes || [];
    if (streamingEps.length > 0) {
      episodeUrls = streamingEps.map((ep, idx) => ({
        name: ep.title || `Episode ${idx + 1}`,
        url: ep.url || "",
      }));
    }

    if (episodeUrls.length === 0) {
      try {
        const anizipRes = await this.request("", {
          headers: {
            "Miru-Url": `https://api.ani.zip/mappings?anilist_id=${url}`,
          },
        });
        if (anizipRes && anizipRes.episodes) {
          const epsObj = anizipRes.episodes;
          const keys = Object.keys(epsObj);
          const normalEps = keys
            .filter((k) => k.match(/^\d+$/))
            .map((k) => epsObj[k])
            .sort((a, b) => parseInt(a.episode, 10) - parseInt(b.episode, 10));

          if (normalEps.length > 0) {
            episodeUrls = normalEps.map((ep) => {
              const epNum = ep.episode;
              const epTitle = ep.title?.en || ep.title?.x_jat || ep.title?.ja || `Episode ${epNum}`;
              return {
                name: `Ep ${epNum}: ${epTitle}`,
                url: epNum.toString(),
              };
            });
          }
        }
      } catch (e) {
        // Fallback
      }
    }

    if (episodeUrls.length === 0) {
      episodeUrls = [
        {
          name: "Episode 1",
          url: "1",
        },
      ];
    }

    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: "Episodes",
          urls: episodeUrls,
        },
      ],
    };
  }

  async search(kw, page) {
    const query = `
      query ($search: String, $page: Int) {
        Page(page: $page, perPage: 15) {
          media(search: $search, type: ANIME) {
            id
            title {
              english
              romaji
              native
            }
            coverImage {
              extraLarge
              large
            }
          }
        }
      }
    `;
    const res = await this.req(query, { search: kw, page: page || 1 });
    const mediaList = res?.data?.Page?.media || [];
    return mediaList.map((item) => {
      const title = item.title?.english || item.title?.romaji || item.title?.native || "N/A";
      const cover = item.coverImage?.extraLarge || item.coverImage?.large || "N/A";
      return {
        title,
        url: item.id.toString(),
        cover,
      };
    });
  }

  async watch(url) {
    return {
      type: "hls",
      url: url.startsWith("http") ? url : "",
    };
  }
}
