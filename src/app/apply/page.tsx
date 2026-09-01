import { redirect } from "next/navigation";

export default async function PublicTripleMindsApplication({ searchParams }: { searchParams: Promise<{ requisitionId?: string; position?: string; experienceRequired?: string; skillsRequired?: string; fields?: string }> }) {
  const { requisitionId, position, experienceRequired, skillsRequired, fields } = await searchParams;
  const query = new URLSearchParams();
  if (requisitionId) query.set("requisitionId", requisitionId);
  if (position) query.set("position", position);
  if (experienceRequired) query.set("experienceRequired", experienceRequired);
  if (skillsRequired) query.set("skillsRequired", skillsRequired);
  if (fields !== undefined) query.set("fields", fields);
  redirect(query.size ? `/apply/triple-minds?${query.toString()}` : "/apply/triple-minds");
}
