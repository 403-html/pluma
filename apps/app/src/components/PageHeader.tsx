'use client';

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  title: string;
  actions?: React.ReactNode;
}

export function PageHeader({ breadcrumbs, title, actions }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
      {actions && (
        <div className="mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
