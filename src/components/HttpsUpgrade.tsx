import { BRAND_DOMAIN } from "@/lib/brand";

/**
 * Client upgrade from http → https while GitHub Pages "Enforce HTTPS" is off
 * or mid-propagation. Prefer the repo Pages setting for a real 301; this is a
 * belt-and-braces fallback for browsers and JS-capable crawlers.
 *
 * Emitted as a raw inline script so the static export runs it immediately
 * (next/script beforeInteractive queues via __next_s and is too late here).
 */
export function HttpsUpgrade() {
  const script = `(function(){try{var h=${JSON.stringify(BRAND_DOMAIN)};if(location.protocol==="http:"&&(location.hostname===h||location.hostname==="www."+h)){location.replace("https://"+location.host+location.pathname+location.search+location.hash);}}catch(e){}})();`;

  return (
    <script
      // Static HTML must execute this without waiting on the Next runtime.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
