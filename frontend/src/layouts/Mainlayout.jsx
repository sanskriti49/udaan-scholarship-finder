import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import gsap from "gsap";
import { useAuth } from "../hooks/useAuth";
import FullScreenLoader from "../components/FullScreenLoader";
import { forceUnlockBodyScroll } from "../hooks/useBodyScrollLock";

function Mainlayout() {
  const location = useLocation();
  const pageRef = useRef(null);
  const { loading } = useAuth();

  useEffect(() => {
    forceUnlockBodyScroll();

    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

    const ctx = gsap.context(() => {
      gsap.fromTo(
        pageRef.current,
        {
          opacity: 0.4,
        },
        {
          opacity: 1,
          duration: 0.22,
          ease: "power1.out",
          clearProps: "opacity",
        },
      );
    }, pageRef);

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <>
      {loading && <FullScreenLoader />}
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div ref={pageRef} className="grow flex flex-col will-change-opacity">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Mainlayout;
