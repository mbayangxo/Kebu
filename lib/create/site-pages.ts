/** Pages Yande should draft from a business category (words → full site). */
export function pagesForCategory(category: string): string[] {
  const c = category.trim().toLowerCase();
  if (["fashion", "beauty", "store", "shop"].includes(c)) {
    return ["home", "shop", "about", "contact"];
  }
  if (c === "restaurant") return ["home", "menu", "about", "contact"];
  if (c === "music") return ["home", "music", "videos", "about", "contact"];
  if (["film", "public figure"].includes(c)) return ["home", "work", "about", "contact"];
  if (["agriculture", "technology", "services", "business"].includes(c)) {
    return ["home", "services", "about", "contact"];
  }
  return ["home", "about", "contact"];
}
