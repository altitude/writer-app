import {
  Links,
  Meta,
  Outlet,
  Scripts,
} from "@remix-run/react";
import { DebugProvider } from "./components/DebugContext";
import { VirtualKeyboardProvider, KeyboardBridge } from "./components/VirtualKeyboard";
import "./style.css";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/x-icon;base64,AA"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <VirtualKeyboardProvider>
          <KeyboardBridge />
          <DebugProvider>
            <main>
              <Outlet />
            </main>
            <Scripts />
          </DebugProvider>
        </VirtualKeyboardProvider>
      </body>
    </html>
  );
}

