import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { usePIIDetection } from '../hooks/usePIIDetection';

interface AgentDoctorChatProps {
  selectedDoctorId: string | null;
  selectedDoctorName: string | null;
  onBack: () => void;
}

const AgentDoctorChat: React.FC<AgentDoctorChatProps> = ({
  selectedDoctorId,
  selectedDoctorName,
  onBack,
}) => {
  const { user } = useAuth();
  const { getChatMessages, sendMessage, markAsRead, messages: allMessages } = useChat();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const currentUserId = user?.id;

  // PII Detection
  const { checkMessage, isServiceHealthy } = usePIIDetection(currentUserId, 'high');
  const [piiCheckResult, setPiiCheckResult] = useState<{
    shouldBlock: boolean;
    reason: string;
    maskedText: string;
    confidence: string;
    violations: any[];
  } | null>(null);
  const [showPiiWarning, setShowPiiWarning] = useState(false);

  // Force re-render when messages change
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const handleMessageUpdate = () => {
      // Force immediate update when messages change
      // Also trigger a re-read from context by forcing update
      forceUpdate(prev => prev + 1);
    };
    
    // Listen for storage events (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'chatMessages') {
        handleMessageUpdate();
      }
    };
    
    // Listen for custom chatMessageSent event (same-tab)
    window.addEventListener('storage', handleStorage);
    window.addEventListener('chatMessageSent', handleMessageUpdate);
    
    // Also poll for updates as a backup (every 500ms for real-time feel)
    const pollInterval = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('chatMessageSent', handleMessageUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Get messages from context - this will update when context messages change
  // Use useMemo to ensure it recalculates when allMessages changes
  const messages = useMemo(() => {
    return selectedDoctorId ? getChatMessages(selectedDoctorId) : [];
  }, [selectedDoctorId, getChatMessages, allMessages.length, allMessages]);

  // Trigger update when messages change or when allMessages from context changes
  useEffect(() => {
    forceUpdate(prev => prev + 1);
  }, [messages.length, allMessages.length]);
  
  // Also trigger update when message content changes (not just length)
  useEffect(() => {
    if (messages.length > 0) {
      forceUpdate(prev => prev + 1);
    }
  }, [messages.map(m => m.id).join(',')]);

  useEffect(() => {
    if (selectedDoctorId) {
      markAsRead(selectedDoctorId);
    }
  }, [selectedDoctorId, markAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time PII detection as user types
  useEffect(() => {
    const checkPII = async () => {
      if (!messageText.trim() || !isServiceHealthy) {
        setPiiCheckResult(null);
        setShowPiiWarning(false);
        return;
      }

      try {
        const result = await checkMessage(messageText);
        setPiiCheckResult(result);
        setShowPiiWarning(result.shouldBlock);
      } catch (error) {
        console.error('PII check failed:', error);
        setPiiCheckResult(null);
        setShowPiiWarning(false);
      }
    };

    // Debounce PII checking to avoid too many API calls
    const timeoutId = setTimeout(checkPII, 500);
    return () => clearTimeout(timeoutId);
  }, [messageText, checkMessage, isServiceHealthy]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!selectedDoctorId || !messageText.trim() || !currentUserId) return;
    
    let messageToSend = messageText;
    let shouldSend = true;
    
    // Check for PII before sending
    if (isServiceHealthy) {
      try {
        const piiResult = await checkMessage(messageText);
        
        // If PII is detected and should be blocked, prevent sending
        if (piiResult.shouldBlock) {
          alert(`Message blocked: ${piiResult.reason}\n\nDetected violations: ${piiResult.violations.map(v => v.type).join(', ')}\n\nPlease remove personal information before sending.`);
          return;
        }
        
        // If PII is detected but not blocking (20% threshold not met), ask about masking
        if (piiResult.violations.length > 0 && piiResult.maskedText !== messageText) {
          const shouldSendMasked = confirm(`Personal information detected in your message.\n\nWould you like to send the masked version instead?\n\nOriginal: "${messageText}"\nMasked: "${piiResult.maskedText}"`);
          
          if (shouldSendMasked) {
            messageToSend = piiResult.maskedText;
          } else {
            shouldSend = false; // User chose not to send
          }
        }
      } catch (error) {
        console.error('PII check failed during send:', error);
        // If PII check fails, allow sending but warn user
        const shouldContinue = confirm('PII detection service is unavailable. Send message anyway?');
        if (!shouldContinue) {
          shouldSend = false;
        }
      }
    }
    
    // Send the message only once if allowed
    if (shouldSend) {
      sendMessage(selectedDoctorId, messageToSend);
      
      // Clear input only after successful send
      setMessageText('');
      setPiiCheckResult(null);
      setShowPiiWarning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!selectedDoctorId) {
    return (
      <div 
        className="doctor-chat-container flex items-center justify-center h-full bg-gray-50"
        style={{ position: 'relative', width: '100%', display: 'block', overflow: 'visible' }}
      >
        <div className="text-center">
          <p className="text-gray-500 text-lg">Select a doctor to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center flex-shrink-0">
        <button
          onClick={onBack}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{selectedDoctorName}</h3>
          <p className="text-sm text-gray-500">Doctor</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isSent = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isSent
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p className={`text-sm whitespace-pre-wrap break-words ${isSent ? 'text-white' : ''}`}>{msg.message}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isSent ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        {/* PII Warning - Only show when PII is actually detected */}
        {showPiiWarning && piiCheckResult && piiCheckResult.violations.length > 0 && (
          <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  PII detected, this message is not allowed
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className={`flex-1 resize-none border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
              showPiiWarning 
                ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || (showPiiWarning && piiCheckResult?.shouldBlock)}
            className={`p-2 rounded-lg transition-colors ${
              showPiiWarning && piiCheckResult?.shouldBlock
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={showPiiWarning && piiCheckResult?.shouldBlock ? 'Message contains PII and will be blocked' : 'Send message'}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentDoctorChat;

