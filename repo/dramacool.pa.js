// ==MiruExtension==
// @name         DramaCool
// @version      v0.0.5
// @author       OshekharO
// @lang         en
// @license      MIT
// @icon         https://asianc.id/template/images/icon_120x120.png
// @package      dramacool.pa
// @type         bangumi
// @webSite      https://asianc.id
// ==/MiruExtension==

export default class extends Extension {
  async req(url) {
    return this.request(url, {
      headers: {
        "Miru-Url": await this.getSetting("dramacool"),
      },
    });
  }

  async load() {
    this.registerSetting({
      title: "Dramacool API",
      key: "dramacool",
      type: "input",
      description: "Dramacool Website Url",
      defaultValue: "https://asianc.id",
    });
  }

  async latest(page) {
    const res = await this.req(`/recently-added?page=${page}`);
    const bsxList = await this.querySelectorAll(res, "ul.switch-block.list-episode-item > li");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "h3").text;
      const cover = await this.querySelector(html, "img").getAttributeText("data-original") || await this.querySelector(html, "img").getAttributeText("src");
      novel.push({
        title,
        url,
        cover,
      });
    }
    return novel;
  }

  async detail(url) {
    const res = await this.req(url);
    const title = await this.querySelector(res, "div.sub-title > h1, div.info > h1").text;
    const cover = await this.querySelector(res, "div.img > img").getAttributeText("src");
    const desc = await this.querySelector(res, "div.info > p").text;

    const epList = await this.querySelectorAll(res, "ul.list-episode-item > li");
    const episodes = [];
    for (const element of epList) {
      const html = await element.content;
      const epUrl = await this.getAttributeText(html, "a", "href");
      const epTitle = await this.querySelector(html, "h3").text;
      episodes.push({
        name: epTitle.strip ? epTitle.strip() : epTitle.trim(),
        url: epUrl,
      });
    }

    return {
      title: title ? title.trim() : "",
      cover,
      desc: desc ? desc.trim() : "",
      episodes: [
        {
          title: "Directory",
          urls: episodes,
        },
      ],
    };
  }

  async search(kw, page) {
    const res = await this.req(`/search?keyword=${encodeURIComponent(kw)}&page=${page}`);
    const bsxList = await this.querySelectorAll(res, "ul.switch-block.list-episode-item > li");
    const novel = [];
    for (const element of bsxList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "h3").text;
      const cover = await this.querySelector(html, "img").getAttributeText("data-original") || await this.querySelector(html, "img").getAttributeText("src");
      novel.push({
        title: title ? title.trim() : "",
        url,
        cover,
      });
    }
    return novel;
  }

  decryptVidBasic(data, keyStr, ivStr) {
    var CryptoJS = CryptoJS || function(u,p){var d={},l=d.lib={},s=function(){},t=l.Base={extend:function(a){s.prototype=this;var c=new s;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},r=d.WordArray=t.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=p?c:4*a.length},toString:function(a){return(a||v).stringify(this)},concat:function(a){var c=this.words,e=a.words,j=this.sigBytes;a=a.sigBytes;this.clamp();if(j%4)for(var k=0;k<a;k++)c[j+k>>>2]|=(e[k>>>2]>>>24-8*(k%4)&255)<<24-8*((j+k)%4);else if(55<e.length)for(k=0;k<a;k+=4)c[j+k>>>2]=e[k>>>2];else c.push.apply(c,e);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<32-8*(c%4);a.length=u.ceil(c/4)},clone:function(){var a=t.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],e=0;e<a;e+=4)c.push(4294967296*u.random()|0);return new r.init(c,a)}},w=d.enc={},v=w.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var e=[],j=0;j<a;j++){var k=c[j>>>2]>>>24-8*(j%4)&255;e.push((k>>>4).toString(16));e.push((k&15).toString(16))}return e.join("")},parse:function(a){for(var c=a.length,e=[],j=0;j<c;j+=2)e[j>>>3]|=parseInt(a.substr(j,2),16)<<24-4*(j%8);return new r.init(e,c/2)}},b=w.Utf8={stringify:function(a){var c=a.words,e=a.sigBytes;a=[];for(var j=0;j<e;j++){var k=c[j>>>2]>>>24-8*(j%4)&255;a.push(String.fromCharCode(k))}return decodeURIComponent(escape(a.join("")))},parse:function(a){return b.parse(unescape(encodeURIComponent(a)))}},x=w.Base64={stringify:function(a){var c=a.words,e=a.sigBytes,j=this._map;a.clamp();for(var k=[],z=0;z<e;z+=3)for(var F=(c[z>>>2]>>>24-8*(z%4)&255)<<16|(c[z+1>>>2]>>>24-8*((z+1)%4)&255)<<8|c[z+2>>>2]>>>24-8*((z+2)%4)&255,G=0;4>G&&z+0.75*G<e;G++)k.push(j.charAt(F>>>6*(3-G)&63));if(c=j.charAt(64))for(;k.length%4;)k.push(c);return k.join("")},parse:function(a){var c=a.length,e=this._map,j=e.charAt(64);j&&(j=a.indexOf(j),-1!=j&&(c=j));for(var j=[],k=0,z=0;z<c;z++)if(z%4){var F=e.indexOf(a.charAt(z-1))<<2*(z%4),G=e.indexOf(a.charAt(z))>>>6-2*(z%4);j[k>>>2]|=(F|G)<<24-8*(k%4);k++}return r.create(j,k)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="};return d}(Math);
    (function(){var u=CryptoJS,p=u.lib,d=p.Base,l=p.WordArray,p=u.algo,s=p.EvpKDF=d.extend({cfg:d.extend({keySize:4,hasher:p.MD5,iterations:1}),init:function(d){this.cfg=this.cfg.extend(d)},compute:function(d,r){for(var p=this.cfg,s=p.hasher.create(),b=l.create(),u=b.words,q=p.keySize,p=p.iterations;u.length<q;){n&&s.update(n);var n=s.update(d).finalize(r);s.reset();for(var a=1;a<p;a++)n=s.finalize(n),s.reset();b.concat(n)}b.sigBytes=4*q;return b}});u.EvpKDF=function(d,l,p){return s.create(p).compute(d,l)}})();
    CryptoJS.lib.Cipher||function(u){var p=CryptoJS,d=p.lib,l=d.Base,s=d.WordArray,t=d.BufferedBlockAlgorithm,r=p.enc.Base64,w=p.algo.EvpKDF,v=d.Cipher=t.extend({cfg:l.extend(),createEncryptor:function(e,a){return this.create(this._ENC_XFORM_MODE,e,a)},createDecryptor:function(e,a){return this.create(this._DEC_XFORM_MODE,e,a)},init:function(e,a,b){this.cfg=this.cfg.extend(b);this._xformMode=e;this._key=a;this.reset()},reset:function(){t.reset.call(this);this._doReset()},process:function(e){this._append(e);return this._process()},finalize:function(e){e&&this._append(e);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(e){return{encrypt:function(b,k,d){return("string"==typeof k?c:a).encrypt(e,b,k,d)},decrypt:function(b,k,d){return("string"==typeof k?c:a).decrypt(e,b,k,d)}}}});d.StreamCipher=v.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var b=p.mode={},x=function(e,a,b){var c=this._iv;c?this._iv=u:c=this._prevBlock;for(var d=0;d<b;d++)e[a+d]^=c[d]},q=(d.BlockCipherMode=l.extend({createEncryptor:function(e,a){return this.Encryptor.create(e,a)},createDecryptor:function(e,a){return this.Decryptor.create(e,a)},init:function(e,a){this._cipher=e;this._iv=a}})).extend();q.Encryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize;x.call(this,e,a,c);b.encryptBlock(e,a);this._prevBlock=e.slice(a,a+c)}});q.Decryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize,d=e.slice(a,a+c);b.decryptBlock(e,a);x.call(this,e,a,c);this._prevBlock=d}});b=b.CBC=q;q=(p.pad={}).Pkcs7={pad:function(a,b){for(var c=4*b,c=c-a.sigBytes%c,d=c<<24|c<<16|c<<8|c,l=[],n=0;n<c;n+=4)l.push(d);c=s.create(l,c);a.concat(c)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};d.BlockCipher=v.extend({cfg:v.cfg.extend({mode:b,padding:q}),reset:function(){v.reset.call(this);var a=this.cfg,b=a.iv,a=a.mode;if(this._xformMode==this._ENC_XFORM_MODE)var c=a.createEncryptor;else c=a.createDecryptor,this._minBufferSize=1;this._mode=c.call(a,this,b&&b.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var n=d.CipherParams=l.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),b=(p.format={}).OpenSSL={stringify:function(a){var b=a.ciphertext;a=a.salt;return(a?s.create([1398893684,1701076831]).concat(a).concat(b):b).toString(r)},parse:function(a){a=r.parse(a);var b=a.words;if(1398893684==b[0]&&1701076831==b[1]){var c=s.create(b.slice(2,4));b.splice(0,4);a.sigBytes-=16}return n.create({ciphertext:a,salt:c})}},a=d.SerializableCipher=l.extend({cfg:l.extend({format:b}),encrypt:function(a,b,c,d){d=this.cfg.extend(d);var l=a.createEncryptor(c,d);b=l.finalize(b);l=l.cfg;return n.create({ciphertext:b,key:c,iv:l.iv,algorithm:a,mode:l.mode,padding:l.padding,blockSize:a.blockSize,formatter:d.format})},decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a,this):a}}),p=(p.kdf={}).OpenSSL={execute:function(a,b,c,d){d||(d=s.random(8));a=w.create({keySize:b+c}).compute(a,d);c=s.create(a.words.slice(b),4*c);a.sigBytes=4*b;return n.create({key:a,iv:c,salt:d})}},c=d.PasswordBasedCipher=a.extend({cfg:a.cfg.extend({kdf:p}),encrypt:function(b,c,d,l){l=this.cfg.extend(l);d=l.kdf.execute(d,b.keySize,b.ivSize);l.iv=d.iv;b=a.encrypt.call(this,b,c,d.key,l);b.mixIn(d);return b},decrypt:function(b,c,d,l){l=this.cfg.extend(l);c=this._parse(c,l.format);d=l.kdf.execute(d,b.keySize,b.ivSize,c.salt);l.iv=d.iv;return a.decrypt.call(this,b,c,d.key,l)}})}();
    (function(){for(var u=CryptoJS,p=u.lib.BlockCipher,d=u.algo,l=[],s=[],t=[],r=[],w=[],v=[],b=[],x=[],q=[],n=[],a=[],c=0;256>c;c++)a[c]=128>c?c<<1:c<<1^283;for(var e=0,j=0,c=0;256>c;c++){var k=j^j<<1^j<<2^j<<3^j<<4,k=k>>>8^k&255^99;l[e]=k;s[k]=e;var z=a[e],F=a[z],G=a[F],y=257*a[k]^16843008*k;t[e]=y<<24|y>>>8;r[e]=y<<16|y>>>16;w[e]=y<<8|y>>>24;v[e]=y;y=16843009*G^65537*F^257*z^16843008*e;b[k]=y<<24|y>>>8;x[k]=y<<16|y>>>16;q[k]=y<<8|y>>>24;n[k]=y;e?(e=z^a[a[a[G^z]]],j^=a[a[j]]):e=j=1}var H=[0,1,2,4,8,16,32,64,128,27,54],d=d.AES=p.extend({_doReset:function(){for(var a=this._key,c=a.words,d=a.sigBytes/4,a=4*((this._nRounds=d+6)+1),e=this._keySchedule=[],j=0;j<a;j++)if(j<d)e[j]=c[j];else{var k=e[j-1];j%d?6<d&&4==j%d&&(k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255]):(k=k<<8|k>>>24,k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255],k^=H[j/d|0]<<24);e[j]=e[j-d]^k}c=this._invKeySchedule=[];for(d=0;d<a;d++)j=a-d,k=d%4?e[j]:e[j-4],c[d]=4>d||4>=j?k:b[l[k>>>24]]^x[l[k>>>16&255]]^q[l[k>>>8&255]]^n[l[k&255]]},encryptBlock:function(a,b){this._doCryptBlock(a,b,this._keySchedule,t,r,w,v,l)},decryptBlock:function(a,c){var d=a[c+1];a[c+1]=a[c+3];a[c+3]=d;this._doCryptBlock(a,c,this._invKeySchedule,b,x,q,n,s);d=a[c+1];a[c+1]=a[c+3];a[c+3]=d},_doCryptBlock:function(a,b,c,d,e,j,l,f){for(var m=this._nRounds,g=a[b]^c[0],h=a[b+1]^c[1],k=a[b+2]^c[2],n=a[b+3]^c[3],p=4,r=1;r<m;r++)var q=d[g>>>24]^e[h>>>16&255]^j[k>>>8&255]^l[n&255]^c[p++],s=d[h>>>24]^e[k>>>16&255]^j[n>>>8&255]^l[g&255]^c[p++],t=d[k>>>24]^e[n>>>16&255]^j[g>>>8&255]^l[h&255]^c[p++],n=d[n>>>24]^e[g>>>16&255]^j[h>>>8&255]^l[k&255]^c[p++],g=q,h=s,k=t;q=(f[g>>>24]<<24|f[h>>>16&255]<<16|f[k>>>8&255]<<8|f[n&255])^c[p++];s=(f[h>>>24]<<24|f[k>>>16&255]<<16|f[n>>>8&255]<<8|f[g&255])^c[p++];t=(f[k>>>24]<<24|f[n>>>16&255]<<16|f[g>>>8&255]<<8|f[h&255])^c[p++];n=(f[n>>>24]<<24|f[g>>>16&255]<<16|f[h>>>8&255]<<8|f[k&255])^c[p++];a[b]=q;a[b+1]=s;a[b+2]=t;a[b+3]=n},keySize:8});u.AES=p._createHelper(d)})();

    const key = CryptoJS.enc.Utf8.parse(keyStr);
    const iv = CryptoJS.enc.Utf8.parse(ivStr);
    const decrypted = CryptoJS.AES.decrypt(data, key, { iv: iv, mode: CryptoJS.mode.CBC });
    return CryptoJS.enc.Utf8.stringify(decrypted).toString();
  }

  async watch(url) {
    const pageHtml = await this.req(url);
    const dataVideoList = await this.querySelectorAll(pageHtml, "li[data-video]");
    let embedUrl = "";

    for (const item of dataVideoList) {
      const html = await item.content;
      const vUrl = await this.getAttributeText(html, "li", "data-video");
      if (vUrl && vUrl.includes("vidbasic")) {
        embedUrl = vUrl.startsWith("//") ? "https:" + vUrl : vUrl;
        break;
      }
    }

    if (!embedUrl) {
      const iframeSrc = await this.getAttributeText(pageHtml, "iframe", "src");
      if (iframeSrc) {
        embedUrl = iframeSrc.startsWith("//") ? "https:" + iframeSrc : iframeSrc;
      }
    }

    if (!embedUrl) {
      throw new Error("Embed video URL not found");
    }

    const embedRes = await this.request("", {
      headers: {
        "Miru-Url": embedUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://asianc.id/",
      },
    });

    const playerIframe = await this.getAttributeText(embedRes, "iframe#embedvideo", "src");
    let playerUrl = playerIframe || "";
    if (playerUrl && playerUrl.startsWith("/")) {
      const urlObj = new URL(embedUrl);
      playerUrl = urlObj.origin + playerUrl;
    }

    if (!playerUrl) {
      throw new Error("3rdplayer URL not found");
    }

    const playerRes = await this.request("", {
      headers: {
        "Miru-Url": playerUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": embedUrl,
      },
    });

    const cryptoMatch = playerRes.match(/data-value=["']([^"']+)["']/);
    if (!cryptoMatch) {
      throw new Error("Crypto data not found in player page");
    }

    const cryptoData = cryptoMatch[1];
    const keyMatch = playerRes.match(/key=CryptoJS\[[^\]]+\]\[[^\]]+\]\[[^\]]+\]\(([^)]+)\)/);
    const ivMatch = playerRes.match(/iv=CryptoJS\[[^\]]+\]\[[^\]]+\]\[[^\]]+\]\(([^)]+)\)/);

    let keyStr = "94588293375053432799222445521289";
    let ivStr = "5259228356829423";

    if (keyMatch && keyMatch[1]) {
      keyStr = keyMatch[1].replace(/['"\s+]/g, "");
    }
    if (ivMatch && ivMatch[1]) {
      ivStr = ivMatch[1].replace(/['"\s+]/g, "");
    }

    const streamUrl = this.decryptVidBasic(cryptoData, keyStr, ivStr);

    return {
      type: "hls",
      url: streamUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://vidbasic.top",
        "Referer": "https://vidbasic.top/",
      },
    };
  }
}
