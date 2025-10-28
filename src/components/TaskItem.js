import React, { useState, useRef } from 'react';

const TaskItem = ({ task, onDoubleClick, onDelete, onToggleComplete, onPriorityClick, getPriorityLabel, getPriorityClass, isRecentlyCompleted = false, dragHandleProps = null }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  // Universal swipe handler for both devices
  const handleSwipeStart = (clientX) => {
    if (isDragging.current) return; // Don't start swipe if dragging
    
    setIsSwiping(true);
    touchStartX.current = clientX;
    setSwipeOffset(0);
  };

  const handleSwipeMove = (clientX) => {
    if (!isSwiping || isDragging.current) return;
    
    const deltaX = clientX - touchStartX.current;
    
    // Allow RIGHT swipe only (positive deltaX)
    if (deltaX > 0) {
      const newOffset = Math.min(deltaX, 80);
      setSwipeOffset(newOffset);
    }
  };

  const handleSwipeEnd = () => {
    if (isDragging.current) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }
    
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
    // Don't start swipe if touching the drag handle
    if (e.target.closest('.drag-handle')) {
      isDragging.current = true;
      return;
    }
    e.preventDefault();
    handleSwipeStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (isDragging.current) return;
    if (!isSwiping) return;
    e.preventDefault();
    handleSwipeMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    if (!isSwiping) return;
    e.preventDefault();
    handleSwipeEnd();
  };

  // LAPTOP Mouse Events
  const handleMouseDown = (e) => {
    // Don't start swipe if clicking on drag handle, checkbox, priority badge, or delete button
    if (e.target.closest('.drag-handle') || 
        e.target.type === 'checkbox' || 
        e.target.closest('.priority-badge-editable') || 
        e.target.closest('.delete-btn') ||
        e.target.closest('.dashboard-delete-btn')) {
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

  // Reset drag state when component unmounts or task changes
  React.useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, [task.id]);

  // DELETE FUNCTION
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
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
      className={`task-item-container ${isRecentlyCompleted ? 'recently-completed' : ''}`}
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

      {/* Drag Handle - Only for incomplete tasks */}
      {!task.completed && dragHandleProps && (
        <div 
          className="drag-handle"
          {...dragHandleProps}
          onTouchStart={(e) => {
            e.stopPropagation();
            isDragging.current = true;
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            isDragging.current = true;
          }}
        >
          ⋮⋮
        </div>
      )}

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
          {task.description && (
            <span className="task-description-hint">📝 Has description</span>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <span className="task-checklist-hint">
              ✅ {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
            </span>
          )}
        </div>
        
        {/* Priority Badge - Click to Edit */}
        <div 
          className={`priority-badge-editable ${getPriorityLabel ? getPriorityClass(task.priority) : 'priority-low'} ${task.completed ? 'completed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onPriorityClick && typeof onPriorityClick === 'function') {
              onPriorityClick();
            }
          }}
        >
          {getPriorityLabel ? getPriorityLabel(task.priority) : 'Low'}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;