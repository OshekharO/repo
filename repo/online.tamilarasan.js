// ==MiruExtension==
// @name         Tamilarasan
// @version      v0.0.1
// @author       OshekharO
// @lang         ta
// @license      MIT
// @type         bangumi
// @package      online.tamilarasan
// @webSite      https://tamilarasan.online
// @description  Watch Tamil Movies, Web Series and TV Shows on Tamilarasan
// ==/MiruExtension==

export default class Tamilarasan extends Extension {
  async latest(page) {
    const url = page === 1 ? '/trending/' : `/trending/page/${page}/`;
    const res = await this.request(url);
    const list = [];
    const articles = res.match(/<article[^>]*>[\s\S]*?<\/article>/g) || [];

    for (const art of articles) {
      const urlMatch = art.match(/href=["']([^"']+)["']/);
      const imgMatch = art.match(/src=["']([^"']+)["']/);
      const titleMatch = art.match(/<h3[^>]*class=["']title["'][^>]*>(.*?)<\/h3>/s) || art.match(/alt=["']([^"']+)["']/);

      if (urlMatch && titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const cover = imgMatch ? imgMatch[1] : '';
        list.push({
          title,
          url: urlMatch[1],
          cover,
        });
      }
    }
    return list;
  }

  async search(kw, page) {
    const url = page === 1 ? `/?s=${encodeURIComponent(kw)}` : `/page/${page}/?s=${encodeURIComponent(kw)}`;
    const res = await this.request(url);
    const list = [];
    const articles = res.match(/<article[^>]*>[\s\S]*?<\/article>/g) || [];

    for (const art of articles) {
      const urlMatch = art.match(/href=["']([^"']+)["']/);
      const imgMatch = art.match(/src=["']([^"']+)["']/);
      const titleMatch = art.match(/<div class=["']title["'][^>]*>\s*<a[^>]*>(.*?)<\/a>/s) || art.match(/<h3[^>]*class=["']title["'][^>]*>(.*?)<\/h3>/s) || art.match(/alt=["']([^"']+)["']/);

      if (urlMatch && titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const cover = imgMatch ? imgMatch[1] : '';
        list.push({
          title,
          url: urlMatch[1],
          cover,
        });
      }
    }
    return list;
  }

  async detail(url) {
    const res = await this.request(url);

    const titleMatch = res.match(/<h1[^>]*>(.*?)<\/h1>/s);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const coverMatch = res.match(/<div class=["']poster["'][^>]*>\s*<img[^>]+src=["']([^"']+)["']/s) || res.match(/<img[^>]+src=["']([^"']+)["']/);
    const cover = coverMatch ? coverMatch[1] : '';

    const descMatch = res.match(/<div class=["']wp-content["'][^>]*>([\s\S]*?)<\/div>/) || res.match(/<div[^>]+id=["']info["'][^>]*>([\s\S]*?)<\/div>/);
    let desc = descMatch ? descMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, '').trim() : '';

    const episodeUrls = [];
    const iframes = res.match(/<iframe[^>]+src=["']([^"']+)["']/gi) || [];

    for (let i = 0; i < iframes.length; i++) {
      const srcMatch = iframes[i].match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        let iframeUrl = srcMatch[1];
        if (iframeUrl.startsWith('//')) {
          iframeUrl = 'https:' + iframeUrl;
        }
        if (!iframeUrl.includes('facebook.com') && !iframeUrl.includes('twitter.com') && !iframeUrl.includes('google.com')) {
          let epName = `Player ${i + 1}`;
          if (iframeUrl.includes('ok.ru')) {
            epName += ' (OK.ru)';
          } else if (iframeUrl.includes('voe.sx')) {
            epName += ' (Voe)';
          } else if (iframeUrl.includes('morencius.com')) {
            epName += ' (Morencius)';
          } else if (iframeUrl.includes('hgcloud.to') || iframeUrl.includes('hanerix.com')) {
            epName += ' (Hanerix)';
          }
          episodeUrls.push({
            name: epName,
            url: iframeUrl,
          });
        }
      }
    }

    return {
      title,
      cover,
      desc,
      episodes: [
        {
          title: 'Streams',
          urls: episodeUrls,
        },
      ],
    };
  }

  async watch(url) {
    const apiUrl = `https://prov-extractor.vercel.app/api/extract?url=${encodeURIComponent(url)}`;
    const res = await this.request(apiUrl);
    const data = typeof res === 'string' ? JSON.parse(res) : res;

    const streamUrl =
      data?.streamUrl ||
      data?.url ||
      data?.stream ||
      (Array.isArray(data?.streams) && data.streams[0]?.url) ||
      (Array.isArray(data?.sources) && data.sources[0]?.url) ||
      '';

    if (!streamUrl) {
      throw new Error('Failed to extract direct stream URL');
    }

    const isMp4 = (data?.type && data.type.includes('mp4')) || streamUrl.includes('.mp4');
    return {
      type: isMp4 ? 'mp4' : 'hls',
      url: streamUrl,
      headers: data?.headers || {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };
  }
}
