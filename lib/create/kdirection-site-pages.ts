import {
  defaultKdirectionHomeProps,
  defaultKdirectionPageProps,
} from "@/lib/create/kdirection-defaults";

export type KdirectionPageSpec = {
  slug: string;
  title: string;
  sections: Array<{ type: string; props: Record<string, unknown> }>;
};

/** Full Wix-style multipage shell for K-Direction in Kebu Builder. */
export function kdirectionWixSitePages(): KdirectionPageSpec[] {
  return [
    {
      slug: "home",
      title: "Home",
      sections: [{ type: "kdirection-home", props: defaultKdirectionHomeProps() }],
    },
    {
      slug: "artists",
      title: "Artist",
      sections: [
        {
          type: "kdirection-page",
          props: {
            ...defaultKdirectionPageProps("Artist"),
            body: "Our roster. Open an artist page or edit this text and photo in the builder.",
            heroImage: defaultKdirectionHomeProps().featuredArtistImage,
            ctaLabel: "May L'ECOR",
            ctaHref: "/artists",
          },
        },
      ],
    },
    {
      slug: "events",
      title: "Events",
      sections: [
        {
          type: "kdirection-page",
          props: {
            ...defaultKdirectionPageProps("Events"),
            body: "Upcoming shows and label events. Replace this copy and add dates anytime.",
          },
        },
        {
          type: "events",
          props: {
            heading: "On the calendar",
            items: [
              {
                title: "Label night",
                date: "2026-10-01",
                location: "Dakar",
                description: "K-Direction artists live.",
                ticketUrl: "#",
              },
            ],
          },
        },
      ],
    },
    {
      slug: "news",
      title: "News",
      sections: [
        {
          type: "kdirection-page",
          props: {
            ...defaultKdirectionPageProps("News"),
            body: "Releases, press, and studio updates. Swap the photo and write your headline story here.",
          },
        },
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      sections: [
        {
          type: "kdirection-page",
          props: {
            ...defaultKdirectionPageProps("Contact"),
            body: "Bookings@k-direction.com · mgmt@k-direction.com",
            ctaLabel: "Email bookings",
            ctaHref: "mailto:Bookings@k-direction.com",
          },
        },
        {
          type: "contact",
          props: {
            heading: "Reach the label",
            email: "mgmt@k-direction.com",
            phone: "",
            address: "Dakar, Senegal",
          },
        },
      ],
    },
    {
      slug: "about",
      title: "About us",
      sections: [{ type: "kdirection-page", props: defaultKdirectionPageProps("About us") }],
    },
    {
      slug: "services",
      title: "Services",
      sections: [
        {
          type: "kdirection-page",
          props: defaultKdirectionPageProps("Services"),
        },
        {
          type: "features",
          props: {
            heading: "What we do",
            items: [
              { title: "Artist development", body: "Careers, releases, and brand identity." },
              { title: "Creative direction", body: "Visuals and campaigns that fit the artist." },
              { title: "Label operations", body: "Coordination across music, media, and partners." },
            ],
          },
        },
      ],
    },
  ];
}
