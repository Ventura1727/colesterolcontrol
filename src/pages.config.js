import Onboarding from './pages/Onboarding';
import Diagnostico from './pages/Diagnostico';
import Dashboard from './pages/Dashboard';
import Premium from './pages/Premium';
import Home from './pages/Home';
import Exercicios from './pages/Exercicios';
import Alimentacao from './pages/Alimentacao';
import Progresso from './pages/Progresso';
import Vendas from './pages/Vendas';
import Checkout from './pages/Checkout';
import FinalizarCompra from './pages/FinalizarCompra';


export const PAGES = {
    "Onboarding": Onboarding,
    "Diagnostico": Diagnostico,
    "Dashboard": Dashboard,
    "Premium": Premium,
    "Home": Home,
    "Exercicios": Exercicios,
    "Alimentacao": Alimentacao,
    "Progresso": Progresso,
    "Vendas": Vendas,
    "Checkout": Checkout,
    "FinalizarCompra": FinalizarCompra,
}

export const pagesConfig = {
    mainPage: "Onboarding",
    Pages: PAGES,
};