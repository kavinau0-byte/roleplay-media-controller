import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import OutputWindow from './output/OutputWindow.jsx'

const isOutput = window.location.hash === '#output'

createRoot(document.getElementById('root')).render(
  <StrictMode>{isOutput ? <OutputWindow /> : <App />}</StrictMode>,
)
