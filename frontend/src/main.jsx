import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. Importamos o Router aqui
import { BrowserRouter } from 'react-router-dom' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Envolvemos o App inteiro aqui. Isso resolve o erro! */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)