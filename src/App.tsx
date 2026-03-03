import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { TenantProvider, useTenant } from './contexts/TenantContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TenantNotFoundScreen } from './components/TenantNotFoundScreen'
import { GlobalApiErrorBanner } from './components/GlobalApiErrorBanner'
import { Toaster } from './components/ui/toaster'
import { MarketingSiteRoutes } from './pages/marketing/MarketingSite'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ElevatorsPage } from './pages/ElevatorsPage'
import { ElevatorDetailPage } from './pages/ElevatorDetailPage'
import { MaintenancesPage } from './pages/MaintenancesPage'
import { WarningsPage } from './pages/WarningsPage'
import { PartsPage } from './pages/PartsPage'
import { OffersPage } from './pages/OffersPage'
import { FaultsPage } from './pages/FaultsPage'
import { InspectionsPage } from './pages/InspectionsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { UsersPage } from './pages/UsersPage'
import { RevisionOffersPage } from './pages/RevisionOffersPage'
import { RevisionOffersConvertedPage } from './pages/RevisionOffersConvertedPage'
import { RevisionStandardsPage } from './pages/RevisionStandardsPage'
import { MaintenancePage } from './pages/maintenance/MaintenancePage'
import { MaintenanceItemsPage } from './pages/maintenance/MaintenanceItemsPage'
import { MaintenancePlanningPage } from './pages/maintenance/MaintenancePlanningPage'
import { ElevatorLabelsPage } from './modules/elevators/ElevatorLabelsPage'
import { ElevatorLabelFormPage } from './modules/elevators/ElevatorLabelFormPage'
import { ElevatorContractsPage } from './modules/elevators/ElevatorContractsPage'
import { ElevatorContractFormPage } from './modules/elevators/ElevatorContractFormPage'
import { EdmIncomingInvoicesPage, EdmOutgoingInvoicesPage } from './modules/edm/EdmInvoicesPage'
import { EdmManualInvoicePage } from './modules/edm/EdmManualInvoicePage'
import { EdmVknValidatePage } from './modules/edm/EdmVknValidatePage'
import { EdmSettingsPage } from './modules/edm/EdmSettingsPage'
import { MaintenanceCompletionsPage } from './modules/maintenance/MaintenanceCompletionsPage'
import { PaymentTransactionsPage } from './modules/payments/PaymentTransactionsPage'
import { StocksPage } from './modules/stocks/StocksPage'
import { ProposalsPage } from './modules/proposals/ProposalsPage'
import { StatusDetectionReportsPage } from './modules/reports/StatusDetectionReportsPage'
import { B2BUnitsPage } from './modules/cari/B2BUnitsPage'
import { B2BUnitGroupsPage } from './modules/cari/B2BUnitGroupsPage'
import { CurrenciesPage } from './modules/cari/CurrenciesPage'
import { B2BUnitMePage } from './modules/cari/B2BUnitMePage'
import { FacilitiesPage } from './modules/facilities/FacilitiesPage'
import { FacilityFormPage } from './modules/facilities/FacilityFormPage'
import { ForbiddenPage } from './pages/ForbiddenPage'

function AppRoutes() {
  const { bootStatus, tenant, errorMessage, recheckTenantHealth, isMarketingHost } = useTenant()
  const { isAuthenticated, isLoading, getDefaultRoute } = useAuth()

  if (isMarketingHost) {
    return <MarketingSiteRoutes />
  }

  if (bootStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Tenant kontrol ediliyor...</div>
      </div>
    )
  }

  if (bootStatus === 'not_found') {
    return (
      <TenantNotFoundScreen
        tenant={tenant}
        message={errorMessage}
        onRetry={() => void recheckTenantHealth()}
      />
    )
  }

  if (bootStatus === 'error') {
    return (
      <TenantNotFoundScreen
        tenant={tenant}
        message={errorMessage || 'Tenant doğrulaması tamamlanamadı.'}
        onRetry={() => void recheckTenantHealth()}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated && !isLoading ? (
            <Navigate to={getDefaultRoute()} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="elevators" element={<ElevatorsPage />} />
        <Route path="elevators/:id" element={<ElevatorDetailPage />} />
        <Route path="maintenances" element={<MaintenancesPage />} />
        <Route path="maintenances/list" element={<MaintenancePage />} />
        <Route path="maintenances/items" element={<MaintenanceItemsPage />} />
        <Route path="maintenances/plan" element={<MaintenancePlanningPage />} />
        <Route path="maintenance-completions" element={<MaintenanceCompletionsPage />} />
        <Route path="elevator-labels" element={<ElevatorLabelsPage />} />
        <Route path="elevator-labels/new" element={<ElevatorLabelFormPage />} />
        <Route path="elevator-labels/:id/edit" element={<ElevatorLabelFormPage />} />
        <Route path="elevator-contracts" element={<ElevatorContractsPage />} />
        <Route path="elevator-contracts/new" element={<ElevatorContractFormPage />} />
        <Route path="elevator-contracts/:id/edit" element={<ElevatorContractFormPage />} />
        <Route path="edm/invoices" element={<Navigate to="/edm/invoices/incoming" replace />} />
        <Route path="edm/invoices/incoming" element={<EdmIncomingInvoicesPage />} />
        <Route path="edm/invoices/outgoing" element={<EdmOutgoingInvoicesPage />} />
        <Route path="edm/invoices/manual" element={<EdmManualInvoicePage />} />
        <Route path="edm/vkn-validate" element={<EdmVknValidatePage />} />
        <Route path="edm/settings" element={<EdmSettingsPage />} />
        <Route path="payment-transactions" element={<PaymentTransactionsPage />} />
        <Route path="stocks" element={<StocksPage />} />
        <Route path="proposals" element={<ProposalsPage />} />
        <Route path="reports/status-detections" element={<StatusDetectionReportsPage />} />
        <Route
          path="b2bunits"
          element={
            <ProtectedRoute requireAnyRole={['STAFF_USER']}>
              <B2BUnitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="b2bunits/me"
          element={
            <ProtectedRoute requireRole="CARI_USER">
              <B2BUnitMePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="b2bunit-groups"
          element={
            <ProtectedRoute requireAnyRole={['STAFF_USER']}>
              <B2BUnitGroupsPage />
            </ProtectedRoute>
          }
        />
        <Route path="currencies" element={<CurrenciesPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route
          path="facilities/new"
          element={
            <ProtectedRoute requireAnyRole={['STAFF_USER']}>
              <FacilityFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="facilities/:id/edit"
          element={
            <ProtectedRoute requireAnyRole={['STAFF_USER']}>
              <FacilityFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="warnings" element={<WarningsPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="revision-offers" element={<RevisionOffersPage />} />
        <Route path="revision-offers/converted" element={<RevisionOffersConvertedPage />} />
        <Route path="revision-standards" element={<RevisionStandardsPage />} />
        <Route path="faults" element={<FaultsPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute requireAnyRole={['SYSTEM_ADMIN', 'STAFF_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <AppRoutes />
          <GlobalApiErrorBanner />
          <Toaster />
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  )
}

export default App
