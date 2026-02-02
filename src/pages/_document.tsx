import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="ja">
            <Head>
                {/* Fonts loaded locally via @font-face in index.css */}
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
