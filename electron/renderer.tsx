import { createRoot } from "react-dom/client";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { getRouter } from "../src/router";
import '../src/styles.css';
const router = getRouter();
router.update({ history: createMemoryHistory({ initialEntries: ["/"] }) });
const root = document.getElementById("root");
if (root) createRoot(root).render(<RouterProvider router={router} />);
