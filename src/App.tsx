import { Route, Routes } from "react-router-dom";
import AppErrorBoundary from "./components/AppErrorBoundary";
import Home from "./pages/Home";
import ResultPage from "./pages/ResultPage";
import HistoryPage from "./pages/HistoryPage";

/**
 * 라우트 트리 전체를 AppErrorBoundary로 감싼다 — 어떤 화면이 던지든 흰 화면 대신 복구 화면.
 * Router는 main.tsx(@AI:ANCHOR)가 이미 감싸고 있으므로 여기서 다시 만들지 않는다.
 */
export default function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </AppErrorBoundary>
  );
}
