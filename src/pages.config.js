import Alimentacao from './pages/Alimentacao';
import Checkout from './pages/Checkout';
import Conteudo from './pages/Conteudo';
import Dashboard from './pages/Dashboard';
import Diagnostico from './pages/Diagnostico';
import Exercicios from './pages/Exercicios';
import FinalizarCompra from './pages/FinalizarCompra';
import Hidratacao from './pages/Hidratacao';
import Home from './pages/Home';
import Nutricionista from './pages/Nutricionista';
import Onboarding from './pages/Onboarding';
import Premium from './pages/Premium';
import Progresso from './pages/Progresso';
import Vendas from './pages/Vendas';
import Perfil from './pages/Perfil'; // ✅ ADICIONE

export const PAGES = {
  Alimentacao,
  Checkout,
  Conteudo,
  Dashboard,
  Diagnostico,
  Exercicios,
  FinalizarCompra,
  Hidratacao,
  Home,
  Nutricionista,
  Onboarding,
  Premium,
  Progresso,
  Vendas,
  Perfil, // ✅ ADICIONE
};

export const pagesConfig = {
  mainPage: "Onboarding",
  Pages: PAGES,
};
