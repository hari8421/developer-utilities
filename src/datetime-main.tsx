import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import DateTimeUtilities from '../DateTimeUtilities/DateTimeUtilities'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DateTimeUtilities />
  </StrictMode>,
)
