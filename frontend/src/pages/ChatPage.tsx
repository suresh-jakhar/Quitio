import React from 'react';
import Layout from '../components/Layout';
import ChatInterface from '../components/ChatInterface';

const ChatPage: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
            AI Assistant
          </h1>
          <p className="text-gray-500 text-sm">
            Ask questions, summarize documents, or discover connections across your knowledge graph.
          </p>
        </header>

        <ChatInterface />
      </div>
    </Layout>
  );
};

export default ChatPage;
