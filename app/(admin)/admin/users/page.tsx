import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { userList } from "@/lib/admin/stats";
import { Card, Empty, Pill, TableWrap, Td, Th, statusTone } from "@/components/admin/ui";
import UserFilters from "@/components/admin/UserFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function planTone(plan: string) {
  return plan === "free" ? "slate" : "indigo";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; page?: string }>;
}) {
  const { q = "", plan = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { rows, total } = await userList({
    search: q,
    plan,
    page,
    pageSize: PAGE_SIZE,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (plan) sp.set("plan", plan);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Every account, what they&apos;re on, and what they&apos;ve actually built
        </p>
      </div>

      <Card>
        <div className="mb-4">
          <UserFilters />
        </div>

        {rows.length === 0 ? (
          <Empty>
            {q || plan ? "No users match these filters" : "No users yet"}
          </Empty>
        ) : (
          <>
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <Th>User</Th>
                    <Th>Plan</Th>
                    <Th>Subscription</Th>
                    <Th right>QRs</Th>
                    <Th right>Scans</Th>
                    <Th right>Joined</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <Td>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                              {u.name}
                              {u.role === "admin" && (
                                <ShieldCheck
                                  className="w-3.5 h-3.5 text-indigo-600"
                                  aria-label="Admin"
                                />
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Pill tone={planTone(u.plan)}>{u.plan}</Pill>
                      </Td>
                      <Td>
                        {u.subStatus ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Pill tone={statusTone(u.subStatus)}>{u.subStatus}</Pill>
                            <span className="text-[11px] text-gray-400">
                              {u.subProvider}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </Td>
                      <Td right>{u.qrCount}</Td>
                      <Td right>{u.scanCount}</Td>
                      <Td right>
                        <span className="text-xs text-gray-500">
                          {u.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {from}–{to} of {total}
              </p>
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-xs text-gray-400">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
