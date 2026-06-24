import heroImage from "../assets/images/hero-image.jpg";

function Hero() {
  return (
    <div className="grid grid-cols-2 p-10 h-max gap-8 items-center">
      <div className="flex flex-col gap-8 justify-between">
        <div className="flex flex-col gap-4">
          <p className="bg-emerald-600 text-white rounded-3xl w-max px-4 py-1.5 text-sm font-medium">
            🎓 One search can change a student's future.
          </p>
          <h1 className="text-7xl font-bold tracking-tight text-gray-900 leading-tight">
            Discover scholarships that help your dreams take flight.
          </h1>
          <p className="text-gray-500 text-xl">
            Empowering students to turn aspirations into achievements.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6">
          <div>
            <h2 className="text-4xl font-bold text-emerald-600">1,000+</h2>
            <p className="text-sm text-gray-500 mt-1">Scholarships Available</p>
          </div>
          <div className="crushed-left pl-4">
            <h2 className="text-4xl font-bold text-emerald-600">500+</h2>
            <p className="text-sm text-gray-500 mt-1">Partner Institutions</p>
          </div>
          <div className="crushed-left pl-4">
            <h2 className="text-4xl font-bold text-emerald-600">95%</h2>
            <p className="text-sm text-gray-500 mt-1">Verified Opportunities</p>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <img
          src={heroImage}
          alt="Hero banner"
          className="w-full max-w-2xl h-auto"
        />
      </div>
    </div>
  );
}

export default Hero;
