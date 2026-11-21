import React from "react";
import { createRoot } from "react-dom/client";
import Workspace from "@/app/code/workspace";

Object.assign(window, { React });
createRoot(document.getElementById("root")!).render(<Workspace />);
