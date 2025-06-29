import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Cashier from './pages/Cashier';
import Admin from './pages/Admin';

const router = createBrowserRouter([
  {
    path: '/cashier',
    element: <Cashier />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '*',
    element: <Navigate to="/cashier" replace />,
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
