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
    <div className="sidebar-section">
      {/* User Identity Frame */}
      <div className="frame mb-4">
        <h3 className="frame-title">我是：</h3>
        <div className="frame-content">
          <div className="dropdown-container mb-2">
            <label htmlFor="school">学校</label>
            <select id="school" className="dropdown">
              <option value="">选择学校</option>
              {/* School options */}
            </select>
          </div>
          <div className="dropdown-container">
            <label htmlFor="grade">年级</label>
            <select id="grade" className="dropdown">
              <option value="">选择年级</option>
              {/* Grade options */}
            </select>
          </div>
        </div>
      </div>

      {/* Test Configuration Frame */}
      <div className="frame">
        <h3 className="frame-title">测验：</h3>
        <div className="frame-content">
          <div className="dropdown-container mb-2">
            <label htmlFor="subject">科目</label>
            <select id="subject" className="dropdown">
              <option value="">选择科目</option>
              {/* Subject options */}
            </select>
          </div>
          <div className="dropdown-container mb-2">
            <label htmlFor="chapter">章节</label>
            <select id="chapter" className="dropdown">
              <option value="">选择章节</option>
              {/* Chapter options */}
            </select>
          </div>
          <div className="dropdown-container">
            <label htmlFor="difficulty">难度</label>
            <select id="difficulty" className="dropdown">
              <option value="">选择难度</option>
              {/* Difficulty options */}
            </select>
          </div>
        </div>
      </div>
      
      {/* External services section would be below this */}
    </div>
  );
};

export default Todo; 