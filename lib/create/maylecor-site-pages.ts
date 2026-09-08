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
            subheading:
              "What May is doing right now — new music, shows, film, and life. Add a card whenever something happens.",
            buttonLabel: "Watch videos",
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
                title: "New drop coming",
                body: "Replace this with your real update — date, city, or link. Edit in Content → Latest.",
              },
              {
                title: "On set / in studio",
                body: "Share a short note about what you are filming or recording this week.",
              },
              {
                title: "Meet May",
                body: "Shows, pop-ups, or Mayjor Good moments — keep fans close.",
              },
            ],
          },
        },
        {
          id: "maylecor-updates-video",
          type: "video",
          props: {
            heading: "Update clips",
            layout: "grid",
            columns: 2,
            items: defaultMaylecorVideoItems().slice(0, 2),
            caption: "Paste YouTube / Vimeo links or upload clips.",
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
        {
          id: "maylecor-updates-blog",
          type: "blog-list",
          props: {
            heading: "From the journal",
            subheading: "Longer posts — write them in Shop → Blog, then they show here.",
            postsPerPage: 4,
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
                title: "Photos",
                body: "Galleries and behind-the-scenes stills.",
                href: "/photos",
                image: photos[0]?.src ?? "",
              },
              {
                title: "Maygazine",
                body: "Stories, looks, travel — May's written world.",
                href: "/maygazine",
                image: photos[3]?.src ?? "",
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
            body: "Welcome, journalists and partners. Use this page for May Lècor's press kit: short bio, approved photos, recent coverage, and booking notes. Update links and quotes anytime in the editor — this page is meant to stay current.",
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
          id: "maylecor-press-coverage",
          type: "features",
          props: {
            heading: "Recent coverage",
            items: [
              {
                title: "Feature — add outlet name",
                body: "Paste the article title and link when a new interview or review lands.",
              },
              {
                title: "Interview — add outlet name",
                body: "Keep this list fresh so press always sees your latest story.",
              },
              {
                title: "Performance / festival",
                body: "List notable stages, tours, or festival appearances here.",
              },
            ],
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
                body: "Use the gallery above or upload new approved stills in the Media library.",
              },
              {
                title: "Music & video",
                body: "Link to latest singles and videos from May's World → Video / Music.",
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
            layout: "grid",
            columns: 2,
            items: defaultMaylecorVideoItems().slice(0, 2),
            caption: "Add YouTube or uploaded clips for journalists to embed.",
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
            body: "Share Mayjor Good, volunteer on care days, or partner on school kits, clinic days, groceries, and youth jobs. Update donation links when ready. Keep it honest — never claim impact you have not verified.",
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
            body: "Music videos, visuals, and stories. Paste YouTube or Vimeo links or upload files — add as many clips as you want in the editor.",
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
            caption: "Add more videos anytime — grid grows with you.",
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
            body: "Podcasts, interviews, and sound from May's World. Upload tracks or paste stream links in the editor.",
          },
        },
      ],
    },
    {
      slug: "photos",
      title: "Photos",
      sections: [
        {
          id: "maylecor-photos-intro",
          type: "text",
          props: {
            heading: "Photos",
            body: "Upload May’s photos in Media, then drop them into this gallery (or edit each slot in Content). Empty slots stay hidden on the live site until you add a photo.",
          },
        },
        {
          id: "maylecor-photos-1",
          type: "gallery",
          props: {
            heading: "Gallery",
            layout: "grid",
            columns: 3,
            items: defaultMaylecorPhotoGalleryItems(),
          },
        },
        {
          id: "maylecor-photos-upload-hint",
          type: "text",
          props: {
            heading: "Add more photos",
            body: "Open Media in the left rail → upload → drag onto the gallery. Same Shopify-style media flow as the rest of the builder.",
          },
        },
      ],
    },
    {
      slug: "maygazine",
      title: "Maygazine",
      sections: [
        {
          id: "maylecor-maygazine-1",
          type: "text",
          props: {
            heading: "Maygazine",
            body: "May's magazine — stories, looks, travel, and culture. Add issues and articles here.",
          },
        },
        {
          id: "maylecor-maygazine-features",
          type: "features",
          props: {
            heading: "Issues",
            items: [
              { title: "Issue 01", body: "Introducing Maygazine — edit this cover story." },
              { title: "Behind the look", body: "Fashion, sets, and creative direction." },
              { title: "Letters from May", body: "Notes from the studio and the road." },
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
            subheading:
              "Cooking with May — warm kitchen energy, baking days, and the food stories behind the artist. Add clips and recipes below.",
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
            body: "May by May is May's cooking lane inside May's World — not a separate brand site. Short recipes, baking sessions, and lifestyle moments you can edit and publish anytime.",
          },
        },
        {
          id: "maylecor-may-by-may-video",
          type: "video",
          props: {
            heading: "Cooking & baking",
            src: "",
            layout: "grid",
            columns: 2,
            items: [
              {
                title: "Baking with May",
                src: "",
                caption: "Add your first May by May video or upload.",
              },
              {
                title: "Kitchen moment",
                src: "",
                caption: "Another clip — sauce, snack, or Sunday cook.",
              },
              {
                title: "Recipe walkthrough",
                src: "",
                caption: "Step-by-step with May.",
              },
            ],
            caption: "May by May — cooking with May.",
          },
        },
        {
          id: "maylecor-may-by-may-ideas",
          type: "features",
          props: {
            heading: "Series ideas",
            layout: "grid",
            items: [
              {
                title: "Sunday sauce",
                body: "Comfort food, slow pots, and stories from the week.",
              },
              {
                title: "Bake night",
                body: "Cookies, cakes, and pink-kitchen chaos.",
              },
              {
                title: "Tour snacks",
                body: "What May eats on the road — quick and real.",
              },
            ],
          },
        },
      ],
    },
  ];
}
