import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Mainlayout from "./layouts/Mainlayout";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<Mainlayout />}>
            <Route path="home" element={<HomePage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
