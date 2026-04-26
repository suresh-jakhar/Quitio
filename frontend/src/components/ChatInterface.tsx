import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import Spinner from './Spinner';
import Button from './Button';
import { useRAGQuery } from '../hooks/useRAGQuery';
import '../styles/chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextCount?: number;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your Quitio AI assistant. Ask me anything about your saved knowledge cards.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const { queryRag, loading, error } = useRAGQuery();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userQuery = inputValue.trim();
    setInputValue('');

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery
    };
    setMessages(prev => [...prev, userMsg]);

    // Query RAG
    const response = await queryRag(userQuery);

    if (response) {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        contextCount: response.context_count
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map(msg => (
          <ChatMessage 
            key={msg.id} 
            role={msg.role} 
            content={msg.content} 
            contextCount={msg.contextCount}
          />
        ))}
        {loading && (
          <div className="chat-message-assistant">
            <div className="chat-typing-indicator">
              <Spinner size="sm" />
              <span>QUITIO is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about your knowledge..."
              style={{
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--font-size-sm)',
                outline: 'none'
              }}
              disabled={loading}
            />
          </div>
          <Button 
            label="Ask AI" 
            variant="primary" 
            type="submit" 
            disabled={!inputValue.trim() || loading}
          />
        </form>
        {error && (
          <p style={{ marginTop: 'var(--space-xs)', color: 'var(--color-error)', fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
