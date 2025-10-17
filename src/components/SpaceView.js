import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import TaskItem from './TaskItem';

const SpaceView = ({ space, setSelectedTask, setView }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(1);
  const [localTasks, setLocalTasks] = useState(space.todos || []);

  // Update local tasks when space changes
  React.useEffect(() => {
    setLocalTasks(space.todos || []);
  }, [space.todos]);

  // SORT TASKS BY PRIORITY (P1 → P2 → P3 → P4)
  const sortedTasks = useMemo(() => {
    return [...localTasks].sort((a, b) => {
      // First sort by priority (P1 should come first)
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      // If same priority, sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [localTasks]);

  // IMMEDIATE TOGGLE COMPLETE - Optimistic Update
  const handleToggleComplete = async (taskId) => {
    try {
      // 1. IMMEDIATELY update UI
      const updatedTasks = localTasks.map(task => 
        task.id === taskId 
          ? { ...task, completed: !task.completed }
          : task
      );
      setLocalTasks(updatedTasks);
      
      // 2. Update Firebase in background (no waiting)
      const spaceRef = doc(db, 'spaces', space.id);
      updateDoc(spaceRef, {
        todos: updatedTasks
      }).catch(error => {
        console.error('Firebase update failed:', error);
        // Revert if Firebase fails
        setLocalTasks(space.todos || []);
      });
      
    } catch (error) {
      console.error('Error toggling task:', error);
      // Revert on error
      setLocalTasks(space.todos || []);
    }
  };

  // IMMEDIATE DELETE FUNCTION - FIXED VERSION
  const handleDeleteTask = async (taskId) => {
    console.log('🗑️ SpaceView DELETE called:', taskId);
    
    try {
      // 1. IMMEDIATELY update UI
      const updatedTasks = localTasks.filter(task => {
        console.log('Comparing:', task.id, 'with:', taskId, 'result:', task.id !== taskId);
        return task.id !== taskId;
      });
      console.log('Updated tasks:', updatedTasks);
      setLocalTasks(updatedTasks);
      
      // 2. Update Firebase in background (no waiting)
      const spaceRef = doc(db, 'spaces', space.id);
      await updateDoc(spaceRef, {
        todos: updatedTasks
      });
      console.log('✅ Firebase updated successfully!');
      
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      console.error('Error details:', error.message);
      // Revert if Firebase fails
      setLocalTasks(space.todos || []);
      alert('Delete failed: ' + error.message);
    }
  };

  // ADD TASK FUNCTION - Optimistic Update
  const addTask = async () => {
    if (newTaskTitle.trim()) {
      try {
        const newTask = {
          id: Date.now().toString(),
          title: newTaskTitle,
          priority: newTaskPriority,
          completed: false,
          createdAt: new Date()
        };

        // 1. IMMEDIATELY update UI
        const updatedTasks = [...localTasks, newTask];
        setLocalTasks(updatedTasks);
        
        // 2. Update Firebase in background
        const spaceRef = doc(db, 'spaces', space.id);
        updateDoc(spaceRef, {
          todos: updatedTasks
        }).catch(error => {
          console.error('Firebase add failed:', error);
          setLocalTasks(space.todos || []);
        });

        setNewTaskTitle('');
        setNewTaskPriority(1);
        
      } catch (error) {
        console.error('Error adding task:', error);
        setLocalTasks(space.todos || []);
      }
    }
  };

  return (
    <div className="space-view">
      <div className="space-header">
        <h2>{space.name}</h2>
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
          <option value={1}>P1</option>
          <option value={2}>P2</option>
          <option value={3}>P3</option>
          <option value={4}>P4</option>
        </select>
        <button onClick={addTask}>Add</button>
      </div>

      <div className="task-list">
        <div className="swipe-instructions">
          👉 Swipe right → on any task to delete
        </div>
        
        {sortedTasks.map(task => (
          <TaskItem
            key={task.id}
            task={{ 
              ...task, 
              spaceName: space.name, 
              spaceId: space.id 
            }}
            onDoubleClick={() => {
              setSelectedTask({ ...task, spaceName: space.name, spaceId: space.id });
              setView('task-detail');
            }}
            onDelete={() => handleDeleteTask(task.id)}
            onToggleComplete={() => handleToggleComplete(task.id)}
          />
        ))}
        
        {sortedTasks.length === 0 && (
          <div className="no-tasks">No tasks in this space yet. Add one above!</div>
        )}
      </div>
    </div>
  );
};

export default SpaceView;