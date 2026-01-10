import { Sidebar } from '../components/Sidebar';
import { Outlet } from 'react-router-dom';

export const MainLayout = () => {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display">
            <Sidebar />
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
                <Outlet />
            </div>
        </div>
    );
};
