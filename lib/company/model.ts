import { supportedPayCurrency } from "./pay";
import { z } from "zod";
const id = z.uuid(),
  title = z.string().trim().min(1).max(160),
  note = z.string().trim().min(1).max(4000),
  stamp = z.iso.datetime({ offset: true });
const project = { projectId: id };
export const quizQuestion = z
  .object({
    prompt: z.string().trim().min(1).max(500),
    options: z.array(z.string().trim().min(1).max(300)).min(2).max(6),
    correctIndex: z.number().int().min(0).max(5),
  })
  .refine((q) => q.correctIndex < q.options.length);
export const companyActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("project_create"),
    id,
    title,
    description: z.string().max(4000).default(""),
  }),
  z.object({
    action: z.literal("project_status"),
    id,
    ...project,
    status: z.enum(["active", "blocked", "done", "archived"]),
    expectedStatus: z.enum(["active", "blocked", "done", "archived"]),
  }),
  z.object({
    action: z.literal("task_create"),
    id,
    ...project,
    title,
    userId: id,
    body: z.string().max(20000).default(""),
    dueAt: stamp.nullable(),
  }),
  z.object({
    action: z.literal("task_status"),
    id,
    taskId: id,
    status: z.enum(["open", "done"]),
  }),
  z.object({
    action: z.literal("feedback_create"),
    id,
    ...project,
    message: note,
  }),
  z.object({ action: z.literal("doc_create"), id, ...project, title }),
  z.object({
    action: z.literal("resource_attach"),
    id,
    ...project,
    kind: z.enum(["doc", "sheet", "slide"]),
    resourceId: id,
    label: title,
  }),
  z.object({
    action: z.literal("module_create"),
    id,
    title,
    lesson: z.string().trim().min(1).max(20000),
    quiz: z.array(quizQuestion).min(1).max(10),
    passPercent: z.number().int().min(1).max(100),
  }),
  z.object({
    action: z.literal("module_assign"),
    id,
    moduleId: id,
    userId: id,
  }),
  z.object({
    action: z.literal("module_answer"),
    id,
    moduleId: id,
    acknowledged: z.literal(true),
    answers: z.array(z.number().int().min(0).max(5)).min(1).max(10),
  }),
  z.object({
    action: z.literal("hr_create"),
    id,
    category: z.enum(["time_off", "pay", "benefits", "workplace", "other"]),
    message: note,
  }),
  z.object({
    action: z.literal("hr_reply"),
    id,
    requestId: id,
    response: note,
    status: z.enum(["open", "resolved"]),
    expectedUpdatedAt: stamp,
  }),
  z
    .object({
      action: z.literal("shift_create"),
      id,
      userId: id,
      startsAt: stamp,
      endsAt: stamp,
      location: z.string().trim().min(1).max(300),
    })
    .refine(
      (s) =>
        Date.parse(s.endsAt) > Date.parse(s.startsAt) &&
        Date.parse(s.endsAt) - Date.parse(s.startsAt) <= 86400000,
    ),
  z.object({ action: z.literal("shift_cancel"), id, shiftId: id }),
  z.object({
    action: z.literal("benefit_create"),
    id,
    title,
    details: z.string().trim().min(1).max(8000),
  }),
  z.object({
    action: z.literal("pay_preference"),
    id,
    method: z.enum(["bank", "mobile_money", "cash"]),
  }),
  z
    .object({
      action: z.literal("statement_create"),
      id,
      userId: id,
      periodStart: z.iso.date(),
      periodEnd: z.iso.date(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .refine(supportedPayCurrency, "Choose a supported currency."),
      grossMinor: z.number().int().min(0).max(1e12),
      deductionsMinor: z.number().int().min(0).max(1e12),
      netMinor: z.number().int().min(0).max(1e12),
      notes: z.string().max(2000).default(""),
    })
    .refine(
      (p) =>
        p.periodEnd >= p.periodStart &&
        p.netMinor === p.grossMinor - p.deductionsMinor,
    ),
  z.object({ action: z.literal("member_remove"), id, userId: id }),
]);
export function companyPortalEnabled() {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return (
    process.env.KEBU_COMPANY_PORTAL_QA === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    (origin === "https://skqnxyaeimvbyrmdfzvk.supabase.co" ||
      /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
  );
}
export type Member = {
  id: string;
  role: string;
  name: string;
  kebuId: string | null;
};
export type Project = {
  id: string;
  title: string;
  description: string;
  status: "active" | "blocked" | "done" | "archived";
  room_id: string;
};
export type Task = {
  id: string;
  project_id: string;
  assignee_user_id: string;
  title: string;
  body: string;
  status: "open" | "done";
  due_at: string | null;
};
export type Feedback = {
  id: string;
  project_id: string;
  author_id: string;
  message: string;
  created_at: string;
};
export type Resource = {
  id: string;
  project_id: string;
  kind: "doc" | "sheet" | "slide";
  resource_id: string;
  label: string;
};
export type Lesson = {
  id: string;
  title: string;
  lesson: string;
  passPercent: number;
  questions: { prompt: string; options: string[] }[];
  passed: boolean;
};
export type HRRequest = {
  id: string;
  user_id: string;
  category: string;
  message: string;
  response: string;
  status: "open" | "resolved";
  updated_at: string;
};
export type Shift = {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  location: string;
  status: string;
};
export type Statement = {
  id: string;
  user_id: string;
  currency: string;
  period_start: string;
  period_end: string;
  gross_minor: number;
  deductions_minor: number;
  net_minor: number;
  notes: string;
};
export type CompanyState = {
  availableResources: {
    id: string;
    kind: "doc" | "sheet" | "slide";
    title: string;
  }[];
  role: string;
  userId: string;
  members: Member[];
  projects: Project[];
  tasks: Task[];
  feedback: Feedback[];
  resources: Resource[];
  lessons: Lesson[];
  modules: { id: string; title: string }[];
  assignments: { module_id: string; user_id: string }[];
  attempts: {
    module_id: string;
    user_id: string;
    passed: boolean;
    score: number;
  }[];
  hr: HRRequest[];
  shifts: Shift[];
  benefits: { id: string; title: string; details: string }[];
  preferences: { user_id: string; method: string }[];
  statements: Statement[];
  limited: boolean;
};
