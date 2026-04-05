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

  // Filtro de fecha para el blog
  eleventyConfig.addFilter("formatoFecha", function (dateObj) {
    if (!dateObj) return "";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateObj).toLocaleDateString('es-ES', options);
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
