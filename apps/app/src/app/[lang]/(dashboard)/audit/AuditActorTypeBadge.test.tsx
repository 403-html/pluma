import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditActorTypeBadge } from './AuditActorTypeBadge';

describe('AuditActorTypeBadge', () => {
  it('renders nothing for null actorType', () => {
    const { container } = render(<AuditActorTypeBadge actorType={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for undefined actorType', () => {
    const { container } = render(<AuditActorTypeBadge actorType={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders user badge', () => {
    render(<AuditActorTypeBadge actorType="user" />);
    expect(screen.getByText('user')).toBeInTheDocument();
  });

  it('renders system badge', () => {
    render(<AuditActorTypeBadge actorType="system" />);
    expect(screen.getByText('system')).toBeInTheDocument();
  });

  it('renders sdk-token badge', () => {
    render(<AuditActorTypeBadge actorType="sdk-token" />);
    expect(screen.getByText('sdk-token')).toBeInTheDocument();
  });

  it('renders unknown type with fallback class', () => {
    const { container } = render(<AuditActorTypeBadge actorType="unknown-type" />);
    expect(container.querySelector('span')).toHaveClass('bg-muted');
  });
});
