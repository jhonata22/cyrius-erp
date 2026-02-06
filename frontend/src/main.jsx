import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom' 

// REMOVA OU COMENTE ESTA IMPORTAÇÃO
// import { EmpresaProvider } from './contexts/EmpresaContext' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* REMOVA O PROVIDER QUE ESTÁ ENVOLVENDO O APP */}
      {/* <EmpresaProvider> */}
        <App />
      {/* </EmpresaProvider> */}
    </BrowserRouter>
  </React.StrictMode>,
)