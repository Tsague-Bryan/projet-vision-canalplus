import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Navbar() {
  return (
    <nav className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center">
      <Link to="/">
        <img src={logo} alt="Logo Canal Vision" className="h-10" />
      </Link>

      <div className="space-x-6">
        <Link to="/" className="hover:text-primary-foreground/80">Accueil</Link>
        <Link to="/services" className="hover:text-primary-foreground/80">Services</Link>
        <Link to="/loginform" className="hover:text-primary-foreground/80">Connexion</Link>
      </div>

      <Link to="/inscription" className="bg-background text-foreground px-4 py-2 rounded-lg hover:bg-background/80">
        S'inscrire
      </Link>
    </nav>
  );
}