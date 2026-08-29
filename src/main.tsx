import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import App from "./App";

// @AI:ANCHOR 앱 부팅 배선 — Provider/Router 구성은 수정하지 마세요.
const container = document.getElementById("root");

if (container != null) {
  createRoot(container).render(
    <StrictMode>
      <TDSMobileAITProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </TDSMobileAITProvider>
    </StrictMode>
  );
}
