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
  // Keep the Navigator's active request and draft alive between its three pages.
  // Leaving this area still unmounts it and clears its in-memory inputs.
  const pageKey = /^\/navigator(?:\/|$)/.test(location.pathname) ? "/navigator" : location.pathname;

  useEffect(() => {
    forceUnlockBodyScroll();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      {loading && <FullScreenLoader />}
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div key={pageKey} className="grow flex flex-col min-h-[calc(100vh-5rem)] animate-page-enter">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Mainlayout;
