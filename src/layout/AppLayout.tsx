import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export const AppLayout = () => {
    return (
        <div className="flex h-screen w-full overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-background-light dark:bg-background-dark relative">
                <Outlet />
            </main>
        </div>
    );
};
