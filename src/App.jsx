import { useState, useEffect } from "react";

import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import TemplateBuilder from "./pages/TemplateBuilder";
import TemplateEditor from "./pages/TemplateEditor";
import TemplateList from "./pages/TemplateList";
import ImageWidgetEditor from "./pages/ImageWidgetEditor";
import Login from "./pages/Login";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {

  //PAGE
  const [page, setPage] =
    useState("login");

  //ACTIVE TEMPLATE
  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState(null);

  //FULLSCREEN
  const [fullscreen, setFullscreen] =
    useState(false);

  //DARK MODE
  const [dark, setDark] =
    useState(
      localStorage.getItem("theme")
      === "dark"
    );

  //IMAGE WIDGET
  const [editingImageWidget,
  setEditingImageWidget] = useState(null);

  //AUTO LOGIN + LOAD DEFAULT TEMPLATE
  useEffect(() => {

    const token =
      localStorage.getItem("token");

    if (!token) return;

    console.log(
      "AUTO LOGIN DETECTED"
    );

    setPage("dashboard");

    fetch(
      "http://localhost:5000/default-template",
      {
        headers: {
          Authorization: token,
        },
      }
    )

      .then(async (res) => {

        console.log(
          "📡 DEFAULT TEMPLATE STATUS:",
          res.status
        );

        const data =
          await res.json();

        return data;
      })

      .then((template) => {

        console.log(
          "DEFAULT TEMPLATE:",
          template
        );

        if (template) {

          setSelectedTemplate(
            template
          );

          console.log(
            "DEFAULT TEMPLATE LOADED"
          );

        } else {

          console.log(
            "NO DEFAULT TEMPLATE FOUND"
          );
        }

      })

      .catch((err) => {

        console.error(
          "DEFAULT TEMPLATE ERROR:",
          err
        );

      });

  }, []);

  //APPLY DARK MODE
  useEffect(() => {

    if (dark) {

      document.documentElement
        .classList.add("dark");

    } else {

      document.documentElement
        .classList.remove("dark");
    }

  }, [dark]);

  //TOGGLE THEME
  const toggleTheme = () => {

    const next = !dark;

    setDark(next);

    localStorage.setItem(
      "theme",
      next ? "dark" : "light"
    );
  };

  //PAGE ROUTER
  const renderPage = () => {

    switch (page) {

      //LOGIN
      case "login": {

        const token =
          localStorage.getItem(
            "token"
          );

        if (token) {

          console.log(
            "🔁 TOKEN EXISTS"
          );

          return null;
        }

        return (
          <Login
            setPage={setPage}
          />
        );
      }

      //TEMPLATE BUILDER
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
              setPage={setPage}
              fullscreen={fullscreen}
              showSidebar={true}
              dark={dark}
              toggleTheme={toggleTheme}
            >

              <TemplateBuilder
                setPage={setPage}
                editingImageWidget={editingImageWidget}
                setEditingImageWidget={setEditingImageWidget}

              />

            </Layout>

          </ProtectedRoute>
        );

      //TEMPLATE EDITOR
      case "editor":

        return (

          <ProtectedRoute
            roles={[
              "superadmin",
              "admin",
            ]}
          >

            <Layout
              setPage={setPage}
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
              />

            </Layout>

          </ProtectedRoute>
        );

      //TEMPLATE LIST
      case "templates":

        return (

          <ProtectedRoute>

            <Layout
              setPage={setPage}
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
              />

            </Layout>

          </ProtectedRoute>
        );

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

      //DASHBOARD
      default:

        return (

          <ProtectedRoute>

            <Layout
              setPage={setPage}
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
              />

            </Layout>

          </ProtectedRoute>
        );
    }
  };

  return renderPage();
}