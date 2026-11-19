const Image = require("@11ty/eleventy-img");
const path = require("path");

async function imageShortcode(src, alt, sizes = "100vw", classes = "") {
  if (!src) return "";

  // Resolve the path correctly based on the input directory
  let fullSrc = src;
  if (!src.startsWith("http")) {
    fullSrc = path.join("src", src);
  }

  let metadata = await Image(fullSrc, {
    widths: [400, 800, 1200, 1600, 2000],
    formats: ["webp", "jpeg"],
    urlPath: "/img/",
    outputDir: "./_site/img/",
    sharpWebpOptions: {
      quality: 90,
      smartSubsample: true
    },
    sharpJpegOptions: {
      quality: 90,
      progressive: true
    },
    filenameFormat: function (id, src, width, format, options) {
      const extension = path.extname(src);
      const name = path.basename(src, extension);
      return `${name}-${width}w.${format}`;
    }
  });

  let imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
    class: classes
  };

  return Image.generateHTML(metadata, imageAttributes);
}

module.exports = function (eleventyConfig) {
  // Passthrough copy for images and admin
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/**/*.webp");
  eleventyConfig.addPassthroughCopy("src/**/*.png");
  eleventyConfig.addPassthroughCopy("src/**/*.jpg");

  // Shortcode for images
  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", imageShortcode);

  // Filtro de fecha para el blog. Las fechas sin hora («2026-04-05») Eleventy las toma como medianoche UTC: esas se
  // muestran en UTC para que no salgan un día antes; las que tienen hora, en hora argentina.
  eleventyConfig.addFilter("formatoFecha", function (dateObj) {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    const sinHora = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: sinHora ? 'UTC' : 'America/Argentina/Buenos_Aires' };
    return d.toLocaleDateString('es-AR', options);
  });

  // --- Blog: SEO y GEO (19/11/2026) ---
  // La clave de IndexNow (psiferbisceglia.com/<clave>.txt).
  eleventyConfig.addPassthroughCopy("src/*.txt");
  // Verificación de Google Search Console (cuenta de Fede, 19/11/2026): no borrar.
  eleventyConfig.addPassthroughCopy("src/google18259790bfc058a9.html");
  eleventyConfig.ignores.add("src/google18259790bfc058a9.html");

  const sitio = require("./src/_data/sitio.json");
  const absoluta = (ruta) => (!ruta ? "" : /^https?:/.test(ruta) ? ruta : sitio.url + encodeURI(ruta));
  eleventyConfig.addFilter("absoluta", absoluta);
  eleventyConfig.addFilter("rutaUrl", (ruta) => (ruta ? encodeURI(ruta) : ""));
  eleventyConfig.addFilter("fechaIso", (d) => (d ? new Date(d).toISOString() : ""));
  eleventyConfig.addFilter("fechaRss", (d) => (d ? new Date(d).toUTCString() : ""));
  eleventyConfig.addFilter("fechaCorta", (d) => (d ? new Date(d).toISOString().slice(0, 10) : ""));
  eleventyConfig.addFilter("minutosLectura", (html) => {
    const palabras = String(html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(palabras / 200));
  });
  eleventyConfig.addFilter("duracionTexto", (s) => {
    const t = Math.round(Number(s) || 0);
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  });
  // Párrafos de un texto plano (la transcripción del video).
  eleventyConfig.addFilter("parrafos", (t) => String(t || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean));
  // Hasta n artículos para «Seguí leyendo»: primero los de la misma serie, después los más nuevos.
  eleventyConfig.addFilter("relacionados", (posts, url, serie, n = 3) => {
    const otros = (posts || []).filter((p) => p.url !== url).sort((a, b) => b.date - a.date);
    const misma = serie ? otros.filter((p) => p.data.serie === serie) : [];
    const resto = otros.filter((p) => !misma.includes(p));
    return [...misma, ...resto].slice(0, n);
  });

  const autor = {
    "@type": "Person",
    "@id": sitio.url + "/#fer",
    name: sitio.autor.nombre,
    honorificPrefix: "Lic.",
    jobTitle: sitio.autor.puesto,
    description: sitio.autor.descripcion,
    url: sitio.url + "/",
    image: sitio.url + sitio.autor.foto,
    email: "mailto:" + sitio.autor.email,
    sameAs: sitio.autor.redes,
    knowsAbout: sitio.autor.temas,
  };
  const ldTexto = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
  const duracionIso = (s) => {
    const t = Math.round(Number(s) || 0);
    return "PT" + (t >= 60 ? Math.floor(t / 60) + "M" : "") + (t % 60) + "S";
  };

  // Datos estructurados de la home: Fer (persona y servicio) y el sitio.
  eleventyConfig.addFilter("ldInicio", () =>
    ldTexto({
      "@context": "https://schema.org",
      "@graph": [
        autor,
        {
          "@type": "WebSite",
          "@id": sitio.url + "/#sitio",
          url: sitio.url + "/",
          name: sitio.nombre,
          inLanguage: "es",
          publisher: { "@id": sitio.url + "/#fer" },
        },
        {
          "@type": "ProfessionalService",
          "@id": sitio.url + "/#consultorio",
          name: "Psicoterapia online con Fernando Bisceglia",
          url: sitio.url + "/",
          image: sitio.url + sitio.autor.foto,
          description: "Psicoterapia individual online para adultos (ansiedad, depresión, estrés y crisis vitales) y supervisiones para profesionales de la salud mental, con un enfoque basado en evidencia.",
          areaServed: "Online",
          founder: { "@id": sitio.url + "/#fer" },
        },
      ],
    })
  );

  // Datos estructurados de un artículo: BlogPosting (+ VideoObject del reel), FAQPage y migas.
  eleventyConfig.addFilter("ldArticulo", (d) => {
    const url = sitio.url + d.url;
    const imagen = absoluta(d.image) || sitio.url + sitio.autor.foto;
    const articulo = {
      "@type": "BlogPosting",
      "@id": url + "#articulo",
      headline: d.title,
      description: d.description,
      url,
      mainEntityOfPage: url,
      image: imagen,
      datePublished: new Date(d.date).toISOString(),
      dateModified: new Date(d.modificado || d.date).toISOString(),
      inLanguage: "es",
      author: autor,
      publisher: { "@id": sitio.url + "/#fer" },
      isPartOf: { "@id": sitio.url + "/#sitio" },
    };
    if (d.resumen) articulo.abstract = d.resumen;
    if (d.etiquetas && d.etiquetas.length) articulo.keywords = d.etiquetas.join(", ");
    if (d.serie) articulo.articleSection = d.serie;
    if (d.fuentes && d.fuentes.length) {
      articulo.citation = d.fuentes.map((f) => {
        const c = { "@type": "CreativeWork", name: f.titulo };
        if (f.url) c.url = f.url;
        if (f.autores) c.author = f.autores;
        if (f.medio) c.publisher = f.medio;
        if (f.fecha) c.datePublished = String(f.fecha);
        return c;
      });
    }
    if (d.video && d.video.youtube) {
      const v = {
        "@type": "VideoObject",
        name: d.video.titulo || d.title,
        description: d.resumen || d.description,
        thumbnailUrl: [imagen, `https://i.ytimg.com/vi/${d.video.youtube}/hqdefault.jpg`],
        uploadDate: new Date(d.video.subido || d.date).toISOString(),
        embedUrl: `https://www.youtube.com/embed/${d.video.youtube}`,
        url: `https://www.youtube.com/shorts/${d.video.youtube}`,
        inLanguage: "es",
        author: { "@id": sitio.url + "/#fer" },
      };
      if (d.video.duracion) v.duration = duracionIso(d.video.duracion);
      if (d.video.transcripcion) v.transcript = d.video.transcripcion;
      articulo.video = v;
    }
    const grafo = [
      articulo,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: sitio.url + "/" },
          { "@type": "ListItem", position: 2, name: "Artículos", item: sitio.url + "/blog/" },
          { "@type": "ListItem", position: 3, name: d.title, item: url },
        ],
      },
    ];
    if (d.faq && d.faq.length) {
      grafo.push({
        "@type": "FAQPage",
        "@id": url + "#preguntas",
        mainEntity: d.faq.map((f) => ({ "@type": "Question", name: f.p, acceptedAnswer: { "@type": "Answer", text: f.r } })),
      });
    }
    return ldTexto({ "@context": "https://schema.org", "@graph": grafo });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    passthroughFileCopy: true,
    templateFormats: ["html", "njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
