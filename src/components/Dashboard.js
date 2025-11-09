import React, { useState, useMemo, useRef, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = ({ spaces, setSelectedTask, setView }) => {
  const [localSpaces, setLocalSpaces] = useState(spaces);
  const [editingPriority, setEditingPriority] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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

  // Update local spaces when spaces prop changes
  React.useEffect(() => {
    setLocalSpaces(spaces);
  }, [spaces]);

  useEffect(() => {
    const searchTasks = async (searchTerm) => {
      if (!searchTerm.trim()) {
        return spaces; // Return all spaces if no search term
      }

      try {
        const spacesRef = collection(db, 'spaces');
        const searchQuery = query(
          spacesRef,
          where('todos', '!=', null) // Ensure spaces have todos
        );

        const querySnapshot = await getDocs(searchQuery);
        const searchedSpaces = [];

        querySnapshot.forEach((doc) => {
          const spaceData = doc.data();
          const filteredTodos = spaceData.todos.filter(task =>
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );

          if (filteredTodos.length > 0) {
            searchedSpaces.push({
              id: doc.id,
              ...spaceData,
              todos: filteredTodos
            });
          }
        });

        return searchedSpaces;
      } catch (error) {
        console.error('Error searching tasks:', error);
        return spaces; // Fallback to local spaces
      }
    };

    const performSearch = async () => {
      if (searchTerm.trim()) {
        const searchedSpaces = await searchTasks(searchTerm);
        setLocalSpaces(searchedSpaces);
      } else {
        setLocalSpaces(spaces);
      }
    };

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, spaces]);

  const prioritizedTasks = useMemo(() => {
    const allTasks = [];
    localSpaces.forEach(space => {
      space.todos?.forEach(todo => {
        const isRecentlyCompleted = recentlyCompletedTasks.has(todo.id);
        const completionTime = taskCompletionTime[todo.id];
        const currentTime = new Date().getTime();

        const shouldShowAsIncomplete = isRecentlyCompleted && completionTime && (currentTime - completionTime < 5000);

        allTasks.push({
          ...todo,
          spaceName: space.name,
          spaceId: space.id,
          completed: shouldShowAsIncomplete ? false : todo.completed
        });
      });
    });

    // Apply status filter (search is now handled server-side)
    let filteredTasks = allTasks;
    if (filter === 'completed') {
      filteredTasks = filteredTasks.filter(task => task.completed);
    } else if (filter === 'incomplete') {
      filteredTasks = filteredTasks.filter(task => !task.completed);
    }

    // Sort tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
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

    return sortedTasks;
  }, [localSpaces, filter, recentlyCompletedTasks, taskCompletionTime]);

  // Pagination calculations
  const totalPages = Math.ceil(prioritizedTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const endIndex = startIndex + tasksPerPage;
  const pageTasks = prioritizedTasks.slice(startIndex, endIndex);

  // Current visible tasks - show 3 initially, or all if showAllTasks is true
  const initialTasksCount = 3;
  const currentTasks = showAllTasks ? pageTasks : pageTasks.slice(0, initialTasksCount);
  const toggleShowAllTasks = () => {
    setShowAllTasks(!showAllTasks);
  };

  // Pagination functions
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

  // Reset to first page and limited tasks when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setShowAllTasks(false);
  }, [searchTerm, filter]);

  // DRAG AND DROP FUNCTIONS FOR DASHBOARD
  const handleDragStart = (e, task) => {
    if (task.completed) return;

    e.dataTransfer.setData('text/plain', JSON.stringify({
      taskId: task.id,
      spaceId: task.spaceId
    }));
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

    const draggedSpaceIndex = localSpaces.findIndex(space => space.id === draggedTask.spaceId);
    const dropTargetSpaceIndex = localSpaces.findIndex(space => space.id === dropTargetTask.spaceId);

    if (draggedSpaceIndex === -1 || dropTargetSpaceIndex === -1) {
      resetDragState();
      return;
    }

    const updatedSpaces = [...localSpaces];
    const draggedSpace = updatedSpaces[draggedSpaceIndex];
    const dropTargetSpace = updatedSpaces[dropTargetSpaceIndex];

    const draggedTaskIndex = draggedSpace.todos.findIndex(task => task.id === draggedTask.id);
    const dropTargetTaskIndex = dropTargetSpace.todos.findIndex(task => task.id === dropTargetTask.id);

    if (draggedTaskIndex === -1 || dropTargetTaskIndex === -1) {
      resetDragState();
      return;
    }

    const [movedTask] = draggedSpace.todos.splice(draggedTaskIndex, 1);
    const newIndex = dropTargetTaskIndex;
    dropTargetSpace.todos.splice(newIndex, 0, movedTask);

    setLocalSpaces(updatedSpaces);

    try {
      const draggedSpaceRef = doc(db, 'spaces', draggedTask.spaceId);
      await updateDoc(draggedSpaceRef, {
        todos: draggedSpace.todos
      });

      const dropTargetSpaceRef = doc(db, 'spaces', dropTargetTask.spaceId);
      await updateDoc(dropTargetSpaceRef, {
        todos: dropTargetSpace.todos
      });
    } catch (error) {
      console.error('Error moving task:', error);
      setLocalSpaces(spaces);
    }

    resetDragState();
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    resetDragState();
    document.querySelectorAll('.dashboard-task-drag-container').forEach(item => {
      item.classList.remove('dragging');
    });
  };

  const resetDragState = () => {
    setDraggedTask(null);
    setDragOverTaskId(null);
    setIsDragging(false);
  };

  // TOGGLE COMPLETE with 5-second delay
  const handleToggleComplete = async (taskId, spaceId, currentCompletedState) => {
    try {
      const newCompletedState = !currentCompletedState;
      const currentTime = new Date();

      const updatedSpaces = localSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedTodos = space.todos.map(task =>
            task.id === taskId
              ? {
                ...task,
                completed: newCompletedState,
                completedAt: newCompletedState ? currentTime : null,
                updatedAt: currentTime
              }
              : task
          );
          return { ...space, todos: updatedTodos };
        }
        return space;
      });

      setLocalSpaces(updatedSpaces);

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
        }, 5000);
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

      const updatedSpace = updatedSpaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        const spaceRef = doc(db, 'spaces', spaceId);
        updateDoc(spaceRef, {
          todos: updatedSpace.todos
        });
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      setLocalSpaces(spaces);
    }
  };

  // PRIORITY EDITING FUNCTIONS
  const startPriorityEdit = (taskId, spaceId) => {
    setEditingPriority({ taskId, spaceId });
  };

  const cancelPriorityEdit = () => {
    setEditingPriority(null);
  };

  const handlePriorityChange = async (taskId, spaceId, newPriority) => {
    try {
      const updatedSpaces = localSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedTodos = space.todos.map(task =>
            task.id === taskId
              ? { ...task, priority: newPriority, updatedAt: new Date() }
              : task
          );
          return { ...space, todos: updatedTodos };
        }
        return space;
      });
      setLocalSpaces(updatedSpaces);
      setEditingPriority(null);

      const updatedSpace = updatedSpaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        const spaceRef = doc(db, 'spaces', spaceId);
        updateDoc(spaceRef, {
          todos: updatedSpace.todos
        });
      }
    } catch (error) {
      console.error('Error changing priority:', error);
      setLocalSpaces(spaces);
      setEditingPriority(null);
    }
  };

  // FILTER FUNCTIONS
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setShowFilterDropdown(false);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowFilterDropdown(false);
    };

    if (showFilterDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showFilterDropdown]);

  // DELETE TASK FUNCTION
  const handleDeleteTask = async (taskId, spaceId) => {
    try {
      const updatedSpaces = localSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedTodos = space.todos.filter(task => task.id !== taskId);
          return { ...space, todos: updatedTodos };
        }
        return space;
      });
      setLocalSpaces(updatedSpaces);

      setRecentlyCompletedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      const updatedSpace = updatedSpaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
          todos: updatedSpace.todos
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      setLocalSpaces(spaces);
    }
  };

  // TASK DOUBLE CLICK FUNCTION
  const handleTaskDoubleClick = (task) => {
    window.history.pushState({ view: 'task-detail' }, '', '');
    setSelectedTask(task);
    setView('task-detail');
  };

  // HELPER FUNCTIONS
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Low';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 1: return 'priority-high';
      case 2: return 'priority-medium';
      case 3: return 'priority-low';
      default: return 'priority-low';
    }
  };

  const getTaskCounts = () => {
    const allTasks = [];
    localSpaces.forEach(space => {
      space.todos?.forEach(todo => {
        allTasks.push(todo);
      });
    });

    return {
      all: allTasks.length,
      completed: allTasks.filter(task => task.completed).length,
      incomplete: allTasks.filter(task => !task.completed).length
    };
  };

  const taskCounts = getTaskCounts();

  const getCurrentFilterLabel = () => {
    switch (filter) {
      case 'all': return `All (${taskCounts.all})`;
      case 'incomplete': return `Incomplete (${taskCounts.incomplete})`;
      case 'completed': return `Completed (${taskCounts.completed})`;
      default: return `All (${taskCounts.all})`;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>All Priority Tasks</h2>
        <div className="task-count-badge">
          {prioritizedTasks.length} task{prioritizedTasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Centered Search Bar */}
      <div className="search-container-centered">
        <input
          type="text"
          placeholder="Search tasks by title, space, or description..."
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

      <div className="dashboard-controls">
        <div className="filter-dropdown-container">
          <button
            className="filter-dropdown-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowFilterDropdown(!showFilterDropdown);
            }}
          >
            {getCurrentFilterLabel()}
            <span className="dropdown-arrow">▼</span>
          </button>

          {showFilterDropdown && (
            <div className="filter-dropdown-menu">
              <button
                className={`filter-dropdown-item ${filter === 'all' ? 'active' : ''}`}
                onClick={() => handleFilterChange('all')}
              >
                All ({taskCounts.all})
              </button>
              <button
                className={`filter-dropdown-item ${filter === 'incomplete' ? 'active' : ''}`}
                onClick={() => handleFilterChange('incomplete')}
              >
                Incomplete ({taskCounts.incomplete})
              </button>
              <button
                className={`filter-dropdown-item ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => handleFilterChange('completed')}
              >
                Completed ({taskCounts.completed})
              </button>
            </div>
          )}
        </div>
      </div>

      {editingPriority && (
        <div className="priority-editor-panel">
          <div className="priority-editor-header">
            <h3>Change Priority</h3>
            <button onClick={cancelPriorityEdit} className="close-editor">×</button>
          </div>
          <div className="priority-options">
            <button
              className="priority-option-btn priority-high"
              onClick={() => handlePriorityChange(editingPriority.taskId, editingPriority.spaceId, 1)}
            >
              High
            </button>
            <button
              className="priority-option-btn priority-medium"
              onClick={() => handlePriorityChange(editingPriority.taskId, editingPriority.spaceId, 2)}
            >
              Medium
            </button>
            <button
              className="priority-option-btn priority-low"
              onClick={() => handlePriorityChange(editingPriority.taskId, editingPriority.spaceId, 3)}
            >
              Low
            </button>
          </div>
        </div>
      )}

      <div className="swipe-instructions">
        👉 Swipe right to delete • Click priority to edit • Double-click for details
      </div>

      {/* Page Info */}
      {prioritizedTasks.length > 0 && (
        <div className="page-info">
          Page {currentPage} of {totalPages} •
          Showing {startIndex + 1}-{Math.min(endIndex, prioritizedTasks.length)} of {prioritizedTasks.length} total tasks
        </div>
      )}

      <div className="task-list">
        {currentTasks.map(task => (
          <React.Fragment key={task.id}>
            {dragOverTaskId === task.id && (
              <div className="drop-zone active" />
            )}

            <div
              className={`dashboard-task-drag-container ${dragOverTaskId === task.id ? 'drag-over' : ''}`}
              draggable={!task.completed}
              onDragStart={(e) => handleDragStart(e, task)}
              onDragOver={(e) => handleDragOver(e, task)}
              onDragEnter={(e) => handleDragEnter(e, task)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, task)}
              onDragEnd={handleDragEnd}
            >
              <DashboardTaskItem
                task={task}
                onDoubleClick={() => handleTaskDoubleClick(task)}
                onDelete={() => handleDeleteTask(task.id, task.spaceId)}
                onToggleComplete={() => handleToggleComplete(task.id, task.spaceId, task.completed)}
                onPriorityClick={() => startPriorityEdit(task.id, task.spaceId)}
                getPriorityLabel={getPriorityLabel}
                getPriorityClass={getPriorityClass}
                isRecentlyCompleted={recentlyCompletedTasks.has(task.id)}
              />
            </div>
          </React.Fragment>
        ))}
        {currentTasks.length === 0 && (
          <div className="no-tasks">
            {searchTerm
              ? 'No tasks found matching your search'
              : filter === 'completed'
                ? 'No completed tasks found'
                : filter === 'incomplete'
                  ? 'No incomplete tasks found'
                  : 'No tasks found. Create a space and add some tasks!'}
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

// Dashboard Task Item Component
const DashboardTaskItem = ({ task, onDoubleClick, onDelete, onToggleComplete, onPriorityClick, getPriorityLabel, getPriorityClass, isRecentlyCompleted }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const startSwipeOffset = useRef(0);

  const handleTouchStart = (e) => {
    if (e.target.type === 'checkbox' || e.target.closest('.priority-badge-editable')) {
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    startSwipeOffset.current = swipeOffset;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
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
    if (!isSwiping) return;
    setIsSwiping(false);

    if (swipeOffset > 40) {
      setSwipeOffset(80);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.type === 'checkbox' || e.target.closest('.priority-badge-editable')) {
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

  return (
    <div
      className={`dashboard-task-item-container ${isRecentlyCompleted ? 'recently-completed' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="dashboard-delete-action"
        style={{
          opacity: swipeOffset > 0 ? 1 : 0,
          transform: `translateX(${swipeOffset - 80}px)`,
          transition: isSwiping ? 'none' : 'all 0.3s ease'
        }}
      >
        <button
          onClick={handleDeleteClick}
          className="dashboard-delete-btn"
        >
          ×
        </button>
      </div>

      <div
        className="dashboard-task-item"
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

export default Dashboard;
