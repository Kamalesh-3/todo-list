import React, { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const SpaceView = ({ space, setSelectedTask, setView }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(3);
  const [localTasks, setLocalTasks] = useState(space.todos || []);
  const [recentlyCompletedTasks, setRecentlyCompletedTasks] = useState(new Set());
  const [taskCompletionTime, setTaskCompletionTime] = useState({});
  
  // Search and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllTasks, setShowAllTasks] = useState(false); // Toggle for show all/hide tasks
  const tasksPerPage = 20;

  // Drag and drop states
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const [, setIsDragging] = useState(false);

  // Priority editing state
  const [editingPriority, setEditingPriority] = useState(null);

  // Effect for server-side search in SpaceView
  useEffect(() => {
    const searchSpaceTasks = async (spaceId, searchTerm) => {
      if (!searchTerm.trim()) {
        return space.todos || [];
      }

      try {
        const spaceRef = doc(db, 'spaces', spaceId);
        const spaceDoc = await getDoc(spaceRef);
        
        if (spaceDoc.exists()) {
          const spaceData = spaceDoc.data();
          const filteredTodos = (spaceData.todos || []).filter(task => 
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );

          return filteredTodos;
        }
        return [];
      } catch (error) {
        console.error('Error searching space tasks:', error);
        return space.todos || [];
      }
    };

    const performSearch = async () => {
      if (searchTerm.trim()) {
        const searchedTasks = await searchSpaceTasks(space.id, searchTerm);
        setLocalTasks(searchedTasks);
      } else {
        setLocalTasks(space.todos || []);
      }
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, space]);

  const sortedTasks = useMemo(() => {
    const tasksWithDelay = localTasks.map(task => {
      const isRecentlyCompleted = recentlyCompletedTasks.has(task.id);
      const completionTime = taskCompletionTime[task.id];
      const currentTime = new Date().getTime();
      
      const shouldShowAsIncomplete = isRecentlyCompleted && completionTime && (currentTime - completionTime < 3000);
      
      return {
        ...task,
        completed: shouldShowAsIncomplete ? false : task.completed,
        spaceName: space.name,
        spaceId: space.id
      };
    });

    // Sort tasks (search is now handled server-side)
    return [...tasksWithDelay].sort((a, b) => {
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      
      if (!a.completed && !b.completed) {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      if (a.completed && b.completed) {
        const aDate = a.completedAt || a.updatedAt || a.createdAt;
        const bDate = b.completedAt || b.updatedAt || b.createdAt;
        return new Date(bDate) - new Date(aDate);
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [localTasks, recentlyCompletedTasks, taskCompletionTime, space.name, space.id]);

  // Pagination calculations for SpaceView
  const totalPages = Math.ceil(sortedTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const endIndex = startIndex + tasksPerPage;
  const pageTasks = sortedTasks.slice(startIndex, endIndex);
  
  // Current visible tasks - show 3 initially, or all if showAllTasks is true
  const initialTasksCount = 3;
  const currentTasks = showAllTasks ? pageTasks : pageTasks.slice(0, initialTasksCount);
  const toggleShowAllTasks = () => {
    setShowAllTasks(!showAllTasks);
  };
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setShowAllTasks(false); // Reset to show limited tasks when changing page
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setShowAllTasks(false); // Reset to show limited tasks when changing page
    }
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    setShowAllTasks(false); // Reset to show limited tasks when changing page
  };

  // Reset to first page and limited tasks when search changes
  useEffect(() => {
    setCurrentPage(1);
    setShowAllTasks(false);
  }, [searchTerm]);

  // DRAG AND DROP FUNCTIONS
  const handleDragStart = (e, task) => {
    if (task.completed) return;
    
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
    setIsDragging(true);
    
    e.currentTarget.classList.add('dragging');
  };

  const handleDragOver = (e, task) => {
    e.preventDefault();
    if (task.completed || !draggedTask || task.id === draggedTask.id) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDragOverTaskId(task.id);
  };

  const handleDragEnter = (e, task) => {
    e.preventDefault();
    if (task.completed || !draggedTask || task.id === draggedTask.id) return;
    setDragOverTaskId(task.id);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverTaskId(null);
    }
  };

  const handleDrop = async (e, dropTargetTask) => {
    e.preventDefault();
    
    if (!draggedTask || !dropTargetTask || draggedTask.id === dropTargetTask.id || dropTargetTask.completed) {
      resetDragState();
      return;
    }

    const currentTasks = [...localTasks];
    const draggedIndex = currentTasks.findIndex(task => task.id === draggedTask.id);
    const dropIndex = currentTasks.findIndex(task => task.id === dropTargetTask.id);

    if (draggedIndex === -1 || dropIndex === -1) {
      resetDragState();
      return;
    }

    const [movedTask] = currentTasks.splice(draggedIndex, 1);
    const newDropIndex = dropIndex > draggedIndex ? dropIndex : dropIndex;
    currentTasks.splice(newDropIndex, 0, movedTask);

    setLocalTasks(currentTasks);

    try {
      const spaceRef = doc(db, 'spaces', space.id);
      await updateDoc(spaceRef, {
        todos: currentTasks
      });
    } catch (error) {
      console.error('Error reordering tasks:', error);
      setLocalTasks(space.todos || []);
    }

    resetDragState();
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    resetDragState();
    document.querySelectorAll('.task-item-drag-container').forEach(item => {
      item.classList.remove('dragging');
    });
  };

  const resetDragState = () => {
    setDraggedTask(null);
    setDragOverTaskId(null);
    setIsDragging(false);
  };

  // PRIORITY EDITING FUNCTIONS
  const startPriorityEdit = (taskId) => {
    setEditingPriority({ taskId, spaceId: space.id });
  };

  const cancelPriorityEdit = () => {
    setEditingPriority(null);
  };

  const handlePriorityChange = async (taskId, newPriority) => {
    try {
      const updatedTasks = localTasks.map(task =>
        task.id === taskId
          ? { ...task, priority: newPriority, updatedAt: new Date() }
          : task
      );
      setLocalTasks(updatedTasks);
      setEditingPriority(null);

      const spaceRef = doc(db, 'spaces', space.id);
      await updateDoc(spaceRef, {
        todos: updatedTasks
      });
    } catch (error) {
      console.error('Error changing priority:', error);
      setLocalTasks(space.todos || []);
      setEditingPriority(null);
    }
  };

  // TOGGLE COMPLETE
  const handleToggleComplete = async (taskId) => {
    try {
      const currentTask = localTasks.find(task => task.id === taskId);
      if (!currentTask) return;

      const newCompletedState = !currentTask.completed;
      const currentTime = new Date();
      
      const updatedTasks = localTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              completed: newCompletedState,
              completedAt: newCompletedState ? currentTime : null,
              updatedAt: currentTime
            }
          : task
      );
      setLocalTasks(updatedTasks);
      
      if (newCompletedState) {
        const completionTimestamp = new Date().getTime();
        setRecentlyCompletedTasks(prev => new Set(prev).add(taskId));
        setTaskCompletionTime(prev => ({
          ...prev,
          [taskId]: completionTimestamp
        }));
        
        setTimeout(() => {
          setRecentlyCompletedTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
        }, 3000);
      } else {
        setRecentlyCompletedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setTaskCompletionTime(prev => {
          const newTimes = { ...prev };
          delete newTimes[taskId];
          return newTimes;
        });
      }

      const spaceRef = doc(db, 'spaces', space.id);
      updateDoc(spaceRef, {
        todos: updatedTasks
      });
      
    } catch (error) {
      setLocalTasks(space.todos || []);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const updatedTasks = localTasks.filter(task => task.id !== taskId);
      setLocalTasks(updatedTasks);

      setRecentlyCompletedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      setTaskCompletionTime(prev => {
        const newTimes = { ...prev };
        delete newTimes[taskId];
        return newTimes;
      });

      const spaceRef = doc(db, 'spaces', space.id);
      await updateDoc(spaceRef, {
        todos: updatedTasks
      });
      
    } catch (error) {
      setLocalTasks(space.todos || []);
    }
  };

  const addTask = async () => {
    if (newTaskTitle.trim()) {
      try {
        const newTask = {
          id: Date.now().toString(),
          title: newTaskTitle,
          priority: newTaskPriority,
          completed: false,
          description: '',
          checklist: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const updatedTasks = [...localTasks, newTask];
        setLocalTasks(updatedTasks);
        
        const spaceRef = doc(db, 'spaces', space.id);
        updateDoc(spaceRef, {
          todos: updatedTasks
        });

        setNewTaskTitle('');
        setNewTaskPriority(3);
        
      } catch (error) {
        setLocalTasks(space.todos || []);
      }
    }
  };

  const handleTaskDoubleClick = (task) => {
    window.history.pushState({ view: 'task-detail' }, '', '');
    setSelectedTask(task);
    setView('task-detail');
  };

  // Get priority label and class functions
  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Low';
    }
  };

  const getPriorityClass = (priority) => {
    switch(priority) {
      case 1: return 'priority-high';
      case 2: return 'priority-medium';
      case 3: return 'priority-low';
      default: return 'priority-low';
    }
  };

  return (
    <div className="space-view">
      <div className="space-header">
        <h2>{space.name}</h2>
        <span className="task-count">
          {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Centered Search Bar */}
      <div className="search-container-centered">
        <input
          type="text"
          placeholder="Search tasks by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            className="clear-search"
            onClick={() => setSearchTerm('')}
          >
            ×
          </button>
        )}
      </div>

      <div className="add-task-form">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add new task..."
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
        />
        <select 
          value={newTaskPriority}
          onChange={(e) => setNewTaskPriority(Number(e.target.value))}
        >
          <option value={1}>High</option>
          <option value={2}>Medium</option>
          <option value={3}>Low</option>
        </select>
        <button onClick={addTask}>Add</button>
      </div>

      {/* Priority Editor Panel */}
      {editingPriority && (
        <div className="priority-editor-panel">
          <div className="priority-editor-header">
            <h3>Change Priority</h3>
            <button onClick={cancelPriorityEdit} className="close-editor">×</button>
          </div>
          <div className="priority-options">
            <button 
              className="priority-option-btn priority-high"
              onClick={() => handlePriorityChange(editingPriority.taskId, 1)}
            >
              High
            </button>
            <button 
              className="priority-option-btn priority-medium"
              onClick={() => handlePriorityChange(editingPriority.taskId, 2)}
            >
              Medium
            </button>
            <button 
              className="priority-option-btn priority-low"
              onClick={() => handlePriorityChange(editingPriority.taskId, 3)}
            >
              Low
            </button>
          </div>
        </div>
      )}

      <div className="task-list">
        <div className="swipe-instructions">
          👉 Drag handle (⠿) to reorder • Swipe to delete • Click priority to edit • Double-click for details
        </div>

        {/* Page Info */}
        {sortedTasks.length > 0 && (
          <div className="page-info">
            Page {currentPage} of {totalPages} • 
            Showing {startIndex + 1}-{Math.min(endIndex, sortedTasks.length)} of {sortedTasks.length} total tasks
          </div>
        )}
        
        {currentTasks.map((task) => (
          <React.Fragment key={task.id}>
            {dragOverTaskId === task.id && (
              <div className="drop-zone active" />
            )}
            
            <div
              className={`task-item-drag-container ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
              draggable={!task.completed}
              onDragStart={(e) => handleDragStart(e, task)}
              onDragOver={(e) => handleDragOver(e, task)}
              onDragEnter={(e) => handleDragEnter(e, task)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, task)}
              onDragEnd={handleDragEnd}
            >
              <SpaceTaskItem
                task={task}
                onDoubleClick={() => handleTaskDoubleClick(task)}
                onDelete={() => handleDeleteTask(task.id)}
                onToggleComplete={() => handleToggleComplete(task.id)}
                onPriorityClick={() => startPriorityEdit(task.id)}
                getPriorityLabel={getPriorityLabel}
                getPriorityClass={getPriorityClass}
                isRecentlyCompleted={recentlyCompletedTasks.has(task.id)}
                dragHandleProps={{
                  draggable: true,
                  onDragStart: (e) => handleDragStart(e, task),
                  onDragEnd: handleDragEnd
                }}
              />
            </div>
          </React.Fragment>
        ))}
        
        {currentTasks.length === 0 && (
          <div className="no-tasks">
            {searchTerm 
              ? 'No tasks found matching your search' 
              : 'No tasks in this space yet. Add one above!'}
          </div>
        )}
      </div>

      {/* Show All / Hide Tasks Toggle Button */}
      {pageTasks.length > initialTasksCount && (
        <div className="show-all-container">
          <div className="show-all-card">
            <div className="show-all-info">
              <span className="show-all-text">
                {showAllTasks 
                  ? `Showing all ${pageTasks.length} tasks on this page` 
                  : `Showing ${currentTasks.length} of ${pageTasks.length} tasks on this page`}
              </span>
              <span className="show-all-subtext">
                {showAllTasks 
                  ? 'All tasks are currently visible' 
                  : `${pageTasks.length - currentTasks.length} more tasks available`}
              </span>
            </div>
            <button 
              onClick={toggleShowAllTasks}
              className={`show-all-btn ${showAllTasks ? 'hide-tasks' : 'show-tasks'}`}
            >
              {showAllTasks ? 'Hide Tasks' : `Show All ${pageTasks.length} Tasks`}
            </button>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className="pagination-btn prev-btn"
          >
            ← Previous
          </button>
          
          <div className="pagination-pages">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="pagination-btn next-btn"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

// Space Task Item Component
const SpaceTaskItem = ({ task, onDoubleClick, onDelete, onToggleComplete, onPriorityClick, getPriorityLabel, getPriorityClass, isRecentlyCompleted, dragHandleProps }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = React.useRef(0);
  const startSwipeOffset = React.useRef(0);
  const isDragging = React.useRef(false);

  const handleTouchStart = (e) => {
    if (e.target.closest('.drag-handle')) {
      isDragging.current = true;
      return;
    }
    if (e.target.type === 'checkbox' || e.target.closest('.priority-badge-editable')) {
      return;
    }
    
    touchStartX.current = e.touches[0].clientX;
    startSwipeOffset.current = swipeOffset;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (isDragging.current) return;
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX.current;
    
    if (deltaX > 0) {
      const newOffset = Math.min(startSwipeOffset.current + deltaX, 80);
      setSwipeOffset(newOffset);
    } else if (swipeOffset > 0) {
      const newOffset = Math.max(0, startSwipeOffset.current + deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = (e) => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (swipeOffset > 40) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      isDragging.current = true;
      return;
    }
    if (e.target.type === 'checkbox' || e.target.closest('.priority-badge-editable') || e.target.closest('.delete-btn')) {
      return;
    }
    
    touchStartX.current = e.clientX;
    startSwipeOffset.current = swipeOffset;
    setIsSwiping(true);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping) return;
    
    const deltaX = e.clientX - touchStartX.current;
    
    if (deltaX > 0) {
      const newOffset = Math.min(startSwipeOffset.current + deltaX, 80);
      setSwipeOffset(newOffset);
    } else if (swipeOffset > 0) {
      const newOffset = Math.max(0, startSwipeOffset.current + deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (swipeOffset > 40) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      setIsSwiping(false);
      if (swipeOffset > 40) {
        setSwipeOffset(80);
      } else {
        setSwipeOffset(0);
      }
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
    setSwipeOffset(0);
  };

  const toggleComplete = (e) => {
    e.stopPropagation();
    onToggleComplete();
  };

  React.useEffect(() => {
    return () => {
      isDragging.current = false;
    };
  }, [task.id]);

  return (
    <div 
      className={`task-item-container ${isRecentlyCompleted ? 'recently-completed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
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
          {task.description && (
            <span className="task-description-hint">📝 Has description</span>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <span className="task-checklist-hint">
              ✅ {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
            </span>
          )}
        </div>
        
        <div 
          className={`priority-badge-editable ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPriorityClick();
          }}
        >
          {getPriorityLabel(task.priority)}
        </div>
      </div>
    </div>
  );
};

export default SpaceView;
