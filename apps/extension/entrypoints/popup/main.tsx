import React from "react";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./popup-app";
import "./popup.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<PopupApp />);
}
