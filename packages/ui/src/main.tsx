import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const applySystemTheme = () => {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
};

applySystemTheme();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySystemTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
