import { useState, useEffect } from "react";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TemplateBuilder from "./pages/TemplateBuilder";
import TemplateEditor from "./pages/TemplateEditor";
import TemplateList from "./pages/TemplateList";
import ImageWidgetEditor from "./pages/ImageWidgetEditor";
import OrganizationManagement from "./pages/ManageOrganization";
import Login from "./pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  // PAGE
  const [page, setPage] =
    useState("login");

  // ACTIVE TEMPLATE
  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState(null);

  // FULLSCREEN
  const [
    fullscreen,
    setFullscreen,
  ] = useState(false);

  // DARK MODE
  const [dark, setDark] =
    useState(
      localStorage.getItem("theme") === "dark"
    );

  // IMAGE WIDGET
  const [
    editingImageWidget,
    setEditingImageWidget,
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
      await fetchDefaultTemplate();

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

        setPage("dashboard");
      };

    loadDefaultDashboard();
  }, []);

  // =====================================
  // APPLY DARK MODE
  // =====================================
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add(
        "dark"
      );
    } else {
      document.documentElement.classList.remove(
        "dark"
      );
    }
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
          />
        );
      }

      // TEMPLATE BUILDER
      case "builder":
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
              <TemplateBuilder
                setPage={setPage}
                editingImageWidget={
                  editingImageWidget
                }
                setEditingImageWidget={
                  setEditingImageWidget
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
                setPage={setPage}
                setSelectedTemplate={
                  setSelectedTemplate
                }
                fetchDefaultTemplate={
                  fetchDefaultTemplate
                }
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
          <ProtectedRoute>
            <ImageWidgetEditor
              widget={editingImageWidget}
              setWidget={
                setEditingImageWidget
              }
              setPage={setPage}
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
              <Dashboard
                template={
                  selectedTemplate
                }
                setFullscreen={
                  setFullscreen
                }
                setPage={setPage}
              />
            </Layout>
          </ProtectedRoute>
        );
    }
  };

  return renderPage();
}