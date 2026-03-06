import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import LiveMonitoring from './pages/LiveMonitoring'
import RiskAnalytics from './pages/RiskAnalytics'
import TransportMap from './pages/TransportMap'
import Incidents from './pages/Incidents'
import Alerts from './pages/Alerts'
import Layout from './components/Layout'

function App() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/live" element={<LiveMonitoring />} />
                        <Route path="/analytics" element={<RiskAnalytics />} />
                        <Route path="/map" element={<TransportMap />} />
                        <Route path="/incidents" element={<Incidents />} />
                        <Route path="/alerts" element={<Alerts />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AppProvider>
    )
}

export default App
