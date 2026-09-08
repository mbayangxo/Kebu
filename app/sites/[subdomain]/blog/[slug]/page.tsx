import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/opportunity/admin";
import { mapBlogPostRow, type BlogPostRow } from "@/lib/create/site-blog";

type Params = { params: Promise<{ subdomain: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { subdomain, slug } = await params;
  const admin = createServiceClient();
  if (!admin) return { title: "Blog" };

  const { data: project } = await admin.from("projects").select("id, title").eq("subdomain", subdomain).maybeSingle();
  if (!project) return { title: "Blog" };

  const { data: post } = await admin
    .from("project_blog_posts")
    .select("title, excerpt")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return {
    title: post?.title ? `${post.title} · ${project.title}` : `Blog · ${project.title}`,
    description: post?.excerpt || undefined,
  };
}

export default async function PublicBlogPostPage({ params }: Params) {
  const { subdomain, slug } = await params;
  const admin = createServiceClient();
  if (!admin) notFound();

  const { data: project } = await admin
    .from("projects")
    .select("id, title, subdomain")
    .eq("subdomain", subdomain)
    .maybeSingle();
  if (!project) notFound();

  const { data: row } = await admin
    .from("project_blog_posts")
    .select("*")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!row) notFound();

  const post = mapBlogPostRow(row as BlogPostRow);
  const siteBase = `/sites/${subdomain}`;

  return (
    <main className="min-h-dvh bg-[#FAFAF8] text-[#0F0D33]">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link href={siteBase} className="text-sm opacity-60 hover:opacity-100">
          ← Back to {project.title}
        </Link>
        {post.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverUrl} alt="" className="mt-6 w-full max-h-80 object-cover rounded-2xl" />
        ) : null}
        <h1 className="mt-8 text-3xl sm:text-4xl font-bold">{post.title}</h1>
        <p className="mt-2 text-sm opacity-60">
          {post.authorName || "Team"}
          {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}
        </p>
        {post.excerpt ? <p className="mt-6 text-lg opacity-80">{post.excerpt}</p> : null}
        <div className="mt-8 whitespace-pre-wrap leading-relaxed text-base">{post.body}</div>
      </article>
    </main>
  );
}
