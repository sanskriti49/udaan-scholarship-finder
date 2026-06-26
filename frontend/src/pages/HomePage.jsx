import FAQ from "../components/FAQ";
import FeaturedScholarships from "../components/FeaturedScholarships";
import Hero from "../components/Hero";

function HomePage() {
	return (
		<div>
			<Hero />
			<FeaturedScholarships />
			<FAQ />
		</div>
	);
}

export default HomePage;
