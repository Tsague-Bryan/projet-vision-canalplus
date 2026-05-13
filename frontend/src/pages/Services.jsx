import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import abonnementsImg from "../assets/cfg.jpg";
import reabonnementsImg from "../assets/abonnements.png";
import installationImg from "../assets/inst.jpg";
import produitsImg from "../assets/kit.jpg";
import assistanceImg from "../assets/abonnements.png";
import parentalImg from "../assets/abonnements.png";

export default function Services() {
  const services = [
    {
      title: "Abonnements Canal+",
      description: "Plus de 280 chaînes TV et radio.",
      image: abonnementsImg,
    },
    {
      title: "Réabonnements Canal+",
      description: "Plus de 350 chaînes incluant sport, cinéma et séries.",
      image: reabonnementsImg,
    },
    {
      title: "Installation Canal+",
      description: "Image nette, son Dolby et +25 000 programmes en replay.",
      image: installationImg,
    },
    {
      title: "Produits Canal+",
      description: "Cinéma inédit, séries originales, sport international.",
      image: produitsImg,
      link:  "/boutique"
    },
    {
      title: "Assistance",
      description: "Notre service clients pour tous vos besoins",
      image: assistanceImg,
      link: "https://wa.me/237656253864"
    },
    {
      title: "Contrôle Parental",
      description: "Sécurisez vos programmes avec un code à 4 chiffres.",
      image: parentalImg,
    },
  ];

  return (
    <>
      <Navbar />
      <div className="bg-background min-h-screen pt-8 px-6">
        <h1 className="text-4xl font-bold text-center text-foreground mb-12">
          Nos Services Vision Canal+
        </h1>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition duration-300 transform hover:-translate-y-2 border border-border"
            >
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-40 object-cover"
              />
              <div className="p-6 text-center">
                <h2 className="text-xl font-semibold mb-2 text-foreground">
                  {service.title}
                </h2>
                <p className="text-muted-foreground">{service.description}</p>

                {service.link && (
                  <a
                    href={service.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition"
                  >
                    Découvrir
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 mb-10">
          <Link
            to="/inscription"
            className="bg-primary text-primary-foreground px-5 py-3 rounded-lg font-semibold hover:bg-primary/90 transition"
          >
            Devenir Partenaire
          </Link>
        </div>

        <Footer />
      </div>
    </>
  );
}