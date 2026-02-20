import { GetServerSideProps } from 'next';

import * as fs from 'fs';
import * as path from 'path';

export const getServerSideProps: GetServerSideProps = async () => {
    // データディレクトリを取得（packaged環境対応）
    const dataDir = process.env.MERFOX_DATA_DIR || path.join(process.env.HOME || '', 'Library/Application Support/MerFox/MerFox');
    const runsDir = path.join(dataDir, 'runs');

    let hasHistory = false;

    try {
        if (fs.existsSync(runsDir)) {
            const files = fs.readdirSync(runsDir);
            // 隠しファイル除外
            const runFolders = files.filter(f => !f.startsWith('.'));
            hasHistory = runFolders.length > 0;
        }
    } catch (err) {
        console.error('Failed to check run history:', err);
        // エラー時はWizardへ（安全側）
    }

    return {
        redirect: {
            destination: hasHistory ? '/dashboard' : '/wizard/step1',
            permanent: false,
        },
    };
};

export default function Home() {
    return null;
}
