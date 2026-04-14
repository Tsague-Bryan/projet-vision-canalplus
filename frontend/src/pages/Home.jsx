import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function HomePage({ user }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center space-y-4">
          <img
            src={logo}
            alt="Logo Canal Vision"
            className="h-24 animate-pulse transition duration-700 hover:scale-110"
          />
          <h1 className="text-black text-xl font-bold">
            Canal Vision+
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col text-gray-900">

      <div className="flex-grow">

        {/* Navbar */}
        <nav className="bg-black text-white px-6 py-4 flex justify-between items-center">
          
          <Link to="/">
                  <img src={logo} alt="Logo Canal Vision" className="h-10" />
                </Link>

          <div className="space-x-6">
            {/* ✅ Accueil → Accueil */}
            <Link to="/" replace className="hover:text-gray-400">
              Accueil
            </Link>

            <Link to="/services" className="hover:text-gray-400">
              Services
            </Link>

            <Link to="/loginform" className="hover:text-gray-400">
              Connexion
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/inscription" className="bg-white text-black px-4 py-2 rounded">
              S'inscrire
            </Link>

            {user?.role === "admin" && (
              <Link to="/admin-dashboard" className="hover:text-gray-400">
                Admin
              </Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-gray-100 text-black text-center py-20">
          <h2 className="text-4xl font-bold mb-4">
            Simplifiez la gestion de vos services Canal+
          </h2>
          <p className="text-lg mb-6">
            Une plateforme unique pour administrateurs et partenaires
          </p>
          <div className="space-x-4">
            <Link to="/services">
              <button className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800">
                Découvrir nos services
              </button>
            </Link>
            <Link to="/inscription">
              <button className="bg-gray-300 text-black px-6 py-2 rounded hover:bg-gray-400">
                Devenir partenaire
              </button>
            </Link>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 px-8 grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-gray-100 shadow-md p-6 rounded">
            <h3 className="text-xl font-bold mb-2">Abonnement Canal+</h3>
            <p className="text-gray-600">Gérez vos abonnements facilement.</p>
          </div>
          <div className="bg-gray-100 shadow-md p-6 rounded">
            <h3 className="text-xl font-bold mb-2">Réabonnements Canal+</h3>
            <p className="text-gray-600">Accédez aux services en toute simplicité.</p>
          </div>
          <div className="bg-gray-100 shadow-md p-6 rounded">
            <h3 className="text-xl font-bold mb-2">Support partenaires</h3>
            <p className="text-gray-600">
              Un accompagnement dédié pour chaque partenaire.
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-black text-white text-center py-6">
        <p>© 2026 Vision Canal+. Tous droits réservés.</p>
        <div className="space-x-4 mt-2">
          <a href="#" className="hover:text-gray-400">À propos</a>
          <a href="#" className="hover:text-gray-400">Contact</a>
          <a href="#" className="hover:text-gray-400">Confidentialité</a>
        </div>
      </footer>

    </div>
  );
}