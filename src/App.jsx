import { useState, useEffect } from "react";

import Layout from "./components/Layout";
import DashboardWorkspace from "./pages/DashboardWorkspace";
import TemplateBuilder from "./pages/TemplateBuilder";
import TemplateEditor from "./pages/TemplateEditor";
import TemplateList from "./pages/TemplateList";
import ImageWidgetEditor from "./pages/ImageWidgetEditor";
import SankeyFlowEditor from "./pages/SankeyFlowEditor";
import ProcessFlowWorkspace from "./pages/ProcessFlowWorkspace";
import OrganizationManagement from "./pages/ManageOrganization";
import DeviceManagement from "./pages/DeviceManagement";
import Login from "./pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";
import AppFeedback from "./components/AppFeedback";
import SessionExpiryModal from "./components/SessionExpiryModal";
import { installLegacyDialogGuards } from "./utils/feedback";
import { installAuthFetchInterceptor } from "./utils/sessionAuth";

installLegacyDialogGuards();
installAuthFetchInterceptor();

export default function App() {
  // PAGE
  const [page, setPage] =
    useState("login");

  // ACTIVE TEMPLATE
  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState(null);

  const [
    templateEditReturnPage,
    setTemplateEditReturnPage,
  ] = useState("templates");

  // OPEN DASHBOARD TABS
  const [
    dashboardTabs,
    setDashboardTabs,
  ] = useState([]);

  const openDashboardTemplate = (template) => {
    if (!template?.id) return;

    setDashboardTabs((current) =>
      current.some(
        (item) =>
          Number(item.id) ===
          Number(template.id)
      )
        ? current.map((item) =>
            Number(item.id) ===
            Number(template.id)
              ? template
              : item
          )
        : [...current, template]
    );

    setSelectedTemplate(template);
    setPage("dashboard");
  };

  const handleTemplateUpdated = (updatedTemplate) => {
    if (!updatedTemplate?.id) return;

    setSelectedTemplate((current) =>
      Number(current?.id) === Number(updatedTemplate.id)
        ? updatedTemplate
        : current
    );

    setDashboardTabs((current) =>
      current.map((item) =>
        Number(item.id) === Number(updatedTemplate.id)
          ? updatedTemplate
          : item
      )
    );
  };

  const closeDashboardTab = (templateId) => {
    const id = Number(templateId);

    setDashboardTabs((current) => {
      const index = current.findIndex(
        (item) => Number(item.id) === id
      );

      const next = current.filter(
        (item) => Number(item.id) !== id
      );

      if (
        Number(selectedTemplate?.id) === id
      ) {
        const fallback =
          next[
            Math.min(
              Math.max(index - 1, 0),
              next.length - 1
            )
          ] || null;

        setSelectedTemplate(fallback);

        if (!fallback) {
          setPage("templates");
        }
      }

      return next;
    });
  };

  // FULLSCREEN
  const [
    fullscreen,
    setFullscreen,
  ] = useState(false);

  // DARK MODE
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      return true;
    }

    if (savedTheme === "light") {
      return false;
    }

    return window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches || false;
  });

  // IMAGE WIDGET
  const [
    editingImageWidget,
    setEditingImageWidget,
  ] = useState(null);

  // SANKEY WIDGET
  const [
    editingSankeyWidget,
    setEditingSankeyWidget,
  ] = useState(null);

  // =====================================
  // FETCH DEFAULT / LATEST / FAVOURITE TEMPLATE
  // =====================================
  const fetchDefaultTemplate = async () => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      console.warn(
        "⚠️ No token found, cannot fetch default template"
      );

      setSelectedTemplate(null);

      return null;
    }

    try {
      const res = await fetch(
        "http://localhost:5000/default-template",
        {
          headers: {
            Authorization: token,
          },
        }
      );

      const text = await res.text();

      let data = null;

      try {
        data = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          "Server did not return JSON while fetching default template"
        );
      }

      console.log(
        "📡 DEFAULT TEMPLATE STATUS:",
        res.status
      );

      console.log(
        "📦 DEFAULT TEMPLATE:",
        data
      );

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to fetch default template"
        );
      }

      if (data) {
        setSelectedTemplate(data);
        setDashboardTabs((current) =>
          current.some(
            (item) =>
              Number(item.id) ===
              Number(data.id)
          )
            ? current.map((item) =>
                Number(item.id) ===
                Number(data.id)
                  ? data
                  : item
              )
            : [...current, data]
        );

        console.log(
          "✅ DEFAULT TEMPLATE LOADED:",
          data.name
        );
      } else {
        setSelectedTemplate(null);

        console.log(
          "⚠️ NO DEFAULT TEMPLATE FOUND"
        );
      }

      return data;
    } catch (err) {
      console.error(
        "❌ DEFAULT TEMPLATE ERROR:",
        err
      );

      setSelectedTemplate(null);

      return null;
    }
  };

  // =====================================
  // SIDEBAR / PAGE NAVIGATION
  // IMPORTANT:
  // Dashboard must reload template from backend.
  // This prevents deleted templates from staying on screen.
  // =====================================
  const handleNavigate = async (nextPage) => {
    if (nextPage === "dashboard") {
      if (!selectedTemplate) {
        await fetchDefaultTemplate();
      }

      setPage("dashboard");
      return;
    }

    setPage(nextPage);
  };

  // =====================================
  // AUTO LOGIN + LOAD DEFAULT TEMPLATE
  // =====================================
  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) return;

    console.log("AUTO LOGIN DETECTED");

    const loadDefaultDashboard =
      async () => {
        await fetchDefaultTemplate();

        // If the session-expiry dialog was exited while the request was
        // waiting, do not reopen the protected dashboard.
        if (localStorage.getItem("token")) {
          setPage("dashboard");
        } else {
          setPage("login");
        }
      };

    loadDefaultDashboard();
  }, []);

  // =====================================
  // SESSION EXPIRED -> EXIT TO LOGIN
  // =====================================
  const handleSessionExitToLogin = () => {
    setFullscreen(false);
    setSelectedTemplate(null);
    setDashboardTabs([]);
    setEditingImageWidget(null);
    setEditingSankeyWidget(null);
    setPage("login");
  };

  // =====================================
  // APPLY DARK MODE
  // =====================================
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    document.documentElement.style.colorScheme =
      dark ? "dark" : "light";
  }, [dark]);

  // =====================================
  // TOGGLE THEME
  // =====================================
  const toggleTheme = () => {
    const next = !dark;

    setDark(next);

    localStorage.setItem(
      "theme",
      next ? "dark" : "light"
    );
  };

  // =====================================
  // PAGE ROUTER
  // =====================================
  const renderPage = () => {
    switch (page) {
      // LOGIN
      case "login": {
        const token =
          localStorage.getItem("token");

        if (token) {
          return (
            <div
              className="
                h-screen
                flex items-center justify-center
                bg-gray-100 dark:bg-gray-950
              "
            >
              <div className="text-center">
                <div
                  className="
                    animate-spin rounded-full
                    h-12 w-12
                    border-b-2 border-emerald-500
                    mx-auto mb-4
                  "
                ></div>

                <p className="text-gray-400">
                  Opening dashboard...
                </p>
              </div>
            </div>
          );
        }

        return (
          <Login
            setPage={setPage}
            fetchDefaultTemplate={
              fetchDefaultTemplate
            }
            dark={dark}
            toggleTheme={toggleTheme}
          />
        );
      }

      // PALM OIL PROCESS SIMULATOR
      case "process-simulator":
        return (
          <ProtectedRoute
            roles={["superadmin", "admin", "editor"]}
          >
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <ProcessFlowWorkspace
                template={selectedTemplate}
                dark={dark}
              />
            </Layout>
          </ProtectedRoute>
        );

      // TEMPLATE BUILDER
      case "builder":
        return (
          <ProtectedRoute
            roles={[
              "superadmin",
              "admin",
            ]}
          >
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <TemplateBuilder
                setPage={setPage}
                editingImageWidget={
                  editingImageWidget
                }
                setEditingImageWidget={
                  setEditingImageWidget
                }
                editingSankeyWidget={
                  editingSankeyWidget
                }
                setEditingSankeyWidget={
                  setEditingSankeyWidget
                }
              />
            </Layout>
          </ProtectedRoute>
        );

      // TEMPLATE EDITOR
      case "editor":
        return (
          <ProtectedRoute
            roles={[
              "superadmin",
              "admin",
              "editor",
            ]}
          >
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <TemplateEditor
                selectedTemplate={
                  selectedTemplate
                }
                setPage={setPage}
                editingImageWidget={
                  editingImageWidget
                }
                setEditingImageWidget={
                  setEditingImageWidget
                }
                editingSankeyWidget={
                  editingSankeyWidget
                }
                setEditingSankeyWidget={
                  setEditingSankeyWidget
                }
                editReturnPage={
                  templateEditReturnPage
                }
                onTemplateUpdated={
                  handleTemplateUpdated
                }
              />
            </Layout>
          </ProtectedRoute>
        );

      // TEMPLATE LIST
      case "templates":
        return (
          <ProtectedRoute>
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <TemplateList
                setPage={(nextPage) => {
                  if (nextPage === "editor") {
                    setTemplateEditReturnPage("templates");
                  }
                  setPage(nextPage);
                }}
                setSelectedTemplate={
                  setSelectedTemplate
                }
                openDashboardTemplate={
                  openDashboardTemplate
                }
                fetchDefaultTemplate={
                  fetchDefaultTemplate
                }
              />
            </Layout>
          </ProtectedRoute>
        );

      // DEVICE MANAGEMENT
      case "device-management":
        return (
          <ProtectedRoute
            roles={[
              "superadmin",
              "admin",
              "editor",
              "viewer",
            ]}
          >
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <DeviceManagement
                setPage={handleNavigate}
                dark={dark}
              />
            </Layout>
          </ProtectedRoute>
        );

      // ORGANIZATION / USER MANAGEMENT
      case "organizations":
        return (
          <ProtectedRoute
            roles={[
              "superadmin",
              "admin",
            ]}
          >
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <OrganizationManagement />
            </Layout>
          </ProtectedRoute>
        );

      // IMAGE WIDGET EDITOR
      case "image-editor":
        return (
          <ProtectedRoute
            roles={["superadmin", "admin", "editor"]}
          >
            <ImageWidgetEditor
              widget={editingImageWidget}
              setWidget={
                setEditingImageWidget
              }
              setPage={setPage}
              dark={dark}
              toggleTheme={toggleTheme}
            />
          </ProtectedRoute>
        );

      // SANKEY FLOW EDITOR
      case "sankey-editor":
        return (
          <ProtectedRoute
            roles={["superadmin", "admin", "editor"]}
          >
            <SankeyFlowEditor
              sankeyWidget={
                editingSankeyWidget
              }
              setSankeyWidget={
                setEditingSankeyWidget
              }
              setPage={setPage}
              darkMode={dark}
              toggleTheme={toggleTheme}
            />
          </ProtectedRoute>
        );

      // DASHBOARD
      default:
        return (
          <ProtectedRoute>
            <Layout
              setPage={handleNavigate}
              currentPage={page}
              fullscreen={fullscreen}
              showSidebar={!fullscreen}
              dark={dark}
              toggleTheme={toggleTheme}
            >
              <DashboardWorkspace
                template={
                  selectedTemplate
                }
                tabs={dashboardTabs}
                onSelectTab={(template) => {
                  setSelectedTemplate(template);
                  setPage("dashboard");
                }}
                onCloseTab={
                  closeDashboardTab
                }
                onOpenLibrary={() =>
                  setPage("templates")
                }
                setFullscreen={
                  setFullscreen
                }
                setPage={(nextPage) => {
                  if (nextPage === "editor") {
                    setTemplateEditReturnPage("dashboard");
                  }
                  setPage(nextPage);
                }}
              />
            </Layout>
          </ProtectedRoute>
        );
    }
  };

  return (
    <>
      <div key={page} className="app-route-frame">
        {renderPage()}
      </div>

      <SessionExpiryModal
        onExitToLogin={handleSessionExitToLogin}
      />

      <AppFeedback />
    </>
  );
}
