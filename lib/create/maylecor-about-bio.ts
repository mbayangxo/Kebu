import { defaultMaylecorPhotoGalleryItems } from "./maylecor-content-defaults";

/**
 * Official About May Lècor bio — split for editable text sections (max 2000 chars each).
 * Light spelling cleanup only; voice and facts preserved for May to edit further.
 */

export type AboutMayBlock = {
  id: string;
  heading: string;
  body: string;
};

export function maylecorAboutMayBlocks(): AboutMayBlock[] {
  return [
    {
      id: "maylecor-about-intro",
      heading: "About May Lècor",
      body: `May Lècor is a singer, songwriter, composer, dancer, choreographer, director, actress, fashion designer, entrepreneur, and philanthropist.

She released her first single Guerre off of her debut album Maytamorphisis in late 2024.`,
    },
    {
      id: "maylecor-about-childhood",
      heading: "New York beginnings",
      body: `Born and raised in New York City, her love and journey into a creative-based career began at the age of 5 when she began writing poetry. Her love for poetry progressed into writing, songwriting, and performing around the age of 7, which led to her winning the Barack Obama writing education award, and publishing her first book at age 11 after being pushed by her writing teacher in school to do so after writing a short story that impressed her teacher for a project.

At age 8 May was gifted a karaoke machine by her uncle for her birthday which she would use to record music on cassettes and perform it with a mic after discovering her love for singing around her home. Her love for singing arose after singing songs she wrote to her older brother and being told she had a good singing voice and talent and should pursue music. This gave her the confidence to begin turning all her poems into songs and performing them for her friends at school, teachers, and family.`,
    },
    {
      id: "maylecor-about-dance",
      heading: "Dance, groups & early performance",
      body: `Around this time her love for dancing was sparked when she began winning dance contests held at Senegalese African parties her parents would take her to for prize money so she could spend it on her favorite toys and albums. Around age 11 she would form her own singing and dance groups with her friends at school and in the neighborhood she grew up in, writing and composing all the songs they would perform at talent shows, designing and bedazzling the outfits and choreographing the groups' dance moves by herself.`,
    },
    {
      id: "maylecor-about-roots",
      heading: "A New York African love story",
      body: `Her art is inspired by a fusion of New York City culture and her West African Senegalese–Guinean–Malian–Ivorian–North African roots, as well as music she was introduced to growing up in the cultural melting pot that is New York City. A New York African love story.`,
    },
    {
      id: "maylecor-about-mother",
      heading: "Family & creative lineage",
      body: `Her talent and love for creativity was something passed on to her from her mother — fashion designer, perfumist, and serial entrepreneur Fanta Keita. Her talent, ambition, and love for entrepreneurship, acting, and fashion stemmed from being around her mother who has been a fashion designer and business owner since she was a young teen, and dreamed of being an actress since she was a small child.

Fanta Keita's love for dreaming big and love for acting — something she has a natural talent for but never got the chance to pursue — inspired May to attend and graduate from the cinema-specialized high school in New York City, which helped cultivate her love and talent for filmmaking and acting. This has had a huge influence on her musical career and why she has a passion for directing all her visuals, and incorporates acting and creative visuals in all of her musical and business-centered projects.`,
    },
    {
      id: "maylecor-about-fashion",
      heading: "Fashion & design",
      body: `May's ambitious and creative spirit has helped her in the journey of becoming the successful young woman she is today — started in childhood. She published her first book at age 11, and launched her first business, a skincare line, at age 10 — a result of her mother's entrepreneurial influence and support growing up.

She was put into fashion design courses at Parsons pre-college and Fashion Institute of Technology pre-college programs when her mother, a fashionista with a love for shopping and Italian haute couture, discovered her talent after finding out she was ripping her clothes apart and sewing them by hand into new clothes she liked better. Her love for fashion was nurtured throughout years of attending classes as a young girl on weekends and throughout summer, and is one of the reasons why she is a fashion designer today — designing clothing and outfits for tours, performances, music videos, short films, and all the pieces in three of her own designer fashion labels.`,
    },
    {
      id: "maylecor-about-entrepreneur",
      heading: "Entrepreneurship",
      body: `She started her entrepreneurship journey at age 10 with a skincare line she made at home and started selling to friends and family of friends. That love for entrepreneurship blossomed at age 15 when she opened a hair company with her mother, which inspired her to open her own fashion label at age 17 while still in high school — achieving a dream she's had since she was 11 attending Parsons.

This sparked her interest in serial entrepreneurship, and she's since founded companies in different sectors: beauty, hair, fashion, music, film. May's natural musical talent and introduction to art, as well as the support and nurturing she received throughout her life from her mother, has made her into the powerhouse across multiple industries she is today.`,
    },
  ];
}

/** Default About page sections for May Lecor sites. */
export function maylecorAboutPageSections() {
  const blocks = maylecorAboutMayBlocks();
  return [
    ...blocks.map((b) => ({
      id: b.id,
      type: "text" as const,
      props: { heading: b.heading, body: b.body },
    })),
    {
      id: "maylecor-about-photo",
      type: "gallery" as const,
      props: {
        heading: "Photos",
        items: defaultMaylecorPhotoGalleryItems().slice(0, 4),
      },
    },
  ];
}
