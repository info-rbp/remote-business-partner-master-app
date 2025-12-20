import ClientsPageClient from './ClientsPageClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function ClientsPage() {
  return <ClientsPageClient />;
}
