import Alimentacao from './pages/Alimentacao';
import Checkout from './pages/Checkout';
import Dashboard from './pages/Dashboard';
import Diagnostico from './pages/Diagnostico';
import Exercicios from './pages/Exercicios';
import FinalizarCompra from './pages/FinalizarCompra';
import Home from './pages/Home';
import Nutricionista from './pages/Nutricionista';
import Onboarding from './pages/Onboarding';
import Premium from './pages/Premium';
import Progresso from './pages/Progresso';
import Vendas from './pages/Vendas';
import Hidratacao from './pages/Hidratacao';
import Conteudo from './pages/Conteudo';


export const PAGES = {
    "Alimentacao": Alimentacao,
    "Checkout": Checkout,
    "Dashboard": Dashboard,
    "Diagnostico": Diagnostico,
    "Exercicios": Exercicios,
    "FinalizarCompra": FinalizarCompra,
    "Home": Home,
    "Nutricionista": Nutricionista,
    "Onboarding": Onboarding,
    "Premium": Premium,
    "Progresso": Progresso,
    "Vendas": Vendas,
    "Hidratacao": Hidratacao,
    "Conteudo": Conteudo,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
};