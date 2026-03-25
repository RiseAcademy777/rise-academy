import { Html, Head, Main, NextScript } from 'next/document';
export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#111111" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Rise Academy" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
