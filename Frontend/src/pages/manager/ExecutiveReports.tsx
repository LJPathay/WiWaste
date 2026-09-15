import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function ExecutiveReports() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/owner/reports', { replace: true });
  }, [navigate]);
  return null;
}
