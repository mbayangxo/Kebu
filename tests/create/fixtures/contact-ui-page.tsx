"use client";
import { SiteFormSection } from "@/app/components/create/site-form-section";
import { siteFormSectionSchema } from "@/lib/create/site-forms";
const props = siteFormSectionSchema.parse({ heading: "May contact QA", fields: [
  { id: "name", label: "Your name", type: "text", required: true },
  { id: "email", label: "Email", type: "email", required: true },
  { id: "message", label: "Message", type: "textarea", required: true },
] });
/** Local QA fixture. Calls the real published-form API and isolated SQL/RLS. */
export default function ContactProbe() {
  return <main className="mx-auto max-w-xl px-6 py-12"><h1 className="text-3xl font-bold">Contact May — local QA</h1><SiteFormSection sectionId="77777777-7777-4777-8777-777777777777" subdomain="may-local" props={props} /></main>;
}
