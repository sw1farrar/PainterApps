#!/usr/bin/env node

import { readImageDimensions } from "../src/lib/sell-sheet/paint-can-image.ts";

const urls = [
  "https://www.minwax.com/content/dam/cbg-minwax/minwaxlogo.svg",
  "https://www.minwax.com/content/dam/cbg-minwax/visualizer/minwax-visualizer1.jpg",
];

for (const url of urls) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.minwax.com/" },
  });
  let buf = Buffer.from(await res.arrayBuffer());
  let mime = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (mime === "image/svg+xml") {
    const sharp = (await import("sharp")).default;
    buf = await sharp(buf, { density: 220 })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    mime = "image/png";
  }
  const dims = readImageDimensions(buf, mime);
  const lower = url.toLowerCase();
  const ratio = dims ? dims.width / dims.height : null;
  console.log("\n", url);
  console.log({ mime, bytes: buf.byteLength, dims, ratio });
  console.log({
    favicon: /favicons|favicon|apple-touch/.test(lower),
    hasLogoInUrl: lower.includes("logo"),
    wideNoLogo: ratio != null && ratio > 3.2 && !lower.includes("logo"),
    squareIcon:
      dims &&
      Math.abs(dims.width - dims.height) <= 20 &&
      dims.width <= 200 &&
      !lower.includes("logo"),
  });
}