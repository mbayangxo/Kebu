/** Default May Lecor assets — local portrait + Wix secondary media (editable in the editor). */
export const MAYLECOR_WIX = {
  backgroundBlur:
    "https://static.wixstatic.com/media/84770f_2ec341c74bcd4afda23cb618a7dbdae3~mv2_d_3840_2160_s_2.png/v1/fill/w_1920,h_1080,al_c,q_85,enc_auto/84770f_2ec341c74bcd4afda23cb618a7dbdae3~mv2_d_3840_2160_s_2.png",
  /** Primary studio portrait (hot pink backdrop). */
  portraitMain:
    "https://static.wixstatic.com/media/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg/v1/crop/x_0,y_0,w_462,h_592/fill/w_554,h_496,al_c,lg_1,q_80,enc_auto/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg",
  collageTop:
    "https://static.wixstatic.com/media/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg/v1/crop/x_0,y_0,w_462,h_592/fill/w_554,h_496,al_c,lg_1,q_80,enc_auto/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg",
  collageMiddle:
    "https://static.wixstatic.com/media/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg/v1/crop/x_0,y_0,w_462,h_592/fill/w_554,h_496,al_c,lg_1,q_80,enc_auto/0380b3_383cb146197941bd8fb1336077c4e1b7~mv2.jpg",
  logoBanner:
    "https://static.wixstatic.com/media/0380b3_d04a151d63d345cab419f86a82512bc3~mv2.png/v1/crop/x_128,y_633,w_2494,h_1307/fill/w_543,h_285,al_c,q_85,enc_auto/0380b3_d04a151d63d345cab419f86a82512bc3~mv2.png",
  bottomLeft:
    "https://static.wixstatic.com/media/11062b_6a9d1f9d3bd241988071deb1c3da8c56~mv2.jpg/v1/fill/w_702,h_737,al_c,q_85,enc_auto/11062b_6a9d1f9d3bd241988071deb1c3da8c56~mv2.jpg",
  bottomRight:
    "https://static.wixstatic.com/media/11062b_017f998d03a44d5494c1f4eb4a9fcace~mv2.jpg/v1/fill/w_745,h_737,al_c,q_85,enc_auto/11062b_017f998d03a44d5494c1f4eb4a9fcace~mv2.jpg",
  logoSmall:
    "https://static.wixstatic.com/media/0380b3_8c2a479580ca493f857c3efb3f6b4aae~mv2.png/v1/crop/x_426,y_292,w_1845,h_1465/fill/w_256,h_206,al_c,q_85,enc_auto/0380b3_8c2a479580ca493f857c3efb3f6b4aae~mv2.png",
  albumArt:
    "https://static.wixstatic.com/media/0380b3_4c2757d9c5b84f7eb202847162b48432~mv2.png/v1/fill/w_800,h_280,al_c,q_85,enc_auto/May-Lecor-7.png",
} as const;

export const MAYLECOR_SOCIAL_DEFAULTS = [
  {
    label: "SoundCloud",
    iconUrl:
      "https://static.wixstatic.com/media/e3496b0865884e4ca74ea5377ed41068.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/e3496b0865884e4ca74ea5377ed41068.png",
    href: "https://soundcloud.com/maylecor",
  },
  {
    label: "Apple Music",
    iconUrl:
      "https://static.wixstatic.com/media/b2a4e7e9c56a45df9961c749501f1139.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/b2a4e7e9c56a45df9961c749501f1139.png",
    href: "https://music.apple.com/",
  },
  {
    label: "Spotify",
    iconUrl:
      "https://static.wixstatic.com/media/e18eec328e7446079b7c7cef09488b18.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/e18eec328e7446079b7c7cef09488b18.png",
    href: "https://open.spotify.com/",
  },
  {
    label: "Instagram",
    iconUrl:
      "https://static.wixstatic.com/media/81af6121f84c41a5b4391d7d37fce12a.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/81af6121f84c41a5b4391d7d37fce12a.png",
    href: "https://instagram.com/maylecor",
  },
  {
    label: "Facebook",
    iconUrl:
      "https://static.wixstatic.com/media/23fd2a2be53141ed810f4d3dcdcd01fa.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/23fd2a2be53141ed810f4d3dcdcd01fa.png",
    href: "https://www.facebook.com/maylecor",
  },
  {
    label: "YouTube",
    iconUrl:
      "https://static.wixstatic.com/media/203dcdc2ac8b48de89313f90d2a4cda1.png/v1/fill/w_61,h_61,al_c,q_85,enc_auto/203dcdc2ac8b48de89313f90d2a4cda1.png",
    href: "https://youtube.com/user/maylecor",
  },
] as const;

export function defaultMaylecorHomeProps(artistName = "MAY LECOR") {
  return {
    artistName,
    backgroundImage: MAYLECOR_WIX.backgroundBlur,
    portraitMain: MAYLECOR_WIX.portraitMain,
    collageTop: MAYLECOR_WIX.collageTop,
    collageMiddle: MAYLECOR_WIX.collageMiddle,
    logoBanner: MAYLECOR_WIX.logoBanner,
    bottomLeft: MAYLECOR_WIX.bottomLeft,
    bottomRight: MAYLECOR_WIX.bottomRight,
    logoSmall: MAYLECOR_WIX.logoSmall,
    ctaLabel: "LISTEN TO MAY'S NEW SINGLE",
    musicPageSlug: "music",
    homeLogoHref: "#top",
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    motionEnabled: true,
  };
}

export function defaultMaylecorMusicProps(artistName = "MAY LECOR") {
  return {
    artistName,
    albumArt: MAYLECOR_WIX.albumArt,
    homePageSlug: "home",
    socialLinks: MAYLECOR_SOCIAL_DEFAULTS.map((s) => ({ ...s })),
    socialRailVisible: true,
    socialRailBg: "rgba(0,0,0,0.85)",
    socialRailLeftPct: 0,
    socialRailTopPct: 12,
    socialRailIconSize: 40,
    motionEnabled: true,
  };
}
