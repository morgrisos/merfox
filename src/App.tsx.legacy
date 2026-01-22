import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import { Dashboard } from './pages/dashboard';
import { Settings } from './pages/settings';
import { Scraper } from './pages/scraper';
import { Converter } from './pages/converter';
import { CsvManager } from './pages/csv';
import { SettingsProvider } from './hooks/useSettings';
import { ScraperProvider } from './hooks/useScraper';

function App() {
  return (
    <SettingsProvider>
      <ScraperProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scraper" element={<Scraper />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/converter" element={<Converter />} />
              <Route path="/csv" element={<CsvManager />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ScraperProvider>
    </SettingsProvider>
  );
}

export default App;
