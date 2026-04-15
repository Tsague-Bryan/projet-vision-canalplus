import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function LoginForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
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
    navigate("/inscription");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <form
        className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md"
        onSubmit={handleSubmit}
      >
        {/* Logo centré */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-20 w-auto" />
        </div>

        <h2 className="text-2xl font-bold text-center text-blue-900 mb-2">Vision Canal+</h2>
        <p className="text-center text-gray-600 mb-6">Sign in to continue</p>

        <input
          type="text"
          placeholder="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
        />

        <input
          type="text"
          placeholder="Email ou Téléphone"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.contact ? "border-red-500" : "border-gray-300"}`}
        />

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? "border-red-500" : "border-gray-300"}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600"
          >
            {showPassword ? "👁️‍🗨️" : "👁️"}
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 mb-2 font-semibold"
        >
          Login
        </button>

        <p
          className="text-blue-500 text-sm text-center cursor-pointer hover:text-blue-700 hover:underline transition-colors duration-200 mb-4"
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </p>

        <p className="text-center text-gray-600">
          Don’t have an account?{" "}
          <span
            onClick={handleRegisterRedirect}
            className="text-blue-600 font-semibold cursor-pointer hover:underline"
          >
            Register
          </span>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
