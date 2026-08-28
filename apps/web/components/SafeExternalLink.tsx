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

export function SafeExternalLink({ url, children }: { url: string; children?: React.ReactNode }) {
  let parsed: URL | undefined;
  try {
    parsed = new URL(url);
  } catch {
    parsed = undefined;
  }

  if (!parsed || !ALLOWED_SCHEMES.has(parsed.protocol)) {
    // Not a safe, well-formed http(s) URL — render as inert text, never as a link.
    return <span style={{ fontFamily: 'monospace' }}>{url}</span>;
  }

  return (
    <a href={parsed.toString()} target="_blank" rel="noopener noreferrer nofollow">
      {children ?? parsed.toString()}
    </a>
  );
}
