// ==MiruExtension==
// @name         Manganato
// @version      v0.0.2
// @author       OshekharO
// @lang         en
// @license      MIT
// @icon         https://www.manganato.gg/images/favicon-manganato.webp
// @package      manganato
// @type         manga
// @webSite      https://www.manganato.gg
// ==/MiruExtension==

export default class extends Extension {
 async req(url) {
  return this.request(url, {
   headers: {
    "Miru-Url": await this.getSetting("manganato"),
   },
  });
 }

 async load() {
  this.registerSetting({
   title: "Base URL",
   key: "manganato",
   type: "input",
   description: "Homepage URL for Manganato",
   defaultValue: "https://www.manganato.gg",
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
  const baseUrl = await this.getSetting("manganato");
  const res = await this.req(page && page > 1 ? `/manga-list/latest-manga?page=${page}` : `/`);
  const latest = await this.querySelectorAll(res, "div.itemupdate");

  let comic = [];
  for (const element of latest) {
   const html = await element.content;
   let url = await this.getAttributeText(html, "a", "href");
   if (url && !url.startsWith("http")) {
    url = baseUrl + url;
   }

   const titleEl = await this.querySelector(html, "h3 a");
   const title = titleEl && titleEl.text ? titleEl.text.trim() : "";

   let cover = (await this.getAttributeText(html, "img", "src")) || (await this.getAttributeText(html, "img", "data-src")) || "";

   if (title && url) {
    comic.push({
     title,
     url,
     cover,
    });
   }
  }
  return comic;
 }

 async search(kw, page) {
  const baseUrl = await this.getSetting("manganato");
  const kwstring = kw.replace(/ /g, "_");
  const pageParam = page && page > 1 ? `?page=${page}` : "";
  const res = await this.req(`/search/story/${kwstring}${pageParam}`);
  const searchList = await this.querySelectorAll(res, "div.story_item");

  let result = [];
  for (const element of searchList) {
   const html = await element.content;
   let url = await this.getAttributeText(html, "a", "href");
   if (url && !url.startsWith("http")) {
    url = baseUrl + url;
   }

   const titleEl = await this.querySelector(html, "h3.story_name a");
   const title = titleEl && titleEl.text ? titleEl.text.trim() : "";

   let cover = (await this.getAttributeText(html, "img", "src")) || (await this.getAttributeText(html, "img", "data-src")) || "";

   if (title && url) {
    result.push({
     title,
     url,
     cover,
    });
   }
  }
  return result;
 }

 async detail(url) {
  const baseUrl = await this.getSetting("manganato");
  const res = await this.request("", {
   headers: {
    "Miru-Url": url,
   },
  });

  const titleEl = await this.querySelector(res, "h1");
  const title = titleEl && titleEl.text ? titleEl.text.trim() : "";

  const cover = (await this.getAttributeText(res, "div.thumbnail-wrap img", "src")) || (await this.getAttributeText(res, "div.manga-info-pic img", "src")) || "";

  let desc = "";
  const descEl = await this.querySelector(res, "div[style*='overflow: hidden']");
  if (descEl && descEl.text) {
   desc = descEl.text.replace(/^[\s\S]*?summary:\s*/i, "").trim();
  }

  const match = url.match(/\/manga\/([^/]+)/);
  let episodes = [];

  if (match && match[1]) {
   const slug = match[1];
   try {
    const apiRes = await this.request(`/api/manga/${slug}/chapters`, {
     headers: {
      "Miru-Url": baseUrl,
     },
    });
    const data = typeof apiRes === "string" ? JSON.parse(apiRes) : apiRes;
    if (data && data.success && data.data && data.data.chapters) {
     episodes = data.data.chapters.map((ch) => {
      const chUrl = `${baseUrl}/manga/${slug}/${ch.chapter_slug}`;
      return {
       name: ch.chapter_name || `Chapter ${ch.chapter_num}`,
       url: chUrl,
      };
     });
    }
   } catch (e) {
    const epiList = await this.querySelectorAll(res, "li.a-h, div.manga-info-chapter a");
    for (const element of epiList) {
     const html = await element.content;
     const aEl = await this.querySelector(html, "a");
     if (aEl) {
      let epUrl = await this.getAttributeText(html, "a", "href");
      if (epUrl && !epUrl.startsWith("http")) {
       epUrl = baseUrl + epUrl;
      }
      episodes.push({
       name: aEl.text ? aEl.text.trim() : "",
       url: epUrl,
      });
     }
    }
   }
  }

  if ((await this.getSetting("reverseChaptersOrder")) === "true") {
   episodes.reverse();
  }

  return {
   title,
   cover,
   desc,
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

  const images = [];
  const imgList = await this.querySelectorAll(res, "div.container-chapter-reader img");
  for (const element of imgList) {
   const html = await element.content;
   let dataSrc = await this.getAttributeText(html, "img", "src");
   if (dataSrc) {
    images.push(dataSrc.trim());
   }
  }

  return {
   urls: images,
  };
 }
}
