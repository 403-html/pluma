import Link from 'next/link';
import { getMessages } from '@/i18n';

const t = getMessages();

export default function NotFound() {
  return (
    <main className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">{t.notFound.code}</h1>
        <h2 className="not-found-subtitle">{t.notFound.title}</h2>
        <p className="not-found-description">
          {t.notFound.description}
        </p>
        <Link href="/" className="not-found-link">
          {t.notFound.backLink}
        </Link>
      </div>
    </main>
  );
}
