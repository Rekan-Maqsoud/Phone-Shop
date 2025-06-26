import { useState } from 'react';

export default function useAdmin(navigate) {
  const [adminModal, setAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [loading, setLoading] = useState(false);

  const openAdminModal = () => {
    setAdminPassword('');
    setAdminError('');
    setLoading(false);
    setAdminModal(true);
  };

  const handleAdminAccess = async (e) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setAdminError('Please enter password');
      return;
    }
    setLoading(true);
    if (window.api?.checkAdminPassword) {
      const res = await window.api.checkAdminPassword(adminPassword);
      setLoading(false);
      if (res.success) {
        setAdminModal(false);
        setAdminPassword('');
        setAdminError('');
        navigate('/admin');
      } else {
        setAdminError(res.message || 'Incorrect password');
      }
    } else {
      setLoading(false);
      setAdminError('API not available');
    }
  };

  return {
    adminModal,
    setAdminModal,
    adminPassword,
    setAdminPassword,
    adminError,
    setAdminError,
    loading,
    setLoading,
    openAdminModal,
    handleAdminAccess,
  };
}
