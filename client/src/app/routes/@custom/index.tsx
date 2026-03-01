import { Route } from 'react-router-dom'
import { ErrorTrackingPage } from '../../pages/app/@custom/ErrorTrackingPage'
import { CollaboratorsPage } from '../../pages/app/@custom/CollaboratorsPage'
import { BrandSettingsPage } from '../../pages/app/@custom/BrandSettingsPage'
import { ChatbasePage } from '../../pages/app/@custom/ChatbasePage'
import { EmailTrackingPage } from '../../pages/app/@custom/EmailTrackingPage'
import { EmailPreviewPage } from '../../pages/app/@custom/EmailPreviewPage'
import { PublicDropPage } from '../../pages/public/@custom/PublicDropPage'
import { LaunchPageBuilderPage } from '../../pages/app/@custom/LaunchPageBuilderPage'
import { ProductHuntPage } from '../../pages/app/@custom/ProductHuntPage'
import { PrivateRoute } from '@/app/components/@system/PrivateRoute/PrivateRoute'

// @custom — add your product-specific routes here.
// Wrap with <PrivateRoute> for authenticated pages.
export const customRoutes: React.ReactElement[] = [
  // Public drop page (viral signup landing page - NO AUTH REQUIRED)
  <Route key="public-drop" path="/drop/:slug" element={<PublicDropPage />} />,

  // Launch Page Builder — create a new drop
  <Route
    key="drops-new"
    path="/app/drops/new"
    element={
      <PrivateRoute>
        <LaunchPageBuilderPage />
      </PrivateRoute>
    }
  />,

  // Launch Page Builder — edit existing drop
  <Route
    key="drops-edit"
    path="/app/drops/:id"
    element={
      <PrivateRoute>
        <LaunchPageBuilderPage />
      </PrivateRoute>
    }
  />,

  // Product Hunt Integration
  <Route
    key="product-hunt"
    path="/app/product-hunt"
    element={
      <PrivateRoute>
        <ProductHuntPage />
      </PrivateRoute>
    }
  />,

  <Route
    key="error-tracking"
    path="/app/errors"
    element={
      <PrivateRoute>
        <ErrorTrackingPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="collaborators"
    path="/app/collaborators"
    element={
      <PrivateRoute>
        <CollaboratorsPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="brand-settings"
    path="/app/brand"
    element={
      <PrivateRoute>
        <BrandSettingsPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="chatbase"
    path="/app/chatbase"
    element={
      <PrivateRoute>
        <ChatbasePage />
      </PrivateRoute>
    }
  />,
  <Route
    key="email-tracking"
    path="/app/emails"
    element={
      <PrivateRoute role="admin">
        <EmailTrackingPage />
      </PrivateRoute>
    }
  />,
  <Route
    key="email-preview"
    path="/app/emails/preview"
    element={
      <PrivateRoute role="admin">
        <EmailPreviewPage />
      </PrivateRoute>
    }
  />,
]
