import { maylecorMotionSitePages } from "@/lib/create/maylecor-site-pages";
import { defaultMaylecorNavLinks } from "@/lib/create/maylecor-nav";
import { describe, expect, it } from "vitest";
import { cutoutScrollTransform } from "@/lib/create/maylecor-cutout-motion";
import { sectionPropsSchemas } from "@/lib/create/website-schema";
import { defaultCutoutCollageProps } from "@/lib/create/legally-blonde-defaults";
import { contactReplyLinks, mailComposeFromParams, type SiteContactMessage } from "@/lib/create/site-contact-inbox";

describe("ordinary May controls", () => {
  it("connects May’s Contact tab to a form with a required reply address", () => {
    expect(defaultMaylecorNavLinks().some(link => link.href === "/contact")).toBe(true);
    const contact = maylecorMotionSitePages().find(page => page.slug === "contact")!;
    expect(contact.sections[0].type).toBe("form");
    expect(contact.sections[0].props.fields).toEqual(expect.arrayContaining([expect.objectContaining({ id: "email", type: "email", required: true })]));
  });
  it("keeps bounded saved horizontal travel and supports two opposing directions", () => {
    const props = sectionPropsSchemas["legally-blonde-hero"].parse({ ...defaultCutoutCollageProps(), layerScroll: { left: { x:-240,y:0 },right:{x:160,y:0} } });
    expect(props.layerScroll?.left.x).toBe(-240);
    expect(cutoutScrollTransform("left",0.5,0,props.layerScroll?.left)).toBe("translate3d(-120px, 0px, 0)");
    expect(cutoutScrollTransform("right",2,0,props.layerScroll?.right)).toBe("translate3d(160px, 0px, 0)");
    expect(sectionPropsSchemas["legally-blonde-hero"].safeParse({ ...props,layerScroll:{invalid:{x:10000,y:0}} }).success).toBe(false);
  });
  it("opens reviewable replies without adding recipients or mail headers", () => {
    const message = { submitter_email:"press@example.test",form_name:"May\r\nBcc:bad@example.test" } as SiteContactMessage;
    const links = contactReplyLinks(message)!;
    const params = new URL(links.kebu,"https://kebu.test").searchParams;
    expect(mailComposeFromParams(params)).toEqual({to:"press@example.test",subject:"Re: May  Bcc:bad@example.test"});
    expect([...params.keys()]).toEqual(["composeTo","composeSubject"]);
    expect(links.email).toContain("subject=Re%3A%20May%20%20Bcc%3Abad%40example.test");
    expect(contactReplyLinks({ ...message,submitter_email:"press@example.test\r\nBcc:bad@example.test" })).toBeNull();
    expect(mailComposeFromParams(new URLSearchParams("composeTo=javascript:alert(1)"))).toBeNull();
  });
});
