'use client';

import { AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import type { UserRole } from '@pluma-flags/types';
import { useLocale } from '@/i18n/LocaleContext';
import { useCurrentUser } from '@/context/CurrentUserContext';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableHeadRow,
  TablePagination,
} from '@/components/ui/table';
import { useAccounts } from './useAccounts';

export default function AccountsTab() {
  const { t } = useLocale();
  const labels = t.organization.accounts;
  const { currentUser } = useCurrentUser();
  const { accounts, isLoading, error, page, total, pageSize, setPage, patchAccount } = useAccounts();

  const hasPrev = page > 1;
  const hasNext = page * pageSize < total;

  async function handleToggleDisabled(id: string, currentlyDisabled: boolean) {
    const result = await patchAccount(id, { disabled: !currentlyDisabled });
    if (result.ok) {
      toast.success(currentlyDisabled ? labels.toastEnabled : labels.toastDisabled);
    } else {
      toast.error(result.message ?? labels.patchError);
    }
  }

  async function handleRoleChange(id: string, newRole: UserRole) {
    const result = await patchAccount(id, { role: newRole });
    if (result.ok) {
      toast.success(labels.toastRoleChanged);
    } else {
      toast.error(result.message ?? labels.patchError);
    }
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive"
      >
        <AlertCircle size={15} aria-hidden="true" />
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{labels.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{labels.desc}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <Table>
          <TableHeader>
            <TableHeadRow>
              <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{labels.colEmail}</TableHead>
              <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{labels.colRole}</TableHead>
              <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{labels.colStatus}</TableHead>
              <TableHead className="px-3 py-2 text-xs font-semibold uppercase">{labels.colActions}</TableHead>
            </TableHeadRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => {
              const isCurrentUser = account.id === currentUser?.id;
              const isOperator = account.role === 'operator';

              return (
                <TableRow key={account.id}>
                  {/* Email */}
                  <TableCell className="px-3 py-3 text-sm">
                    <span>{account.email}</span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">{labels.youLabel}</span>
                    )}
                  </TableCell>

                  {/* Role selector */}
                  <TableCell className="px-3 py-3">
                    {isOperator ? (
                      <span className="text-sm text-muted-foreground">{labels.roleOperator}</span>
                    ) : (
                      <Select
                        value={account.role}
                        onValueChange={(value) => void handleRoleChange(account.id, value as UserRole)}
                        disabled={isCurrentUser}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{labels.roleAdmin}</SelectItem>
                          <SelectItem value="user">{labels.roleUser}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                  {/* Status badge */}
                  <TableCell className="px-3 py-3">
                    <span
                      className={
                        account.disabled
                          ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive'
                          : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary'
                      }
                    >
                      {account.disabled ? labels.statusDisabled : labels.statusActive}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-3 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCurrentUser || isOperator}
                      onClick={() => void handleToggleDisabled(account.id, account.disabled)}
                    >
                      {account.disabled ? labels.enableBtn : labels.disableBtn}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {(hasPrev || hasNext) && (
        <TablePagination
          currentPage={page}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
          prevLabel={t.common.prevPage}
          nextLabel={t.common.nextPage}
          pageInfoTemplate={t.common.pageInfo}
          className="shrink-0"
        />
      )}
    </div>
  );
}
