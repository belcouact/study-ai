import React, { useState } from 'react';

const SidebarDropdowns: React.FC = () => {
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [difficulty, setDifficulty] = useState('');

  // Sample data for dropdowns
  const schools = ['北京大学', '清华大学', '复旦大学', '上海交通大学'];
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
  const subjects = ['数学', '语文', '英语', '物理', '化学', '生物'];
  const chapters = ['第一章', '第二章', '第三章', '第四章', '第五章'];
  const difficulties = ['简单', '中等', '困难'];

  return (
    <div className="sidebar-dropdowns">
      {/* User Identity Frame */}
      <div className="frame mb-4">
        <h3 className="frame-title">我是：</h3>
        <div className="frame-content">
          <div className="dropdown-container mb-2">
            <label htmlFor="school">学校</label>
            <select 
              id="school" 
              className="dropdown"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            >
              <option value="">选择学校</option>
              {schools.map((s, index) => (
                <option key={index} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="dropdown-container">
            <label htmlFor="grade">年级</label>
            <select 
              id="grade" 
              className="dropdown"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">选择年级</option>
              {grades.map((g, index) => (
                <option key={index} value={g}>{g}</option>
              ))}
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
            <select 
              id="subject" 
              className="dropdown"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">选择科目</option>
              {subjects.map((s, index) => (
                <option key={index} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="dropdown-container mb-2">
            <label htmlFor="chapter">章节</label>
            <select 
              id="chapter" 
              className="dropdown"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            >
              <option value="">选择章节</option>
              {chapters.map((c, index) => (
                <option key={index} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="dropdown-container">
            <label htmlFor="difficulty">难度</label>
            <select 
              id="difficulty" 
              className="dropdown"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">选择难度</option>
              {difficulties.map((d, index) => (
                <option key={index} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarDropdowns; 