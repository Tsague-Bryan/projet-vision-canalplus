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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <img
            src={logo}
            alt="Logo Canal Vision"
            className="h-24 animate-pulse transition duration-700 hover:scale-110"
          />
          <h1 className="text-foreground text-xl font-bold">
            Canal Vision+
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col text-foreground">
      <div className="flex-grow">
        {/* Navbar intégrée ici pour home, mais tu peux aussi utiliser <Navbar /> */}
        <nav className="bg-primary text-primary-foreground px-6 py-4 flex justify-between items-center">
          <Link to="/">
            <img src={logo} alt="Logo Canal Vision" className="h-10" />
          </Link>

          <div className="space-x-6">
            <Link to="/" replace className="hover:text-primary-foreground/80">
              Accueil
            </Link>
            <Link to="/services" className="hover:text-primary-foreground/80">
              Services
            </Link>
            <Link to="/loginform" className="hover:text-primary-foreground/80">
              Connexion
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/inscription" className="bg-background text-foreground px-4 py-2 rounded-lg hover:bg-background/80">
              S'inscrire
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin-dashboard" className="hover:text-primary-foreground/80">
                Admin
              </Link>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-muted text-foreground text-center py-20">
          <h2 className="text-4xl font-bold mb-4">
            Simplifiez la gestion de vos services Canal+
          </h2>
          <p className="text-lg mb-6">
            Une plateforme unique pour administrateurs et partenaires
          </p>
          <div className="space-x-4">
            <Link to="/services">
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90">
                Découvrir nos services
              </button>
            </Link>
            <Link to="/inscription">
              <button className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg hover:bg-secondary/80">
                Devenir partenaire
              </button>
            </Link>
          </div>
        </section>

        {/* Services */}
        <section className="py-16 px-8 grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-card shadow-md p-6 rounded-lg border border-border">
            <h3 className="text-xl font-bold mb-2 text-card-foreground">Abonnement Canal+</h3>
            <p className="text-muted-foreground">Gérez vos abonnements facilement.</p>
          </div>
          <div className="bg-card shadow-md p-6 rounded-lg border border-border">
            <h3 className="text-xl font-bold mb-2 text-card-foreground">Réabonnements Canal+</h3>
            <p className="text-muted-foreground">Accédez aux services en toute simplicité.</p>
          </div>
          <div className="bg-card shadow-md p-6 rounded-lg border border-border">
            <h3 className="text-xl font-bold mb-2 text-card-foreground">Support partenaires</h3>
            <p className="text-muted-foreground">Un accompagnement dédié pour chaque partenaire.</p>
          </div>
        </section>
      </div>

      <footer className="bg-primary text-primary-foreground text-center py-6">
        <p>© 2026 Vision Canal+. Tous droits réservés.</p>
        <div className="space-x-4 mt-2">
          <a href="#" className="hover:text-primary-foreground/80">À propos</a>
          <a href="#" className="hover:text-primary-foreground/80">Contact</a>
          <a href="#" className="hover:text-primary-foreground/80">Confidentialité</a>
        </div>
      </footer>
    </div>
  );
}