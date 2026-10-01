import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AdminPortal } from "./admin/AdminPortal";

const isAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path.startsWith('/admin') || search.includes('admin') || hash.includes('admin');
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isAdminRoute() ? <AdminPortal /> : <App />}
  </StrictMode>
);

