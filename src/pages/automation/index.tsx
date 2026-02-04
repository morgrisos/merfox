import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AutomationRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/scraper');
    }, [router]);

    return null;
}
