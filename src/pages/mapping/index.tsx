import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Container } from '@/components/ui/Container';
import { MappingEditor } from '@/components/mapping/MappingEditor';

export default function Mapping() {
    return (
        <div className="flex-1 overflow-y-auto bg-app-base text-white">
            <Container>
                <MappingEditor />
            </Container>
        </div>
    );
}

Mapping.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
