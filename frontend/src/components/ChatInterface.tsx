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
  citations?: any[];
  isMultiHop?: boolean;
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
  const [deepMode, setDeepMode] = useState(false);
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
    const response = await queryRag(userQuery, 5, deepMode);

    if (response) {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        contextCount: response.context_count,
        citations: response.citations?.card_details || [],
        // @ts-ignore - isMultiHop might be in response
        isMultiHop: response.is_multi_hop
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  };

  return (
    <div className="chat-container">
      {/* Header with Toggle */}
      <div style={{ 
        padding: 'var(--space-sm) var(--space-xl)', 
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: loading ? 'var(--color-warning)' : 'var(--color-success)' 
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {loading ? 'AI IS THINKING' : 'AI READY'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={deepMode} 
              onChange={(e) => setDeepMode(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', fontWeight: 700, color: deepMode ? 'var(--color-primary)' : 'var(--color-text-secondary)', letterSpacing: '0.05em' }}>
              DEEP MODE
            </span>
          </label>

          <button 
            onClick={() => setMessages([{ id: 'welcome', role: 'assistant', content: 'Hello! How can I help you today?' }])}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--color-danger)',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            CLEAR CHAT
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map(msg => (
          <ChatMessage 
            key={msg.id} 
            role={msg.role} 
            content={msg.content} 
            contextCount={msg.contextCount}
            citations={msg.citations}
          />
        ))}
        {loading && (
          <div className="chat-message-assistant">
            <div className="chat-typing-indicator">
              <Spinner size="sm" />
              <span>{deepMode ? 'QUITIO is performing multi-hop reasoning...' : 'QUITIO is thinking...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="chat-form">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={deepMode ? "Ask a complex question..." : "Type your question here..."}
            className="input-field"
            disabled={loading}
          />
          <div style={{ width: '120px' }}>
            <Button 
              label={loading ? '...' : 'Ask AI'} 
              variant="primary" 
              type="submit" 
              disabled={!inputValue.trim() || loading}
              block
            />
          </div>
        </form>
        {error && (
          <p className="input-error" style={{ marginTop: 'var(--space-sm)', textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
