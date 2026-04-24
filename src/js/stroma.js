/*!
 * Stroma.js v1.1.0
 * Lightweight, framework-agnostic SEO meta tag generator.
 *
 * Named after biological stroma — the supportive matrix inside cells.
 * Stroma.js is the scaffolding that binds a single config object into
 * every signal search engines and social platforms need to read your page.
 *
 * < 2KB gzipped | No dependencies | Framework-agnostic | SPA & SSR ready
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? module.exports = factory()
    : typeof define === 'function' && define.amd
      ? define(factory)
      : (global.Stroma = factory());
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ─── Module-level defaults (overridable via Stroma.defaults() or per-call) ─
  var DEFAULTS = {
    maxTitleLength:       60,
    maxDescriptionLength: 160,
    robots:      'index, follow',
    ogType:      'website',
    locale:      'en_US',
    imageWidth:  '1200',
    imageHeight: '630',
  };

  var STROMA_ATTR = 'data-stroma';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function truncate(str, maxLen) {
    if (!str) return '';
    str = String(str).trim();
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '\u2026' : str;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/"/g,  '&quot;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;');
  }

  function toAbsoluteUrl(url, base) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    try {
      var origin = base || (typeof window !== 'undefined' ? window.location.origin : '');
      return new URL(url, origin).href;
    } catch (_) { return url; }
  }

  // ─── DOM helpers (client-side only) ───────────────────────────────────────

  function findFirstImage() {
    var img = document.querySelector('body img[src]');
    return img ? toAbsoluteUrl(img.getAttribute('src')) : '';
  }

  function setMeta(attrName, attrValue, content) {
    if (!content) return;
    var el = document.querySelector('meta[' + attrName + '="' + attrValue + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      el.setAttribute(STROMA_ATTR, '');
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setTitle(text) {
    if (!text) return;
    var el = document.querySelector('title');
    if (!el) {
      el = document.createElement('title');
      el.setAttribute(STROMA_ATTR, '');
      document.head.appendChild(el);
    }
    el.textContent = text;
  }

  function setLink(rel, href) {
    if (!href) return;
    var el = document.querySelector('link[rel="' + rel + '"]');
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      el.setAttribute(STROMA_ATTR, '');
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function setJsonLd(data) {
    var el = document.querySelector('script[type="application/ld+json"][' + STROMA_ATTR + ']');
    if (!el) {
      el = document.createElement('script');
      el.setAttribute('type', 'application/ld+json');
      el.setAttribute(STROMA_ATTR, '');
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data, null, 2);
  }

  function cleanup() {
    document.querySelectorAll('[' + STROMA_ATTR + ']').forEach(function (el) { el.remove(); });
  }

  // ─── String helpers (SSR / renderToString) ─────────────────────────────────

  function strMeta(attrName, attrValue, content) {
    if (!content) return '';
    return '<meta ' + attrName + '="' + escapeHtml(attrValue) +
      '" content="' + escapeHtml(content) + '" ' + STROMA_ATTR + '>\n';
  }

  function strLink(rel, href) {
    if (!href) return '';
    return '<link rel="' + escapeHtml(rel) + '" href="' + escapeHtml(href) +
      '" ' + STROMA_ATTR + '>\n';
  }

  function strTitle(text) {
    if (!text) return '';
    return '<title ' + STROMA_ATTR + '>' + escapeHtml(text) + '</title>\n';
  }

  function strJsonLd(data) {
    return '<script type="application/ld+json" ' + STROMA_ATTR + '>\n' +
      JSON.stringify(data, null, 2) + '\n</script>\n';
  }

  // ─── JSON-LD Schema Builders ───────────────────────────────────────────────

  function buildWebPageSchema(cfg) {
    var s = {
      '@context':    'https://schema.org',
      '@type':       cfg.schemaType || 'WebPage',
      'name':        cfg.title,
      'description': cfg.description,
      'url':         cfg.url,
    };
    if (cfg.image)         s.image         = cfg.image;
    if (cfg.author)        s.author        = { '@type': 'Person', name: cfg.author };
    if (cfg.siteName)      s.isPartOf      = { '@type': 'WebSite', name: cfg.siteName };
    if (cfg.datePublished) s.datePublished = cfg.datePublished;
    if (cfg.dateModified)  s.dateModified  = cfg.dateModified;
    return s;
  }

  function buildArticleSchema(cfg) {
    return {
      '@context':      'https://schema.org',
      '@type':         'Article',
      'headline':      cfg.title,
      'description':   cfg.description,
      'url':           cfg.url,
      'image':         cfg.image || '',
      'author':        { '@type': 'Person', name: cfg.author || 'Unknown' },
      'publisher': {
        '@type': 'Organization',
        'name':  cfg.siteName || cfg.author || '',
        'logo':  { '@type': 'ImageObject', url: cfg.logo || '' },
      },
      'datePublished': cfg.datePublished || '',
      'dateModified':  cfg.dateModified  || cfg.datePublished || '',
    };
  }

  function buildProductSchema(cfg) {
    var s = {
      '@context':    'https://schema.org',
      '@type':       'Product',
      'name':        cfg.title,
      'description': cfg.description,
      'url':         cfg.url,
    };
    if (cfg.image) s.image = cfg.image;
    if (cfg.price != null) {
      s.offers = {
        '@type':        'Offer',
        'price':         cfg.price,
        'priceCurrency': cfg.priceCurrency || 'USD',
        'availability':  'https://schema.org/InStock',
      };
    }
    return s;
  }

  function buildBreadcrumbSchema(items) {
    return {
      '@context': 'https://schema.org',
      '@type':    'BreadcrumbList',
      'itemListElement': items.map(function (item, i) {
        return { '@type': 'ListItem', 'position': i + 1, 'name': item.name, 'item': toAbsoluteUrl(item.url) };
      }),
    };
  }

  function pickSchema(cfg) {
    switch (cfg.schema) {
      case 'article':    return buildArticleSchema(cfg);
      case 'product':    return buildProductSchema(cfg);
      case 'breadcrumb': return cfg.breadcrumb
        ? buildBreadcrumbSchema(cfg.breadcrumb)
        : buildWebPageSchema(cfg);
      default:           return buildWebPageSchema(cfg);
    }
  }

  // ─── Config Resolution ─────────────────────────────────────────────────────

  function resolveConfig(input) {
    var cfg = Object.assign({}, input);

    // Per-call overrides take precedence; fall back to module DEFAULTS
    var maxT = cfg.maxTitleLength       || DEFAULTS.maxTitleLength;
    var maxD = cfg.maxDescriptionLength || DEFAULTS.maxDescriptionLength;

    cfg.url   = toAbsoluteUrl(cfg.url || (typeof window !== 'undefined' ? window.location.href : ''));
    cfg.image = toAbsoluteUrl(cfg.image || (typeof document !== 'undefined' ? findFirstImage() : ''));

    cfg.titleFull       = truncate(cfg.title,       maxT);
    cfg.descriptionFull = truncate(cfg.description, maxD);

    cfg.twitterCard = cfg.twitterCard || (cfg.image ? 'summary_large_image' : 'summary');
    cfg.locale      = cfg.locale      || DEFAULTS.locale;
    cfg.robots      = cfg.robots      || DEFAULTS.robots;
    cfg.ogType      = cfg.ogType      || DEFAULTS.ogType;
    cfg.imageWidth  = cfg.imageWidth  || DEFAULTS.imageWidth;
    cfg.imageHeight = cfg.imageHeight || DEFAULTS.imageHeight;

    return cfg;
  }

  // ─── Tag Descriptor List ───────────────────────────────────────────────────

  function describeTags(cfg) {
    var t = [];
    var kw = cfg.keywords
      ? (Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : cfg.keywords)
      : null;

    t.push({ fn: 'title',  a: [cfg.titleFull] });

    // Core
    t.push({ fn: 'meta', a: ['name', 'description', cfg.descriptionFull] });
    if (cfg.author)     t.push({ fn: 'meta', a: ['name', 'author',      cfg.author] });
    if (kw)             t.push({ fn: 'meta', a: ['name', 'keywords',    kw] });
    t.push({ fn: 'meta', a: ['name', 'robots', cfg.robots] });
    if (cfg.themeColor) t.push({ fn: 'meta', a: ['name', 'theme-color', cfg.themeColor] });
    t.push({ fn: 'link', a: ['canonical', cfg.canonical || cfg.url] });

    // Open Graph
    t.push({ fn: 'meta', a: ['property', 'og:title',       cfg.titleFull] });
    t.push({ fn: 'meta', a: ['property', 'og:description', cfg.descriptionFull] });
    t.push({ fn: 'meta', a: ['property', 'og:url',         cfg.url] });
    if (cfg.image) {
      t.push({ fn: 'meta', a: ['property', 'og:image',        cfg.image] });
      t.push({ fn: 'meta', a: ['property', 'og:image:width',  cfg.imageWidth] });
      t.push({ fn: 'meta', a: ['property', 'og:image:height', cfg.imageHeight] });
      t.push({ fn: 'meta', a: ['property', 'og:image:alt',    cfg.imageAlt || cfg.titleFull] });
    }
    t.push({ fn: 'meta', a: ['property', 'og:type',   cfg.ogType] });
    t.push({ fn: 'meta', a: ['property', 'og:locale', cfg.locale] });
    if (cfg.siteName) t.push({ fn: 'meta', a: ['property', 'og:site_name', cfg.siteName] });

    // Twitter Card
    t.push({ fn: 'meta', a: ['name', 'twitter:card',        cfg.twitterCard] });
    t.push({ fn: 'meta', a: ['name', 'twitter:title',       cfg.titleFull] });
    t.push({ fn: 'meta', a: ['name', 'twitter:description', cfg.descriptionFull] });
    if (cfg.image) {
      t.push({ fn: 'meta', a: ['name', 'twitter:image',     cfg.image] });
      t.push({ fn: 'meta', a: ['name', 'twitter:image:alt', cfg.imageAlt || cfg.titleFull] });
    }
    if (cfg.twitterSite)    t.push({ fn: 'meta', a: ['name', 'twitter:site',    cfg.twitterSite] });
    if (cfg.twitterCreator) t.push({ fn: 'meta', a: ['name', 'twitter:creator', cfg.twitterCreator] });

    // WeChat / article:author
    if (cfg.author) t.push({ fn: 'meta', a: ['property', 'article:author', cfg.author] });

    // PWA
    if (cfg.themeColor) {
      t.push({ fn: 'meta', a: ['name', 'msapplication-navbutton-color',         cfg.themeColor] });
      t.push({ fn: 'meta', a: ['name', 'apple-mobile-web-app-status-bar-style', cfg.themeColor] });
    }
    if (cfg.pwa) {
      t.push({ fn: 'meta', a: ['name', 'apple-mobile-web-app-capable', 'yes'] });
      t.push({ fn: 'meta', a: ['name', 'mobile-web-app-capable',       'yes'] });
      t.push({ fn: 'meta', a: ['name', 'apple-mobile-web-app-title', cfg.appName || cfg.titleFull] });
      if (cfg.image) t.push({ fn: 'link', a: ['apple-touch-icon', cfg.image] });
    }

    // JSON-LD
    t.push({ fn: 'jsonld', a: [pickSchema(cfg)] });

    return t;
  }

  // ─── DOM Writer ────────────────────────────────────────────────────────────

  function applyTags(cfg) {
    describeTags(cfg).forEach(function (tag) {
      switch (tag.fn) {
        case 'title':  setTitle(tag.a[0]);                  break;
        case 'meta':   setMeta(tag.a[0], tag.a[1], tag.a[2]); break;
        case 'link':   setLink(tag.a[0], tag.a[1]);         break;
        case 'jsonld': setJsonLd(tag.a[0]);                 break;
      }
    });
  }

  // ─── SSR String Renderer ───────────────────────────────────────────────────

  function renderTags(cfg) {
    return describeTags(cfg).map(function (tag) {
      switch (tag.fn) {
        case 'title':  return strTitle(tag.a[0]);
        case 'meta':   return strMeta(tag.a[0], tag.a[1], tag.a[2]);
        case 'link':   return strLink(tag.a[0], tag.a[1]);
        case 'jsonld': return strJsonLd(tag.a[0]);
        default:       return '';
      }
    }).join('');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  var Stroma = {
    /**
     * Initialize (or re-initialize) all SEO tags in the DOM.
     * Removes any previously injected Stroma tags first.
     * For server-side environments, use renderToString() instead.
     *
     * @param {Object} options
     * @param {string}   options.title
     * @param {string}   options.description
     * @param {string}   [options.url]                  defaults to window.location.href
     * @param {string}   [options.image]                absolute URL; falls back to first <img>
     * @param {string}   [options.imageAlt]
     * @param {string}   [options.imageWidth]           default '1200'
     * @param {string}   [options.imageHeight]          default '630'
     * @param {string}   [options.siteName]
     * @param {string}   [options.author]
     * @param {string|string[]} [options.keywords]
     * @param {string}   [options.locale]               default 'en_US'
     * @param {string}   [options.robots]               default 'index, follow'
     * @param {string}   [options.themeColor]
     * @param {string}   [options.canonical]
     * @param {string}   [options.ogType]               default 'website'
     * @param {string}   [options.twitterCard]          'summary' | 'summary_large_image'
     * @param {string}   [options.twitterSite]          e.g. '@yourhandle'
     * @param {string}   [options.twitterCreator]
     * @param {string}   [options.schema]               'webpage'|'article'|'product'|'breadcrumb'
     * @param {string}   [options.datePublished]
     * @param {string}   [options.dateModified]
     * @param {number}   [options.price]                for schema: 'product'
     * @param {string}   [options.priceCurrency]        default 'USD'
     * @param {Array}    [options.breadcrumb]           [{name,url}, …] for schema: 'breadcrumb'
     * @param {boolean}  [options.pwa]                  inject PWA / Apple hints
     * @param {string}   [options.appName]              PWA display name
     * @param {string}   [options.logo]                 publisher logo for article schema
     * @param {number}   [options.maxTitleLength]       override default 60-char limit
     * @param {number}   [options.maxDescriptionLength] override default 160-char limit
     * @returns {Stroma}
     */
    init: function (options) {
      if (typeof document === 'undefined') return this;
      cleanup();
      var cfg = resolveConfig(options || {});
      applyTags(cfg);
      this._current = cfg;
      return this;
    },
    
    update: function (patch) {
      return this.init(Object.assign({}, this._current || {}, patch));
    },
    
    reset: function () {
      if (typeof document !== 'undefined') cleanup();
      this._current = null;
      return this;
    },
    
    getConfig: function () {
      return Object.assign({}, this._current);
    },
    
    renderToString: function (options) {
      return renderTags(resolveConfig(options || {}));
    },
    
    breadcrumb: function (items) {
      if (typeof document !== 'undefined') setJsonLd(buildBreadcrumbSchema(items));
      return this;
    },
    
    defaults: function (patch) {
      if (!patch) return Object.assign({}, DEFAULTS);
      Object.assign(DEFAULTS, patch);
      return this;
    },

    version: '1.1.0',
  };

  return Stroma;
}));
