import { createBrowserRouter } from "react-router-dom";
import { StartPage } from "../pages/start-page";
import { WorkspacePage } from "../pages/workspace-page";
import { ProjectsPage } from "../pages/projects-page";
import { AccountPage } from "../pages/account-page";
import { AppsPage } from "../pages/apps-page";
import { SettingsPage } from "../pages/settings-page";
import { ExportPage } from "../pages/export-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <StartPage />
  },
  {
    path: "/workspace/:projectId",
    element: <WorkspacePage />
  },
  {
    path: "/projects",
    element: <ProjectsPage />
  },
  {
    path: "/account",
    element: <AccountPage />
  },
  {
    path: "/apps",
    element: <AppsPage />
  },
  {
    path: "/settings",
    element: <SettingsPage />
  },
  {
    path: "/export/:projectId",
    element: <ExportPage />
  }
]);
