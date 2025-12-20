'use client';

export default function BookConsultButton({
  href,
  serviceSlug,
  label = 'Book a consult',
}: {
  href: string;
  serviceSlug?: string;
  label?: string;
}) {
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const payload = {
      type: 'book_consult_click',
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      serviceSlug,
    };

    const body = JSON.stringify(payload);
    const url = '/api/track';

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        });
      }
    } catch (error) {
      console.warn('Unable to record consult click', error);
    } finally {
      if (event.metaKey || event.ctrlKey) {
        window.open(href, '_blank', 'noopener');
      } else {
        window.location.href = href;
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold"
    >
      {label}
    </button>
  );
}
