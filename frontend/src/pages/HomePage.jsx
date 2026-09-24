import FAQ from "../components/FAQ";
import FeaturedScholarships from "../components/FeaturedScholarships";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";
import { PageStyles } from "../components/PageKit";

function HomePage() {
	return (
		<main className="ud-root min-h-screen bg-[#E9F0EA] font-sans text-emerald-950">
			<PageStyles />
			<Hero />
			<FeaturedScholarships />
			<HowItWorks />
			<FAQ />
		</main>
	);
}

export default HomePage;
