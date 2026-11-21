import React from "react";
import { createRoot } from "react-dom/client";
import Documents from "@/app/code/documents/documents";

Object.assign(window, { React });
createRoot(document.getElementById("root")!).render(<Documents />);
