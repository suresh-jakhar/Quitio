import React from 'react';
import CitationList from './CitationList';
import '../styles/chat.css';

interface Citation {
  id: string;
  title: string;
  content_type: string;
  similarity: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  contextCount?: number;
  citations?: Citation[];
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, contextCount, citations }) => {
  const isAssistant = role === 'assistant';

  return (
    <div className={isAssistant ? 'chat-message-assistant' : 'chat-message-user'}>
      <div className="chat-bubble-header">
        {isAssistant ? 'Quitio AI' : 'You'}
        {isAssistant && contextCount !== undefined && (
          <span className="chat-context-badge">
            {contextCount} sources considered
          </span>
        )}
      </div>
      
      <div className="chat-bubble-content">
        {content}
      </div>

      {isAssistant && citations && citations.length > 0 && (
        <CitationList citations={citations} />
      )}
    </div>
  );
};

export default ChatMessage;
