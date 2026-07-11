import React from "react";
import { createRoot } from "react-dom/client";
import { OptionsApp } from "./options-app";
import "../popup/popup.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<OptionsApp />);
}
