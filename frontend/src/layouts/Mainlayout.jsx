import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../hooks/useAuth";
import FullScreenLoader from "../components/FullScreenLoader";
import { forceUnlockBodyScroll } from "../hooks/useBodyScrollLock";

function Mainlayout() {
  const location = useLocation();
  const { loading } = useAuth();

  useEffect(() => {
    forceUnlockBodyScroll();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      {loading && <FullScreenLoader />}
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div key={location.pathname} className="grow flex flex-col min-h-[calc(100vh-5rem)] animate-fade-in">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Mainlayout;
