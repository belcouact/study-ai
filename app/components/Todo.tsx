import React from 'react';
import { useLocation } from 'react-router-dom';

const Todo: React.FC = () => {
  const location = useLocation();

  const handleGenerateQuestions = async () => {
    // Any logic needed without setting loading state
    console.log('Generate questions clicked on path:', location.pathname);
    // ... existing code ...
  }

  return (
    <div>
      {/* Removed loading spinner and "Thinking..." text */}
    </div>
  );
};

export default Todo; 