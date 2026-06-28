import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollToPlugin);

function Mainlayout() {
	const location = useLocation();
	const pageRef = useRef(null);

	useEffect(() => {
		gsap.set(window, { scrollTo: 0 });

		gsap.fromTo(
			pageRef.current,
			{
				opacity: 0,
				y: 16,
			},
			{
				opacity: 1,
				y: 0,
				duration: 0.45,
				ease: "power2.out",
				clearProps: "all",
			},
		);
	}, [location.pathname]);

	return (
		<div className="flex flex-col min-h-screen">
			<Navbar />

			<div ref={pageRef} className="flex-grow">
				<Outlet />
			</div>

			<Footer />
		</div>
	);
}

export default Mainlayout;
