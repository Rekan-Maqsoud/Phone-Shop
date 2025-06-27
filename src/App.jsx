import React from 'react';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';

function App() {

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/cashier" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
