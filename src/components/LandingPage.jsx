import { Link } from 'react-router-dom';
import { Clock, FileText, CheckCircle, Shield, Check } from 'react-feather';
import servifoodLogo from '../assets/servifood_logo_white_text_HQ.png';

const benefits = [
  {
    icon: Clock,
    title: "Pedí en segundos",
    description: "Completá tu pedido diario de forma ágil y sin complicaciones.",
  },
  {
    icon: FileText,
    title: "Consultá tus pedidos",
    description: "Revisá el historial y el estado de tus selecciones rápidamente.",
  },
  {
    icon: CheckCircle,
    title: "Gestión organizada",
    description: "Todo en un solo lugar, con una interfaz clara y estructurada.",
  },
  {
    icon: Shield,
    title: "Acceso seguro",
    description: "Ingresá de manera confiable con tu cuenta personal.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#1a237e] font-sans selection:bg-[#fb8c00] selection:text-white">
      <style>{`
        .landing-navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
        }
        .landing-header-logo {
          display: block;
          object-fit: contain;
          flex-shrink: 0;
          width: 82px;
          height: auto;
        }
        @media (min-width: 768px) {
          .landing-header-logo {
            width: 110px;
          }
          .landing-navbar {
            padding: 1.5rem 2rem;
          }
        }
        .landing-header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .landing-hero {
          padding-top: 2rem;
          padding-bottom: 3rem;
        }
        @media (min-width: 1024px) {
          .landing-hero {
            padding-top: 3rem;
            padding-bottom: 5rem;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="landing-navbar">
        <Link to="/" style={{ flexShrink: 0, display: 'flex' }}>
          <img
            src={servifoodLogo}
            alt="ServiFood Catering Logo"
            className="landing-header-logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/150?text=ServiFood';
            }}
          />
        </Link>
        <div className="landing-header-actions">
          <Link
            to="/register"
            className="text-white/90 hover:text-white font-medium transition-colors text-sm sm:text-base whitespace-nowrap"
          >
            Registrarse
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#fb8c00] hover:bg-[#f57c00] text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 text-sm sm:text-base whitespace-nowrap"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col">
        {/* HERO SECTION */}
        <section className="container mx-auto px-6 landing-hero">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Copy */}
            <div className="text-center lg:text-left space-y-6">
              <span className="inline-block px-3 py-1 bg-white/10 text-white/90 text-sm font-bold tracking-wider rounded-full uppercase border border-white/20">
                Gestión de Pedidos
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
                Tus pedidos diarios, <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-[#fb8c00]">
                  simples y organizados
                </span>
              </h1>
              <p className="text-lg text-white/80 max-w-xl mx-auto lg:mx-0">
                Ingresá al portal de ServiFood para elegir tus comidas diarias en segundos y mantener un registro ordenado de todas tus selecciones.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#fb8c00] hover:bg-[#f57c00] text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 text-center"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-xl transition-all border border-white/20 text-center backdrop-blur-sm"
                >
                  Crear una cuenta
                </Link>
              </div>
            </div>

            {/* Right Column: Visual Mockup */}
            <div className="relative w-full max-w-sm mx-auto lg:ml-auto lg:mr-0 perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent blur-3xl -z-10 rounded-full" />
              <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 transform transition-transform hover:-translate-y-1 hover:shadow-3xl duration-300">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                  <h3 className="font-bold text-gray-800">Menú del Día</h3>
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                    Hoy
                  </span>
                </div>
                <div className="space-y-3">
                  {/* Selected Option */}
                  <div className="flex items-center p-3 rounded-xl border-2 border-[#fb8c00] bg-orange-50 cursor-default">
                    <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#fb8c00] text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-bold text-gray-900">Pollo al verdeo con papas</p>
                      <p className="text-xs text-gray-600 font-medium mt-0.5">Menú Principal</p>
                    </div>
                  </div>
                  {/* Unselected Option */}
                  <div className="flex items-center p-3 rounded-xl border border-gray-200 bg-white cursor-default opacity-60">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300" />
                    <div className="ml-3">
                      <p className="text-sm font-semibold text-gray-700">Tarta de verdura</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Opción Vegetariana</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="w-full py-3 bg-[#1a237e] text-white text-sm font-bold rounded-xl text-center opacity-90 cursor-default">
                    Confirmar Selección
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section className="container mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
                >
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-[#fb8c00]">
                    <Icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="container mx-auto px-6 py-12 mb-8">
          <div className="bg-[#283593] border border-[#3949ab] rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                ¿Listo para realizar tu próximo pedido?
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8 text-lg">
                Ingresá a tu cuenta y gestioná tus pedidos de forma rápida y sencilla.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#fb8c00] hover:bg-[#f57c00] text-white font-bold text-lg rounded-xl transition-all shadow-md active:scale-95"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto px-8 py-3.5 text-white/90 hover:text-white font-semibold text-lg transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-6 text-center mt-auto">
        <p className="text-sm text-white/50 font-medium">
          © {new Date().getFullYear()} ServiFood. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
