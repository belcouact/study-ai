import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

const Todo: React.FC = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const handleGenerateQuestions = async () => {
    if (location.pathname !== '/test') {
      setLoading(false);
      return;
    }
    setLoading(true);
    // ... existing code ...
  }

  return (
    <div>
      {loading && location.pathname === '/test' && (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mr-2"></div>
          <span>Thinking...</span>
        </div>
      )}
    </div>
  );
};

export default Todo; 