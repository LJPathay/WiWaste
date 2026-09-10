import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export function ExecutiveReports() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/owner/reports', { replace: true });
  }, [navigate]);
  return null;
}
