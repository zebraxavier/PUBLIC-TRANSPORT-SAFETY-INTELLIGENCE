import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring'))
const RiskAnalytics = lazy(() => import('./pages/RiskAnalytics'))
const TransportMap = lazy(() => import('./pages/TransportMap'))
const Incidents = lazy(() => import('./pages/Incidents'))
const Alerts = lazy(() => import('./pages/Alerts'))

function PageLoader() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-neon-blue border-t-transparent rounded-full animate-spin" />
        </div>
    )
}

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <BrowserRouter>
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
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
                    </Suspense>
                </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    )
}
