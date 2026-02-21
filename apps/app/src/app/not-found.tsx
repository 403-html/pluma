import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/" className="not-found-link">
          Go back home
        </Link>
      </div>
    </main>
  );
}
