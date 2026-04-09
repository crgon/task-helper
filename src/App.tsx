import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Timeline from "./pages/Timeline";
import WeeklyReport from "./pages/WeeklyReport";
import TaskDetail from "./pages/TaskDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/report" element={<WeeklyReport />} />
        <Route path="/task/:id" element={<TaskDetail />} />
      </Routes>
      <NavBar />
    </BrowserRouter>
  );
}