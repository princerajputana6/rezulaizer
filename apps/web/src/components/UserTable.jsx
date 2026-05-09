'use client';
import React, { useState, useMemo } from 'react';

const UserTable = ({ users }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch = `${user.firstName} ${user.lastName} ${user.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const filterMatch = filter === 'all' || user.role === filter;
      return searchMatch && filterMatch;
    });
  }, [users, searchTerm, filter]);

  return (
    <div>
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Search..."
          className="border p-2 rounded w-1/3"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select
          className="border p-2 rounded ml-4"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">First Name</th>
            <th className="py-2 px-4 border-b">Last Name</th>
            <th className="py-2 px-4 border-b">Email</th>
            <th className="py-2 px-4 border-b">Role</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(user => (
            <tr key={user._id}>
              <td className="py-2 px-4 border-b">{user.firstName}</td>
              <td className="py-2 px-4 border-b">{user.lastName}</td>
              <td className="py-2 px-4 border-b">{user.email}</td>
              <td className="py-2 px-4 border-b">{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;