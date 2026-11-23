import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Painel from './pages/Painel'
import Obras from './pages/Obras'
import ObraDetalhe from './pages/ObraDetalhe'
import Clientes from './pages/Clientes'
import Funcionarios from './pages/Funcionarios'
import Fornecedores from './pages/Fornecedores'
import { Spinner } from './components/ui'

function Protegido({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid h-full place-items-center"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protegido>
            <Layout />
          </Protegido>
        }
      >
        <Route index element={<Painel />} />
        <Route path="obras" element={<Obras />} />
        <Route path="obras/:id/:aba?" element={<ObraDetalhe />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="funcionarios" element={<Funcionarios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
