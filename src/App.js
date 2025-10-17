import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import SideMenu from './components/SideMenu';
import Dashboard from './components/Dashboard';
import SpaceView from './components/SpaceView';
import TaskDetail from './components/TaskDetail';
import LoginScreen from './components/LoginScreen';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [view, setView] = useState('dashboard');
  const [selectedTask, setSelectedTask] = useState(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Firestore data listener
  useEffect(() => {
    if (!user) {
      setSpaces([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'spaces'), (snapshot) => {
      const spacesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Filter spaces by current user
      const userSpaces = spacesData.filter(space => space.ownerId === user.uid);
      setSpaces(userSpaces);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
    setSelectedSpace(null);
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
      <header className="header">
        <h1>TodoList</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>
      
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;