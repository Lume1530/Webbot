import React from 'react';
import { LoginForm } from './components/LoginForm';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { useAuth } from './hooks/useAuth';
import { LogOut } from 'lucide-react';

function App() {
  const { user, isAuthenticated, isLoading, login, register, logout, updateUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <LoginForm
        onLogin={login}
        onRegister={register}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Logout Button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={logout}
          className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg border border-gray-200"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Render appropriate dashboard based on user role */}
      {user.role === 'admin' ? (
        <AdminDashboard currentUser={user} />
      ) : (
        <UserDashboard user={user} onUpdateUser={updateUser} />
      )}
    </div>
  );
}

export default App;