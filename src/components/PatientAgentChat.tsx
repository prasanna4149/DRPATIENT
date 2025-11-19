import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { usePIIDetection } from '../hooks/usePIIDetection';

const PatientAgentChat: React.FC = () => {
  const { user } = useAuth();
  const { getChatMessages, sendMessage, markAsRead, onlineUsers, messages: allMessages } = useChat();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // PII Detection
  const { checkMessage, isServiceHealthy } = usePIIDetection(user?.id, 'high');
  const [piiCheckResult, setPiiCheckResult] = useState<{
    shouldBlock: boolean;
    reason: string;
    maskedText: string;
    confidence: string;
    violations: any[];
  } | null>(null);
  const [showPiiWarning, setShowPiiWarning] = useState(false);

  useEffect(() => {}, [user, onlineUsers.length]);

  // Find the agent (first online agent or any agent)
  const agent = onlineUsers.find((u) => u.role === 'agent') || null;
  const agentId = agent?.userId || null;

  const [, forceUpdate] = useState(0);
  useEffect(() => {}, []);
  
  // Get messages for this conversation - recalculate on every render
  // Use useMemo to ensure it recalculates when allMessages changes
  const messages = useMemo(() => {
    return agentId ? getChatMessages(agentId) : [];
  }, [agentId, getChatMessages, allMessages.length, allMessages]);
  
  // Trigger update when allMessages changes or when messages array changes
  useEffect(() => {
    forceUpdate(prev => prev + 1);
  }, [allMessages.length, agentId, messages.length]);
  
  // Also trigger update when message content changes (not just length)
  useEffect(() => {
    if (messages.length > 0) {
      forceUpdate(prev => prev + 1);
    }
  }, [messages.map(m => m.id).join(',')]);

  useEffect(() => {
    if (agentId) {
      markAsRead(agentId);
    }
  }, [agentId, markAsRead]);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      // Fallback: scroll the container directly
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change (new message received or sent)
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [messageText]);

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

  const handleSend = useCallback(async () => {
    if (!agentId || !messageText.trim()) return;
    
    const textToSend = messageText.trim();
    let messageToSend = textToSend;
    let shouldSend = true;
    
    // Check for PII before sending
    if (isServiceHealthy) {
      try {
        const piiResult = await checkMessage(textToSend);
        
        // If PII is detected and should be blocked, prevent sending
        if (piiResult.shouldBlock) {
          alert(`Message blocked: ${piiResult.reason}\n\nDetected violations: ${piiResult.violations.map(v => v.type).join(', ')}\n\nPlease remove personal information before sending.`);
          return;
        }
        
        // If PII is detected but not blocking (20% threshold not met), ask about masking
        if (piiResult.violations.length > 0 && piiResult.maskedText !== textToSend) {
          const shouldSendMasked = confirm(`Personal information detected in your message.\n\nWould you like to send the masked version instead?\n\nOriginal: "${textToSend}"\nMasked: "${piiResult.maskedText}"`);
          
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
      sendMessage(agentId, messageToSend);
      
      // Clear input only after successful send
      setMessageText('');
      setPiiCheckResult(null);
      setShowPiiWarning(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '36px';
      }
    }
  }, [agentId, messageText, sendMessage, checkMessage, isServiceHealthy]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Focus textarea when component mounts or agent becomes available
  useEffect(() => {
    if (agentId && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [agentId]);

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 h-[400px] min-h-[400px] max-h-[500px] w-full">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 sm:px-4 py-2 rounded-t-lg">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-2 sm:mr-3">
            {agent ? agent.userName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {agent ? agent.userName : 'Agent'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500">
              {agent?.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable Container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 min-h-0 overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[80px]">
            <p className="text-xs sm:text-sm text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => {
              const isSent = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg ${
                      isSent
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words text-white">{msg.message}</p>
                    <p
                      className={`text-[10px] sm:text-xs mt-0.5 ${
                        isSent ? 'text-blue-100' : 'text-blue-100'
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

      {/* Input - Pinned at Bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white rounded-b-lg shadow-[0_-2px_8px_rgba(0,0,0,0.05)] px-3 sm:px-4 py-2">
        {/* PII Warning - Only show when PII is actually detected */}
        {showPiiWarning && piiCheckResult && piiCheckResult.violations.length > 0 && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800">
                  PII detected, this message is not allowed
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            className={`flex-1 resize-none border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:border-transparent overflow-y-auto transition-colors ${
              showPiiWarning 
                ? 'border-red-300 focus:ring-red-500 bg-red-50' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            style={{ minHeight: '36px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || !agentId || (showPiiWarning && piiCheckResult?.shouldBlock)}
            className={`flex-shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors ${
              showPiiWarning && piiCheckResult?.shouldBlock
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label="Send message"
            title={showPiiWarning && piiCheckResult?.shouldBlock ? 'Message contains PII and will be blocked' : 'Send message'}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientAgentChat;

