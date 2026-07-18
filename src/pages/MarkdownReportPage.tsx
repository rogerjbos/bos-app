import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

const MarkdownReportPage: React.FC = () => {
  const { filename } = useParams<{ filename: string }>();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!filename) return;
      // Reset per-filename so navigating from a failed report to a valid one
      // doesn't keep showing the old error/content.
      setLoading(true);
      setError(null);
      setContent('');
      try {
        const response = await fetch(`/reports/${filename}`);
        if (!response.ok) {
          throw new Error('Failed to fetch the report');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [filename]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-600 dark:text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose dark:prose-invert max-w-none">
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default MarkdownReportPage;
