
'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Account</h2>
          <p className="text-gray-400">Manage your account settings</p>
        </div>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Notifications</h2>
          <p className="text-gray-400">Configure your notification preferences</p>
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Theme</h2>
          <p className="text-gray-400">Choose your preferred theme</p>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded mt-2"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>
    </div>
  );
}
