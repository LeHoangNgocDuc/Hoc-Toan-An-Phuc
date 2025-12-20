
import React from 'react';
import { Member, Role } from '../types';

interface MemberCardProps {
  member: Member;
  onDelete: (id: string) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onDelete }) => {
  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case Role.LEADER: return 'bg-red-100 text-red-700 border-red-200';
      case Role.DEPUTY: return 'bg-orange-100 text-orange-700 border-orange-200';
      case Role.SECRETARY: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{member.name}</h3>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(member.role)}`}>
              {member.role}
            </span>
          </div>
        </div>
        <button 
          onClick={() => onDelete(member.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>
      <p className="text-gray-600 text-sm mb-3">
        <i className="fa-solid fa-envelope mr-2 text-gray-400"></i>
        {member.email}
      </p>
      <p className="text-gray-500 text-sm italic line-clamp-2">
        "{member.bio}"
      </p>
    </div>
  );
};

export default MemberCard;
