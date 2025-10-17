import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import TaskItem from './TaskItem';

const Dashboard = ({ spaces, setSelectedTask, setView }) => {
  const [visibleCount, setVisibleCount] = useState(10);
  const [localSpaces, setLocalSpaces] = useState(spaces);

  // Update local spaces when spaces prop changes
  React.useEffect(() => {
    setLocalSpaces(spaces);
  }, [spaces]);

  const prioritizedTasks = useMemo(() => {
    const allTasks = [];
    localSpaces.forEach(space => {
      space.todos?.forEach(todo => {
        allTasks.push({
          ...todo,
          spaceName: space.name,
          spaceId: space.id
        });
      });
    });

    // DEBUG: Log before sorting
    console.log('📋 BEFORE SORTING:');
    allTasks.forEach(task => {
      console.log(`Task: "${task.title}", Priority: P${task.priority}`);
    });

    // Proper priority sorting - P1 first, then P2, P3, P4
    const sortedTasks = allTasks.sort((a, b) => {
      // First sort by priority (P1 should come first)
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      // If same priority, sort by creation date (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // DEBUG: Log after sorting
    console.log('🎯 AFTER SORTING (P1 → P2 → P3 → P4):');
    sortedTasks.forEach(task => {
      console.log(`Task: "${task.title}", Priority: P${task.priority}`);
    });

    return sortedTasks;
  }, [localSpaces]);

  // IMMEDIATE TOGGLE COMPLETE - Optimistic Update
  const handleToggleComplete = async (taskId, spaceId) => {
    try {
      // 1. IMMEDIATELY update UI
      const updatedSpaces = localSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedTodos = space.todos.map(task =>
            task.id === taskId
              ? { ...task, completed: !task.completed }
              : task
          );
          return { ...space, todos: updatedTodos };
        }
        return space;
      });
      setLocalSpaces(updatedSpaces);

      // 2. Update Firebase in background - USE UPDATED SPACES
      const updatedSpace = updatedSpaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        const spaceRef = doc(db, 'spaces', spaceId);
        updateDoc(spaceRef, {
          todos: updatedSpace.todos
        }).catch(error => {
          console.error('Firebase update failed:', error);
          setLocalSpaces(spaces); // Revert on error
        });
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      setLocalSpaces(spaces); // Revert on error
    }
  };

  // IMMEDIATE DELETE FUNCTION - FIXED VERSION
  const handleDeleteTask = async (taskId, spaceId) => {
    console.log('🗑️ Dashboard DELETE called:', taskId, spaceId);
    
    try {
      // 1. IMMEDIATELY update UI
      const updatedSpaces = localSpaces.map(space => {
        if (space.id === spaceId) {
          const updatedTodos = space.todos.filter(task => {
            console.log('Comparing:', task.id, 'with:', taskId, 'result:', task.id !== taskId);
            return task.id !== taskId;
          });
          console.log('Updated todos:', updatedTodos);
          return { ...space, todos: updatedTodos };
        }
        return space;
      });
      setLocalSpaces(updatedSpaces);

      // 2. Update Firebase in background - USE THE UPDATED SPACES
      const updatedSpace = updatedSpaces.find(s => s.id === spaceId);
      if (updatedSpace) {
        console.log('Updating Firebase with:', updatedSpace.todos);
        const spaceRef = doc(db, 'spaces', spaceId);
        await updateDoc(spaceRef, {
          todos: updatedSpace.todos
        });
        console.log('✅ Firebase updated successfully!');
      } else {
        console.error('❌ Updated space not found');
      }
      
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      console.error('Error details:', error.message);
      // Revert on error
      setLocalSpaces(spaces);
      alert('Delete failed: ' + error.message);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight * 1.2) {
      setVisibleCount(prev => prev + 10);
    }
  };

  const handleTaskDoubleClick = (task) => {
    setSelectedTask(task);
    setView('task-detail');
  };

  return (
    <div className="dashboard" onScroll={handleScroll}>
      <h2>All Priority Tasks</h2>
      <div className="swipe-instructions">
        👉 Swipe any task to delete
      </div>
      <div className="task-list">
        {prioritizedTasks.slice(0, visibleCount).map(task => (
          <TaskItem
            key={task.id}
            task={task}
            onDoubleClick={() => handleTaskDoubleClick(task)}
            onDelete={() => handleDeleteTask(task.id, task.spaceId)}
            onToggleComplete={() => handleToggleComplete(task.id, task.spaceId)}
          />
        ))}
        {prioritizedTasks.length === 0 && (
          <div className="no-tasks">No tasks found. Create a space and add some tasks!</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;