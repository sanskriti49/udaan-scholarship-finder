import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import gsap from "gsap";
import { useAuth } from "../hooks/useAuth";
import FullScreenLoader from "../components/FullScreenLoader";

function Mainlayout() {
  const location = useLocation();
  const pageRef = useRef(null);
  const { loading } = useAuth();

  useEffect(() => {
    // Instant scroll to top on route change so no abrupt scroll jumps occur
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Smooth, quick, fluid GSAP route transition
    const ctx = gsap.context(() => {
      gsap.fromTo(
        pageRef.current,
        {
          opacity: 0,
          y: 8,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: "power2.out",
          clearProps: "transform,opacity",
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
        <div ref={pageRef} className="grow flex flex-col will-change-[opacity,transform]">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  );
}

export default Mainlayout;
