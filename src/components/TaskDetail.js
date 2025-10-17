import React from 'react';

const TaskDetail = ({ task, setView }) => {
  return (
    <div className="task-detail">
      <div className="detail-header">
        <button onClick={() => setView('dashboard')} className="back-btn">
          ← Back
        </button>
        <h2>Task Details</h2>
      </div>

      <div className="detail-content">
        <div className="task-title-large">{task.title}</div>
        <div className="task-meta">
          <span>Space: {task.spaceName}</span>
          <span>Priority: P{task.priority}</span>
          <span>Status: {task.completed ? 'Completed' : 'Pending'}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;