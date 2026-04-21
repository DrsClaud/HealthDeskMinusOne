const { createWriteStream } = require("fs");
const { SitemapStream } = require("sitemap");

const sitemap = new SitemapStream({ hostname: "https://hlthdsk.com" });

const writeStream = createWriteStream("./public/sitemap.xml");
sitemap.pipe(writeStream);

sitemap.write({ url: "/", priority: 1 });
sitemap.write({ url: "/register", priority: 0.8 });
sitemap.write({ url: "/auth", priority: 0.8 });
sitemap.write({ url: "/reset-password", priority: 0.5 });
sitemap.end();
