import React from 'react';

type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
};

export default function Link({ href, children, ...props }: LinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
