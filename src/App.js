import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import SideMenu from './components/SideMenu';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import TaskDetail from './components/TaskDetail';
import LoginScreen from './components/LoginScreen';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

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

  const handleLogout = () => {
    signOut(auth);
    setSelectedSpace(null);
    setSelectedTask(null);
    setView('dashboard');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Productivity App</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      <div className="main-container">
        <SideMenu
          spaces={spaces}
          selectedSpace={selectedSpace}
          setSelectedSpace={setSelectedSpace}
          setView={setView}
        />

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
              spaces={spaces} // ADD THIS LINE - pass spaces prop
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;