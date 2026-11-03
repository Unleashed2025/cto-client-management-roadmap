import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuditBuilder } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuditBuilder />
  </React.StrictMode>,
)
