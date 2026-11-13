import { classifyInternalEmail } from "@/modules/shared/domain/internal-emails";

export async function getActivityEmailList(findEmails: () => Promise<{ addresses: string[]; complete: boolean }>, confirmed: string[]) {
  const { addresses, complete } = await findEmails().catch(() => ({ addresses: [], complete: false }));
  const internalEmails = new Set(confirmed);
  const suspectedEmails = new Set<string>();
  for (const email of addresses) {
    const status = classifyInternalEmail(email, confirmed);
    if (status === "excluded") internalEmails.add(email);
    if (status === "suspected") suspectedEmails.add(email);
  }
  return { internalEmails: [...internalEmails].sort(), suspectedEmails: [...suspectedEmails].sort(), complete };
}
