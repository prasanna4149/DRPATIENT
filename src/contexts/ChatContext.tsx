import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChatMessage, OnlineUser } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

interface ChatContextType {
  messages: ChatMessage[];
  onlineUsers: OnlineUser[];
  sendMessage: (receiverId: string, message: string) => void;
  getChatMessages: (otherUserId: string) => ChatMessage[];
  markAsRead: (senderId: string) => void;
  getUnreadCount: (senderId: string) => number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('timestamp', { ascending: true });
      if (data) {
        setMessages(
          data.map((msg: any) => ({
            id: msg.id,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            message: msg.message,
            timestamp: new Date(msg.timestamp),
            senderName: msg.sender_name || undefined,
            receiverName: msg.receiver_name || undefined,
          }))
        );
      }
    };
    fetchMessages();

    const sub = supabase
      .channel('realtime:chat_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload: any) => {
        console.log('Real-time event received:', payload);
        const row = payload.new || payload.old;
        if (payload.eventType === 'INSERT') {
          console.log('Processing INSERT event for message:', row);
          setMessages(prev => {
            // Check if message already exists to prevent duplicates
            const exists = prev.some(msg => msg.id === row.id);
            if (exists) {
              console.log('Message already exists, skipping:', row.id);
              return prev;
            }
            
            console.log('Adding new message to state:', row);
            return [
              ...prev,
              {
                id: row.id,
                sender_id: row.sender_id,
                receiver_id: row.receiver_id,
                message: row.message,
                timestamp: new Date(row.timestamp),
                senderName: row.sender_name || undefined,
                receiverName: row.receiver_name || undefined,
              },
            ];
          });
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => (m.id === row.id ? {
            id: row.id,
            sender_id: row.sender_id,
            receiver_id: row.receiver_id,
            message: row.message,
            timestamp: new Date(row.timestamp),
            senderName: row.sender_name || undefined,
            receiverName: row.receiver_name || undefined,
          } : m)));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== row.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  const loadOnlineUsers = useCallback(() => {}, []);

  useEffect(() => {
    if (!user) return;
    const presence = supabase.channel('presence:online_users', {
      config: {
        presence: { key: user.id },
      },
    });

    presence.on('presence', { event: 'sync' }, () => {
      const state = presence.presenceState();
      const users: OnlineUser[] = Object.entries(state).flatMap(([userId, metas]: any) =>
        metas.map((m: any) => ({
          userId,
          userName: m.userName,
          role: m.role,
          lastSeen: new Date(m.lastSeen),
          isOnline: true,
        }))
      );
      setOnlineUsers(users);
    });

    presence.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presence.track({
          userName: user.name,
          role: user.role,
          lastSeen: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(presence);
    };
  }, [user]);

  useEffect(() => {}, [user]);

  useEffect(() => {}, []);

  useEffect(() => {}, []);

  const sendMessage = useCallback(async (receiverId: string, message: string) => {
    if (!message.trim() || !user) return;
    console.log('Sending message from user:', user);
    console.log('To receiver:', receiverId);
    console.log('Message content:', message);
    
    const id = crypto.randomUUID();
    const payload = {
      id,
      sender_id: user.id,
      receiver_id: receiverId,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      sender_name: user.name,
    } as any;
    const receiverMeta = onlineUsers.find(u => u.userId === receiverId);
    if (receiverMeta) payload.receiver_name = receiverMeta.userName;
    
    console.log('Payload to insert:', payload);
    
    // Optimistic update - add message immediately for better UX
    const optimisticMessage = {
      id,
      sender_id: user.id,
      receiver_id: receiverId,
      message: message.trim(),
      timestamp: new Date(),
      senderName: user.name,
      receiverName: receiverMeta?.userName,
    };
    
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some(msg => msg.id === id);
      if (exists) return prev;
      return [...prev, optimisticMessage];
    });
    
    // Insert to database - real-time listener will handle updates for other users
    try {
      const { data, error } = await supabase.from('chat_messages').insert(payload);
      if (error) {
        console.error('Database insert error:', error);
        // Remove the optimistic message if database insert failed
        setMessages(prev => prev.filter(msg => msg.id !== id));
        throw error;
      }
      console.log('Message successfully inserted to database:', data);
    } catch (error) {
      // If insert fails, remove the optimistic message
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }
  }, [user, onlineUsers]);

  const getChatMessages = useCallback((otherUserId: string): ChatMessage[] => {
    if (!user) return [];
    const currentUserId = user.id;
    
    return messages
      .filter(
        (msg) =>
          (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === currentUserId)
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [user, messages]);

  const markAsRead = useCallback((senderId: string) => {
    if (!user) return;
    const currentUserId = user.id;
    
    // In a real app, you'd mark messages as read
    // For now, we'll just track read status in localStorage
    const readMessages = JSON.parse(localStorage.getItem('readMessages') || '{}');
    readMessages[`${senderId}_${currentUserId}`] = new Date().toISOString();
    localStorage.setItem('readMessages', JSON.stringify(readMessages));
  }, [user]);

  const getUnreadCount = useCallback((senderId: string): number => {
    if (!user) return 0;
    const currentUserId = user.id;
    
    const readMessages = JSON.parse(localStorage.getItem('readMessages') || '{}');
    const lastReadTime = readMessages[`${senderId}_${currentUserId}`];
    
    if (!lastReadTime) {
      return messages.filter(
        (msg) => msg.sender_id === senderId && msg.receiver_id === currentUserId
      ).length;
    }

    const lastRead = new Date(lastReadTime);
    return messages.filter(
      (msg) =>
        msg.sender_id === senderId &&
        msg.receiver_id === currentUserId &&
        msg.timestamp > lastRead
    ).length;
  }, [user, messages]);

  const value = {
    messages,
    onlineUsers,
    sendMessage,
    getChatMessages,
    markAsRead,
    getUnreadCount,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

