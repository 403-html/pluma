import { getMessages } from '@/i18n';

const t = getMessages();

export default function Home() {
  return (
    <main>
      <h1>{t.home.heading}</h1>
      <p>{t.home.subheading}</p>
    </main>
  );
}
