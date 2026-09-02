import { MAYLECOR_WIX } from "./maylecor-defaults";

export function defaultMaylecorPhotoGalleryItems() {
  return [
    { src: MAYLECOR_WIX.collageTop, alt: "May Lecor — studio" },
    { src: MAYLECOR_WIX.bottomLeft, alt: "May Lecor — live" },
    { src: MAYLECOR_WIX.bottomRight, alt: "May Lecor — performance" },
    { src: MAYLECOR_WIX.logoBanner, alt: "May Lecor — brand" },
    { src: MAYLECOR_WIX.albumArt, alt: "May Lecor — album art" },
    { src: MAYLECOR_WIX.portraitMain, alt: "May Lecor — portrait" },
  ];
}

export function defaultMaylecorVideoGalleryItems() {
  return [
    { src: MAYLECOR_WIX.bottomLeft, alt: "Music video still" },
    { src: MAYLECOR_WIX.bottomRight, alt: "Behind the scenes" },
    { src: MAYLECOR_WIX.collageTop, alt: "May Lecor — visuals" },
  ];
}

/** Sample merch — editable in builder Products tab or inline on shop page. */
export function defaultMaylecorShopProducts() {
  return [
    {
      name: "May Lecor — Digital Album",
      description: "Full album download. Pay via mobile money or WhatsApp — we confirm your order manually.",
      priceLabel: "5 000 XOF",
      imageUrl: MAYLECOR_WIX.albumArt,
      whatsappMessage: "Hi May Lecor team — I want to buy the digital album.",
    },
    {
      name: "Tour T-shirt",
      description: "Official tour tee. Sizes S–XL.",
      priceLabel: "15 000 XOF",
      imageUrl: MAYLECOR_WIX.collageTop,
      whatsappMessage: "Hi — I want to order a May Lecor tour T-shirt.",
    },
    {
      name: "Signed poster",
      description: "Limited signed print from the latest release.",
      priceLabel: "8 000 XOF",
      imageUrl: MAYLECOR_WIX.bottomLeft,
      whatsappMessage: "Hi — I want a signed May Lecor poster.",
    },
  ];
}

/** Default Spotify artist embed path — replace with your artist ID in the editor. */
export const MAYLECOR_DEFAULT_SPOTIFY_EMBED =
  "https://open.spotify.com/embed/artist/4YRxDV8wJFPHPTeXepOstw?utm_source=generator";

export const MAYLECOR_DEFAULT_YOUTUBE_EMBED =
  "https://www.youtube.com/embed/videoseries?list=UUuser";
