import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom' 

// 1. Importar o Provider do Contexto que criamos
import { EmpresaProvider } from './contexts/EmpresaContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. Envolver a aplicação inteira com o Provider */}
      <EmpresaProvider>
        <App />
      </EmpresaProvider>
    </BrowserRouter>
  </React.StrictMode>,
)