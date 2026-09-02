/** Assets from https://ksendrdesign.ru/legallyblonderu (Tilda Zero Block). */
export const LEGALLY_BLONDE_ASSETS = {
  backgroundLayer:
    "https://static.tildacdn.com/tild3639-6261-4261-b361-646339346430/_1.png",
  /** Title — slow 360° spin (Group_557.svg on Tilda). */
  titleLogo:
    "https://static.tildacdn.com/tild6237-6230-4862-b263-393533656538/Group_557.svg",
  /** Left cutout — bobs up (−16px loop). */
  cutoutLeft:
    "https://static.tildacdn.com/tild6538-3665-4232-b661-376339363635/Group_556.png",
  /** Right cutout — bobs down (+16px loop). */
  cutoutRight:
    "https://static.tildacdn.com/tild3466-3462-4430-a336-313662643530/Group_555.png",
  /** Center cutout — 353° base + 0→14°→0 wobble loop. */
  cutoutAccent:
    "https://static.tildacdn.com/tild3333-3236-4631-a431-346338396264/Group_546_1.png",
  /** Sparkle / portrait accent above logo. */
  cutoutSparkle:
    "https://static.tildacdn.com/tild6339-6666-4433-b930-346262333339/Group_523_1.png",
  /** Laptop mockup in scroll scene (Group_569 — not a raw MacBook PNG). */
  macbook:
    "https://static.tildacdn.com/tild3538-3362-4431-b431-373663306261/Group_569.png",
  sparkleGif:
    "https://static.tildacdn.com/tild3437-6635-4035-a165-323763313632/4.gif",
  heroPhoto:
    "https://static.tildacdn.com/tild3063-6230-4137-a233-626364346663/photo.png",
} as const;

export function defaultLegallyBlondeHeroProps() {
  return {
    title: "блондинка в законе",
    subtitle:
      "Как наивная блондинка преобразилась в успешную юристку, разрушив стереотипы",
    backgroundLayer: LEGALLY_BLONDE_ASSETS.backgroundLayer,
    titleLogo: LEGALLY_BLONDE_ASSETS.titleLogo,
    cutoutLeft: LEGALLY_BLONDE_ASSETS.cutoutLeft,
    cutoutRight: LEGALLY_BLONDE_ASSETS.cutoutRight,
    cutoutAccent: LEGALLY_BLONDE_ASSETS.cutoutAccent,
    cutoutSparkle: LEGALLY_BLONDE_ASSETS.cutoutSparkle,
    macbook: LEGALLY_BLONDE_ASSETS.macbook,
    sparkleGif: LEGALLY_BLONDE_ASSETS.sparkleGif,
    heroPhoto: LEGALLY_BLONDE_ASSETS.heroPhoto,
    accentColor: "#e9006b",
    motionEnabled: true,
    showExtras: false,
  };
}
