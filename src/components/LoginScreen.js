import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../firebase';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!email) {
      alert('Please enter your email address to reset password');
      return;
    }

    setLoading(true);
    
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      alert('Password reset email sent! Check your inbox.');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>{showForgotPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Sign Up')}</h2>
        
        {!showForgotPassword ? (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </button>
            
            {isLogin && (
              <p 
                onClick={() => setShowForgotPassword(true)} 
                className="toggle-auth forgot-password"
              >
                Forgot Password?
              </p>
            )}
            
            <p onClick={() => setIsLogin(!isLogin)} className="toggle-auth">
              {isLogin ? 'Need an account? Sign up' : 'Have an account? Login'}
            </p>
          </>
        ) : (
          <>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <button 
              type="button" 
              onClick={handleForgotPassword} 
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <p 
              onClick={() => setShowForgotPassword(false)} 
              className="toggle-auth"
            >
              Back to Login
            </p>
            
            {resetSent && (
              <p className="success-message">
                Check your email for password reset instructions
              </p>
            )}
          </>
        )}
      </form>
    </div>
  );
};

export default LoginScreen;
