import { Link } from 'react-router-dom';
import servifoodLogo from '../assets/servifood logo.jpg';

import { ArrowRight } from 'react-feather';
import timerIcon from '../assets/timer icon.png';
import expertiseIcon from '../assets/expertise icon.png';
import cyberSecurityIcon from '../assets/cyber-security icon.png';
import settingsIcon from '../assets/setting-lines icon.png';

const features = [
  {
    icon: <img src={timerIcon} alt="Rapidez" className="h-12 w-12 mx-auto" />,
    title: "Rápido",
    description: "Gestión de pedidos en segundos.",
  },
  {
    icon: <img src={expertiseIcon} alt="Profesional" className="h-12 w-12 mx-auto" />,
    title: "Profesional",
    description: "Solución para empresas y eventos.",
  },
  {
    icon: <img src={cyberSecurityIcon} alt="Seguro" className="h-12 w-12 mx-auto" />,
    title: "Seguro",
    description: "Tus datos protegidos y privados.",
  },
  {
    icon: <img src={settingsIcon} alt="Flexible" className="h-12 w-12 mx-auto" />,
    title: "Flexible",
    description: "Personaliza tu experiencia.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#303f9f]">

      {/* HEADER */}
      <div className="flex flex-col items-center justify-center pt-8 pb-2">
        <img
          src={servifoodLogo}
          alt="ServiFood Catering Logo"
          className="rounded-xl shadow-xl"
          style={{ width: "150px", height: "150px", objectFit: "contain" }}
        />

        <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold text-white text-center tracking-wide">
          SERVIFOOD CATERING
        </h1>

        <div className="flex gap-2 mt-4">
          <Link
            to="/login"
            className="px-4 py-2 text-white font-bold rounded-xl bg-[#283593] hover:bg-[#3949ab] transition-colors"
          >
            Iniciar Sesión
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 text-white font-bold rounded-xl bg-gradient-to-r from-[#ff9800] to-[#fb8c00] hover:from-[#fb8c00] hover:to-[#f57c00]"
          >
            Registrarse
          </Link>
        </div>
      </div>

      {/* FEATURES */}
      <div className="py-8" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
              💡 ¿Por qué ServiFood?
            </h2>
            <p className="text-lg text-white/90">La mejor plataforma para gestionar tus pedidos</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-2xl backdrop-blur-sm text-center border
                           hover:scale-105 transition shadow-lg"
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderColor: "rgba(255,255,255,0.2)",
                }}
              >
                <div
                  className="p-4 rounded-xl mx-auto mb-3"
                  style={{
                    background: "linear-gradient(to right, #ff9800, #fb8c00)",
                  }}
                >
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                <p className="text-white/90">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-6">
        <div className="container mx-auto px-4">
          <div
            className="rounded-3xl p-6 sm:p-8 text-center shadow-xl"
            style={{
              background: "linear-gradient(to right, #ff9800, #fb8c00)",
            }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              🚀 ¿Listo para comenzar?
            </h2>

            <p className="text-lg text-white/95 mb-6">
              Únete a ServiFood y lleva tu gestión al siguiente nivel
            </p>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white font-bold text-lg rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition"
              style={{ color: "#fb8c00" }}
            >
              ✨ Crear Cuenta Gratis
              <ArrowRight className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer
        className="py-4 text-center border-t backdrop-blur-sm"
        style={{
          backgroundColor: "rgba(26,35,126,0.5)",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <p className="text-white/90">
          © 2025 ServiFood Catering. Todos los derechos reservados.
        </p>
      </footer>

    </div>
  );
}
