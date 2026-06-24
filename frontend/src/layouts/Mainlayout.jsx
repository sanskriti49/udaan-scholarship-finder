import { Outlet } from "react-router-dom";

function Mainlayout() {
  return (
    <div>
      <Nav />
      <Outlet />
      <Footer />
    </div>
  );
}

export default Mainlayout;
