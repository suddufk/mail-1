import { useEffect, useRef } from 'react';
import { formatMailContent } from '@/lib/utils';

export default function ShadowHtml({ html }: { html?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const bodyStyleMatch = (html || '').match(/<body[^>]*style="([^"]*)"[^>]*>/i);
    const bodyStyle = bodyStyleMatch ? bodyStyleMatch[1] : '';
    const cleanedHtml = formatMailContent(html || '').replace(/<\/?body[^>]*>/gi, '');

    root.innerHTML = `
      <style>
        :host {
          all: initial;
          display: block;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 14px;
          line-height: 1.55;
          color: #13181d;
          word-break: break-word;
        }
        a { color: #0e70df; text-decoration: none; }
        p { margin: 0 0 12px; }
        img:not(table img) { max-width: 100%; height: auto !important; }
        .shadow-content {
          background: #fff;
          width: fit-content;
          min-width: 100%;
          ${bodyStyle}
        }
      </style>
      <div class="shadow-content">${cleanedHtml}</div>
    `;
  }, [html]);

  return <div className="html-message" ref={hostRef} />;
}
