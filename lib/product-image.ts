export function isSupportedProductImage(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      parsed.hostname === "images.unsplash.com" &&
      parsed.port === "" &&
      /^\/photo-[^/]*$/.test(parsed.pathname);
  } catch {
    return false;
  }
}
