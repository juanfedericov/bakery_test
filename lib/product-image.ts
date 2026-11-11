export function isSupportedProductImage(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" &&
      parsed.hostname === "images.unsplash.com" &&
      parsed.port === "" &&
      parsed.pathname.startsWith("/photo-");
  } catch {
    return false;
  }
}
