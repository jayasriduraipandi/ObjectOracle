import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import UploadPage from './pages/UploadPage'
import StreamPage from './pages/StreamPage'
import Sidebar from './components/Sidebar'

export type Page = 'dashboard' | 'upload' | 'stream'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117' }}>
      <Sidebar current={page} onNavigate={setPage} />
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'upload'    && <UploadPage />}
        {page === 'stream'    && <StreamPage />}
      </main>
    </div>
  )
}
