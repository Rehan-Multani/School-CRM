import React, { useState } from 'react';
import { useStudentNotifications } from '../context/NotificationContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Send, 
  Paperclip, 
  ChevronLeft, 
  User, 
  Smile,
  ShieldCheck
} from 'lucide-react';

export const StudentMessages = () => {
  const { messages, addMessage, markMessagesAsRead } = useStudentNotifications();
  const [selectedContactId, setSelectedContactId] = useState(messages[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [mobileOpenChat, setMobileOpenChat] = useState(false);

  const selectedContact = messages.find(m => m.id === selectedContactId);

  const handleSelectContact = (id) => {
    setSelectedContactId(id);
    markMessagesAsRead(id);
    setMobileOpenChat(true);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContactId) return;
    addMessage(selectedContactId, inputText);
    setInputText('');
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] flex gap-4 overflow-hidden">
      
      {/* 1. Contact List Pane */}
      <div className={`w-full md:w-80 lg:w-96 shrink-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden ${
        mobileOpenChat ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-black text-foreground uppercase tracking-wider">Inbox Conversations</h3>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Connect with teachers & support desks</span>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border">
          {messages.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleSelectContact(contact.id)}
              className={`p-4 flex items-center gap-3.5 cursor-pointer duration-100 ${
                selectedContactId === contact.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
              }`}
            >
              <img 
                src={contact.avatar} 
                alt={contact.name} 
                className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground truncate">{contact.name}</h4>
                  {contact.unread > 0 && (
                    <span className="h-4 w-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {contact.unread}
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">{contact.role}</span>
                <p className="text-[10px] text-slate-500 truncate mt-1.5 leading-none">
                  {contact.chats[contact.chats.length - 1]?.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Chat Conversation Panel */}
      <div className={`flex-1 flex flex-col bg-card border border-border rounded-2xl overflow-hidden ${
        !mobileOpenChat ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setMobileOpenChat(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-600 dark:text-slate-400 md:hidden shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <img 
                  src={selectedContact.avatar} 
                  alt={selectedContact.name} 
                  className="w-9 h-9 rounded-lg object-cover border border-border shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-foreground leading-none">{selectedContact.name}</h4>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">{selectedContact.role}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Internal Desk</span>
              </div>
            </div>

            {/* Bubble list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50/30 dark:bg-slate-950/10">
              {selectedContact.chats.map((chat, i) => {
                const isMe = chat.sender === 'me';
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                      isMe 
                        ? 'bg-primary text-white rounded-tr-none shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-tl-none'
                    }`}>
                      <p>{chat.text}</p>
                      <span className={`text-[8px] font-semibold mt-1.5 block text-right ${
                        isMe ? 'text-white/70' : 'text-slate-400'
                      }`}>
                        {chat.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input row */}
            <form onSubmit={handleSend} className="p-4 border-t border-border flex items-center gap-3">
              <button 
                type="button" 
                onClick={() => alert('Attachments limit: 5MB. PDF, DOC, PNG, JPG supported.')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-slate-500 shrink-0 transition-colors"
                title="Add attachment"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder="Type message here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
              />

              <button
                type="submit"
                className="p-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-premium transition-all active:scale-95 duration-100 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
            <User className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">Select a chat conversation from the list to start messaging.</p>
          </div>
        )}
      </div>

    </div>
  );
};
