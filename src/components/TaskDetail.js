import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const TaskDetail = ({ task, setView, spaces }) => {
  const [description, setDescription] = useState(task.description || '');
  const [checklist, setChecklist] = useState(task.checklist || []);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Update local state when task changes
  useEffect(() => {
    setDescription(task.description || '');
    setChecklist(task.checklist || []);
  }, [task]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      setView('dashboard');
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [setView]);

  // Format date function with proper validation
  const formatDate = (date) => {
    if (!date) return 'Never';
    
    // Handle Firestore Timestamp objects
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      const parsedDate = new Date(date);
      return isNaN(parsedDate.getTime()) ? 'Invalid Date' : parsedDate.toLocaleString();
    }
    
    // Handle Date objects
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
    }
    
    return 'Invalid Date';
  };

  // Get priority label and class
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

  // Get current space data from Firebase
  const getCurrentSpace = async () => {
    try {
      const spaceRef = doc(db, 'spaces', task.spaceId);
      const spaceDoc = await getDoc(spaceRef);
      if (spaceDoc.exists()) {
        return { id: spaceDoc.id, ...spaceDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting space data:', error);
      return null;
    }
  };

  // Save description to Firebase
  const saveDescription = async () => {
    try {
      const spaceRef = doc(db, 'spaces', task.spaceId);
      const currentSpace = await getCurrentSpace();
      
      if (!currentSpace || !currentSpace.todos) {
        console.error('Space not found or no todos');
        return;
      }

      console.log('💾 Saving description:', description);
      
      // Update only the description for this task
      const updatedTasks = currentSpace.todos.map(t => 
        t.id === task.id ? { ...t, description, updatedAt: new Date() } : t
      );

      await updateDoc(spaceRef, {
        todos: updatedTasks
      });
      
      console.log('✅ Description saved successfully');
    } catch (error) {
      console.error('Error saving description:', error);
    }
  };

  // Save checklist to Firebase
  const saveChecklist = async (updatedChecklist) => {
    try {
      const spaceRef = doc(db, 'spaces', task.spaceId);
      const currentSpace = await getCurrentSpace();
      
      if (!currentSpace || !currentSpace.todos) {
        console.error('Space not found or no todos');
        return;
      }

      console.log('💾 Saving checklist:', updatedChecklist);
      
      // Update only the checklist for this task
      const updatedTasks = currentSpace.todos.map(t => 
        t.id === task.id ? { ...t, checklist: updatedChecklist, updatedAt: new Date() } : t
      );

      await updateDoc(spaceRef, {
        todos: updatedTasks
      });
      
      console.log('✅ Checklist saved successfully');
    } catch (error) {
      console.error('Error saving checklist:', error);
    }
  };

  // Add new checklist item
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false
      };
      const updatedChecklist = [...checklist, newItem];
      console.log('➕ Adding checklist item:', newItem);
      setChecklist(updatedChecklist);
      saveChecklist(updatedChecklist);
      setNewChecklistItem('');
    }
  };

  // Toggle checklist item completion
  const toggleChecklistItem = (itemId) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    console.log('🔁 Toggling checklist item:', itemId);
    setChecklist(updatedChecklist);
    saveChecklist(updatedChecklist);
  };

  // Delete checklist item
  const deleteChecklistItem = (itemId) => {
    console.log('🗑️ Deleting checklist item:', itemId);
    console.log('📋 Current checklist before deletion:', checklist);
    
    const updatedChecklist = checklist.filter(item => {
      const shouldKeep = item.id !== itemId;
      console.log('Checking item:', item.id, 'against:', itemId, 'keep?', shouldKeep);
      return shouldKeep;
    });
    
    console.log('📋 Updated checklist after deletion:', updatedChecklist);
    setChecklist(updatedChecklist);
    saveChecklist(updatedChecklist);
  };

  const handleBackClick = () => {
    setView('dashboard');
  };

  // Debug: Log the task data to see what dates we have
  console.log('Task data:', {
    id: task.id,
    title: task.title,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    createdAtType: typeof task.createdAt,
    updatedAtType: typeof task.updatedAt,
    completedAtType: typeof task.completedAt
  });

  return (
    <div className="task-detail">
      <div className="detail-header">
        <button onClick={handleBackClick} className="back-btn">
          ← Back
        </button>
        <h2>Task Details</h2>
      </div>

      <div className="detail-content">
        <div className="task-title-large">{task.title}</div>

        <div className="task-meta">
          <span>Space: {task.spaceName}</span>
          <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
            Priority: {getPriorityLabel(task.priority)}
          </span>
          <span>Status: {task.completed ? 'Completed' : 'Pending'}</span>
        </div>

        {/* Date Information Section */}
        <div className="dates-section">
          <h3>Task Timeline</h3>
          <div className="date-grid">
            <div className="date-item">
              <strong>Created:</strong> 
              <span>{formatDate(task.createdAt)}</span>
            </div>
            <div className="date-item">
              <strong>Last Updated:</strong> 
              <span>{formatDate(task.updatedAt || task.createdAt)}</span>
            </div>
            {task.completedAt && (
              <div className="date-item">
                <strong>Completed:</strong> 
                <span>{formatDate(task.completedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        <div className="description-section">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add a description for this task (up to 2000 characters)..."
            maxLength={2000}
            rows={6}
          />
          <div className="char-count">{description.length}/2000 characters</div>
        </div>

        {/* Checklist Section */}
        <div className="checklist-section">
          <label>Checklist</label>
          <div className="add-checklist-item">
            <input
              type="text"
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              placeholder="Add a checklist item..."
              onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
            />
            <button onClick={addChecklistItem}>Add</button>
          </div>
          
          <div className="checklist-items">
            {checklist.map(item => (
              <ChecklistItem
                key={item.id}
                item={item}
                onToggle={() => toggleChecklistItem(item.id)}
                onDelete={() => deleteChecklistItem(item.id)}
              />
            ))}
            {checklist.length === 0 && (
              <div className="no-checklist">No checklist items yet. Add some above!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Separate ChecklistItem component with swipe to delete
const ChecklistItem = ({ item, onToggle, onDelete }) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const startSwipeOffset = useRef(0);

  const handleTouchStart = (e) => {
    if (e.target.type === 'checkbox') return;
    
    e.preventDefault();
    setIsSwiping(true);
    touchStartX.current = e.touches[0].clientX;
    startSwipeOffset.current = swipeOffset;
    setSwipeOffset(0);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX.current;
    
    // Allow RIGHT swipe only (positive deltaX)
    if (deltaX > 0) {
      const newOffset = Math.min(startSwipeOffset.current + deltaX, 60);
      setSwipeOffset(newOffset);
    } else if (swipeOffset > 0) {
      const newOffset = Math.max(0, startSwipeOffset.current + deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = (e) => {
    if (!isSwiping) return;
    
    e.preventDefault();
    setIsSwiping(false);
    
    // If swiped enough, trigger delete
    if (swipeOffset > 30) {
      console.log('👆 Swipe delete triggered for checklist item:', item.id);
      onDelete();
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
  };

  // Mouse events for desktop
  const handleMouseDown = (e) => {
    if (e.target.type === 'checkbox') return;
    
    setIsSwiping(true);
    touchStartX.current = e.clientX;
    startSwipeOffset.current = swipeOffset;
    setSwipeOffset(0);
  };

  const handleMouseMove = (e) => {
    if (!isSwiping) return;
    
    const deltaX = e.clientX - touchStartX.current;
    
    if (deltaX > 0) {
      const newOffset = Math.min(startSwipeOffset.current + deltaX, 60);
      setSwipeOffset(newOffset);
    } else if (swipeOffset > 0) {
      const newOffset = Math.max(0, startSwipeOffset.current + deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleMouseUp = () => {
    if (!isSwiping) return;
    
    setIsSwiping(false);
    
    if (swipeOffset > 30) {
      console.log('🖱️ Mouse swipe delete triggered for checklist item:', item.id);
      onDelete();
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMouseLeave = () => {
    if (isSwiping) {
      setIsSwiping(false);
      if (swipeOffset > 30) {
        onDelete();
      }
      setSwipeOffset(0);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('🖱️ Manual delete click for checklist item:', item.id);
    onDelete();
    setSwipeOffset(0);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div 
      className="checklist-item-container"
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
        className="checklist-delete-action"
        style={{ 
          opacity: swipeOffset > 0 ? 1 : 0,
          transform: `translateX(${swipeOffset - 60}px)`,
          transition: isSwiping ? 'none' : 'all 0.3s ease'
        }}
      >
        <button 
          className="checklist-delete-btn"
          onClick={handleDeleteClick}
        >
          ×
        </button>
      </div>

      {/* Main checklist item */}
      <div 
        className="checklist-item"
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'all 0.3s ease'
        }}
      >
        <input
          type="checkbox"
          checked={item.completed}
          onChange={handleToggle}
          className="checklist-checkbox"
        />
        <span className={`checklist-text ${item.completed ? 'completed' : ''}`}>
          {item.text}
        </span>
      </div>
    </div>
  );
};

export default TaskDetail;