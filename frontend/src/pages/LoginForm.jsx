import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/loginForm.css";

function LoginForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newErrors = {};
    if (!name) newErrors.name = true;
    if (!contact) newErrors.contact = true;
    if (!password) newErrors.password = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, password }),
      });

      const data = await response.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        alert("Connexion réussie !");

        if (data.role === "partner") {
          navigate("/partner/dashboard");
        } else if (data.role === "admin") {
          navigate("/admin/dashboard");
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
    }
  };


  const handleForgotPassword = async () => {
    const phone = prompt("Veuillez entrer votre numéro de téléphone pour réinitialiser votre mot de passe :");

    if (!phone) return alert("Numéro de téléphone requis");

    try {
      const response = await fetch("http://localhost:5000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: phone }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Un code de réinitialisation a été envoyé à votre numéro de téléphone !");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la réinitialisation :", error);
      alert("Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const handleRegisterRedirect = () => {
    navigate("/inscription"); // Redirection vers la page d'inscription
  };

  return (
    <div className="container">
      <form className="form" onSubmit={handleSubmit}>
        <h2>Connexion</h2>


        <input
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "error" : ""}`}
        />

        <input
          type="text"
          placeholder="Email ou Téléphone"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.contact ? "error" : ""}`}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? "error" : ""}`}
        />

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors duration-200 mb-2"
        >
          Se connecter
        </button>

        <button
          type="button"
          onClick={handleRegisterRedirect}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors duration-200 mb-4"
        >
          S'inscrire
        </button>

        <p
          className="text-blue-500 text-sm text-center cursor-pointer hover:text-blue-700 hover:underline transition-colors duration-200"
          onClick={handleForgotPassword}
        >
          Mot de passe oublié ?
        </p>

      </form>
    </div>
  );
}


export default LoginForm;


