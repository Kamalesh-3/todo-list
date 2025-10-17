import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const SideMenu = ({ spaces, selectedSpace, setSelectedSpace, setView }) => {
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  const addSpace = async () => {
    if (newSpaceName.trim() && auth.currentUser) {
      try {
        await addDoc(collection(db, 'spaces'), {
          name: newSpaceName,
          ownerId: auth.currentUser.uid,
          createdAt: new Date(),
          todos: []
        });
        setNewSpaceName('');
        setShowAddSpace(false);
      } catch (error) {
        console.error('Error creating space:', error);
        alert('Error creating space: ' + error.message);
      }
    }
  };

  const handleSpaceClick = (space) => {
    setSelectedSpace(space);
    setView('space');
  };

  return (
    <div className="side-menu">
      <div className="menu-header">
        <h2>Spaces</h2>
        <button 
          className="add-btn"
          onClick={() => setShowAddSpace(true)}
        >
          +
        </button>
      </div>

      {showAddSpace && (
        <div className="add-space-form">
          <input
            type="text"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            placeholder="Space name"
            autoFocus
          />
          <div className="form-actions">
            <button onClick={addSpace}>Add</button>
            <button onClick={() => setShowAddSpace(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="space-list">
        <div 
          className={`space-item ${!selectedSpace ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </div>
        {spaces.map(space => (
          <div
            key={space.id}
            className={`space-item ${selectedSpace?.id === space.id ? 'active' : ''}`}
            onClick={() => handleSpaceClick(space)}
          >
            {space.name}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SideMenu;