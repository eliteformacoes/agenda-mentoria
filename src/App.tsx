import { useAuth, Login } from './auth';
import { Painel } from './pages/Painel';

export function App() {
  const { session, carregando } = useAuth();
  if (carregando) return null;
  return session ? <Painel /> : <Login />;
}
