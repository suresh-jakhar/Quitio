import React from 'react';
import '../styles/chat.css';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  contextCount?: number;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, contextCount }) => {
  const isAssistant = role === 'assistant';

  return (
    <div className={isAssistant ? 'chat-message-assistant' : 'chat-message-user'}>
      <div className="chat-bubble-header">
        {isAssistant ? 'Quitio AI' : 'You'}
        {isAssistant && contextCount !== undefined && (
          <span className="chat-context-badge">
            {contextCount} sources
          </span>
        )}
      </div>
      
      <div className="chat-bubble-content">
        {content}
      </div>
    </div>
  );
};

export default ChatMessage;
