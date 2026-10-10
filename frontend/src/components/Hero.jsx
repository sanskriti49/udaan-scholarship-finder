import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ShockedStudent } from "./AnimatedIllustrations";
import "./home-hero.css";

// Use the same filter values as the scholarship catalogue.
const LEVELS = [
  ["Class 10", "Class 10"], ["Class 12", "Class 12"],
  ["UG", "Undergraduate"], ["PG", "Postgraduate"], ["PhD", "PhD / research"],
];
const STATES = [
  ["UP", "Uttar Pradesh"], ["Bihar", "Bihar"], ["Maharashtra", "Maharashtra"],
  ["Karnataka", "Karnataka"], ["West Bengal", "West Bengal"],
  ["Delhi", "Delhi"], ["Tamil Nadu", "Tamil Nadu"],
];

export default function Hero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState("studies");
  const [level, setLevel] = useState("");
  const [state, setState] = useState("");
  const [search, setSearch] = useState("");

  function explore(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (mode === "name") {
      if (search.trim()) params.set("search", search.trim());
    } else {
      if (level) params.set("level", level);
      if (state) params.set("state", state);
    }
    navigate(`/scholarships${params.size ? `?${params}` : ""}`);
  }

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero-inner">
        <div className="home-hero-layout">
          <div className="home-hero-copy">
            <p className="home-hero-kicker">FOR THE “WHAT IF I COULD?” IN YOU</p>
            <h1 id="home-hero-title">Got big plans?<br />Let’s find the<br /><em>funding.</em></h1>
            <p className="home-hero-intro">That course you keep thinking about? Start here. Explore scholarships, make sense of the rules, and give your next step a chance.</p>
            <div className="home-hero-actions">
              <Link className="home-hero-browse" to="/scholarships">Find my scholarship <ArrowUpRight size={20} aria-hidden="true" /></Link>
              <Link className="home-hero-guide" to="/resources"><BookOpen size={18} aria-hidden="true" /> Application guides</Link>
            </div>
          </div>
          <div className="home-hero-scene" aria-hidden="true">
            <div className="home-scene-orbit" />
            <svg className="home-scene-spark" viewBox="0 0 64 64"><path d="M32 4L36 25L58 18L40 32L58 46L36 39L32 60L27 39L6 46L24 32L6 18L27 25Z" /></svg>
            <div className="home-scene-sheet">
              <span className="home-scene-tape" />
              <p className="home-scene-sheet-label">YOUR NEXT CHAPTER</p>
              <p className="home-scene-sheet-title">A place for<br />your big ideas.</p>
              <div className="home-scene-lines"><span>College fees</span><span>Course books</span><span>Something bigger</span></div>
              <span className="home-scene-sheet-footer">LET’S SEE WHAT’S POSSIBLE ↗</span>
            </div>
            <div className="home-scene-sticker">Dream big.<br /><em>Start small.</em></div>
            <div className="home-scene-boy"><ShockedStudent size={245} showBubble={false} /></div>
            <div className="home-scene-bubble">Wait…<br /><strong>there’s a scholarship<br />for that?</strong></div>
            <svg className="home-scene-arrow" viewBox="0 0 120 80"><path d="M6 10C74-5 112 23 78 61M78 61L80 40M78 61L100 54" /></svg>
          </div>
        </div>
          <div className="home-finder-wrap">
            <form className="home-finder" onSubmit={explore} aria-labelledby="home-finder-title">
              <div className="home-finder-heading"><span className="home-finder-eyebrow">LET’S NARROW IT DOWN</span><h2 id="home-finder-title">Got a starting point?</h2></div>
              <div className="home-finder-controls">
              <div className="home-finder-modes" role="group" aria-label="Find scholarships by">
                <button type="button" aria-pressed={mode === "studies"} onClick={() => setMode("studies")}>My studies</button>
                <button type="button" aria-pressed={mode === "name"} onClick={() => setMode("name")}>Scholarship name</button>
              </div>
              <div className="home-finder-fields">
                {mode === "studies" ? <>
                  <div className="home-finder-field">
                  <label htmlFor="home-study-level">What are you studying?</label>
                  <select id="home-study-level" value={level} onChange={(event) => setLevel(event.target.value)}>
                    <option value="">Any level of study</option>
                    {LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  </div><div className="home-finder-field">
                  <label htmlFor="home-study-state">Your home state</label>
                  <select id="home-study-state" value={state} onChange={(event) => setState(event.target.value)}>
                    <option value="">All states</option>
                    {STATES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  </div>
                </> : <>
                  <div className="home-finder-field home-finder-name">
                  <label htmlFor="home-scholarship-search">Have a scholarship in mind?</label>
                  <div className="home-finder-search"><Search size={19} aria-hidden="true" /><input id="home-scholarship-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Pragati or Post-Matric" /></div>
                  </div>
                </>}
                <button type="submit" className="home-finder-submit">Explore <ArrowRight size={19} aria-hidden="true" /></button>
              </div>
              </div>
              <div className="home-finder-bottom"><p className="home-finder-footnote">Browse without an account. Always check the scheme’s rules.</p>
              <div className="home-finder-eligibility"><span>Want to check your eligibility?</span><Link to="/eligibility">{user ? "Try the eligibility checker" : "Sign in to check"} <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
              </div>
            </form>
          </div>
      </div>
    </section>
  );
}
