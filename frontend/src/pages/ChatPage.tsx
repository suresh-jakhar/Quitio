import React from 'react';
import Layout from '../components/Layout';
import ChatInterface from '../components/ChatInterface';

const ChatPage: React.FC = () => {
  return (
    <Layout>
      <div className="chat-page-container" style={{ padding: 'var(--space-md) var(--space-xl)' }}>
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-500 mt-2">
            Ask questions, summarize documents, or discover connections across your knowledge graph.
          </p>
        </header>

        <ChatInterface />
      </div>
    </Layout>
  );
};

export default ChatPage;
