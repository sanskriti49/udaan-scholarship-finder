import FAQ from "../components/FAQ";
import FeaturedScholarships from "../components/FeaturedScholarships";
import Hero from "../components/Hero";
import HowItWorks from "../components/HowItWorks";

function HomePage() {
	return (
		<main>
			<Hero />
			<FeaturedScholarships />
			<HowItWorks />
			<FAQ />
		</main>
	);
}

export default HomePage;

