import { getMessages } from '@/i18n';

export default function Home() {
  const t = getMessages();
  return (
    <main>
      <h1>{t.home.heading}</h1>
      <p>{t.home.subheading}</p>
    </main>
  );
}
