import { defaultMaylecorMusicProps } from "./maylecor-defaults";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
  defaultMaylecorVideoGalleryItems,
  MAYLECOR_DEFAULT_YOUTUBE_EMBED,
} from "./maylecor-content-defaults";
import type { WebsiteDefinition } from "./website-schema";

/** Default inner pages for May Lecor ksendr-motion portfolio (real sections, editable in builder). */
export function maylecorMotionSitePages(artistName = "MAY LECOR"): WebsiteDefinition["pages"] {
  return [
    {
      slug: "home",
      title: "Home",
      sections: [],
    },
    {
      slug: "music",
      title: "Music",
      sections: [
        {
          id: "maylecor-music-1",
          type: "maylecor-music",
          props: defaultMaylecorMusicProps(artistName),
        },
        {
          id: "maylecor-music-stream",
          type: "audio",
          props: {
            heading: "Your music",
            src: "",
            title: "Upload your track",
            artist: artistName,
          },
        },
      ],
    },
    {
      slug: "videos",
      title: "Videos",
      sections: [
        {
          id: "maylecor-videos-1",
          type: "video",
          props: {
            heading: "Videos",
            src: MAYLECOR_DEFAULT_YOUTUBE_EMBED,
            caption: "Paste your YouTube video or playlist URL in the editor.",
          },
        },
        {
          id: "maylecor-videos-gallery",
          type: "gallery",
          props: {
            items: defaultMaylecorVideoGalleryItems(),
          },
        },
      ],
    },
    {
      slug: "photos",
      title: "Photos",
      sections: [
        {
          id: "maylecor-photos-1",
          type: "gallery",
          props: {
            items: defaultMaylecorPhotoGalleryItems(),
          },
        },
      ],
    },
    {
      slug: "mays-world",
      title: "May's World",
      sections: [
        {
          id: "maylecor-world-text",
          type: "text",
          props: {
            heading: "May's World",
            body: "Everything I'm building — music, visuals, live shows, and what's next. Edit this page in your Kebu site editor.",
          },
        },
        {
          id: "maylecor-world-features",
          type: "features",
          props: {
            heading: "What's happening",
            items: [
              { title: "New releases", body: "Singles, albums, and collaborations." },
              { title: "Live shows", body: "Tour dates and festival appearances." },
              { title: "Behind the scenes", body: "Studio, travel, and creative process." },
            ],
          },
        },
      ],
    },
    {
      slug: "shop",
      title: "Shop",
      sections: [
        {
          id: "maylecor-shop-intro",
          type: "text",
          props: {
            heading: "Shop",
            body: "Merch and music — add or edit products below. Customers order via WhatsApp today; JOKO mobile-money checkout for the store is coming in a later Kebu slice.",
          },
        },
        {
          id: "maylecor-shop-products",
          type: "products",
          props: {
            heading: "Merch & music",
            items: defaultMaylecorShopProducts(),
          },
        },
        {
          id: "maylecor-shop-whatsapp",
          type: "whatsapp",
          props: {
            label: "Order on WhatsApp — pay with mobile money",
            phone: "+221770000000",
            message: "Hi May Lecor — I want to place an order from your shop.",
          },
        },
        {
          id: "maylecor-shop-newsletter",
          type: "newsletter",
          props: {
            heading: "Join May's list",
            subheading: "Be first to know about drops, shows, and member perks.",
            buttonLabel: "Sign up",
          },
        },
      ],
    },
  ];
}
