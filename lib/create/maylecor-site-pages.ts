import { siteFormSectionSchema } from "./site-forms";
import { defaultMaylecorMusicProps } from "./maylecor-defaults";
import {
  defaultMaylecorPhotoGalleryItems,
  defaultMaylecorShopProducts,
  defaultMaylecorVideoGalleryItems,
  defaultMaylecorVideoItems,
} from "./maylecor-content-defaults";
import { maylecorAboutPageSections } from "./maylecor-about-bio";
import type { WebsiteDefinition } from "./website-schema";

/** Default inner pages for May Lecor — primary chrome + May's World hub. */
export function maylecorMotionSitePages(artistName = "MAY LECOR"): WebsiteDefinition["pages"] {
  const photos = defaultMaylecorPhotoGalleryItems();
  return [
    {
      slug: "home",
      title: "Home",
      sections: [],
    },
    {
      slug: "contact",
      title: "Contact",
      sections: [{
        id: "maylecor-contact-form",
        type: "form",
        props: siteFormSectionSchema.parse({
          heading: "Contact May",
          subheading: "Press, bookings, partnerships and other enquiries. Send a message to May’s team.",
          buttonLabel: "Send enquiry",
          successMessage: "Thank you. Your enquiry has been received by May’s team.",
          fields: [
            { id: "name", label: "Your name", type: "text", required: true },
            { id: "email", label: "Email address", type: "email", required: true },
            { id: "topic", label: "Enquiry type", type: "select", required: true, options: ["Press", "Booking", "Partnership", "Other"] },
            { id: "message", label: "Your message", type: "textarea", required: true },
          ],
        }),
      }],
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
            body: "Merch and music — add or edit products below. Customers can pay with JOKO (mobile money) when configured, or order via WhatsApp.",
          },
        },
        {
          id: "maylecor-shop-products",
          type: "products",
          props: {
            heading: "Merch & music",
            layout: "grid",
            columns: 3,
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
    {
      slug: "updates",
      title: "Updates",
      sections: [
        {
          id: "maylecor-updates-hero",
          type: "hero",
          props: {
            heading: "Updates",
            subheading: "What May is doing right now — new music, video, and life.",
            buttonLabel: "Watch the video",
            buttonHref: "/videos",
            align: "left",
            background: "#0A0A0A",
          },
        },
        {
          id: "maylecor-updates-feed",
          type: "features",
          props: {
            heading: "Latest",
            layout: "grid",
            items: [
              {
                title: "\"Yaw Laa Taan\" is out",
                body: "May's new single is streaming now — watch the video and hear the full sound.",
                href: "/music",
              },
              {
                title: "Behind the visual",
                body: "Go behind the scenes of the \"Yaw Laa Taan\" shoot — the full clip is on Video.",
                href: "/videos",
              },
              {
                title: "Inside May's World",
                body: "Music, video, audio, Maygazine, and May by May — everything May's building, in one place.",
                href: "/mays-world",
              },
            ],
          },
        },
        {
          id: "maylecor-updates-video",
          type: "video",
          props: {
            heading: "Update clips",
            layout: "single",
            columns: 2,
            items: defaultMaylecorVideoItems().slice(0, 1),
          },
        },
        {
          id: "maylecor-updates-photos",
          type: "gallery",
          props: {
            heading: "Moments",
            layout: "grid",
            columns: 3,
            items: photos.slice(0, 3),
          },
        },
      ],
    },
    {
      slug: "mays-world",
      title: "May's World",
      sections: [
        {
          id: "maylecor-world-intro",
          type: "hero",
          props: {
            heading: "May's World",
            subheading:
              "An animated moodboard of May — music, film, sound, photos, Maygazine, and May by May in the kitchen. Tap a tile to step into that room.",
            buttonLabel: "Cook with May",
            buttonHref: "/may-by-may",
            align: "center",
            background: "#0A0A0A",
          },
        },
        {
          id: "maylecor-world-mood",
          type: "gallery",
          props: {
            heading: "Atmosphere",
            layout: "featured",
            columns: 3,
            items: photos,
          },
        },
        {
          id: "maylecor-world-rooms",
          type: "features",
          props: {
            heading: "Rooms in the world",
            layout: "moodboard",
            items: [
              {
                title: "Music",
                body: "Singles, albums, and streaming — the sound room.",
                href: "/music",
                image: photos[4]?.src ?? "",
              },
              {
                title: "Video",
                body: "Music videos and visual stories in motion.",
                href: "/videos",
                image: photos[1]?.src ?? "",
              },
              {
                title: "Audio",
                body: "Podcasts, voice notes, and soundscapes.",
                href: "/audio",
                image: photos[2]?.src ?? "",
              },
              {
                title: "Maygazine",
                body: "Stories, looks, travel, and galleries — May's written world.",
                href: "/maygazine",
                image: photos[0]?.src ?? "",
              },
              {
                title: "May by May",
                body: "Cooking with May — recipes, baking, kitchen energy.",
                href: "/may-by-may",
                image: photos[5]?.src ?? "",
              },
            ],
          },
        },
      ],
    },
    {
      slug: "about",
      title: "About May",
      sections: maylecorAboutPageSections(),
    },
    {
      slug: "press",
      title: "Press",
      sections: [
        {
          id: "maylecor-press-hero",
          type: "text",
          props: {
            heading: "Press",
            body: "Welcome, journalists and partners. Everything you need for May Lècor coverage: short bio, approved photos, and booking notes.",
          },
        },
        {
          id: "maylecor-press-bio",
          type: "text",
          props: {
            heading: "Short bio",
            body: "May Lècor is a singer, songwriter, composer, dancer, choreographer, director, actress, fashion designer, entrepreneur, and philanthropist. She released her first single Guerre from her debut album Maytamorphisis in late 2024. Full story on the About May page.",
          },
        },
        {
          id: "maylecor-press-photos",
          type: "gallery",
          props: {
            heading: "Approved press photos",
            items: defaultMaylecorPhotoGalleryItems(),
          },
        },
        {
          id: "maylecor-press-kit",
          type: "features",
          props: {
            heading: "Press kit",
            items: [
              {
                title: "High-res photos",
                body: "Approved stills from the gallery above, cleared for press use.",
              },
              {
                title: "Music & video",
                body: "\"Yaw Laa Taan\" — the single and the video.",
                href: "/videos",
              },
              {
                title: "Foundation",
                body: "For Mayjor Good / foundation stories, see the Mayjor Good page.",
                href: "/mayjor-good",
              },
            ],
          },
        },
        {
          id: "maylecor-press-video",
          type: "video",
          props: {
            heading: "Press / performance clips",
            src: "",
            layout: "single",
            columns: 2,
            items: defaultMaylecorVideoItems().slice(0, 1),
          },
        },
      ],
    },
    {
      slug: "mayjor-good",
      title: "Mayjor Good",
      sections: [
        {
          id: "maylecor-mayjor-1",
          type: "text",
          props: {
            heading: "Mayjor Good",
            body: "For The Mayjor Good is May's foundation — helping youth with school supplies, SST & talibés care, food and showers, medical and monthly clinic visits, monthly groceries for students, care for orphans, and job opportunities. Full foundation site: mayjorgood.kebu.africa. Press uses Press; fans follow May on social.",
          },
        },
        {
          id: "maylecor-mayjor-photo",
          type: "gallery",
          props: {
            heading: "Moments",
            items: defaultMaylecorPhotoGalleryItems().slice(0, 3),
          },
        },
        {
          id: "maylecor-mayjor-pillars",
          type: "features",
          props: {
            heading: "What we stand for",
            layout: "moodboard",
            items: [
              {
                title: "School supplies",
                body: "Kits so youth can learn with what they need.",
                href: "https://mayjorgood.kebu.africa/service",
              },
              {
                title: "SST · talibés · orphans",
                body: "Food, showers, and care with dignity.",
                href: "https://mayjorgood.kebu.africa/service",
              },
              {
                title: "Health & groceries",
                body: "Monthly clinic visits and monthly groceries for students.",
                href: "https://mayjorgood.kebu.africa/service",
              },
              {
                title: "Youth jobs",
                body: "Job opportunities so young people can earn and grow.",
                href: "https://mayjorgood.kebu.africa/opportunity",
              },
            ],
          },
        },
        {
          id: "maylecor-mayjor-howto",
          type: "text",
          props: {
            heading: "How to support",
            body: "Share Mayjor Good, volunteer on care days, or partner on school kits, clinic days, groceries, and youth jobs.",
          },
        },
        {
          id: "maylecor-mayjor-newsletter",
          type: "newsletter",
          props: {
            heading: "Stay with Mayjor Good",
            subheading: "Get foundation updates from May's World.",
            buttonLabel: "Sign up",
          },
        },
      ],
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
      title: "Video",
      sections: [
        {
          id: "maylecor-videos-intro",
          type: "text",
          props: {
            heading: "Video",
            body: "Music videos and visuals from May.",
          },
        },
        {
          id: "maylecor-videos-1",
          type: "video",
          props: {
            heading: "Watch",
            src: "",
            layout: "grid",
            columns: 2,
            items: defaultMaylecorVideoItems(),
          },
        },
        {
          id: "maylecor-videos-gallery",
          type: "gallery",
          props: {
            heading: "Stills",
            layout: "grid",
            columns: 3,
            items: defaultMaylecorVideoGalleryItems(),
          },
        },
      ],
    },
    {
      slug: "audio",
      title: "Audio",
      sections: [
        {
          id: "maylecor-audio-1",
          type: "audio",
          props: {
            heading: "Audio",
            src: "",
            title: "Add a podcast or voice note",
            artist: artistName,
          },
        },
        {
          id: "maylecor-audio-text",
          type: "text",
          props: {
            heading: "Listen deeper",
            body: "Podcasts, interviews, and sound from May's World.",
          },
        },
      ],
    },
    {
      // Maygazine is May's editorial home — stories, looks, and the photo galleries live here.
      // There is no separate bare "Photos" page: a plain grid next to an editorial magazine page
      // was a redundant nav entry, so photo content now lives inside Maygazine's layout.
      slug: "maygazine",
      title: "Maygazine",
      sections: [
        {
          id: "maylecor-maygazine-1",
          type: "text",
          props: {
            heading: "Maygazine",
            body: "May's written world — stories, looks, travel, and the photos behind the music.",
          },
        },
        {
          id: "maylecor-maygazine-gallery",
          type: "gallery",
          props: {
            heading: "Gallery",
            layout: "featured",
            columns: 3,
            items: defaultMaylecorPhotoGalleryItems(),
          },
        },
        {
          id: "maylecor-maygazine-features",
          type: "features",
          props: {
            heading: "More from May",
            items: [
              { title: "Press", body: "Approved photos, bio, and booking notes for press and partners.", href: "/press" },
              { title: "Video", body: "Watch the \"Yaw Laa Taan\" visual and more.", href: "/videos" },
              { title: "May's World", body: "Music, video, audio, and May by May — the whole world.", href: "/mays-world" },
            ],
          },
        },
      ],
    },
    {
      slug: "may-by-may",
      title: "May by May",
      sections: [
        {
          id: "maylecor-may-by-may-1",
          type: "hero",
          props: {
            heading: "May by May",
            subheading: "Cooking with May — warm kitchen energy, baking days, and the food stories behind the artist.",
            buttonLabel: "Back to May's World",
            buttonHref: "/mays-world",
            align: "left",
            background: "#1A0A10",
          },
        },
        {
          id: "maylecor-may-by-may-about",
          type: "text",
          props: {
            heading: "In the kitchen with May",
            body: "May by May is May's cooking lane inside May's World — short recipes, baking sessions, and lifestyle moments.",
          },
        },
      ],
    },
  ];
}
