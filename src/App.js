import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import TaskDetail from './components/TaskDetail';
import LoginScreen from './components/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch spaces when user changes
  useEffect(() => {
    if (!user) {
      setSpaces([]);
      return;
    }

    const q = query(
      collection(db, 'spaces'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const spacesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSpaces(spacesData);
    });

    return unsubscribe;
  }, [user]);

  // Logout function
  const handleLogout = () => {
    signOut(auth);
    setSelectedSpace(null);
    setSelectedTask(null);
    setView('dashboard');
    setShowMenu(false);
  };

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
        setShowMenu(false);
      } catch (error) {
        console.error('Error creating space:', error);
        alert('Error creating space: ' + error.message);
      }
    }
  };

  const handleSpaceClick = (space) => {
    setSelectedSpace(space);
    setView('space');
    setShowMenu(false);
  };

  const handleViewChange = (newView) => {
    setView(newView);
    setShowMenu(false);
  };

  // Delete space function
  const handleDeleteSpace = async () => {
    if (!spaceToDelete) return;
    
    try {
      const spaceRef = doc(db, 'spaces', spaceToDelete.id);
      await deleteDoc(spaceRef);
      
      // If the deleted space was selected, clear selection
      if (selectedSpace && selectedSpace.id === spaceToDelete.id) {
        setSelectedSpace(null);
        setView('dashboard');
      }
      
      setShowDeleteConfirm(false);
      setSpaceToDelete(null);
      setShowMenu(false);
    } catch (error) {
      console.error('Error deleting space:', error);
      alert('Error deleting space: ' + error.message);
    }
  };

  // Open delete confirmation
  const confirmDeleteSpace = (space, e) => {
    e.stopPropagation(); // Prevent space selection when clicking delete
    setSpaceToDelete(space);
    setShowDeleteConfirm(true);
  };

  // Close delete confirmation
  const cancelDeleteSpace = () => {
    setShowDeleteConfirm(false);
    setSpaceToDelete(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.menu-container') && !event.target.closest('.header-title')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <div className="header">
          <div className="header-left">
            <div className="menu-container">
              <div 
                className="header-title"
                onClick={() => setShowMenu(!showMenu)}
              >
                <span className="app-title">Productivity App</span>
                <span className="dropdown-icon">{showMenu ? '✕' : '☰'}</span>
              </div>
              
              {showMenu && (
                <div className="dropdown-menu">
                  <div className="menu-header">
                    <h2>Productivity App</h2>
                  </div>
                  
                  {/* ADDED SCROLL WRAPPER */}
                  <div className="menu-content">
                    <div className="menu-section">
                      <h3>Spaces</h3>
                      
                      {/* ADD SPACE BUTTON MOVED ABOVE DASHBOARD */}
                      {showAddSpace ? (
                        <div className="add-space-menu">
                          <input
                            type="text"
                            value={newSpaceName}
                            onChange={(e) => setNewSpaceName(e.target.value)}
                            placeholder="Space name"
                            autoFocus
                            className="menu-input"
                          />
                          <div className="menu-form-actions">
                            <button 
                              onClick={addSpace}
                              className="menu-action-btn primary"
                            >
                              Add
                            </button>
                            <button 
                              onClick={() => setShowAddSpace(false)}
                              className="menu-action-btn"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          className="menu-item add-space-btn"
                          onClick={() => setShowAddSpace(true)}
                        >
                          + Add Space
                        </button>
                      )}
                      
                      <div className="menu-divider"></div>
                      
                      <button 
                        className={`menu-item ${view === 'dashboard' ? 'active' : ''}`}
                        onClick={() => handleViewChange('dashboard')}
                      >
                        Dashboard
                      </button>
                      
                      {spaces.map(space => (
                        <div
                          key={space.id}
                          className={`menu-space-item ${selectedSpace?.id === space.id && view === 'space' ? 'active' : ''}`}
                          onClick={() => handleSpaceClick(space)}
                        >
                          <span className="space-name">{space.name}</span>
                          <button 
                            className="delete-space-btn"
                            onClick={(e) => confirmDeleteSpace(space, e)}
                            title="Delete space"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* END OF SCROLL WRAPPER */}
                  
                </div>
              )}
            </div>
          </div>
          
          {/* Logout Button in Top Right Corner */}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>

        <div className="main-container">          
          <div className="content">
            {view === 'dashboard' && (
              <Dashboard
                spaces={spaces}
                setSelectedTask={setSelectedTask}
                setView={setView}
              />
            )}
            
            {view === 'space' && selectedSpace && (
              <SpaceView
                space={selectedSpace}
                setSelectedTask={setSelectedTask}
                setView={setView}
              />
            )}
            
            {view === 'task-detail' && selectedTask && (
              <TaskDetail
                task={selectedTask}
                setView={setView}
                spaces={spaces}
              />
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && spaceToDelete && (
          <div className="modal-overlay">
            <div className="delete-confirm-modal">
              <div className="modal-header">
                <h3>Delete Space</h3>
              </div>
              <div className="modal-content">
                <p>Are you sure you want to delete the space "<strong>{spaceToDelete.name}</strong>"?</p>
                <p className="warning-text">This action cannot be undone and all tasks in this space will be permanently deleted.</p>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={cancelDeleteSpace}
                  className="modal-btn cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteSpace}
                  className="modal-btn delete-btn"
                >
                  Delete Space
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
