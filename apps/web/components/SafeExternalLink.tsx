/**
 * Agent-controlled data (service URLs, metadata) is untrusted input (build
 * prompt section 34). React already escapes text content by default, so
 * there's no XSS risk from rendering a URL as text — but an `<a href>`
 * built from an unvalidated string could still resolve to `javascript:`
 * or another dangerous scheme. This component validates the scheme before
 * ever producing a real link, and falls back to plain (still escaped)
 * text otherwise.
 */
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

export function SafeExternalLink({
  url,
  children,
  maxLength = 45,
}: {
  url: string;
  children?: React.ReactNode;
  maxLength?: number;
}) {
  let parsed: URL | undefined;
  try {
    parsed = new URL(url);
  } catch {
    parsed = undefined;
  }

  // Format display label if no custom children passed
  const formatLabel = (raw: string) => {
    if (raw.startsWith('data:')) {
      const semicolonIdx = raw.indexOf(';');
      const mime = raw.substring(5, semicolonIdx > 0 ? semicolonIdx : 25);
      return `data-uri (${mime || 'embedded'})`;
    }
    if (raw.startsWith('ipfs://')) {
      const cid = raw.replace('ipfs://', '');
      return cid.length > 20 ? `ipfs://${cid.slice(0, 8)}...${cid.slice(-6)}` : raw;
    }
    if (raw.length > maxLength) {
      return `${raw.slice(0, Math.floor(maxLength * 0.6))}...${raw.slice(-Math.floor(maxLength * 0.3))}`;
    }
    return raw;
  };

  if (!parsed || !ALLOWED_SCHEMES.has(parsed.protocol)) {
    // Not a safe, standard http(s) URL (e.g. data URI, ipfs, relative, or unparseable)
    // Render as inert, styled monospace text with title tooltip and word break
    return (
      <span
        title={url}
        className="font-mono"
        style={{
          color: 'var(--text-secondary)',
          wordBreak: 'break-all',
        }}
      >
        {children ?? formatLabel(url)}
      </span>
    );
  }

  return (
    <a
      href={parsed.toString()}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={url}
      style={{
        color: 'var(--accent-bnb)',
        textDecoration: 'underline',
        textUnderlineOffset: '2px',
        wordBreak: 'break-all',
      }}
    >
      {children ?? formatLabel(parsed.toString())}
    </a>
  );
}
