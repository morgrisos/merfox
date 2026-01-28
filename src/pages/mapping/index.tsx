import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MappingEditor } from '@/components/mapping/MappingEditor';

export default function Mapping() {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-base text-white">
            <MappingEditor />
        </div>
    );
}

Mapping.getLayout = (page: React.ReactElement) => <AppShell>{page}</AppShell>;
