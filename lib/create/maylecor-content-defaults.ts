import { MAYLECOR_LOCAL_ASSETS, MAYLECOR_WIX } from "./maylecor-defaults";

export function defaultMaylecorPhotoGalleryItems() {
  /** Empty slots — founder uploads May photos via Media → drop onto gallery in the editor. */
  return [
    { src: "", alt: "Upload photo 1" },
    { src: "", alt: "Upload photo 2" },
    { src: "", alt: "Upload photo 3" },
    { src: "", alt: "Upload photo 4" },
    { src: "", alt: "Upload photo 5" },
    { src: "", alt: "Upload photo 6" },
  ];
}

export function defaultMaylecorVideoGalleryItems() {
  return [
    { src: MAYLECOR_WIX.bottomLeft, alt: "Music video still" },
    { src: MAYLECOR_WIX.bottomRight, alt: "Behind the scenes" },
    { src: MAYLECOR_WIX.collageTop, alt: "May Lecor — visuals" },
  ];
}

/** Multi-video grid defaults — paste real YouTube URLs / upload files in the editor. */
export function defaultMaylecorVideoItems() {
  return [
    {
      src: "",
      title: "Video 1",
      caption: "Paste a YouTube URL or upload a video file",
      thumbnail: MAYLECOR_WIX.portraitMain,
    },
    {
      src: "",
      title: "Video 2",
      caption: "Add another clip",
      thumbnail: MAYLECOR_WIX.bottomLeft,
    },
    {
      src: "",
      title: "Video 3",
      caption: "Add another clip",
      thumbnail: MAYLECOR_WIX.bottomRight,
    },
    {
      src: "",
      title: "Video 4",
      caption: "Add another clip",
      thumbnail: MAYLECOR_WIX.collageTop,
    },
  ];
}

/** Sample merch — editable in builder Products tab or inline on shop page. */
export function defaultMaylecorShopProducts() {
  return [
    {
      name: "May Lecor — Digital Album",
      description:
        "Full album download. Pay via mobile money or WhatsApp — we confirm your order manually.",
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

/** @deprecated Prefer defaultMaylecorVideoItems() — kept for older call sites. */
export const MAYLECOR_DEFAULT_YOUTUBE_EMBED = "";
