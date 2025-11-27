// ...existing code removed...
import { Link } from 'react-router-dom';
import servifoodLogo from '../assets/servifood logo.jpg';
// Import missing icons and features
import { ArrowRight } from 'react-feather';
import timerIcon from '../assets/timer icon.png';
import expertiseIcon from '../assets/expertise icon.png';
import cyberSecurityIcon from '../assets/cyber-security icon.png';
import settingsIcon from '../assets/setting-lines icon.png';

const features = [
  {
    icon: <img src={timerIcon} alt="Rapidez" className="h-12 w-12 mx-auto" />,
    title: 'Rápido',
    description: 'Gestión de pedidos en segundos.',
  },
  {
    icon: <img src={expertiseIcon} alt="Profesional" className="h-12 w-12 mx-auto" />,
    title: 'Profesional',
    description: 'Solución para empresas y eventos.',
  },
  {
    icon: <img src={cyberSecurityIcon} alt="Seguro" className="h-12 w-12 mx-auto" />,
    title: 'Seguro',
    description: 'Tus datos protegidos y privados.',
  },
  {
    icon: <img src={settingsIcon} alt="Flexible" className="h-12 w-12 mx-auto" />,
    title: 'Flexible',
    description: 'Personaliza tu experiencia.',
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#303f9f]">
      <div className="flex flex-col items-center justify-center w-full pt-6 pb-2">
        <img
          src={servifoodLogo}
          alt="Servifood Catering Logo"
          className="mx-auto rounded-xl shadow-2xl"
          style={{ width: '120px', height: '120px', objectFit: 'contain' }}
        />
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold text-white text-center drop-shadow-lg tracking-wide">
          SERVIFOOD CATERING
        </h1>
        <div className="flex flex-col items-center justify-center gap-2 mt-2">
          <div className="flex gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl bg-[#283593] hover:bg-[#3949ab] transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl bg-gradient-to-r from-[#ff9800] to-[#fb8c00] hover:from-[#fb8c00] hover:to-[#f57c00] transition-all duration-200"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="backdrop-blur-sm py-4 sm:py-6" style={{backgroundColor: 'rgba(255, 255, 255, 0.05)'}}>
        <div className="w-full px-0 sm:px-2 max-w-none">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 drop-shadow-lg">
              💡 ¿Por qué ServiFood?
            </h2>
            <p className="text-lg sm:text-xl font-semibold" style={{color: 'rgba(255, 255, 255, 0.9)'}}>
              La mejor plataforma para gestionar tus pedidos de comida
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                className="backdrop-blur-sm p-8 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl text-center"
                style={{backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.borderColor = '#ffa726'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                }}
              >
                <div className="text-white p-4 rounded-xl w-fit mx-auto mb-4" style={{background: 'linear-gradient(to right, #ff9800, #fb8c00)'}}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="font-medium" style={{color: 'rgba(255, 255, 255, 0.9)'}}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-4 sm:py-6">
        <div className="w-full px-0 sm:px-2 max-w-none">
          <div className="rounded-3xl p-4 sm:p-6 shadow-2xl text-center w-full" style={{background: 'linear-gradient(to right, #ff9800, #fb8c00)'}}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4">
              🚀 ¿Listo para comenzar?
            </h2>
            <p className="text-lg sm:text-xl mb-4 max-w-2xl mx-auto font-semibold" style={{color: 'rgba(255, 255, 255, 0.95)'}}>
              Únete a ServiFood hoy y lleva la gestión de tus pedidos al siguiente nivel
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-10 py-4 bg-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
              style={{color: '#fb8c00'}}
            >
              ✨ Crear Cuenta Gratis
              <ArrowRight className="h-6 w-6" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="backdrop-blur-sm py-4 border-t w-full mt-auto" style={{backgroundColor: 'rgba(26, 35, 126, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)', flexShrink: 0}}>
        <div className="container mx-auto px-4 sm:px-6 text-center font-medium" style={{color: 'rgba(255, 255, 255, 0.9)'}}>
          <p className="truncate" style={{maxWidth: '100%', margin: '0 auto'}}>
            © 2025 ServiFood Catering. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
