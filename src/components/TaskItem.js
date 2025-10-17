import React, { useState, useRef } from 'react';

const TaskItem = ({ task, onDoubleClick, onDelete, onToggleComplete }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef(null);

  // Universal swipe handler for both devices
  const handleSwipeStart = (clientX) => {
    setIsSwiping(true);
    touchStartX.current = clientX;
    setSwipeOffset(0);
  };

  const handleSwipeMove = (clientX) => {
    if (!isSwiping) return;
    
    const deltaX = clientX - touchStartX.current;
    
    // Allow RIGHT swipe only (positive deltaX)
    if (deltaX > 0) {
      const newOffset = Math.min(deltaX, 80);
      setSwipeOffset(newOffset);
    }
  };

  const handleSwipeEnd = () => {
    setIsSwiping(false);
    
    // If swiped enough, keep delete visible
    if (swipeOffset > 40) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  };

  // MOBILE Touch Events
  const handleTouchStart = (e) => {
    e.preventDefault();
    handleSwipeStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    handleSwipeMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    handleSwipeEnd();
  };

  // LAPTOP Mouse Events
  const handleMouseDown = (e) => {
    // Only start swipe if not clicking on checkbox or delete button
    if (e.target.type === 'checkbox' || e.target.closest('.delete-btn')) {
      return;
    }
    handleSwipeStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    handleSwipeMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleSwipeEnd();
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      handleSwipeEnd();
    }
  };

  // DELETE FUNCTION
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🗑️ DELETE CLICKED for:', task.title);
    
    if (onDelete && typeof onDelete === 'function') {
      onDelete();
      setSwipeOffset(0);
    }
  };

  // TOGGLE COMPLETE
  const toggleComplete = (e) => {
    e.stopPropagation();
    if (onToggleComplete && typeof onToggleComplete === 'function') {
      onToggleComplete();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="task-item-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Delete button on LEFT side */}
      <div 
        className="delete-action-left"
        style={{ 
          opacity: swipeOffset > 0 ? 1 : 0,
          transform: `translateX(${swipeOffset - 80}px)`,
          transition: isSwiping ? 'none' : 'all 0.3s ease'
        }}
      >
        <button 
          onClick={handleDeleteClick} 
          className="delete-btn"
        >
          ×
        </button>
      </div>

      {/* Main task item */}
      <div 
        className="task-item"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'all 0.3s ease'
        }}
        onDoubleClick={onDoubleClick}
      >
        <input
          type="checkbox"
          checked={task.completed || false}
          onChange={toggleComplete}
          className="task-checkbox"
        />
        <div className="task-content">
          <span className={`task-title ${task.completed ? 'completed' : ''}`}>
            {task.title}
          </span>
          <span className="task-space">{task.spaceName}</span>
        </div>
        <div className={`task-priority priority-${task.priority}`}>
          P{task.priority}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;