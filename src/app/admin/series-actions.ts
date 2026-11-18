"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { deleteSeries, saveSeries } from "@/lib/series-admin";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveSeriesAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fseries");

  const id = text(formData, "id");
  const result = await saveSeries(
    { id: id || undefined, name: text(formData, "name"), summary: text(formData, "summary") },
    session.userId,
  );

  if (!result.ok) redirect(`/admin/series?error=${result.code}`);
  revalidatePath("/admin/series");
  redirect("/admin/series?saved=1");
}

export async function deleteSeriesAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!session) redirect("/login?callbackUrl=%2Fadmin%2Fseries");

  const id = text(formData, "id");
  if (text(formData, "confirmDelete") !== "on") {
    redirect("/admin/series?error=SERIES_004");
  }

  const result = await deleteSeries(id, session.userId);
  if (!result.ok) redirect(`/admin/series?error=${result.code}`);

  revalidatePath("/admin/series");
  redirect("/admin/series?deleted=1");
}
