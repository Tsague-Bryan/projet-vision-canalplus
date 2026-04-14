import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-4 flex justify-between items-center">
      {/* Logo cliquable */}
      <Link to="/">
        <img src={logo} alt="Logo Canal Vision" className="h-10" />
      </Link>

      {/* Liens */}
      <div className="space-x-6">
        <Link to="/" className="hover:text-gray-400">Accueil</Link>
        <Link to="/services" className="hover:text-gray-400">Services</Link>
        <Link to="/loginform" className="hover:text-gray-400">Connexion</Link>
      </div>

      {/* Bouton inscription */}
      <Link to="/inscription" className="bg-white text-black px-4 py-2 rounded">
        S'inscrire
      </Link>
    </nav>
  );
}
