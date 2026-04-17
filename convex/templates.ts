import { mutation, query } from "./_generated/server";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});

const heading = (level: number, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const doc = (content: unknown[]) =>
  JSON.stringify({ type: "doc", content });

const DEFAULT_TEMPLATES = [
  {
    name: "Blank",
    content: doc([paragraph("")]),
  },
  {
    name: "Project Proposal",
    content: doc([
      heading(1, "Project Proposal"),
      heading(2, "Overview"),
      paragraph("Describe the project in a short paragraph."),
      heading(2, "Goals"),
      paragraph("List the primary goals of the project."),
      heading(2, "Timeline"),
      paragraph("Outline key milestones and delivery dates."),
      heading(2, "Budget"),
      paragraph("Summarize the expected costs."),
    ]),
  },
  {
    name: "Meeting Notes",
    content: doc([
      heading(1, "Meeting Notes"),
      paragraph("Date:"),
      paragraph("Attendees:"),
      heading(2, "Agenda"),
      paragraph(""),
      heading(2, "Discussion"),
      paragraph(""),
      heading(2, "Action Items"),
      paragraph(""),
    ]),
  },
  {
    name: "Resume / CV",
    content: doc([
      heading(1, "Your Name"),
      paragraph("Email · Phone · Location"),
      heading(2, "Summary"),
      paragraph("A short summary of your experience and strengths."),
      heading(2, "Experience"),
      paragraph("Role — Company (Year – Year)"),
      heading(2, "Education"),
      paragraph("Degree — Institution (Year)"),
      heading(2, "Skills"),
      paragraph("Comma-separated list of skills."),
    ]),
  },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("templates").take(10);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("templates").take(1);
    if (existing.length > 0) return { seeded: false, count: existing.length };
    for (const t of DEFAULT_TEMPLATES) {
      await ctx.db.insert("templates", t);
    }
    return { seeded: true, count: DEFAULT_TEMPLATES.length };
  },
});
