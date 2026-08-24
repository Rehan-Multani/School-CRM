import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { SearchBar } from '../components/ui/SearchBar';
import { EmptyState } from '../components/ui/EmptyState';
import { useTeacherNotifications } from '../context/TeacherNotificationContext';
import { MessageSquare, Send, Paperclip, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';

const typeVariant = { parent: 'warning', admin: 'primary', principal: 'danger', student: 'success' };
const typeLabel = { parent: 'Parent', admin: 'Admin', principal: 'Principal', student: 'Student' };

export const TeacherMessages = () => {
  const { messages, addMessage, markMessagesAsRead } = useTeacherNotifications();
  const [search, setSearch] = useState('');
  const [activeConv, setActiveConv] = useState(null);
  const [newMsg, setNewMsg] = useState('');
  const [isMobileChat, setIsMobileChat] = useState(false);

  const filteredMessages = messages.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeMessages = messages.find(m => m.id === activeConv);

  const handleOpenConv = (msg) => {
    setActiveConv(msg.id);
    markMessagesAsRead(msg.id);
    setIsMobileChat(true);
  };

  const handleSend = () => {
    if (!newMsg.trim() || !activeConv) return;
    addMessage(activeConv, newMsg.trim());
    setNewMsg('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const totalUnread = messages.reduce((s, m) => s + (m.unread || 0), 0);

  return (
    <div className="space-y-0 -mx-4 -my-6 md:mx-0 md:my-0 md:space-y-6">
      {/* Mobile header */}
      <div className="md:hidden px-4 py-4 border-b border-border">
        <h2 className="text-lg font-black text-foreground">Messages</h2>
        {totalUnread > 0 && <p className="text-xs text-slate-500">{totalUnread} unread messages</p>}
      </div>

      <div className="hidden md:block">
        <h2 className="text-lg font-black text-foreground">Messages</h2>
        <p className="text-xs text-slate-500 mt-0.5">Chat with students, parents and school staff</p>
      </div>

      <div className="flex h-[calc(100vh-180px)] md:h-[calc(100vh-200px)] border border-border rounded-none md:rounded-3xl overflow-hidden bg-card">
        {/* Conversation List */}
        <div className={cn(
          "flex flex-col border-r border-border w-full md:w-80 lg:w-96 shrink-0",
          isMobileChat && activeConv ? 'hidden md:flex' : 'flex'
        )}>
          <div className="p-4 border-b border-border">
            <SearchBar value={search} onChange={setSearch} placeholder="Search conversations..." />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredMessages.length === 0 ? (
              <EmptyState title="No conversations" icon={MessageSquare} />
            ) : (
              filteredMessages.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => handleOpenConv(msg)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 border-b border-border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-left",
                    activeConv === msg.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  id={`msg-conv-${msg.id}`}
                >
                  <div className="relative shrink-0">
                    <Avatar src={msg.photo} name={msg.name} size="md" />
                    {msg.unread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                        {msg.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs font-bold text-foreground truncate">{msg.name}</h4>
                      <Badge variant={typeVariant[msg.type] || 'default'} className="text-[9px] shrink-0">
                        {typeLabel[msg.type]}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{msg.subtitle}</p>
                    {msg.chats.length > 0 && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {msg.chats[msg.chats.length - 1].sender === 'me' ? 'You: ' : ''}
                        {msg.chats[msg.chats.length - 1].text}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col",
          !isMobileChat && !activeConv ? 'hidden md:flex' : 'flex'
        )}>
          {activeMessages ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
                <button
                  onClick={() => setIsMobileChat(false)}
                  className="md:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <Avatar src={activeMessages.photo} name={activeMessages.name} size="sm" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">{activeMessages.name}</h4>
                  <p className="text-[10px] text-slate-400">{activeMessages.subtitle}</p>
                </div>
                <Badge variant={typeVariant[activeMessages.type] || 'default'} className="ml-auto">
                  {typeLabel[activeMessages.type]}
                </Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {activeMessages.chats.map((chat, i) => (
                  <div key={i} className={cn("flex", chat.sender === 'me' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[75%] px-4 py-2.5 rounded-2xl text-xs",
                      chat.sender === 'me'
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-bl-md"
                    )}>
                      <p className="leading-relaxed">{chat.text}</p>
                      <p className={cn("text-[9px] mt-1 text-right", chat.sender === 'me' ? "text-white/70" : "text-slate-400")}>
                        {chat.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex items-end gap-2">
                  <button className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-border bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    id="message-input"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMsg.trim()}
                    className="p-2.5 bg-primary disabled:opacity-40 text-white rounded-xl hover:bg-primary-hover transition-colors shrink-0 active:scale-95"
                    id="message-send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                title="Select a conversation"
                description="Choose from your conversations on the left to start chatting"
                icon={MessageSquare}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
